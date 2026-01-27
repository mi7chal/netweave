-- psql UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE IF NOT EXISTS users (
    -- No default value for uuid beacuse UUID v7 is used (postgres uses v4)
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL ,
    email VARCHAR(255) UNIQUE NOT NULL,

    -- in the future oidc may be used
    auth_subject_id VARCHAR(255) UNIQUE,

    password_hash VARCHAR(255),

    -- local role management
    role VARCHAR(20) NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'VIEWER')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- networks
CREATE TABLE IF NOT EXISTS networks (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    cidr CIDR UNIQUE NOT NULL,
    vlan_id INT UNIQUE CHECK (vlan_id BETWEEN 1 AND 4094),
    gateway INET,
    dns_servers INET[],
    description TEXT
);


CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY,

    -- Sometimes devices are nested (VM lives inside a physical machine)
    parent_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,

    hostname VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PHYSICAL', 'VM', 'LXC', 'CONTAINER', 'SWITCH', 'AP', 'ROUTER', 'OTHER')),

    -- Hardware specs (optional)
    cpu_cores SMALLINT,
    ram_gb REAL,
    storage_gb REAL,
    os_info VARCHAR(100),

    -- Always useful to have extra metadata
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- network interfaces in order to have data consistency
CREATE TABLE IF NOT EXISTS interfaces (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,

    name VARCHAR(50) NOT NULL DEFAULT 'eth0',
    mac_address MACADDR,

    -- homelabs often use VMs or something
    type VARCHAR(20) DEFAULT 'PHYSICAL', -- todo implement enum or sth

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- our ip addresses - leases, static reservations, dynamic assignments etc.
CREATE TABLE IF NOT EXISTS ip_addresses (
    id UUID PRIMARY KEY,
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE RESTRICT,

    interface_id UUID REFERENCES interfaces(id) ON DELETE SET NULL,

    ip_address INET NOT NULL,

    -- static dhcp lease tracking. when interface is set it will be ignored
    mac_address MACADDR,

    -- status (in the future it should be fetched from our dhcp provider)
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESERVED', 'DHCP', 'DEPRECATED', 'FREE')),
    description TEXT,

    is_static BOOLEAN NOT NULL DEFAULT TRUE,

    -- avoid duplicate
    CONSTRAINT unique_ip_in_network UNIQUE (network_id, ip_address)
);

-- Real applications/services running on network devices
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(255) NOT NULL,

    -- for the future like everything in this schema
    health_endpoint VARCHAR(100),
    monitor_interval_seconds INT DEFAULT 600, -- 10 minutes

    is_public BOOLEAN DEFAULT FALSE
);

-- Service secrets which may be used to access the service healthecks, APIs etc.
-- For now it is NOT implemented
CREATE TABLE IF NOT EXISTS service_secrets (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    token_type VARCHAR(20) NOT NULL, -- beaarer, api_key or something else
    encrypted_token BYTEA NOT NULL,
    encryption_nonce BYTEA NOT NULL,
    description VARCHAR(100)
);

-- logs tracks changes and events
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id UUID,

    -- Stores the state "before" and "after" as JSON for full history
    changes JSONB,

    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

---------- TRIGGERS -------------
--
-- Checks if ip matches subnet using postgres native functions
CREATE OR REPLACE FUNCTION validate_ip_subnet_match()
RETURNS TRIGGER AS $$
DECLARE
    net_cidr CIDR;
BEGIN
    SELECT cidr INTO net_cidr FROM networks WHERE id = NEW.network_id;

    -- postgres native
    IF NOT (NEW.ip_address << net_cidr) THEN
        RAISE EXCEPTION 'IP % isn`t within the subnet %', NEW.ip_address, net_cidr;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_ip_assignment
BEFORE INSERT OR UPDATE ON ip_addresses
FOR EACH ROW
EXECUTE FUNCTION validate_ip_subnet_match();


-- link ip to mac on update
CREATE OR REPLACE FUNCTION auto_link_ip_to_interface()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mac_address IS NOT NULL AND NEW.interface_id IS NULL THEN
        SELECT id INTO NEW.interface_id
        FROM interfaces
        WHERE mac_address = NEW.mac_address
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_link_ip_mac
BEFORE INSERT OR UPDATE ON ip_addresses
FOR EACH ROW
EXECUTE FUNCTION auto_link_ip_to_interface();


-- links mac to ip if lease exist
CREATE OR REPLACE FUNCTION auto_link_interface_to_ip()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mac_address IS NOT NULL THEN
        UPDATE ip_addresses
        SET interface_id = NEW.id
        WHERE mac_address = NEW.mac_address
          AND interface_id IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_link_interface_mac
AFTER INSERT OR UPDATE ON interfaces
FOR EACH ROW
EXECUTE FUNCTION auto_link_interface_to_ip();


-- Generate logs
CREATE OR REPLACE FUNCTION generic_audit_log_func()
RETURNS TRIGGER AS $$
DECLARE
    audit_action VARCHAR(50);
    audit_data JSONB;
    target_uuid UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        audit_action := 'DELETE';
        -- we need onlty the old state
        audit_data := jsonb_build_object('old', row_to_json(OLD));
        target_uuid := OLD.id;
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action := 'UPDATE';
        -- we nned both old and new states
        audit_data := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
        target_uuid := NEW.id;
    ELSIF (TG_OP = 'INSERT') THEN
        audit_action := 'INSERT';
        -- we need only the new state
        audit_data := jsonb_build_object('new', row_to_json(NEW));
        target_uuid := NEW.id;
    END IF;

    -- inserting with uuid v4 (psql does not support v7)
    INSERT INTO audit_logs (id, action, target_table, target_id, changes)
    VALUES (
        uuid_generate_v4(),
        audit_action,
        TG_TABLE_NAME,
        target_uuid,
        audit_data
    );

    -- can't use procedure so we just return null
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trigger_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION generic_audit_log_func();

CREATE TRIGGER audit_trigger_networks
AFTER INSERT OR UPDATE OR DELETE ON networks
FOR EACH ROW EXECUTE FUNCTION generic_audit_log_func();

CREATE TRIGGER audit_trigger_devices
AFTER INSERT OR UPDATE OR DELETE ON devices
FOR EACH ROW EXECUTE FUNCTION generic_audit_log_func();

CREATE TRIGGER audit_trigger_interfaces
AFTER INSERT OR UPDATE OR DELETE ON interfaces
FOR EACH ROW EXECUTE FUNCTION generic_audit_log_func();

CREATE TRIGGER audit_trigger_ip_addresses
AFTER INSERT OR UPDATE OR DELETE ON ip_addresses
FOR EACH ROW EXECUTE FUNCTION generic_audit_log_func();

CREATE TRIGGER audit_trigger_services
AFTER INSERT OR UPDATE OR DELETE ON services
FOR EACH ROW EXECUTE FUNCTION generic_audit_log_func();


-- ---------- INDEXES -----------
-- better to much indexs than too few


CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
CREATE INDEX IF NOT EXISTS idx_devices_hostname ON devices(hostname);
CREATE INDEX IF NOT EXISTS idx_devices_parent_device_id ON devices(parent_device_id);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON devices(created_at DESC);


CREATE INDEX IF NOT EXISTS idx_interfaces_device_id ON interfaces(device_id);
CREATE INDEX IF NOT EXISTS idx_interfaces_mac_address ON interfaces(mac_address);

CREATE INDEX IF NOT EXISTS idx_networks_cidr ON networks(cidr)

CREATE INDEX IF NOT EXISTS idx_ip_addresses_interface_id ON ip_addresses(interface_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_network_id ON ip_addresses(network_id);

CREATE INDEX IF NOT EXISTS idx_services_device_id ON services(device_id);
CREATE INDEX IF NOT EXISTS idx_service_secrets_service_id ON service_secrets(service_id);


CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON audit_logs(target_table);


CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

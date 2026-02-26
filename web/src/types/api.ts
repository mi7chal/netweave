export interface Service {
    id: string;
    device_id: string | null;
    name: string;
    base_url: string;
    health_endpoint: string | null;
    monitor_interval_seconds: number;
    is_public: boolean;
    status: ServiceStatus;
    last_check: string | null;
    total_checks: number;
    successful_checks: number;
    uptime_percentage: number;
}

export type ServiceStatus = "UP" | "DOWN" | "UNKNOWN" | "MAINTENANCE";

export interface DashboardResponse {
    services: Service[];
}

export interface CreateServicePayload {
    name: string;
    base_url: string;
    device_id?: string;
    is_public: boolean;
}

// --- Devices & Networks ---

export const DeviceType = {
    Physical: "PHYSICAL",
    Vm: "VM",
    Lxc: "LXC",
    Container: "CONTAINER",
    Switch: "SWITCH",
    Ap: "AP",
    Router: "ROUTER",
    Other: "OTHER",
} as const;

export type DeviceType = typeof DeviceType[keyof typeof DeviceType];

export const IpStatus = {
    Active: "ACTIVE",
    Reserved: "RESERVED",
    Dhcp: "DHCP",
    Deprecated: "DEPRECATED",
    Free: "FREE",
} as const;

export type IpStatus = typeof IpStatus[keyof typeof IpStatus];

export interface Interface {
    id: string;
    device_id: string;
    name: string;
    mac_address: string | null;
    interface_type: string | null;
}

export interface IpAddress {
    id: string;
    network_id: string;
    interface_id: string | null;
    ip_address: string;
    mac_address: string | null;
    status: IpStatus;
    description: string | null;
    is_static: boolean;
}

export interface DeviceListView {
    id: string;
    hostname: string;
    device_type: DeviceType;
    os_info: string | null;
    created_at: string;
    primary_ip: string | null;
    mac_address: string | null;
    is_static: boolean | null;
}

export interface InterfaceWithIps extends Interface {
    ips: IpAddress[];
}

export interface DeviceDetails {
    id: string;
    parent_device_id: string | null;
    hostname: string;
    device_type: DeviceType;
    cpu_cores: number | null;
    ram_gb: number | null;
    storage_gb: number | null;
    os_info: string | null;
    created_at: string;
    interfaces: InterfaceWithIps[];
    services: Service[];
}

export interface CreateDevicePayload {
    parent_device_id?: string;
    hostname: string;
    device_type: DeviceType;
    os_info?: string;
    cpu_cores?: number;
    ram_gb?: number;
    storage_gb?: number;
    mac_address?: string; // Initial MAC
    ip_address?: string;  // Optional static IP
}

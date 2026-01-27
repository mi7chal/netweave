use super::{CreateIpParams, Db};
use crate::models::{DeviceIpView, IpStatus, NetworkIpView};
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;

impl Db {
    pub async fn create_ip(&self, params: CreateIpParams) -> Result<Uuid, sqlx::Error> {
        // Resolve Interface ID if device_id is provided
        let interface_id = if let Some(did) = params.device_id {
            // Find the first interface (usually eth0)
            struct IfaceId {
                id: Uuid,
            }
            let res = sqlx::query_as!(
                IfaceId,
                "SELECT id FROM interfaces WHERE device_id = $1 ORDER BY name ASC LIMIT 1",
                did
            )
            .fetch_optional(&self.pool)
            .await?;

            if let Some(row) = res {
                Some(row.id)
            } else {
                None
            }
        } else {
            None
        };

        let new_id = Uuid::now_v7();
        // Since we are inserting into a VARCHAR column checked against values,
        // and IpStatus maps to SCREAMING_SNAKE_CASE via sqlx::Type,
        // we can rely on sqlx to serialize it if we cast or use explicit string.
        // But since we are constructing the query manually and want to be safe with the CHECK constraint string literal:
        let status_str = match params.status {
            IpStatus::Active => "ACTIVE",
            IpStatus::Reserved => "RESERVED",
            IpStatus::Dhcp => "DHCP",
            IpStatus::Deprecated => "DEPRECATED",
            IpStatus::Free => "FREE",
        };

        let result = sqlx::query!(
            r#"
            INSERT INTO ip_addresses (
                id, interface_id, network_id, ip_address, mac_address,
                is_static, status, description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (network_id, ip_address)
            DO UPDATE SET
                interface_id = EXCLUDED.interface_id,
                mac_address = COALESCE(EXCLUDED.mac_address, ip_addresses.mac_address),
                status = EXCLUDED.status,
                description = COALESCE(EXCLUDED.description, ip_addresses.description)
            WHERE ip_addresses.interface_id IS NULL
            "#,
            new_id,
            interface_id,
            params.network_id,
            params.ip_address as _,
            params.mac_address as _,
            params.is_static,
            status_str,
            params.description
        )
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(sqlx::Error::Protocol("IP address already occupied".into()));
        }

        Ok(new_id)
    }

    pub async fn list_device_ips(&self, device_id: Uuid) -> Result<Vec<DeviceIpView>, sqlx::Error> {
        sqlx::query_as!(
            DeviceIpView,
            r#"
            SELECT
                i.id,
                iface.device_id as "device_id!",
                iface.name as "interface_name!",
                i.ip_address as "ip_address: std::net::IpAddr",
                i.mac_address,
                i.is_static as "is_static",
                i.status as "status: IpStatus",
                n.name as "network_name",
                n.cidr as "network_cidr: IpNetwork"
            FROM ip_addresses i
            JOIN interfaces iface ON i.interface_id = iface.id
            JOIN networks n ON i.network_id = n.id
            WHERE iface.device_id = $1
            ORDER BY i.ip_address ASC
            "#,
            device_id
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_network_ips(
        &self,
        network_id: Uuid,
    ) -> Result<Vec<NetworkIpView>, sqlx::Error> {
        sqlx::query_as!(
            NetworkIpView,
            r#"
            SELECT
                i.id,
                i.ip_address as "ip_address: std::net::IpAddr",
                i.mac_address,
                i.status as "status: IpStatus",
                i.description,
                d.hostname as "device_hostname?",
                iface.name as "interface_name?"
            FROM ip_addresses i
            LEFT JOIN interfaces iface ON i.interface_id = iface.id
            LEFT JOIN devices d ON iface.device_id = d.id
            WHERE i.network_id = $1
            ORDER BY i.ip_address ASC
            "#,
            network_id
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn delete_ip(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM ip_addresses WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

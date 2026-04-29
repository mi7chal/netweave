use crate::db::Db;
use crate::entities::{devices, networks};
use crate::models::CreateDevicePayload;
use sea_orm::*;
use uuid::Uuid;

impl Db {
    pub async fn create_device(&self, params: CreateDevicePayload) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();
        let txn = self.conn.begin().await?;

        let device = devices::ActiveModel {
            id: Set(new_id),
            parent_device_id: Set(params.parent_device_id),
            hostname: Set(params.hostname),
            r#type: Set(params.device_type),
            os_info: Set(params.os_info),
            cpu_cores: Set(params.cpu_cores),
            ram_gb: Set(params.ram_gb),
            storage_gb: Set(params.storage_gb),
            ..Default::default()
        };
        device.insert(&txn).await?;

        // Create default interface `eth0`.
        let mac_address = params.mac_address.clone();
        let interface_id = Uuid::now_v7();
        let interface_stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            r#"
                INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
                VALUES ($1, $2, $3, CAST($4 AS macaddr), $5, $6)
            "#,
            vec![
                interface_id.into(),
                new_id.into(),
                "eth0".to_string().into(),
                mac_address.into(),
                Some("ethernet".to_string()).into(),
                chrono::Utc::now().into(),
            ],
        );
        txn.execute(interface_stmt).await?;

        if let Some(ip_str) = params.ip_address {
            if let Ok(ip_addr) = ip_str.parse::<std::net::IpAddr>() {
                let all_networks = networks::Entity::find().all(&txn).await?;
                let matching_network = all_networks
                    .iter()
                    .find(|network| network.cidr.contains(ip_addr));

                if let Some(network) = matching_network {
                    let ip_network = crate::db::helpers::ip_to_network(ip_addr)?;
                    let ip_stmt = Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        r#"
                            INSERT INTO ip_addresses (id, interface_id, network_id, ip_address, is_static, status)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            ON CONFLICT (network_id, ip_address) DO NOTHING
                        "#,
                        vec![
                            Uuid::now_v7().into(),
                            interface_id.into(),
                            network.id.into(),
                            ip_network.into(),
                            true.into(),
                            "ACTIVE".to_string().into(),
                        ],
                    );
                    txn.execute(ip_stmt).await?;
                } else {
                    tracing::warn!(
                        "No matching network found for IP {}, skipping IP assignment",
                        ip_addr
                    );
                }
            }
        }

        txn.commit().await?;
        Ok(new_id)
    }
}

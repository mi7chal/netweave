use super::{CreateIpParams, Db};
use crate::entities::{devices, interfaces, ip_addresses, networks};
use crate::models::{DeviceIpView, IpStatus, NetworkIpView};
use sea_orm::*;
use sea_orm::{QuerySelect, QueryOrder};
use sea_orm::sea_query::{Expr, Alias};
use uuid::Uuid;

impl Db {
    pub async fn create_ip(&self, params: CreateIpParams) -> Result<Uuid, anyhow::Error> {
        // Resolve Interface ID if device_id is provided
        let interface_id = if let Some(did) = params.device_id {
            let iface = interfaces::Entity::find()
                .select_only()
                .column(interfaces::Column::Id)
                .filter(interfaces::Column::DeviceId.eq(did))
                .order_by_asc(interfaces::Column::Name)
                .into_tuple::<Uuid>()
                .one(&self.conn)
                .await?;
            iface
        } else {
            None
        };

        let new_id = Uuid::now_v7();
        let status_str = match params.status {
            IpStatus::Active => "ACTIVE",
            IpStatus::Reserved => "RESERVED",
            IpStatus::Dhcp => "DHCP",
            IpStatus::Deprecated => "DEPRECATED",
            IpStatus::Free => "FREE",
        };

        // Raw SQL for complex generic index constrained ON CONFLICT
        let sql = r#"
            INSERT INTO ip_addresses (
                id, interface_id, network_id, ip_address, mac_address,
                is_static, status, description
            )
            VALUES ($1, $2, $3, $4::inet, $5::macaddr, $6, $7, $8)
            ON CONFLICT (network_id, ip_address)
            DO UPDATE SET
                interface_id = EXCLUDED.interface_id,
                mac_address = COALESCE(EXCLUDED.mac_address, ip_addresses.mac_address),
                status = EXCLUDED.status,
                description = COALESCE(EXCLUDED.description, ip_addresses.description)
            WHERE ip_addresses.interface_id IS NULL
        "#;

        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![
                new_id.into(),
                interface_id.into(),
                params.network_id.into(),
                params.ip_address.to_string().into(),
                params.mac_address.map(|m| m.to_string()).into(),
                params.is_static.into(),
                status_str.into(),
                params.description.into(),
            ],
        );

        self.conn.execute(stmt).await?;
        Ok(new_id)
    }

    pub async fn list_device_ips(
        &self,
        device_id: Uuid,
    ) -> Result<Vec<DeviceIpView>, anyhow::Error> {
        let backend = self.conn.get_database_backend();
        let query = ip_addresses::Entity::find()
            .join(JoinType::InnerJoin, ip_addresses::Relation::Interface.def())
            .join(JoinType::InnerJoin, ip_addresses::Relation::Network.def())
            .filter(interfaces::Column::DeviceId.eq(device_id))
            .order_by_asc(ip_addresses::Column::IpAddress)
            .select_only()
            .column(ip_addresses::Column::Id)
            .column_as(interfaces::Column::DeviceId, "device_id")
            .column_as(interfaces::Column::Name, "interface_name")
            .column_as(Expr::col(ip_addresses::Column::IpAddress).cast_as(Alias::new("text")), "ip_address")
            .column_as(Expr::col(ip_addresses::Column::MacAddress).cast_as(Alias::new("text")), "mac_address")
            .column(ip_addresses::Column::IsStatic)
            .column(ip_addresses::Column::Status)
            .column_as(networks::Column::Name, "network_name")
            .column_as(Expr::col(networks::Column::Cidr).cast_as(Alias::new("text")), "network_cidr")
            .build(backend);

        let res = self.conn.query_all(query).await?;

        let mut views = Vec::new();
        for row in res {
            let status_str: String = row.try_get("", "status")?;
            let status = match status_str.as_str() {
                "ACTIVE" => IpStatus::Active,
                "RESERVED" => IpStatus::Reserved,
                "DHCP" => IpStatus::Dhcp,
                "DEPRECATED" => IpStatus::Deprecated,
                _ => IpStatus::Free,
            };

            let ip_str: String = row.try_get("", "ip_address")?;
            let cidr_str: String = row.try_get("", "network_cidr")?;
            let mac_str: Option<String> = row.try_get("", "mac_address")?;

            views.push(DeviceIpView {
                id: row.try_get("", "id")?,
                device_id: row.try_get("", "device_id")?,
                interface_name: row.try_get("", "interface_name")?,
                ip_address: ip_str
                    .split('/')
                    .next()
                    .unwrap_or("")
                    .parse()
                    .unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0))),
                mac_address: mac_str.and_then(|s| s.parse().ok()), // parse Option<String> -> Option<MacAddress>
                is_static: row.try_get("", "is_static")?,
                status: Some(status),
                network_name: row.try_get("", "network_name")?,
                network_cidr: cidr_str.parse().ok(),
            });
        }

        Ok(views)
    }

    pub async fn list_network_ips(
        &self,
        network_id: Uuid,
    ) -> Result<Vec<NetworkIpView>, anyhow::Error> {
        let backend = self.conn.get_database_backend();
        let query = ip_addresses::Entity::find()
            .join(JoinType::LeftJoin, ip_addresses::Relation::Interface.def())
            .join_rev(
                JoinType::LeftJoin,
                devices::Entity::belongs_to(interfaces::Entity)
                    .from(devices::Column::Id)
                    .to(interfaces::Column::DeviceId)
                    .into(),
            )
            .filter(ip_addresses::Column::NetworkId.eq(network_id))
            .order_by_asc(ip_addresses::Column::IpAddress)
            .select_only()
            .column(ip_addresses::Column::Id)
            .column_as(Expr::col(ip_addresses::Column::IpAddress).cast_as(Alias::new("text")), "ip_address")
            .column_as(Expr::col(ip_addresses::Column::MacAddress).cast_as(Alias::new("text")), "mac_address")
            .column(ip_addresses::Column::Status)
            .column(ip_addresses::Column::Description)
            .column_as(devices::Column::Hostname, "device_hostname")
            .column_as(interfaces::Column::Name, "interface_name")
            .build(backend);

        let res = self.conn.query_all(query).await?;

        let mut views = Vec::new();
        for row in res {
            let status_str: String = row.try_get("", "status")?;
            let status = match status_str.as_str() {
                "ACTIVE" => IpStatus::Active,
                "RESERVED" => IpStatus::Reserved,
                "DHCP" => IpStatus::Dhcp,
                "DEPRECATED" => IpStatus::Deprecated,
                _ => IpStatus::Free,
            };

            let ip_str: String = row.try_get("", "ip_address")?;
            let mac_str: Option<String> = row.try_get("", "mac_address")?;

            views.push(NetworkIpView {
                id: row.try_get("", "id")?,
                ip_address: ip_str
                    .split('/')
                    .next()
                    .unwrap_or("")
                    .parse()
                    .unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0))),
                mac_address: mac_str.and_then(|s| s.parse().ok()),
                status,
                description: row.try_get("", "description")?,
                device_hostname: row.try_get("", "device_hostname").ok(),
                interface_name: row.try_get("", "interface_name").ok(),
            });
        }
        Ok(views)
    }

    pub async fn delete_ip(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let res = ip_addresses::Entity::delete_by_id(id)
            .exec(&self.conn)
            .await?;
        Ok(res.rows_affected > 0)
    }
}

use super::{CreateIpParams, Db};
use crate::entities::{devices, interfaces, ip_addresses, networks};
use crate::models::{DeviceIpView, IpStatus, NetworkIpView};
use sea_orm::prelude::IpNetwork;
use sea_orm::QueryOrder;
use sea_orm::*;
use uuid::Uuid;

impl Db {
    pub async fn create_ip(&self, params: CreateIpParams) -> Result<Uuid, anyhow::Error> {
        // Resolve Interface ID: Use explicit or infer from device_id
        let interface_id = if let Some(iid) = params.interface_id {
            Some(iid)
        } else if let Some(did) = params.device_id {
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
        let ip_net = super::helpers::ip_to_network(params.ip_address)?;

        // Raw SQL for complex generic index constrained ON CONFLICT
        let sql = r#"
            INSERT INTO ip_addresses (
                id, interface_id, network_id, ip_address, mac_address,
                is_static, status, description
            )
            VALUES ($1, $2, $3, $4, CAST($5 AS macaddr), $6, $7, $8)
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
                ip_net.into(),
                params
                    .mac_address
                    .map(crate::models::types::MacAddress)
                    .into(),
                params.is_static.into(),
                params.status.into_value().into(),
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
        let res = ip_addresses::Entity::find()
            .join(JoinType::InnerJoin, ip_addresses::Relation::Interface.def())
            .join(JoinType::InnerJoin, ip_addresses::Relation::Network.def())
            .filter(interfaces::Column::DeviceId.eq(device_id))
            .order_by_asc(ip_addresses::Column::IpAddress)
            .select_only()
            .column(ip_addresses::Column::Id)
            .column_as(interfaces::Column::DeviceId, "device_id")
            .column_as(interfaces::Column::Name, "interface_name")
            .column(ip_addresses::Column::IpAddress)
            .column(ip_addresses::Column::MacAddress)
            .column(ip_addresses::Column::IsStatic)
            .column(ip_addresses::Column::Status)
            .column_as(networks::Column::Name, "network_name")
            .column(networks::Column::Cidr)
            .into_tuple::<(
                Uuid,
                Uuid,
                String,
                IpNetwork,
                Option<crate::models::types::MacAddress>,
                bool,
                IpStatus,
                String,
                IpNetwork,
            )>()
            .all(&self.conn)
            .await?;

        let mut views = Vec::new();
        for (id, device_id, iface_name, ip_net, mac, is_static, status, net_name, net_cidr) in res {
            views.push(DeviceIpView {
                id,
                device_id,
                interface_name: iface_name,
                ip_address: ip_net.ip(),
                mac_address: mac.map(|m| m.0),
                is_static: Some(is_static),
                status: Some(status),
                network_name: Some(net_name),
                network_cidr: Some(net_cidr),
            });
        }

        Ok(views)
    }

    pub async fn list_network_ips(
        &self,
        network_id: Uuid,
    ) -> Result<Vec<NetworkIpView>, anyhow::Error> {
        let res = ip_addresses::Entity::find()
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
            .column(ip_addresses::Column::IpAddress)
            .column(ip_addresses::Column::MacAddress)
            .column(ip_addresses::Column::Status)
            .column(ip_addresses::Column::Description)
            .column_as(devices::Column::Hostname, "device_hostname")
            .column_as(interfaces::Column::Name, "interface_name")
            .into_tuple::<(
                Uuid,
                IpNetwork,
                Option<crate::models::types::MacAddress>,
                IpStatus,
                Option<String>,
                Option<String>,
                Option<String>,
            )>()
            .all(&self.conn)
            .await?;

        let mut views = Vec::new();
        for (id, ip_net, mac, status, description, hostname, iface_name) in res {
            views.push(NetworkIpView {
                id,
                ip_address: ip_net.ip(),
                mac_address: mac.map(|m| m.0),
                status,
                description,
                device_hostname: hostname,
                interface_name: iface_name,
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

    pub async fn update_ip(
        &self,
        params: crate::db::UpdateIpParams,
    ) -> Result<ip_addresses::Model, anyhow::Error> {
        let ip = ip_addresses::Entity::find_by_id(params.ip_id)
            .one(&self.conn)
            .await?
            .ok_or_else(|| anyhow::anyhow!("IP address not found"))?;

        let mut active_model: ip_addresses::ActiveModel = ip.into();

        if let Some(ip_addr) = params.ip_address {
            active_model.ip_address = Set(super::helpers::ip_to_network(ip_addr)?);
        }

        if let Some(is_static) = params.is_static {
            active_model.is_static = Set(is_static);
        }

        if let Some(status) = params.status {
            active_model.status = Set(status);
        }

        if let Some(desc) = params.description {
            active_model.description = Set(desc);
        }

        let mut updated = active_model.update(&self.conn).await?;

        // Process mac_address separately with raw SQL to explicitly cast as macaddr
        if let Some(mac_opt) = params.mac_address {
            if let Some(mac) = mac_opt {
                let sql = "UPDATE ip_addresses SET mac_address = CAST($1 AS macaddr) WHERE id = $2";
                let stmt = Statement::from_sql_and_values(
                    DatabaseBackend::Postgres,
                    sql,
                    vec![mac.to_string().into(), updated.id.into()],
                );
                self.conn.execute(stmt).await?;
                updated.mac_address = Some(crate::models::types::MacAddress(mac));
            } else {
                let sql = "UPDATE ip_addresses SET mac_address = NULL WHERE id = $1";
                let stmt = Statement::from_sql_and_values(
                    DatabaseBackend::Postgres,
                    sql,
                    vec![updated.id.into()],
                );
                self.conn.execute(stmt).await?;
                updated.mac_address = None;
            }
        }

        Ok(updated)
    }
}

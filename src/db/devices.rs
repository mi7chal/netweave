use super::Db;
use crate::entities::{devices, interfaces};
use crate::models::{CreateDevicePayload, Device, DeviceType};
use sea_orm::*;
use sea_orm::{QuerySelect, QueryOrder};
use sea_orm::sea_query::{Expr, Alias};
use uuid::Uuid;

impl Db {
    pub async fn list_devices(&self, search: Option<String>) -> Result<Vec<Device>, anyhow::Error> {
        let search = search.unwrap_or_default().to_lowercase();

        let mut query = devices::Entity::find();

        if !search.is_empty() {
            let s = format!("%{}%", search);
            query = query.filter(
                Condition::any()
                    .add(devices::Column::Hostname.like(&s))
                    .add(devices::Column::Type.like(&s))
                    .add(devices::Column::OsInfo.like(&s)),
            );
        }

        let devices = query
            .order_by_asc(devices::Column::Hostname)
            .all(&self.conn)
            .await?;

        Ok(devices
            .into_iter()
            .map(|d| {
                let dt = match d.r#type.as_str() {
                    "PHYSICAL" => DeviceType::Physical,
                    "VM" => DeviceType::Vm,
                    "LXC" => DeviceType::Lxc,
                    "CONTAINER" => DeviceType::Container,
                    "SWITCH" => DeviceType::Switch,
                    "AP" => DeviceType::Ap,
                    "ROUTER" => DeviceType::Router,
                    _ => DeviceType::Other,
                };
                Device {
                    id: d.id,
                    parent_device_id: d.parent_device_id,
                    hostname: d.hostname,
                    device_type: dt,
                    cpu_cores: d.cpu_cores,
                    ram_gb: d.ram_gb,
                    storage_gb: d.storage_gb,
                    os_info: d.os_info,
                    meta_data: d.meta_data,
                    created_at: d.created_at.into(),
                }
            })
            .collect())
    }

    pub async fn get_device(&self, id: Uuid) -> Result<Option<Device>, anyhow::Error> {
        let device = devices::Entity::find_by_id(id).one(&self.conn).await?;

        Ok(device.map(|d| {
            let dt = match d.r#type.as_str() {
                "PHYSICAL" => DeviceType::Physical,
                "VM" => DeviceType::Vm,
                "LXC" => DeviceType::Lxc,
                "CONTAINER" => DeviceType::Container,
                "SWITCH" => DeviceType::Switch,
                "AP" => DeviceType::Ap,
                "ROUTER" => DeviceType::Router,
                _ => DeviceType::Other,
            };
            Device {
                id: d.id,
                parent_device_id: d.parent_device_id,
                hostname: d.hostname,
                device_type: dt,
                cpu_cores: d.cpu_cores,
                ram_gb: d.ram_gb,
                storage_gb: d.storage_gb,
                os_info: d.os_info,
                meta_data: d.meta_data,
                created_at: d.created_at.into(),
            }
        }))
    }

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

        // Create default interface 'eth0'
        let interface_id = Uuid::now_v7();
        let mac = params.mac_address;

        let sql = r#"
            INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
            VALUES ($1, $2, $3, $4::macaddr, $5, $6)
        "#;

        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![
                interface_id.into(),
                new_id.into(),
                "eth0".into(),
                mac.map(|m| m.to_string()).into(),
                "ethernet".into(),
                chrono::Utc::now().into(),
            ],
        );

        txn.execute(stmt).await?;

        txn.commit().await?;

        Ok(new_id)
    }

    pub async fn update_device(
        &self,
        id: Uuid,
        params: CreateDevicePayload,
    ) -> Result<bool, anyhow::Error> {
        let txn = self.conn.begin().await?;

        let device_model = match devices::Entity::find_by_id(id).one(&txn).await? {
            Some(d) => d,
            None => return Ok(false),
        };

        let mut device: devices::ActiveModel = device_model.into();

        device.parent_device_id = Set(params.parent_device_id);
        device.hostname = Set(params.hostname);
        device.r#type = Set(params.device_type);
        device.os_info = Set(params.os_info);
        device.cpu_cores = Set(params.cpu_cores);
        device.ram_gb = Set(params.ram_gb);
        device.storage_gb = Set(params.storage_gb);

        device.update(&txn).await?;

        // Update eth0 mac if provided
        if let Some(mac) = params.mac_address {
            // Try find existing eth0
            let eth0 = interfaces::Entity::find()
                .select_only()
                .column(interfaces::Column::Id)
                .column(interfaces::Column::DeviceId)
                .column(interfaces::Column::Name)
                .column_as(Expr::col(interfaces::Column::MacAddress).cast_as(Alias::new("text")), "mac_address")
                .column(interfaces::Column::Type)
                .column(interfaces::Column::CreatedAt)
                .filter(interfaces::Column::DeviceId.eq(id))
                .filter(interfaces::Column::Name.eq("eth0"))
                .into_model::<interfaces::Model>()
                .one(&txn) // use &txn here
                .await?;

            if let Some(eth0_model) = eth0 {
                let mut eth0: interfaces::ActiveModel = eth0_model.into();
                eth0.mac_address = Set(Some(mac));
                eth0.update(&txn).await?;
            } else if !mac.is_empty() {
                // create if missing?
                let interface = interfaces::ActiveModel {
                    id: Set(Uuid::now_v7()),
                    device_id: Set(id),
                    name: Set("eth0".to_string()),
                    mac_address: Set(Some(mac)),
                    ..Default::default()
                };
                interface.insert(&txn).await?;
            }
        }

        txn.commit().await?;
        Ok(true)
    }

    pub async fn delete_device(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let res = devices::Entity::delete_by_id(id).exec(&self.conn).await?;
        Ok(res.rows_affected > 0)
    }
}

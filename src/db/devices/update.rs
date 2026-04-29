use crate::db::Db;
use crate::entities::{devices, interfaces};
use crate::models::CreateDevicePayload;
use sea_orm::*;
use uuid::Uuid;

impl Db {
    pub async fn update_device(
        &self,
        id: Uuid,
        params: CreateDevicePayload,
    ) -> Result<bool, anyhow::Error> {
        let txn = self.conn.begin().await?;

        let device_model = match devices::Entity::find_by_id(id).one(&txn).await? {
            Some(model) => model,
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

        if let Some(mac_str) = params.mac_address {
            if let Ok(_mac) = mac_str.parse::<mac_address::MacAddress>() {
                let eth0 = interfaces::Entity::find()
                    .filter(interfaces::Column::DeviceId.eq(id))
                    .filter(interfaces::Column::Name.eq("eth0"))
                    .one(&txn)
                    .await?;

                if let Some(eth0_model) = eth0 {
                    let update_stmt = Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        r#"
                            UPDATE interfaces SET mac_address = CAST($1 AS macaddr)
                            WHERE id = $2
                        "#,
                        vec![mac_str.into(), eth0_model.id.into()],
                    );
                    txn.execute(update_stmt).await?;
                } else {
                    let insert_stmt = Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        r#"
                            INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
                            VALUES ($1, $2, $3, CAST($4 AS macaddr), $5, $6)
                        "#,
                        vec![
                            Uuid::now_v7().into(),
                            id.into(),
                            "eth0".to_string().into(),
                            mac_str.into(),
                            Some("ethernet".to_string()).into(),
                            chrono::Utc::now().into(),
                        ],
                    );
                    txn.execute(insert_stmt).await?;
                }
            }
        }

        txn.commit().await?;
        Ok(true)
    }
}

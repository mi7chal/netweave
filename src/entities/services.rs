use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "services")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub device_id: Option<Uuid>,
    pub name: String,
    pub base_url: String,
    pub health_endpoint: Option<String>,
    pub monitor_interval_seconds: Option<i32>,
    pub is_public: Option<bool>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::devices::Entity",
        from = "Column::DeviceId",
        to = "super::devices::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Device,
}

impl Related<super::devices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Device.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

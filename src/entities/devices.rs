use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "devices")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub parent_device_id: Option<Uuid>,
    pub hostname: String,
    pub r#type: String, // 'type' is a reserved keyword
    pub cpu_cores: Option<i16>,
    pub ram_gb: Option<f32>,
    pub storage_gb: Option<f32>,
    pub os_info: Option<String>,
    pub meta_data: Option<serde_json::Value>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ParentDeviceId",
        to = "Column::Id",
        on_update = "NoAction",
        on_delete = "SetNull"
    )]
    SelfRef,
    #[sea_orm(has_many = "super::services::Entity")]
    Services,
}

pub struct SelfRefLink;

impl Linked for SelfRefLink {
    type FromEntity = Entity;
    type ToEntity = Entity;

    fn link(&self) -> Vec<RelationDef> {
        vec![Relation::SelfRef.def()]
    }
}

impl Related<super::services::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Services.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

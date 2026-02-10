use crate::models::types::MacAddress;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ip_addresses")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub network_id: Uuid,
    pub interface_id: Option<Uuid>,
    pub ip_address: String,
    pub mac_address: Option<MacAddress>,
    pub status: String,
    pub description: Option<String>,
    pub is_static: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::networks::Entity",
        from = "Column::NetworkId",
        to = "super::networks::Column::Id",
        on_update = "NoAction",
        on_delete = "Restrict"
    )]
    Network,
    #[sea_orm(
        belongs_to = "super::interfaces::Entity",
        from = "Column::InterfaceId",
        to = "super::interfaces::Column::Id",
        on_update = "NoAction",
        on_delete = "SetNull"
    )]
    Interface,
}

impl Related<super::networks::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Network.def()
    }
}

impl Related<super::interfaces::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Interface.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Database module for Homelab Manager application.
///
/// Provides structures and functions to interact with the PostgreSQL database,
use crate::models::IpStatus;
use sqlx::postgres::PgPool;
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;

pub mod devices;
pub mod interfaces;
pub mod ips;
pub mod networks;
pub mod services;
pub mod users;

pub struct CreateNetworkParams {
    pub name: String,
    pub cidr: IpNetwork,
    pub vlan_id: Option<i32>,
    pub gateway: Option<std::net::IpAddr>,
    pub dns_servers: Option<Vec<std::net::IpAddr>>,
    pub description: Option<String>,
}

pub struct CreateIpParams {
    pub network_id: Uuid,
    pub device_id: Option<Uuid>,
    pub interface_id: Option<Uuid>,
    pub ip_address: std::net::IpAddr,
    pub mac_address: Option<mac_address::MacAddress>,
    pub is_static: bool,
    pub status: IpStatus,
    pub description: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UpdateIpParams {
    pub ip_id: Uuid,
    pub ip_address: Option<std::net::IpAddr>,
    pub mac_address: Option<Option<mac_address::MacAddress>>,
    pub is_static: Option<bool>,
    pub status: Option<IpStatus>,
    pub description: Option<Option<String>>,
}

/// Database connection wrapper
///
/// It holds pool and basically is created just to implement methods inside specific files.
///
/// It serves as a repository pattern to organize database operations.
use sea_orm::{DatabaseConnection, SqlxPostgresConnector};

#[derive(Clone)]
pub struct Db {
    pub conn: DatabaseConnection,
}

impl Db {
    pub fn new(pool: PgPool) -> Self {
        let conn = SqlxPostgresConnector::from_sqlx_postgres_pool(pool);
        Self { conn }
    }
}

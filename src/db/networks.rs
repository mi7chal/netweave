use super::{CreateNetworkParams, Db};
use crate::models::Network;
use std::net::IpAddr;
use uuid::Uuid;

impl Db {
    pub async fn list_networks(&self) -> Result<Vec<Network>, sqlx::Error> {
        sqlx::query_as!(
            Network,
            r#"
            SELECT
                id, name, cidr, vlan_id,
                gateway as "gateway: IpAddr",
                dns_servers as "dns_servers: Vec<IpAddr>",
                description
            FROM networks
            ORDER BY name ASC
            "#
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_network(&self, id: Uuid) -> Result<Option<Network>, sqlx::Error> {
        sqlx::query_as!(
            Network,
            r#"
            SELECT
                id, name, cidr, vlan_id,
                gateway as "gateway: IpAddr",
                dns_servers as "dns_servers: Vec<IpAddr>",
                description
            FROM networks
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_network(&self, params: CreateNetworkParams) -> Result<Uuid, sqlx::Error> {
        let new_id = Uuid::now_v7();
        sqlx::query!(
            r#"
            INSERT INTO networks (id, name, cidr, vlan_id, gateway, dns_servers, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            new_id,
            params.name,
            params.cidr,
            params.vlan_id,
            params.gateway as _,
            params.dns_servers as _,
            params.description
        )
        .execute(&self.pool)
        .await?;
        Ok(new_id)
    }

    pub async fn update_network(
        &self,
        id: Uuid,
        params: CreateNetworkParams,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!(
            r#"
            UPDATE networks
            SET name = $1, cidr = $2, vlan_id = $3, gateway = $4, dns_servers = $5, description = $6
            WHERE id = $7
            "#,
            params.name,
            params.cidr,
            params.vlan_id,
            params.gateway as _,
            params.dns_servers as _,
            params.description,
            id
        )
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_network(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM networks WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

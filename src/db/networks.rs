use super::{CreateNetworkParams, Db};
use crate::entities::networks;
use crate::models::Network;
use sea_orm::*;
use sea_orm::QueryOrder;
use uuid::Uuid;

impl Db {
    pub async fn list_networks(&self) -> Result<Vec<Network>, anyhow::Error> {
        let rows = networks::Entity::find()
            .order_by_asc(networks::Column::Name)
            .all(&self.conn)
            .await?;
        Ok(rows.into_iter().map(Network::from).collect())
    }

    pub async fn get_network(&self, id: Uuid) -> Result<Option<Network>, anyhow::Error> {
        let row = networks::Entity::find_by_id(id).one(&self.conn).await?;
        Ok(row.map(Network::from))
    }

    pub async fn create_network(&self, params: CreateNetworkParams) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();

        let gateway = params
            .gateway
            .map(super::helpers::ip_to_network)
            .transpose()?;
        let dns_servers = params
            .dns_servers
            .map(|v| v.into_iter().map(super::helpers::ip_to_network).collect())
            .transpose()?;

        let network = networks::ActiveModel {
            id: Set(new_id),
            name: Set(params.name),
            cidr: Set(params.cidr),
            vlan_id: Set(params.vlan_id),
            gateway: Set(gateway),
            dns_servers: Set(dns_servers),
            description: Set(params.description),
        };

        network.insert(&self.conn).await?;
        Ok(new_id)
    }

    pub async fn update_network(
        &self,
        id: Uuid,
        params: CreateNetworkParams,
    ) -> Result<bool, anyhow::Error> {
        let mut network: networks::ActiveModel =
            match networks::Entity::find_by_id(id).one(&self.conn).await? {
                Some(n) => n.into(),
                None => return Ok(false),
            };

        let gateway = params
            .gateway
            .map(super::helpers::ip_to_network)
            .transpose()?;
        let dns_servers = params
            .dns_servers
            .map(|v| v.into_iter().map(super::helpers::ip_to_network).collect())
            .transpose()?;

        network.name = Set(params.name);
        network.cidr = Set(params.cidr);
        network.vlan_id = Set(params.vlan_id);
        network.gateway = Set(gateway);
        network.dns_servers = Set(dns_servers);
        network.description = Set(params.description);

        network.update(&self.conn).await?;
        Ok(true)
    }

    pub async fn delete_network(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let res = networks::Entity::delete_by_id(id).exec(&self.conn).await?;
        Ok(res.rows_affected > 0)
    }
}

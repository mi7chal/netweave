use super::{CreateNetworkParams, Db};
use crate::entities::networks;
use crate::models::Network;
use sea_orm::*;
use uuid::Uuid;

impl Db {
    pub async fn list_networks(&self) -> Result<Vec<Network>, anyhow::Error> {
        let networks_models = networks::Entity::find()
            .order_by_asc(networks::Column::Name)
            .all(&self.conn)
            .await?;

        // Map back to models::Network. String -> IpNetwork parsing needed.
        let mut result = Vec::new();
        for n in networks_models {
            result.push(Network {
                id: n.id,
                name: n.name,
                cidr: n.cidr.parse()?, // potential error if DB has bad data
                vlan_id: n.vlan_id,
                gateway: n.gateway.as_deref().map(|s| s.parse()).transpose()?,
                dns_servers: n
                    .dns_servers
                    .map(|v| v.iter().filter_map(|s| s.parse().ok()).collect()),
                description: n.description,
            });
        }
        Ok(result)
    }

    pub async fn get_network(&self, id: Uuid) -> Result<Option<Network>, anyhow::Error> {
        let network_model = networks::Entity::find_by_id(id).one(&self.conn).await?;

        if let Some(n) = network_model {
            Ok(Some(Network {
                id: n.id,
                name: n.name,
                cidr: n.cidr.parse()?,
                vlan_id: n.vlan_id,
                gateway: n.gateway.as_deref().map(|s| s.parse()).transpose()?,
                dns_servers: n
                    .dns_servers
                    .map(|v| v.iter().filter_map(|s| s.parse().ok()).collect()),
                description: n.description,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn create_network(&self, params: CreateNetworkParams) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();

        let network = networks::ActiveModel {
            id: Set(new_id),
            name: Set(params.name),
            cidr: Set(params.cidr.to_string()),
            vlan_id: Set(params.vlan_id),
            gateway: Set(params.gateway.map(|g| g.to_string())),
            dns_servers: Set(params
                .dns_servers
                .map(|v| v.iter().map(|ip| ip.to_string()).collect())),
            description: Set(params.description),
            ..Default::default()
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

        network.name = Set(params.name);
        network.cidr = Set(params.cidr.to_string());
        network.vlan_id = Set(params.vlan_id);
        network.gateway = Set(params.gateway.map(|g| g.to_string()));
        network.dns_servers = Set(params
            .dns_servers
            .map(|v| v.iter().map(|ip| ip.to_string()).collect()));
        network.description = Set(params.description);

        network.update(&self.conn).await?;
        Ok(true)
    }

    pub async fn delete_network(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let res = networks::Entity::delete_by_id(id).exec(&self.conn).await?;
        Ok(res.rows_affected > 0)
    }
}

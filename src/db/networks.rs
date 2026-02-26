use super::{CreateNetworkParams, Db};
use crate::entities::networks;
use crate::models::Network;
use sea_orm::*;
use sea_orm::QueryOrder; 
use sea_orm::prelude::IpNetwork;
use uuid::Uuid;

impl Db {
    pub async fn list_networks(&self) -> Result<Vec<Network>, anyhow::Error> {
        let networks_models = networks::Entity::find()
            .order_by_asc(networks::Column::Name)
            .all(&self.conn)
            .await?;

        // Map to models::Network
        let result = networks_models.into_iter().map(|n| Network {
            id: n.id,
            name: n.name,
            cidr: n.cidr,
            vlan_id: n.vlan_id,
            gateway: n.gateway.map(|gn| gn.ip()),
            dns_servers: n.dns_servers.map(|v| {
                v.iter().map(|n| n.ip()).collect()
            }),
            description: n.description,
        }).collect();

        Ok(result)
    }

    pub async fn get_network(&self, id: Uuid) -> Result<Option<Network>, anyhow::Error> {
        let network_model = networks::Entity::find_by_id(id)
            .one(&self.conn)
            .await?;

        if let Some(n) = network_model {
            Ok(Some(Network {
                id: n.id,
                name: n.name,
                cidr: n.cidr,
                vlan_id: n.vlan_id,
                gateway: n.gateway.map(|gn| gn.ip()),
                dns_servers: n.dns_servers.map(|v| {
                    v.iter().map(|n| n.ip()).collect()
                }),
                description: n.description,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn create_network(&self, params: CreateNetworkParams) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();

        let gateway = params.gateway.map(|ip| {
             IpNetwork::new(ip, if ip.is_ipv4() { 32 } else { 128 }).unwrap()
        });

        let dns_servers = params.dns_servers.map(|v| {
            v.into_iter()
                .map(|ip| IpNetwork::new(ip, if ip.is_ipv4() { 32 } else { 128 }).unwrap())
                .collect::<Vec<IpNetwork>>()
        });

        let network = networks::ActiveModel {
            id: Set(new_id),
            name: Set(params.name),
            cidr: Set(params.cidr),
            vlan_id: Set(params.vlan_id),
            gateway: Set(gateway),
            dns_servers: Set(dns_servers),
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

        let gateway = params.gateway.map(|ip| {
             IpNetwork::new(ip, if ip.is_ipv4() { 32 } else { 128 }).unwrap()
        });

        let dns_servers = params.dns_servers.map(|v| {
            v.into_iter()
                .map(|ip| IpNetwork::new(ip, if ip.is_ipv4() { 32 } else { 128 }).unwrap())
                .collect::<Vec<IpNetwork>>()
        });

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

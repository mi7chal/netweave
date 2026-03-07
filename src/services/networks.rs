use crate::db::{CreateNetworkParams, Db};
use crate::models::{CreateNetworkPayload, Network};
use crate::validation;
use anyhow::Result;
use ipnetwork::IpNetwork;
use std::str::FromStr;
use uuid::Uuid;

pub struct NetworkService;

impl NetworkService {
    fn into_params(payload: CreateNetworkPayload) -> Result<CreateNetworkParams> {
        let cidr = IpNetwork::from_str(&payload.cidr)?;

        Ok(CreateNetworkParams {
            name: payload.name,
            cidr,
            vlan_id: payload.vlan_id,
            gateway: payload.gateway.as_deref().and_then(|g| g.parse().ok()),
            dns_servers: payload.dns_servers.as_ref().map(|s| {
                s.split(',')
                    .filter_map(|ip| ip.trim().parse().ok())
                    .collect()
            }),
            description: payload.description,
        })
    }

    /// Create a network with validation
    pub async fn create(db: &Db, payload: CreateNetworkPayload) -> Result<Uuid> {
        // 1. Validate input
        validation::validate_name(&payload.name, "Network name", 50)?;
        validation::validate_cidr(&payload.cidr)?;

        // 2. Convert and parse
        let params = Self::into_params(payload)?;

        // 3. Create network
        db.create_network(params).await
    }

    pub async fn update(db: &Db, id: Uuid, payload: CreateNetworkPayload) -> Result<bool> {
        validation::validate_name(&payload.name, "Network name", 50)?;
        validation::validate_cidr(&payload.cidr)?;

        let params = Self::into_params(payload)?;

        db.update_network(id, params).await
    }

    pub async fn delete(db: &Db, id: Uuid) -> Result<()> {
        db.delete_network(id).await?;
        Ok(())
    }

    pub async fn list(db: &Db) -> Result<Vec<Network>> {
        db.list_networks().await
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_network_validation() {
        // Future: add tests with test database
    }
}

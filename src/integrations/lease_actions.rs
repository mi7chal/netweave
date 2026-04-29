use super::create_provider;
use crate::entities::integrations;
use crate::AppState;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

#[derive(Debug, Clone, Copy)]
enum LeaseAction {
    Push,
    Delete,
}

async fn trigger_static_lease_action(
    state: &AppState,
    action: LeaseAction,
    mac: &str,
    ip: &str,
    hostname: &str,
) {
    let active_integrations = match integrations::Entity::find()
        .filter(integrations::Column::Status.eq("ACTIVE"))
        .all(&state.db.conn)
        .await
    {
        Ok(list) => list,
        Err(error) => {
            tracing::error!("Failed to query active integrations: {}", error);
            return;
        }
    };

    for model in active_integrations {
        let provider = match create_provider(&model) {
            Ok(provider) => provider,
            Err(_) => continue,
        };

        let result = match action {
            LeaseAction::Push => provider.push_static_lease(mac, ip, hostname).await,
            LeaseAction::Delete => provider.delete_static_lease(mac, ip, hostname).await,
        };

        if let Err(error) = result {
            tracing::error!(
                "Failed to {:?} static lease for integration {}: {}",
                action,
                model.name,
                error
            );
        }
    }
}

pub async fn trigger_static_lease_push(state: &AppState, mac: &str, ip: &str, hostname: &str) {
    trigger_static_lease_action(state, LeaseAction::Push, mac, ip, hostname).await;
}

pub async fn trigger_static_lease_delete(state: &AppState, mac: &str, ip: &str, hostname: &str) {
    trigger_static_lease_action(state, LeaseAction::Delete, mac, ip, hostname).await;
}

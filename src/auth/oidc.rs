use anyhow::Result;
use openidconnect::core::{CoreClient, CoreProviderMetadata, CoreResponseType};
use openidconnect::reqwest::async_http_client;
use openidconnect::{ClientId, ClientSecret, IssuerUrl, RedirectUrl, Scope, TokenResponse};
use std::env;

#[derive(Clone)]
pub struct OidcService {
    client: CoreClient,
}

impl OidcService {
    pub async fn from_env() -> Result<Self> {
        let issuer_url = IssuerUrl::new(env::var("OIDC_ISSUER")?)?;
        let client_id = ClientId::new(env::var("OIDC_CLIENT_ID")?);
        let client_secret = ClientSecret::new(env::var("OIDC_CLIENT_SECRET")?);
        let redirect_url = RedirectUrl::new(env::var("OIDC_REDIRECT_URL")?)?;

        // Discover provider metadata
        let provider_metadata =
            CoreProviderMetadata::discover_async(issuer_url, async_http_client).await?;

        // Create client
        let client =
            CoreClient::from_provider_metadata(provider_metadata, client_id, Some(client_secret))
                .set_redirect_uri(redirect_url);

        Ok(Self { client })
    }

    pub fn get_authorization_url(
        &self,
    ) -> (
        openidconnect::url::Url,
        openidconnect::CsrfToken,
        openidconnect::Nonce,
    ) {
        self.client
            .authorize_url(
                openidconnect::AuthenticationFlow::<CoreResponseType>::AuthorizationCode,
                openidconnect::CsrfToken::new_random,
                openidconnect::Nonce::new_random,
            )
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .add_scope(Scope::new("openid".to_string()))
            // Add groups scope if needed for RBAC
            // .add_scope(Scope::new("groups".to_string()))
            .url()
    }

    pub async fn exchange_code(
        &self,
        code: String,
    ) -> Result<(
        openidconnect::core::CoreIdTokenClaims,
        openidconnect::core::CoreIdToken,
    )> {
        let token_response = self
            .client
            .exchange_code(openidconnect::AuthorizationCode::new(code))
            .request_async(async_http_client)
            .await?;

        let id_token = token_response
            .id_token()
            .ok_or_else(|| anyhow::anyhow!("Server did not return an ID token"))?;

        let claims = id_token.claims(
            &self.client.id_token_verifier(),
            &openidconnect::Nonce::new_random(),
        )?;

        Ok((claims.clone(), id_token.clone()))
    }
}

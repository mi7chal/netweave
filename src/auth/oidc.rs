use crate::config::OidcConfig;
use anyhow::Result;
use openidconnect::core::{CoreClient, CoreProviderMetadata, CoreResponseType};
use openidconnect::reqwest::async_http_client;
use openidconnect::{
    AuthorizationCode, ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce, RedirectUrl, Scope, TokenResponse,
};

#[derive(Clone)]
pub struct OidcService {
    client: CoreClient,
}

impl OidcService {
    pub async fn from_config(config: &OidcConfig) -> Result<Self> {
        let mut issuer_str = config.discovery_url.clone();
        if issuer_str.ends_with(".well-known/openid-configuration") {
            issuer_str = issuer_str.strip_suffix(".well-known/openid-configuration").unwrap().to_string();
        }
        if issuer_str.ends_with(".well-known/openid-configuration/") {
            issuer_str = issuer_str.strip_suffix(".well-known/openid-configuration/").unwrap().to_string();
        }
        // openidconnect-rs often requires a trailing slash for authentik issuers.
        if !issuer_str.ends_with('/') {
            issuer_str.push('/');
        }
        
        let issuer_url = IssuerUrl::new(issuer_str)?;
        let client_id = ClientId::new(config.client_id.clone());
        let client_secret = ClientSecret::new(config.client_secret.clone());
        let redirect_url = RedirectUrl::new(config.redirect_uri.clone())?;

        // Discover provider metadata, this automatically fetches the JWK set for signature verification
        let provider = CoreProviderMetadata::discover_async(issuer_url, async_http_client).await?;
        
        let client = CoreClient::from_provider_metadata(provider, client_id, Some(client_secret))
            .set_redirect_uri(redirect_url);

        Ok(Self { client })
    }

    pub fn authorization_url(&self) -> (openidconnect::url::Url, CsrfToken, Nonce) {
        self.client
            .authorize_url(
                openidconnect::AuthenticationFlow::<CoreResponseType>::AuthorizationCode,
                CsrfToken::new_random,
                Nonce::new_random,
            )
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .url()
    }

    pub async fn exchange_code(
        &self,
        code: String,
        nonce: &Nonce,
    ) -> Result<(
        openidconnect::core::CoreIdTokenClaims,
        openidconnect::core::CoreIdToken,
    )> {
        let token = self
            .client
            .exchange_code(AuthorizationCode::new(code))
            .request_async(async_http_client)
            .await?;

        let id_token = token
            .id_token()
            .ok_or_else(|| anyhow::anyhow!("Server did not return an ID token"))?;

        let claims = id_token.claims(&self.client.id_token_verifier(), nonce)?;
        Ok((claims.clone(), id_token.clone()))
    }
}

use anyhow::Result;
use openidconnect::core::{CoreClient, CoreProviderMetadata, CoreResponseType};
use openidconnect::reqwest::async_http_client;
use openidconnect::{
    AuthorizationCode, ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce, RedirectUrl, Scope,
    TokenResponse,
};
use std::env;

#[derive(Clone)]
pub struct OidcService {
    client: CoreClient,
}

impl OidcService {
    /// Initialize from env. Only requires `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`.
    /// `OIDC_REDIRECT_URL` is optional — auto-derived from `PORT` if not set.
    pub async fn from_env() -> Result<Self> {
        let issuer_url = IssuerUrl::new(env::var("OIDC_ISSUER")?)?;
        let client_id = ClientId::new(env::var("OIDC_CLIENT_ID")?);
        let client_secret = ClientSecret::new(env::var("OIDC_CLIENT_SECRET")?);

        let redirect_url = match env::var("OIDC_REDIRECT_URL") {
            Ok(url) => RedirectUrl::new(url)?,
            Err(_) => {
                let port = env::var("PORT").unwrap_or_else(|_| "8789".to_string());
                RedirectUrl::new(format!("http://localhost:{port}/auth/callback"))?
            }
        };

        // OpenID Connect Discovery
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
        let token = self.client
            .exchange_code(AuthorizationCode::new(code))
            .request_async(async_http_client)
            .await?;

        let id_token = token.id_token()
            .ok_or_else(|| anyhow::anyhow!("Server did not return an ID token"))?;

        let claims = id_token.claims(&self.client.id_token_verifier(), nonce)?;
        Ok((claims.clone(), id_token.clone()))
    }
}

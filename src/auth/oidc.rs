use crate::config::OidcConfig;
use anyhow::Result;
use openidconnect::core::{CoreClient, CoreProviderMetadata, CoreResponseType};
use openidconnect::reqwest;
use openidconnect::{
    AuthorizationCode, ClientId, ClientSecret, CsrfToken, EndpointMaybeSet, EndpointNotSet,
    EndpointSet, IssuerUrl, Nonce, RedirectUrl, Scope,
};

#[derive(Clone)]
pub struct OidcService {
    client: CoreClient<
        EndpointSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointMaybeSet,
        EndpointMaybeSet,
    >,
    http_client: reqwest::Client,
}

impl OidcService {
    pub async fn from_config(config: &OidcConfig) -> Result<Self> {
        // config.rs normalizes discovery_url to end with /.well-known/openid-configuration.
        // The openidconnect crate needs the issuer base URL (without the well-known path).
        let issuer_str = config
            .discovery_url
            .trim_end_matches(".well-known/openid-configuration")
            .trim_end_matches('/');
        // openidconnect-rs often requires a trailing slash for authentik issuers.
        let issuer_str = format!("{issuer_str}/");

        let issuer_url = IssuerUrl::new(issuer_str)?;
        let client_id = ClientId::new(config.client_id.clone());
        let client_secret = ClientSecret::new(config.client_secret.clone());
        let redirect_url = RedirectUrl::new(config.redirect_uri.clone())?;
        let http_client = reqwest::ClientBuilder::new()
            // Prevent SSRF vectors through automatic redirect following.
            .redirect(reqwest::redirect::Policy::none())
            .build()?;

        // Discover provider metadata, this automatically fetches the JWK set for signature verification
        let provider = CoreProviderMetadata::discover_async(issuer_url, &http_client).await?;

        let client = CoreClient::from_provider_metadata(provider, client_id, Some(client_secret))
            .set_redirect_uri(redirect_url);

        Ok(Self {
            client,
            http_client,
        })
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
            .map_err(|e| anyhow::anyhow!("OIDC configuration error: {e}"))?
            .request_async(&self.http_client)
            .await?;

        let id_token = token
            .extra_fields()
            .id_token()
            .ok_or_else(|| anyhow::anyhow!("Server did not return an ID token"))?;

        let claims = id_token.claims(&self.client.id_token_verifier(), nonce)?;
        Ok((claims.clone(), id_token.clone()))
    }
}

//! Application configuration management.

use anyhow::{Context, Result};
use rand::RngCore;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub port: u16,
    pub session_secret: String,
    pub session_secure_cookie: bool,
    pub allowed_origins: Vec<String>,
    pub rust_log: String,
    pub oidc_enabled: bool,
    pub oidc_config: Option<OidcConfig>,
}

#[derive(Debug, Clone)]
pub struct OidcConfig {
    pub client_id: String,
    pub client_secret: String,
    pub discovery_url: String,
    pub redirect_uri: String,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        let database_url = env::var("DATABASE_URL").context("DATABASE_URL must be set")?;

        let port = env::var("SERVER_PORT")
            .unwrap_or_else(|_| "8789".to_string())
            .parse::<u16>()
            .context("SERVER_PORT must be a valid u16")?;

        let session_secret = env::var("SESSION_SECRET").unwrap_or_else(|_| {
            tracing::warn!(
                "SESSION_SECRET not set, generating a temporary random key. Logins will be lost on restart!"
            );
            generate_session_secret()
        });

        let session_secure_cookie = env::var("SESSION_SECURE_COOKIE")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);

        let allowed_origins = env::var("ALLOWED_ORIGINS")
            .unwrap_or_default()
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.trim().to_string())
            .collect();

        let rust_log = env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string());

        let oidc_enabled = env::var("OIDC_CLIENT_ID").is_ok();
        let oidc_config = if oidc_enabled {
            Some(OidcConfig {
                client_id: env::var("OIDC_CLIENT_ID")
                    .context("OIDC_CLIENT_ID required when OIDC is enabled")?,
                client_secret: env::var("OIDC_CLIENT_SECRET")
                    .context("OIDC_CLIENT_SECRET required when OIDC is enabled")?,
                discovery_url: {
                    let mut url = env::var("OIDC_CONFIGURATION_URL")
                        .or_else(|_| env::var("OIDC_ISSUER"))
                        .context("OIDC_CONFIGURATION_URL or OIDC_ISSUER required when OIDC is enabled")?;
                    
                    if !url.ends_with("openid-configuration") {
                        if !url.ends_with('/') {
                            url.push('/');
                        }
                        url.push_str(".well-known/openid-configuration");
                    }
                    url
                },
                redirect_uri: env::var("OIDC_REDIRECT_URL")
                    .context("OIDC_REDIRECT_URL required when OIDC is enabled")?,
            })
        } else {
            None
        };

        Ok(Self {
            database_url,
            port,
            session_secret,
            session_secure_cookie,
            allowed_origins,
            rust_log,
            oidc_enabled,
            oidc_config,
        })
    }
}

fn generate_session_secret() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_from_env() {
        env::set_var("DATABASE_URL", "postgres://localhost");
        env::set_var("SERVER_PORT", "8789");

        let config = Config::from_env().expect("Failed to load config");
        assert_eq!(config.port, 8789);
        assert_eq!(config.database_url, "postgres://localhost");
    }

    #[test]
    fn test_config_invalid_port() {
        env::set_var("DATABASE_URL", "postgres://localhost");
        env::set_var("SERVER_PORT", "invalid");

        let result = Config::from_env();
        assert!(result.is_err());
    }
}

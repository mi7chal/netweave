//! Application configuration management.

use anyhow::{anyhow, Context, Result};
use rand::RngCore;
use std::env;

/// General config struct. Can be passed as argument in order tu use it in the whole app.
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

/// General oidc config.
#[derive(Debug, Clone)]
pub struct OidcConfig {
    pub client_id: String,
    pub client_secret: String,
    pub discovery_url: String,
    pub redirect_uri: String,
}

impl Config {
    fn read_env_any(keys: &[&str]) -> Option<String> {
        keys.iter()
            .find_map(|key| env::var(key).ok())
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    }

    fn normalize_oidc_discovery_url(raw: &str) -> Result<String> {
        let mut url = raw.trim().to_string();
        if !(url.starts_with("http://") || url.starts_with("https://")) {
            return Err(anyhow!(
                "OIDC discovery/issuer URL must start with http:// or https://"
            ));
        }

        if !url.ends_with("/.well-known/openid-configuration")
            && !url.ends_with(".well-known/openid-configuration")
        {
            if !url.ends_with('/') {
                url.push('/');
            }
            url.push_str(".well-known/openid-configuration");
        }
        Ok(url)
    }

    /// Load configuration from environment variables
    ///
    /// For now loading is manual, because it is simpler to implement but it should
    /// be optimized later.
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

        let oidc_client_id = Self::read_env_any(&["OIDC_CLIENT_ID"]);
        let oidc_enabled = oidc_client_id.is_some();
        let oidc_config = if oidc_enabled {
            let discovery_input =
                Self::read_env_any(&["OIDC_CONFIGURATION_URL", "OIDC_DISCOVERY_URL", "OIDC_ISSUER"])
                    .context(
                        "OIDC_CONFIGURATION_URL / OIDC_DISCOVERY_URL / OIDC_ISSUER required when OIDC is enabled",
                    )?;

            Some(OidcConfig {
                client_id: oidc_client_id
                    .context("OIDC_CLIENT_ID required when OIDC is enabled")?,
                client_secret: Self::read_env_any(&["OIDC_CLIENT_SECRET", "OIDC_SECRET"])
                    .context("OIDC_CLIENT_SECRET (or OIDC_SECRET) required when OIDC is enabled")?,
                discovery_url: Self::normalize_oidc_discovery_url(&discovery_input)?,
                redirect_uri: Self::read_env_any(&["OIDC_REDIRECT_URL", "OIDC_REDIRECT_URI"])
                    .context(
                        "OIDC_REDIRECT_URL (or OIDC_REDIRECT_URI) required when OIDC is enabled",
                    )?,
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

/// Session secret spare generator.
fn generate_session_secret() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn clear_oidc_env() {
        env::remove_var("OIDC_CLIENT_ID");
        env::remove_var("OIDC_CLIENT_SECRET");
        env::remove_var("OIDC_SECRET");
        env::remove_var("OIDC_CONFIGURATION_URL");
        env::remove_var("OIDC_DISCOVERY_URL");
        env::remove_var("OIDC_ISSUER");
        env::remove_var("OIDC_REDIRECT_URL");
        env::remove_var("OIDC_REDIRECT_URI");
    }

    #[test]
    fn test_config_from_env() {
        let _guard = ENV_LOCK.lock().expect("ENV_LOCK poisoned");
        env::set_var("DATABASE_URL", "postgres://localhost");
        env::set_var("SERVER_PORT", "8789");

        let config = Config::from_env().expect("Failed to load config");
        assert_eq!(config.port, 8789);
        assert_eq!(config.database_url, "postgres://localhost");
    }

    #[test]
    fn test_config_invalid_port() {
        let _guard = ENV_LOCK.lock().expect("ENV_LOCK poisoned");
        env::set_var("DATABASE_URL", "postgres://localhost");
        env::set_var("SERVER_PORT", "invalid");

        let result = Config::from_env();
        assert!(result.is_err());
    }

    #[test]
    fn test_oidc_aliases_are_supported() {
        let _guard = ENV_LOCK.lock().expect("ENV_LOCK poisoned");
        clear_oidc_env();
        env::set_var("DATABASE_URL", "postgres://localhost");
        env::set_var("OIDC_CLIENT_ID", "netweave");
        env::set_var("OIDC_SECRET", "secret-from-alias");
        env::set_var("OIDC_DISCOVERY_URL", "https://auth.example.com");
        env::set_var("OIDC_REDIRECT_URI", "http://localhost:8789/auth/callback");

        let config = Config::from_env().expect("Failed to load config");
        let oidc = config.oidc_config.expect("OIDC should be enabled");

        assert_eq!(oidc.client_id, "netweave");
        assert_eq!(oidc.client_secret, "secret-from-alias");
        assert_eq!(
            oidc.discovery_url,
            "https://auth.example.com/.well-known/openid-configuration"
        );
        assert_eq!(oidc.redirect_uri, "http://localhost:8789/auth/callback");
    }

    #[test]
    fn test_oidc_issuer_gets_normalized_to_discovery_url() {
        let _guard = ENV_LOCK.lock().expect("ENV_LOCK poisoned");
        clear_oidc_env();
        env::set_var("DATABASE_URL", "postgres://localhost");
        env::set_var("OIDC_CLIENT_ID", "netweave");
        env::set_var("OIDC_CLIENT_SECRET", "super-secret");
        env::set_var("OIDC_ISSUER", "https://issuer.example.com/");
        env::set_var("OIDC_REDIRECT_URL", "http://localhost:8789/auth/callback");

        let config = Config::from_env().expect("Failed to load config");
        let oidc = config.oidc_config.expect("OIDC should be enabled");
        assert_eq!(
            oidc.discovery_url,
            "https://issuer.example.com/.well-known/openid-configuration"
        );
    }
}

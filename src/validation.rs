//! Centralized validation module for domain objects.

use anyhow::{anyhow, Result};
use serde::{Deserialize, Deserializer};
use serde_json::Value;

// SECTION: Common deserializers

/// Deserialize checkbox-like values ("on", "true", "1") to boolean.
/// Project uses libraries so it's easier to just use this function
pub fn deserialize_checkbox<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    Ok(matches!(s.as_str(), "on" | "true" | "1"))
}

/// Deserialize empty strings as None for optional fields
pub fn deserialize_optional_string<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    let v: Option<Value> = Option::deserialize(deserializer)?;
    match v {
        Some(Value::String(s)) if !s.is_empty() => {
            T::from_str(&s).map(Some).map_err(serde::de::Error::custom)
        }
        Some(Value::Number(n)) => T::from_str(&n.to_string())
            .map(Some)
            .map_err(serde::de::Error::custom),
        _ => Ok(None),
    }
}

// SECTION: Domain validators

/// Validate hostname format (RFC 1123 simplified)
pub fn validate_hostname(hostname: &str) -> Result<()> {
    if hostname.is_empty() {
        return Err(anyhow!("Hostname cannot be empty"));
    }
    if hostname.len() > 100 {
        return Err(anyhow!("Hostname too long (max 100 chars)"));
    }
    // RFC 1123 simplified check: alphanumeric, hyphens, dots
    if !hostname
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '.')
    {
        return Err(anyhow!("Hostname contains invalid characters"));
    }
    Ok(())
}

/// Validate generic name field with max length
pub fn validate_name(name: &str, field: &str, max_len: usize) -> Result<()> {
    if name.is_empty() {
        return Err(anyhow!("{} cannot be empty", field));
    }
    if name.len() > max_len {
        return Err(anyhow!("{} too long (max {} chars)", field, max_len));
    }
    Ok(())
}

/// Validate CIDR notation
pub fn validate_cidr(cidr: &str) -> Result<()> {
    // Parse and validate CIDR notation
    cidr.parse::<ipnetwork::IpNetwork>()
        .map_err(|_| anyhow!("Invalid CIDR notation"))?;
    Ok(())
}

/// Validate URL format
pub fn validate_url(url: &str) -> Result<()> {
    if url.is_empty() {
        return Err(anyhow!("URL cannot be empty"));
    }
    if url.len() > 2048 {
        return Err(anyhow!("URL too long (max 2048 chars)"));
    }
    // Basic URL validation - must start with http/https
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(anyhow!("URL must start with http:// or https://"));
    }
    // Basic validation without external URL parsing crate
    // More thorough validation can be added later
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_hostname_valid() {
        assert!(validate_hostname("server-1.lab").is_ok());
        assert!(validate_hostname("proxy").is_ok());
    }

    #[test]
    fn test_validate_hostname_invalid_chars() {
        assert!(validate_hostname("server_1").is_err());
        assert!(validate_hostname("server@host").is_err());
    }

    #[test]
    fn test_validate_hostname_empty() {
        assert!(validate_hostname("").is_err());
    }

    #[test]
    fn test_validate_hostname_too_long() {
        let long = "a".repeat(101);
        assert!(validate_hostname(&long).is_err());
    }

    #[test]
    fn test_validate_cidr_valid() {
        assert!(validate_cidr("192.168.1.0/24").is_ok());
        assert!(validate_cidr("10.0.0.0/8").is_ok());
    }

    #[test]
    fn test_validate_cidr_invalid() {
        assert!(validate_cidr("999.999.999.999/32").is_err());
        assert!(validate_cidr("invalid").is_err());
    }

    #[test]
    fn test_validate_name_valid() {
        assert!(validate_name("test", "Field", 100).is_ok());
    }

    #[test]
    fn test_validate_name_empty() {
        assert!(validate_name("", "Field", 100).is_err());
    }

    #[test]
    fn test_validate_name_too_long() {
        let long = "a".repeat(101);
        assert!(validate_name(&long, "Field", 100).is_err());
    }
}

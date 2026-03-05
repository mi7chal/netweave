/// Validates a hostname (device, service, etc.).
pub fn validate_hostname(hostname: &str) -> Result<(), String> {
    if hostname.is_empty() {
        return Err("Hostname cannot be empty".into());
    }
    if hostname.len() > 100 {
        return Err("Hostname must be at most 100 characters".into());
    }
    if !hostname
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '.' || c == '_')
    {
        return Err("Hostname contains invalid characters (allowed: alphanumeric, - . _)".into());
    }
    Ok(())
}

/// Validates a resource name (network name, integration name, etc.).
pub fn validate_name(value: &str, field: &str, max_len: usize) -> Result<(), String> {
    if value.is_empty() {
        return Err(format!("{field} cannot be empty"));
    }
    if value.len() > max_len {
        return Err(format!("{field} must be at most {max_len} characters"));
    }
    Ok(())
}

/// Validates a URL string.
pub fn validate_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("URL cannot be empty".into());
    }
    if url.len() > 2048 {
        return Err("URL must be at most 2048 characters".into());
    }
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL must start with http:// or https://".into());
    }
    Ok(())
}


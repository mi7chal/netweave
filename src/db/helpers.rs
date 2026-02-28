//! Database helper functions to avoid repeated patterns and unwraps.

use anyhow::Result;
use std::net::IpAddr;

/// Converts a host IP address to an IpNetwork with /32 (v4) or /128 (v6) prefix.
/// Replaces the repeated `IpNetwork::new(ip, ...).unwrap()` pattern.
pub fn ip_to_network(ip: IpAddr) -> Result<ipnetwork::IpNetwork> {
    let prefix = if ip.is_ipv4() { 32 } else { 128 };
    ipnetwork::IpNetwork::new(ip, prefix).map_err(|e| anyhow::anyhow!("invalid host network: {}", e))
}

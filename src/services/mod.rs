//! Service layer: business logic extracted from handlers.

pub mod devices;
pub mod integration_service;
pub mod ip_service;
pub mod ips;
pub mod networks;
#[allow(clippy::module_inception)]
pub mod services;

// Re-exports for convenience
pub use devices::DeviceService;
pub use ips::IpService;
pub use networks::NetworkService;
pub use services::ServiceService;

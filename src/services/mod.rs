//! Service layer: business logic extracted from handlers.

pub mod devices;
pub mod networks;
pub mod ips;
#[allow(clippy::module_inception)]
pub mod services;
pub mod ip_service;
pub mod integration_service;

// Re-exports for convenience
pub use devices::DeviceService;
pub use networks::NetworkService;
pub use ips::IpService;
pub use services::ServiceService;

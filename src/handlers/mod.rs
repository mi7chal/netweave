/// Module for `HTTP` requests. This modules contains basically copy-paste copies of
/// `handlers`, which implements CRUD operations.
pub mod common;
pub mod dashboard;
pub mod devices;
pub mod ips;
pub mod networks;
pub mod services;

// re-expors
pub use dashboard::*;
pub use devices::*;
pub use ips::*;
pub use networks::*;
pub use services::*;

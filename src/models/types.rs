use sea_orm::sea_query::{ArrayType, ColumnType, Nullable, ValueType, ValueTypeErr};
use sea_orm::{DbErr, DeriveActiveEnum, EnumIter, TryGetError, Value};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

/// SeaORM-compatible wrapper for PostgreSQL native `MACADDR` columns.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct MacAddress(pub mac_address::MacAddress);

impl fmt::Display for MacAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<MacAddress> for Value {
    fn from(val: MacAddress) -> Self {
        Value::String(Some(Box::new(val.0.to_string())))
    }
}

impl sea_orm::TryGetable for MacAddress {
    fn try_get_by<I: sea_orm::ColIdx>(
        res: &sea_orm::QueryResult,
        index: I,
    ) -> Result<Self, TryGetError> {
        let val: Option<String> = res.try_get_by(index)?;
        match val {
            Some(v) => mac_address::MacAddress::from_str(&v)
                .map(MacAddress)
                .map_err(|e| TryGetError::DbErr(DbErr::Type(format!("Invalid MAC: {e}")))),
            None => Err(TryGetError::Null("mac_address".to_string())),
        }
    }
}

impl ValueType for MacAddress {
    fn try_from(v: Value) -> Result<Self, ValueTypeErr> {
        match v {
            Value::String(Some(s)) => mac_address::MacAddress::from_str(&s)
                .map(MacAddress)
                .map_err(|_| ValueTypeErr),
            _ => Err(ValueTypeErr),
        }
    }

    fn type_name() -> String {
        "MacAddress".to_owned()
    }
    fn array_type() -> ArrayType {
        ArrayType::String
    }
    fn column_type() -> ColumnType {
        ColumnType::custom("macaddr")
    }
}

impl Nullable for MacAddress {
    fn null() -> Value {
        Value::String(None)
    }
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DeviceType {
    Physical,
    Vm,
    Lxc,
    Container,
    Switch,
    Ap,
    Router,
    #[default]
    Other,
}

impl fmt::Display for DeviceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl From<&str> for DeviceType {
    fn from(s: &str) -> Self {
        match s {
            "PHYSICAL" => Self::Physical,
            "VM" => Self::Vm,
            "LXC" => Self::Lxc,
            "CONTAINER" => Self::Container,
            "SWITCH" => Self::Switch,
            "AP" => Self::Ap,
            "ROUTER" => Self::Router,
            "OTHER" => Self::Other,
            _ => Self::Physical,
        }
    }
}

#[derive(
    Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, EnumIter, DeriveActiveEnum,
)]
#[sea_orm(
    rs_type = "String",
    db_type = "Text",
    rename_all = "SCREAMING_SNAKE_CASE"
)]
pub enum IpStatus {
    #[sea_orm(string_value = "ACTIVE")]
    #[default]
    Active,
    #[sea_orm(string_value = "RESERVED")]
    Reserved,
    #[sea_orm(string_value = "DHCP")]
    Dhcp,
    #[sea_orm(string_value = "DEPRECATED")]
    Deprecated,
    #[sea_orm(string_value = "FREE")]
    Free,
}

impl fmt::Display for IpStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl FromStr for IpStatus {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ACTIVE" => Ok(Self::Active),
            "RESERVED" => Ok(Self::Reserved),
            "DHCP" => Ok(Self::Dhcp),
            "DEPRECATED" => Ok(Self::Deprecated),
            "FREE" => Ok(Self::Free),
            _ => Err(()),
        }
    }
}

/// Parse an optional MAC address string, treating empty strings as None.
pub fn parse_optional_mac(s: &Option<String>) -> Option<mac_address::MacAddress> {
    s.as_ref()
        .filter(|m| !m.is_empty())
        .and_then(|m| mac_address::MacAddress::from_str(m).ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn device_type_from_str_known_variants() {
        assert_eq!(DeviceType::from("PHYSICAL"), DeviceType::Physical);
        assert_eq!(DeviceType::from("VM"), DeviceType::Vm);
        assert_eq!(DeviceType::from("LXC"), DeviceType::Lxc);
        assert_eq!(DeviceType::from("CONTAINER"), DeviceType::Container);
        assert_eq!(DeviceType::from("SWITCH"), DeviceType::Switch);
        assert_eq!(DeviceType::from("AP"), DeviceType::Ap);
        assert_eq!(DeviceType::from("ROUTER"), DeviceType::Router);
    }

    #[test]
    fn device_type_unknown_falls_back_to_physical() {
        assert_eq!(DeviceType::from("UNKNOWN"), DeviceType::Physical);
        assert_eq!(DeviceType::from(""), DeviceType::Physical);
        assert_eq!(DeviceType::from("random"), DeviceType::Physical);
    }

    #[test]
    fn device_type_default_is_other() {
        assert_eq!(DeviceType::default(), DeviceType::Other);
    }

    #[test]
    fn device_type_display() {
        assert_eq!(DeviceType::Physical.to_string(), "Physical");
        assert_eq!(DeviceType::Router.to_string(), "Router");
    }

    #[test]
    fn device_type_serde_roundtrip() {
        let dt = DeviceType::Physical;
        let json = serde_json::to_string(&dt).unwrap();
        let parsed: DeviceType = serde_json::from_str(&json).unwrap();
        assert_eq!(dt, parsed);
    }

    #[test]
    fn ip_status_default_is_active() {
        assert_eq!(IpStatus::default(), IpStatus::Active);
    }

    #[test]
    fn ip_status_display() {
        assert_eq!(IpStatus::Active.to_string(), "Active");
        assert_eq!(IpStatus::Dhcp.to_string(), "Dhcp");
        assert_eq!(IpStatus::Free.to_string(), "Free");
    }

    #[test]
    fn ip_status_serde_roundtrip() {
        for status in [
            IpStatus::Active,
            IpStatus::Reserved,
            IpStatus::Dhcp,
            IpStatus::Deprecated,
            IpStatus::Free,
        ] {
            let json = serde_json::to_string(&status).unwrap();
            let parsed: IpStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(status, parsed);
        }
    }

    #[test]
    fn mac_address_display() {
        let mac = MacAddress(mac_address::MacAddress::new([
            0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF,
        ]));
        let s = mac.to_string().to_uppercase();
        assert!(s.contains("AA"));
    }

    #[test]
    fn mac_address_serde_roundtrip() {
        let mac = MacAddress(mac_address::MacAddress::new([
            0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
        ]));
        let json = serde_json::to_string(&mac).unwrap();
        let parsed: MacAddress = serde_json::from_str(&json).unwrap();
        assert_eq!(mac, parsed);
    }
}

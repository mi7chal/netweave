use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use sea_orm::{TryGetError, Value, DbErr, EnumIter, DeriveActiveEnum};
use sea_orm::sea_query::{ColumnType, ValueType, ValueTypeErr, Nullable, ArrayType};

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
    fn try_get_by<I: sea_orm::ColIdx>(res: &sea_orm::QueryResult, index: I) -> Result<Self, TryGetError> {
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
            Value::String(Some(s)) => mac_address::MacAddress::from_str(&s).map(MacAddress).map_err(|_| ValueTypeErr),
            _ => Err(ValueTypeErr),
        }
    }

    fn type_name() -> String { "MacAddress".to_owned() }
    fn array_type() -> ArrayType { ArrayType::String }
    fn column_type() -> ColumnType { ColumnType::custom("macaddr") }
}

impl Nullable for MacAddress {
    fn null() -> Value { Value::String(None) }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DeviceType {
    Physical,
    Vm,
    Lxc,
    Container,
    Switch,
    Ap,
    Router,
    Other,
}

impl fmt::Display for DeviceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl Default for DeviceType {
    fn default() -> Self {
        Self::Other
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
            _ => Self::Other,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, EnumIter, DeriveActiveEnum)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
#[sea_orm(rs_type = "String", db_type = "Text", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IpStatus {
    #[sea_orm(string_value = "ACTIVE")]
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

impl Default for IpStatus {
    fn default() -> Self {
        Self::Active
    }
}

impl fmt::Display for IpStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

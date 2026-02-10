use serde::{Deserialize, Serialize};
use std::fmt;
use sea_orm::entity::prelude::*;
use sea_orm::{TryGetable, TryGetError, Value, QueryResult, DbErr, RuntimeErr};
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct MacAddress(pub mac_address::MacAddress);

impl sea_orm::sea_query::Nullable for MacAddress {
    fn null() -> Value {
        Value::String(None)
    }
}

impl From<MacAddress> for Value {
    fn from(m: MacAddress) -> Self {
        Value::String(Some(Box::new(m.0.to_string())))
    }
}

impl sea_orm::TryGetable for MacAddress {
    fn try_get_by<I: sea_orm::ColIdx>(res: &QueryResult, idx: I) -> Result<Self, TryGetError> {
        let s = String::try_get_by(res, idx)?;
        let val = mac_address::MacAddress::from_str(&s).map_err(|_| {
            TryGetError::DbErr(DbErr::Type(format!("Failed to parse MacAddress from string: {}", s)))
        })?;
        Ok(MacAddress(val))
    }
}

impl sea_orm::sea_query::ValueType for MacAddress {
    fn try_from(v: Value) -> Result<Self, sea_orm::sea_query::ValueTypeErr> {
         match v {
            Value::String(Some(s)) => {
                let m = mac_address::MacAddress::from_str(&s).map_err(|_| sea_orm::sea_query::ValueTypeErr)?;
                Ok(MacAddress(m))
            },
            _ => Err(sea_orm::sea_query::ValueTypeErr),
        }
    }

    fn type_name() -> String {
        "MacAddress".to_owned()
    }
    
    fn array_type() -> sea_orm::sea_query::ArrayType {
         sea_orm::sea_query::ArrayType::String
    }

    fn column_type() -> sea_orm::sea_query::ColumnType {
        sea_orm::sea_query::ColumnType::Text
    }
}

// Implement Deref to make accessing the inner MacAddress easier
impl std::ops::Deref for MacAddress {
    type Target = mac_address::MacAddress;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl ToString for MacAddress {
    fn to_string(&self) -> String {
        self.0.to_string()
    }
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IpStatus {
    Active,
    Reserved,
    Dhcp,
    Deprecated,
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

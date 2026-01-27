use super::entities::{DashboardService, Device, DeviceIpView, Interface, Network, NetworkIpView};
use super::types::{DeviceType, IpStatus};
use crate::ui::{CellType, TableDisplay, TableRow};

impl TableDisplay for Network {
    fn table_headers() -> Vec<String> {
        vec![
            "Name".into(),
            "CIDR".into(),
            "VLAN".into(),
            "Gateway".into(),
            "Actions".into(),
        ]
    }

    fn table_row(&self) -> TableRow {
        TableRow {
            cells: vec![
                CellType::Link {
                    text: self.name.clone(),
                    url: format!("/networks/{}", self.id),
                    target_blank: false,
                },
                CellType::Text(self.cidr.to_string()),
                CellType::Text(
                    self.vlan_id
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "-".into()),
                ),
                CellType::Text(
                    self.gateway
                        .map(|g| g.to_string())
                        .unwrap_or_else(|| "-".into()),
                ),
                CellType::Actions {
                    delete_url: format!("/networks/{}", self.id),
                },
            ],
        }
    }
}

impl TableDisplay for Device {
    fn table_headers() -> Vec<String> {
        vec![
            "Hostname".into(),
            "Type".into(),
            "OS".into(),
            "Resources".into(),
            "Actions".into(),
        ]
    }

    fn table_row(&self) -> TableRow {
        let resources = if let (Some(cpu), Some(ram)) = (self.cpu_cores, self.ram_gb) {
            format!("{} vCPU / {} GB", cpu, ram)
        } else {
            "-".to_string()
        };

        let style = match self.device_type {
            DeviceType::Physical => "badge-primary",
            DeviceType::Vm => "badge-secondary",
            DeviceType::Lxc | DeviceType::Container => "badge-accent",
            _ => "badge-ghost",
        };

        TableRow {
            cells: vec![
                CellType::Link {
                    text: self.hostname.clone(),
                    url: format!("/devices/{}", self.id),
                    target_blank: false,
                },
                CellType::Badge {
                    text: format!("{:?}", self.device_type).to_uppercase(),
                    style_class: style.into(),
                },
                CellType::Text(self.os_info.clone().unwrap_or_default()),
                CellType::Text(resources),
                CellType::Actions {
                    delete_url: format!("/devices/{}", self.id),
                },
            ],
        }
    }
}

impl TableDisplay for Interface {
    fn table_headers() -> Vec<String> {
        vec!["Name".into(), "MAC Address".into(), "Type".into()]
    }

    fn table_row(&self) -> TableRow {
        TableRow {
            cells: vec![
                CellType::Text(self.name.clone()),
                CellType::Text(
                    self.mac_address
                        .map(|m| m.to_string())
                        .unwrap_or("-".into()),
                ),
                CellType::Text(self.interface_type.clone().unwrap_or("Physical".into())),
            ],
        }
    }
}

impl TableDisplay for DashboardService {
    fn table_headers() -> Vec<String> {
        vec![
            "Service".into(),
            "Host".into(),
            "Access".into(),
            "".into(),
            "Actions".into(),
        ]
    }

    fn table_row(&self) -> TableRow {
        let is_public = self.is_public;
        TableRow {
            cells: vec![
                CellType::Link {
                    text: self.name.clone(),
                    url: self.base_url.clone(),
                    target_blank: true,
                },
                CellType::Text(self.device_hostname.clone()),
                if is_public {
                    CellType::Badge {
                        text: "Public".into(),
                        style_class: "badge-success".into(),
                    }
                } else {
                    CellType::Badge {
                        text: "Private".into(),
                        style_class: "badge-neutral".into(),
                    }
                },
                CellType::Link {
                    text: "Edit".into(),
                    url: format!("/services/{}/edit", self.id),
                    target_blank: false,
                },
                CellType::Actions {
                    delete_url: format!("/services/{}", self.id),
                },
            ],
        }
    }
}

impl TableDisplay for DeviceIpView {
    fn table_headers() -> Vec<String> {
        vec![
            "IP Address".into(),
            "Interface".into(),
            "Network".into(),
            "Status".into(),
            "MAC".into(),
            "Type".into(),
            "Actions".into(),
        ]
    }

    fn table_row(&self) -> TableRow {
        let network_display =
            if let (Some(name), Some(cidr)) = (&self.network_name, &self.network_cidr) {
                format!("{} ({})", name, cidr)
            } else {
                "-".to_string()
            };

        let status_str = self
            .status
            .map(|s| format!("{:?}", s))
            .unwrap_or_else(|| "-".into());

        let is_static = self.is_static.unwrap_or(false);

        TableRow {
            cells: vec![
                CellType::Text(self.ip_address.to_string()),
                CellType::Text(self.interface_name.clone()),
                CellType::Text(network_display),
                CellType::Badge {
                    text: status_str,
                    style_class: "badge-ghost".into(),
                },
                CellType::Text(
                    self.mac_address
                        .map(|m| m.to_string())
                        .unwrap_or("-".into()),
                ),
                CellType::Badge {
                    text: if is_static {
                        "Static".into()
                    } else {
                        "DHCP".into()
                    },
                    style_class: if is_static {
                        "badge-primary".into()
                    } else {
                        "badge-ghost".into()
                    },
                },
                CellType::Actions {
                    delete_url: format!("/devices/{}/ips/{}", self.device_id, self.id),
                },
            ],
        }
    }
}

impl TableDisplay for NetworkIpView {
    fn table_headers() -> Vec<String> {
        vec![
            "IP Address".into(),
            "MAC".into(),
            "Status".into(),
            "Assigned To".into(),
            "Description".into(),
            "Actions".into(),
        ]
    }

    fn table_row(&self) -> TableRow {
        let status_style = match self.status {
            IpStatus::Active => "badge-success",
            IpStatus::Reserved => "badge-warning",
            IpStatus::Dhcp => "badge-info",
            IpStatus::Deprecated => "badge-error",
            _ => "badge-ghost",
        };

        let assigned_to = if let Some(host) = &self.device_hostname {
            if let Some(iface) = &self.interface_name {
                format!("{} ({})", host, iface)
            } else {
                host.clone()
            }
        } else {
            "-".into()
        };

        TableRow {
            cells: vec![
                CellType::Text(self.ip_address.to_string()),
                CellType::Text(
                    self.mac_address
                        .map(|m| m.to_string())
                        .unwrap_or("-".into()),
                ),
                CellType::Badge {
                    text: format!("{:?}", self.status).to_uppercase(),
                    style_class: status_style.into(),
                },
                CellType::Text(assigned_to),
                CellType::Text(self.description.clone().unwrap_or_default()),
                CellType::Text("".into()),
            ],
        }
    }
}

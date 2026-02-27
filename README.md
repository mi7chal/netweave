# 🌐 NetWeave

**The Lightweight, Modern IPAM & HomeLab Dashboard.**

Built for lightweight and convenient network administration. NetWeave is based on Rust and React — extremely fast, fulfilling all the needs of a modern IPAM and HomeLab dashboard.

---

## ✨ Features

- 🔌 **Dynamic IPAM**: Comprehensive IP Address Management with support for static and dynamic leases.
- 🖥️ **Device Management**: Track all your hardware with MAC address mapping and IP identification.
- 📡 **AdGuard Integration**: Native sync with AdGuard Home for managing DHCP leases and static assignments.
- 🛠️ **Service Monitoring**: Keep an eye on your local services with real-time status checks.
- 🔐 **Authentication**: Username/password and OIDC SSO support with role-based access control.
- ⚙️ **Settings**: Configurable public homepage and application preferences.
- 🚀 **Secure & Fast**: Powered by **Rust** (Axum) for memory safety and high-concurrency performance.

---

## 🚀 Quick Start

### Docker Compose (Recommended)

```yaml
services:
  netweave:
    image: mi7chal/netweave:latest
    container_name: netweave
    environment:
      # You need to provide a valid PostgreSQL connection data
      DATABASE_URL: "postgres://${DATABASE_USER}:${DATABASE_PASSWORD}@db:5432/${DATABASE_NAME}"
      DEFAULT_ADMIN_USER: ${DEFAULT_ADMIN_USER}
      DEFAULT_ADMIN_PASSWORD: ${DEFAULT_ADMIN_PASSWORD}
      RUST_LOG: ${RUST_LOG:-info}
    ports:
      - "5123:5123"
      - "8789:8789"
    restart: unless-stopped

```

---

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | *required* |
| `DEFAULT_ADMIN_USER` | Initial admin username | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | `adminpassword` |
| `RUST_LOG` | Log level (`debug`, `info`, `warn`) | `info` |
| `OIDC_ISSUER` | OIDC provider URL | *optional* |
| `OIDC_CLIENT_ID` | OIDC client ID | *optional* |
| `OIDC_CLIENT_SECRET` | OIDC client secret | *optional* |
| `OIDC_REDIRECT_URL` | OIDC callback URL | *optional* |

---

## 🛠️ Tech Stack

### Backend
- **Core**: [Rust](https://www.rust-lang.org/) / [Axum](https://github.com/tokio-rs/axum)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [SQLx](https://github.com/launchbadge/sqlx) & [SeaORM](https://www.sea-orm.com/)
- **Runtime**: [Tokio](https://tokio.rs/)

### Frontend
- **Framework**: [React](https://reactjs.org/) / [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) / [Shadcn UI](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 🤝 Contributing

NetWeave welcomes all contributions! In order to contribute, please open an issue or a pull request.

---

© 2026 [mi7chal](https://github.com/mi7chal). Distributed under the Apache License 2.0.

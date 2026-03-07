# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-07

### Added

- **IPAM**: Comprehensive IP address management with static/dynamic lease tracking
- **Device Management**: Hardware inventory with MAC address mapping, interfaces, and nested device support
- **Network Management**: Subnet/VLAN management with CIDR validation and gateway configuration
- **Service Monitoring**: Real-time health checks with uptime tracking and configurable intervals
- **AdGuard Integration**: Native sync with AdGuard Home for DHCP lease management
- **Authentication**: Username/password login with bcrypt hashing and session management
- **OIDC SSO**: OpenID Connect support with auto-import and role mapping
- **Role-Based Access Control**: Admin and Viewer roles with middleware-enforced permissions
- **User Management**: Full CRUD for user accounts via admin UI
- **Settings**: Configurable public homepage and application preferences
- **Audit Logging**: Database-level trigger-based audit trail for all entity changes
- **AES-256-GCM Encryption**: Secure storage for service secrets and integration tokens
- **Rate Limiting**: Username-based login rate limiting to prevent brute-force attacks
- **Multi-Arch Docker**: Automated builds for `linux/amd64` and `linux/arm64`
- **CI Pipeline**: GitHub Actions with Rust (fmt, clippy, build, test) and frontend (lint, build)
- **Modern UI**: React + Vite + Tailwind CSS + Shadcn UI with Framer Motion animations

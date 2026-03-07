# Contributing to NetWeave

Thank you for your interest in contributing! All contributions — bug reports, feature requests, docs improvements, and code — are welcome.

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Node.js](https://nodejs.org/) 22+ with [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) & Docker Compose
- [PostgreSQL](https://www.postgresql.org/) 16+ (or use the provided Docker Compose)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/mi7chal/netweave.git
cd netweave

# Copy environment config
cp .env.example .env
# Edit .env with your preferred values

# Start development dependencies (PostgreSQL + pgweb)
docker compose -f compose.dev.yaml up -d

# Run the backend
cargo run

# In a separate terminal, run the frontend
cd web
pnpm install
pnpm dev
```

The backend will be available at `http://localhost:8789` and the frontend dev server at `http://localhost:5173`.

## Code Style

### Rust (Backend)

- Run `cargo fmt` before committing
- Run `cargo clippy -- -D warnings` and fix all warnings
- Write doc comments for public APIs

### TypeScript/React (Frontend)

- Run `pnpm lint` before committing
- Follow existing component patterns and naming conventions

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`
2. **Make your changes** with clear, descriptive commits
3. **Ensure CI passes** — formatting, linting, and builds must succeed
4. **Open a PR** against `main` with a clear description of what and why

## Reporting Bugs

Please use the [Bug Report](https://github.com/mi7chal/netweave/issues/new?template=bug_report.md) issue template.

## Requesting Features

Please use the [Feature Request](https://github.com/mi7chal/netweave/issues/new?template=feature_request.md) issue template.

## Security

If you discover a security vulnerability, please see [SECURITY.md](SECURITY.md) for responsible disclosure instructions. **Do not open a public issue.**

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

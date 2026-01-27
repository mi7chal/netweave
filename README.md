# Homelab network manager and dashboard

## Overview
Homelab manager is a lightweight IPAM and dashboard application written in Rust.


## Docs
Polish academic documentation is available in the [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md).

## Running Locally
In order to run please firstly assure that you have [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html) and [Docker](https://www.docker.com/get-started) installed.

Then run the following commands:

```bash
git clone https://github.com/mi7chal/homelab_manager
cd homelab_manager
cp .env.example .env
docker compose up -d
cargo run
```

It will automatically setup the database and start the server on `http://localhost:8789`. In order to customize the configuration see .env file.

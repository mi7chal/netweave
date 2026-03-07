# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/web

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Install dependencies first (cache layer)
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY web/ ./
RUN pnpm build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM rust:1.94-slim AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Cache dependencies - copy only manifests first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && echo "" > src/lib.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src

# Copy actual source and build
COPY src/ src/
COPY migrations/ migrations/
RUN touch src/main.rs src/lib.rs && cargo build --release

# ============================================
# Stage 3: Runtime
# ============================================
FROM debian:bookworm-slim AS runtime

LABEL org.opencontainers.image.title="NetWeave" \
    org.opencontainers.image.description="Lightweight IPAM & HomeLab Dashboard" \
    org.opencontainers.image.url="https://github.com/mi7chal/netweave" \
    org.opencontainers.image.source="https://github.com/mi7chal/netweave" \
    org.opencontainers.image.licenses="Apache-2.0"

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false netweave

WORKDIR /app

# Copy binary
COPY --from=backend-builder /app/target/release/netweave ./

# Copy frontend dist
COPY --from=frontend-builder /app/web/dist ./web/dist

# Copy migrations
COPY migrations/ ./migrations/

USER netweave

EXPOSE 8789

ENV RUST_LOG=info

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8789/api/auth/check-oidc || exit 1

CMD ["./netweave"]

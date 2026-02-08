# Financoor API Dockerfile
# Multi-stage build for smaller final image

# ============================================
# Stage 1: Build the Rust application
# ============================================
FROM rust:1.83-bookworm AS builder

# Install SP1 toolchain dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install SP1 toolchain
RUN curl -L https://sp1up.dev | bash && \
    ~/.sp1/bin/sp1up

# Set up cargo environment
ENV PATH="/root/.sp1/bin:/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy only dependency files first (for caching)
COPY Cargo.toml Cargo.lock ./
COPY crates/core/Cargo.toml crates/core/
COPY crates/prover/Cargo.toml crates/prover/
COPY crates/api/Cargo.toml crates/api/
COPY crates/tax-zk/Cargo.toml crates/tax-zk/

# Create dummy source files for dependency caching
RUN mkdir -p crates/core/src crates/prover/src crates/api/src crates/tax-zk/src && \
    echo "fn main() {}" > crates/core/src/lib.rs && \
    echo "fn main() {}" > crates/prover/src/lib.rs && \
    echo "fn main() {}" > crates/api/src/main.rs && \
    echo "fn main() {}" > crates/tax-zk/src/main.rs

# Build dependencies only (this layer will be cached)
RUN cargo build --release --package financoor-api 2>/dev/null || true

# Copy actual source code
COPY crates/core crates/core
COPY crates/prover crates/prover
COPY crates/api crates/api
COPY crates/tax-zk crates/tax-zk

# Touch source files to invalidate cache and rebuild
RUN touch crates/*/src/*.rs

# Build the actual application
RUN cargo build --release --package financoor-api

# ============================================
# Stage 2: Runtime image
# ============================================
FROM debian:bookworm-slim AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary
COPY --from=builder /app/target/release/api /app/financoor-api

# Create non-root user for security
RUN useradd -r -s /bin/false financoor
USER financoor

# Expose API port
EXPOSE 3001

# Set environment variables
ENV RUST_LOG=info
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Run the API
CMD ["/app/financoor-api"]

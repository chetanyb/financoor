#!/bin/bash
# =============================================================================
# Financoor EC2 Bootstrap Script
# This runs automatically when the instance launches
# =============================================================================

set -e
exec > >(tee /var/log/financoor-setup.log) 2>&1

echo "=========================================="
echo "Financoor Bootstrap - $(date)"
echo "=========================================="

# Update system
echo "[1/9] Updating system..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# Install dependencies
echo "[2/9] Installing dependencies..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    git \
    htop \
    jq \
    unzip \
    ca-certificates \
    gnupg

# Install Docker (needed for SP1 Groth16 proving)
echo "[3/9] Installing Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io
systemctl enable docker
systemctl start docker

# Create app user
echo "[4/9] Creating app user..."
useradd -m -s /bin/bash financoor || true
usermod -aG sudo financoor
usermod -aG docker financoor

# Switch to app user for remaining setup
sudo -u financoor bash << 'USERSCRIPT'
cd /home/financoor

# Install Rust
echo "[5/9] Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Install SP1 toolchain
echo "[6/9] Installing SP1 toolchain..."
curl -L https://sp1up.dev | bash
export PATH="$HOME/.sp1/bin:$PATH"
$HOME/.sp1/bin/sp1up

# Clone repository
echo "[7/9] Cloning repository..."
if [ -d "financoor" ]; then
    cd financoor && git pull
else
    git clone "${github_repo}" financoor
    cd financoor
fi

# Create environment file
echo "[8/9] Creating environment file..."
cat > .env << EOF
ALCHEMY_API_KEY=${alchemy_api_key}
API_SECRET_KEY=${api_secret_key}
RUST_LOG=info
PORT=3001
EOF
chmod 600 .env

# Build application
echo "[9/9] Building application (this takes 5-10 minutes)..."
$HOME/.cargo/bin/cargo build --release --package financoor-api

echo "Build complete!"
USERSCRIPT

# Create systemd service
echo "Setting up systemd service..."
cat > /etc/systemd/system/financoor-api.service << EOF
[Unit]
Description=Financoor API Server
After=network.target

[Service]
Type=simple
User=financoor
Group=financoor
WorkingDirectory=/home/financoor/financoor
EnvironmentFile=/home/financoor/financoor/.env
Environment=PATH=/home/financoor/.cargo/bin:/home/financoor/.sp1/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/home/financoor/financoor/target/release/api
Restart=always
RestartSec=5

# Security hardening (relaxed for Docker access)
NoNewPrivileges=false
PrivateTmp=true

# Performance
LimitNOFILE=65535
LimitNPROC=65535

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable financoor-api
systemctl start financoor-api

echo "=========================================="
echo "Bootstrap complete! - $(date)"
echo "API should be running on port 3001"
echo "Check status: systemctl status financoor-api"
echo "View logs: journalctl -u financoor-api -f"
echo "=========================================="

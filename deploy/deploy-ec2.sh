#!/bin/bash
# =============================================================================
# Quick Deploy Script for EC2
# Run this AFTER you've SSH'd into a fresh Ubuntu 22.04 EC2 instance
# Usage: curl -sSL <raw-url-to-this-script> | bash -s -- <ALCHEMY_API_KEY> <REPO_URL>
# =============================================================================

set -e

ALCHEMY_KEY=${1:-""}
REPO_URL=${2:-"https://github.com/your-username/financoor.git"}

if [ -z "$ALCHEMY_KEY" ]; then
    echo "Usage: $0 <ALCHEMY_API_KEY> [REPO_URL]"
    echo "Example: $0 abc123xyz https://github.com/user/financoor.git"
    exit 1
fi

echo "=========================================="
echo "Financoor Quick Deploy"
echo "=========================================="

# Update system
echo "[1/7] Updating system..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install dependencies
echo "[2/7] Installing dependencies..."
sudo apt-get install -y -qq \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    git \
    htop

# Install Rust
echo "[3/7] Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Install SP1
echo "[4/7] Installing SP1 toolchain..."
curl -L https://sp1up.dev | bash
export PATH="$HOME/.sp1/bin:$PATH"
~/.sp1/bin/sp1up

# Clone repo
echo "[5/7] Cloning repository..."
cd ~
if [ -d "financoor" ]; then
    cd financoor && git pull
else
    git clone "$REPO_URL" financoor
    cd financoor
fi

# Create .env
echo "[6/7] Creating environment file..."
cat > .env << EOF
ALCHEMY_API_KEY=$ALCHEMY_KEY
RUST_LOG=info
PORT=3001
EOF

# Build
echo "[7/7] Building (this takes 5-10 minutes)..."
~/.cargo/bin/cargo build --release --package financoor-api

# Setup systemd service
echo "Setting up systemd service..."
sudo tee /etc/systemd/system/financoor-api.service > /dev/null << EOF
[Unit]
Description=Financoor API Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/financoor
Environment=RUST_LOG=info
Environment=PORT=3001
EnvironmentFile=$HOME/financoor/.env
ExecStart=$HOME/financoor/target/release/api
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable financoor-api
sudo systemctl start financoor-api

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "API URL: http://$PUBLIC_IP:3001"
echo ""
echo "Test it:"
echo "  curl http://$PUBLIC_IP:3001/health"
echo ""
echo "View logs:"
echo "  sudo journalctl -u financoor-api -f"
echo ""
echo "Next: Deploy frontend to Vercel with:"
echo "  NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:3001"
echo "=========================================="

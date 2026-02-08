#!/bin/bash
# =============================================================================
# Financoor AWS EC2 Setup Script
# Run this on a fresh EC2 instance (Ubuntu 22.04 or Amazon Linux 2023)
# =============================================================================

set -e

echo "=========================================="
echo "Financoor API Server Setup"
echo "=========================================="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS"
    exit 1
fi

echo "Detected OS: $OS"

# Install dependencies based on OS
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "Installing dependencies for Ubuntu/Debian..."
    sudo apt-get update
    sudo apt-get install -y \
        build-essential \
        pkg-config \
        libssl-dev \
        curl \
        git \
        docker.io \
        docker-compose \
        htop \
        tmux

    # Start Docker
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER

elif [ "$OS" = "amzn" ]; then
    echo "Installing dependencies for Amazon Linux..."
    sudo yum update -y
    sudo yum install -y \
        gcc \
        openssl-devel \
        curl \
        git \
        docker \
        htop \
        tmux

    # Install docker-compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    # Start Docker
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
fi

# Install Rust (needed if building without Docker)
echo "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Install SP1 toolchain
echo "Installing SP1 toolchain..."
curl -L https://sp1up.dev | bash
export PATH="$HOME/.sp1/bin:$PATH"
~/.sp1/bin/sp1up

echo "=========================================="
echo "Setup complete!"
echo ""
echo "IMPORTANT: Log out and back in for Docker permissions to take effect"
echo ""
echo "Next steps:"
echo "1. Clone your repo: git clone <your-repo-url>"
echo "2. cd financoor"
echo "3. Create .env file with your ALCHEMY_API_KEY"
echo "4. Run: docker-compose up -d --build"
echo ""
echo "Or build natively:"
echo "1. cargo build --release --package financoor-api"
echo "2. ALCHEMY_API_KEY=xxx ./target/release/api"
echo "=========================================="

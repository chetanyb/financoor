# Deployment

## Recommended: Terraform

See [terraform/README.md](./terraform/README.md) for automated AWS deployment.

## Manual EC2 Setup

1. Launch Ubuntu 22.04 on c6i.2xlarge (or similar)
2. Open ports 22 (SSH) and 3001 (API)
3. SSH in and run:

```bash
# Install deps
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev curl git

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Install SP1
curl -L https://sp1up.dev | bash
~/.sp1/bin/sp1up

# Clone and build
git clone <your-repo> financoor && cd financoor
echo "ALCHEMY_API_KEY=<your-key>" > .env
cargo build --release --package financoor-api

# Run
./target/release/api
```

## Frontend (Vercel)

```bash
cd apps/web
npx vercel --prod
# Set NEXT_PUBLIC_API_URL to your EC2 IP:3001
```

# Terraform Deployment

## Setup

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
- `allowed_ssh_cidr` - your IP (run `curl -s https://ipv4.icanhazip.com` and add `/32`)
- `alchemy_api_key` - from Alchemy dashboard
- `github_repo` - your fork URL

## Deploy

```bash
terraform init
terraform apply
```

Takes ~10-15 min. Outputs API URL and SSH command when done.

## After Deploy

```bash
# SSH in
$(terraform output -raw ssh_command)

# Check build progress
tail -f /var/log/financoor-setup.log

# Check API status
sudo systemctl status financoor-api
```

## Teardown

```bash
terraform destroy
```

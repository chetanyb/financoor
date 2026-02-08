# =============================================================================
# Financoor Terraform Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type (c6i.2xlarge recommended for ZK proofs)"
  type        = string
  default     = "c6i.2xlarge"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "financoor"
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH (your IP, e.g., '203.0.113.50/32')"
  type        = string
  # No default - must be provided for security
}

variable "alchemy_api_key" {
  description = "Alchemy API key for blockchain data"
  type        = string
  sensitive   = true
}

variable "api_secret_key" {
  description = "Secret key for API authentication (optional, leave empty to disable)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository URL to clone"
  type        = string
  default     = "https://github.com/your-username/financoor.git"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 50
}

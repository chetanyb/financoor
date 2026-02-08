# =============================================================================
# Financoor Terraform Outputs
# =============================================================================

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.api.id
}

output "public_ip" {
  description = "Public IP address (Elastic IP)"
  value       = aws_eip.api.public_ip
}

output "api_url" {
  description = "API URL for frontend configuration"
  value       = "http://${aws_eip.api.public_ip}:3001"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${local_file.private_key.filename} ubuntu@${aws_eip.api.public_ip}"
}

output "ssh_key_path" {
  description = "Path to the generated SSH private key"
  value       = local_file.private_key.filename
}

output "vercel_env_var" {
  description = "Environment variable to set in Vercel"
  value       = "NEXT_PUBLIC_API_URL=http://${aws_eip.api.public_ip}:3001"
}

output "health_check_command" {
  description = "Command to check API health"
  value       = "curl http://${aws_eip.api.public_ip}:3001/health"
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.api.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "instance_type" {
  description = "EC2 instance type"
  value       = aws_instance.api.instance_type
}

output "estimated_weekly_cost" {
  description = "Estimated weekly cost (USD)"
  value       = var.instance_type == "c6i.xlarge" ? "~$45" : var.instance_type == "c6i.2xlarge" ? "~$90" : var.instance_type == "c6i.4xlarge" ? "~$180" : "varies"
}

output "setup_status" {
  description = "How to check setup progress"
  value       = "SSH in and run: tail -f /var/log/financoor-setup.log"
}

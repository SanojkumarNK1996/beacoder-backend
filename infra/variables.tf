variable "aws_region" {
  description = "The AWS region where resources will be deployed."
  type        = string
  default     = "us-east-1"
}

variable "apg_stage_name" {
  description = "The stage of apigateway"
  type        = string
}

variable "github_repo" {
  description = "The URL of the public GitHub repository containing the React app source code."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (e.g., dev, staging, prod)."
  type        = string
}

variable "postgres_client_cidr" {
  description = "Public IPv4 CIDR allowed to connect to PostgreSQL, e.g. 203.0.113.10/32."
  type        = string
}
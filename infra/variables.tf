variable "aws_region" {
  description = "The AWS region where resources will be deployed."
  type        = string
  default     = "ap-south-1"
}

variable "github_repo" {
  description = "The URL of the public GitHub repository containing the React app source code."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (e.g., dev, staging, prod)."
  type        = string
  default     = "dev"
}
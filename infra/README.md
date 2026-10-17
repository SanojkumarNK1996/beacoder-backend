# beacoder-backend-infra code
Backend Code for Beacoder website

# Terraform state bucket
Create the S3 bucket `beacoder-terraform-state-prod` in respective region before running Terraform.

# To run
terraform apply -var-file="beacoder-dev-ap-south-1.tfvars"

# To apply only the local PostgreSQL IP allowlist rule
terraform apply -var-file="beacoder-dev-ap-south-1.tfvars" -target="aws_security_group_rule.rds_from_local"

# Last reource
 "http://15.206.124.36:3000/"
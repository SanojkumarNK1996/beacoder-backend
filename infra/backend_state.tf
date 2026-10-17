terraform {
  backend "s3" {
    bucket  = "beacoder-terraform-state-prod"      # create this bucket manually
    key     = "beacoder-backend/terraform.tfstate" # path inside the bucket
    region  = "us-east-1"                          # your bucket region
    encrypt = true                                 # encrypt state at rest
  }
}
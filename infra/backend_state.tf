terraform {
  backend "s3" {
    bucket  = "beacoder-terraform"                 # the bucket you created manually
    key     = "beacoder-backend/terraform.tfstate" # path inside the bucket
    region  = "us-east-1"                          # your bucket region
    encrypt = true                                 # encrypt state at rest
  }
}
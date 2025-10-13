provider "aws" {
  region = "ap-south-1"

  default_tags {
    tags = {
      Project     = "beacoder-backend"
      Environment = var.environment
      Owner       = "sanojkumar"
    }
  }
}

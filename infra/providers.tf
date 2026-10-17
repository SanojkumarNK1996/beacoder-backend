provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "beacoder-backend"
      Environment = var.environment
      Owner       = "sanojkumar"
    }
  }
}

########################################################
# API Gateway setup
########################################################

# 1️⃣ Create API
resource "aws_api_gateway_rest_api" "app_api" {
  name        = "AppBackendAPI"
  description = "API Gateway to front the EC2 backend"
}

# 2️⃣ Proxy resource
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_rest_api.app_api.root_resource_id
  path_part   = "{proxy+}"
}

# 3️⃣ ANY method (proxy everything)
resource "aws_api_gateway_method" "proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# 4️⃣ Integration (to EC2 public IP)
resource "aws_api_gateway_integration" "proxy_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_method.http_method
  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = "http://${aws_instance.app.public_ip}:3000/{proxy}"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

# 5️⃣ Root-level proxy for "/"
resource "aws_api_gateway_method" "root_method" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_rest_api.app_api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "root_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_rest_api.app_api.root_resource_id
  http_method             = aws_api_gateway_method.root_method.http_method
  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = "http://${aws_instance.app.public_ip}:3000/"
}

# 6️⃣ Deployment
resource "aws_api_gateway_deployment" "app_deploy" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id

  depends_on = [
    aws_api_gateway_integration.proxy_integration,
    aws_api_gateway_integration.root_integration
  ]
}

# 7️⃣ Stage (prod)
resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  deployment_id = aws_api_gateway_deployment.app_deploy.id
  stage_name    = var.apg_stage_name
}

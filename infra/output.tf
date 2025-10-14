output "api_gateway_invoke_url" {
  description = "Public HTTPS endpoint for your backend"
  value       = "https://${aws_api_gateway_rest_api.app_api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.prod.stage_name}/"
}

output "ec2_public_ip" {
  description = "EC2 Public IP"
  value       = aws_instance.app.public_ip
}

output "ec2_postman_url" {
  description = "Base URL for accessing the Node.js app on EC2"
  value       = "http://${aws_instance.app.public_ip}:3000/"
}
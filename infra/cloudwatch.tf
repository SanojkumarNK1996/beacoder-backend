resource "aws_cloudwatch_log_group" "node_app" {
  name              = "/beacoder-backend-app"
  retention_in_days = 7
}

resource "aws_iam_role" "ec2_cw_role" {
  name = "ec2-cloudwatch-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "attach_cw_policy" {
  role       = aws_iam_role.ec2_cw_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

resource "aws_iam_instance_profile" "ec2_cw_profile" {
  name = "ec2-cloudwatch-profile"
  role = aws_iam_role.ec2_cw_role.name
}

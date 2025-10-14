########################################################
# EC2 Security Group
########################################################
resource "aws_security_group" "ec2_sg" {
  name        = "ec2_sg"
  description = "Allow SSH and Node.js app access"
  vpc_id      = aws_vpc.main.id

  # Only egress inline; all ingress as separate resources
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "EC2-SG"
  }
}

# SSH ingress
resource "aws_security_group_rule" "ec2_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  security_group_id = aws_security_group.ec2_sg.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "SSH access"
}

# Node.js app port (3000) ingress
resource "aws_security_group_rule" "ec2_app" {
  type              = "ingress"
  from_port         = 3000
  to_port           = 3000
  protocol          = "tcp"
  security_group_id = aws_security_group.ec2_sg.id
  cidr_blocks       = ["0.0.0.0/0"] # temporary; can restrict to API Gateway later
  description       = "Node.js app port"
}

########################################################
# RDS Security Group
########################################################
resource "aws_security_group" "rds_sg" {
  name        = "rds_sg"
  description = "Allow Postgres access from EC2"
  vpc_id      = aws_vpc.main.id

  # Only egress inline
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "RDS-SG"
  }
}

# RDS ingress only from EC2 security group
resource "aws_security_group_rule" "rds_from_ec2" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.ec2_sg.id
  description              = "Allow Postgres from EC2"
}

# We need this to comment
resource "aws_security_group_rule" "rds_public" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  security_group_id = aws_security_group.rds_sg.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow Postgres from anywhere (unsafe!)"
}
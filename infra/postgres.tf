resource "aws_db_instance" "postgres" {
  identifier        = "mydb"
  engine            = "postgres"
  db_name           = "postgres"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  username          = "beacoder_user"
  password          = "beacoder_password"

  skip_final_snapshot       = true
  final_snapshot_identifier = "beacoder-db-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  vpc_security_group_ids    = [aws_security_group.rds_sg.id]
  publicly_accessible       = true
  db_subnet_group_name      = aws_db_subnet_group.main.name
}

resource "aws_db_subnet_group" "main" {
  name = "main-subnet-group"
  subnet_ids = [
    aws_subnet.subnet_1.id,
    aws_subnet.subnet_2.id
  ]
  description = "Subnet group for RDS"
}

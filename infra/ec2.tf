# --------------------------
# EC2 Instance
# --------------------------
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.micro"

  # Critical for EC2 Instance Connect
  associate_public_ip_address = true
  subnet_id                   = aws_subnet.subnet_1.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_cw_profile.name
  user_data_replace_on_change = true

  user_data = <<-EOF
    #!/bin/bash
    
    echo "=== User Data Script Started at $(date) ==="
    
    echo "Step 1: Updating system... <-->"
    dnf update -y
    
    echo "Step 2: Installing Git... <-->"
    dnf install -y git
    
    echo "Step 3: Installing Node.js (v20 LTS)... <-->"
    dnf install -y nodejs20 npm
    sleep 2
    
    node --version || echo "Node installation failed"
    npm --version || echo "NPM installation failed"
    
    echo "Step 4: Installing PostgreSQL client... <-->"
    dnf install -y postgresql15
    sleep 2
    
    psql --version || echo "PostgreSQL installation failed"
    
    echo "Step 5: Cloning repository... <-->"
    cd /home/ec2-user
    rm -rf app
    git clone ${var.github_repo} app
    chown -R ec2-user:ec2-user app
    cd app
    
    if [ -d "source" ]; then
        echo "Found source directory, navigating into it..."
        cd source
    fi
    
    echo "Current directory: $(pwd)"
    echo "Files in directory:"
    ls -lah
    
    echo "Step 6: Installing npm packages... <-->"
    sudo -u ec2-user npm install
    
    echo "Step 7: Waiting for database at ${aws_db_instance.postgres.address}..."
    for i in {1..60}; do
        if PGPASSWORD=beacoder_password psql -h ${aws_db_instance.postgres.address} -U beacoder_user -d postgres -c '\q' 2>/dev/null; then
            echo "Database is ready!"
            break
        fi
        echo "Waiting for database... attempt $i/60"
        sleep 5
    done
    
    echo "Step 8: Creating beacoder database... <-->"
    PGPASSWORD=beacoder_password psql -h ${aws_db_instance.postgres.address} -U beacoder_user -d postgres <<-EOSQL
        SELECT 'CREATE DATABASE beacoder'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'beacoder')\gexec
    EOSQL
    
    echo "Step 9: Creating environment file... <-->"
    cat > .env <<ENVEOF
    NODE_ENV=production
    PORT=3000
    PG_DB_URI=postgres://beacoder_user:beacoder_password@${aws_db_instance.postgres.address}:5432/beacoder?sslmode=no-verify
    ENVEOF
    chown ec2-user:ec2-user .env
    
    echo "Step 10: Installing PM2... <-->"
    npm install -g pm2
    
    echo "Step 11: Starting application with PM2... <-->"
    sudo -u ec2-user pm2 start app.js --name beacoder-backend
    
    sudo -u ec2-user pm2 save
    sudo -u ec2-user pm2 startup systemd -u ec2-user --hp /home/ec2-user
    
    sudo -u ec2-user pm2 status
    
    echo "=== Setup Complete at $(date) ==="
    echo "<--> PM2 Status:"
    sudo -u ec2-user pm2 status
    
    echo "<--> Port 3000 Status:"
    ss -tlnp | grep 3000 || echo "Port 3000 not listening yet"
    
    echo "Application should be accessible at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
    
    echo "=== User Data Script Finished ==="
  EOF

  tags = {
    Name = "BeACoderAppServer5"
  }

  depends_on = [aws_db_instance.postgres]
}

output "ec2_public_ip" {
  description = "EC2 Public IP"
  value       = aws_instance.app.public_ip
}

output "ec2_postman_url" {
  description = "Base URL for accessing the Node.js app on EC2"
  value       = "http://${aws_instance.app.public_ip}:3000/"
}
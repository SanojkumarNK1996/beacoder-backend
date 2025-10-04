# --------------------------
# EC2 Instance
# --------------------------
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.subnet_1.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_cw_profile.name
  user_data_replace_on_change = true

  user_data = <<-EOF
    #!/bin/bash
    
    echo "=== User Data Script Started at $(date) ==="
    
    echo "Step 1: Updating system..."
    yum update -y
    
    echo "Step 2: Installing Git..."
    yum install -y git
    
    echo "Step 3: Installing Node.js..."
    curl -sL https://rpm.nodesource.com/setup_16.x | bash -
    yum install -y nodejs
    sleep 2
    
    node --version || echo "Node installation failed"
    npm --version || echo "NPM installation failed"
    
    echo "Step 4: Installing PostgreSQL client..."
    amazon-linux-extras enable postgresql14
    yum install -y postgresql
    sleep 2
    
    psql --version || echo "PostgreSQL installation failed"
    
    echo "Step 5: Cloning repository..."
    cd /home/ec2-user
    rm -rf app
    git clone https://github.com/SanojkumarNK1996/beacoder-backend.git app
    cd app
    
    if [ -d "source" ]; then
        echo "Found source directory, navigating into it..."
        cd source
    fi
    
    echo "Current directory: $(pwd)"
    echo "Files in directory:"
    ls -lah
    
    echo "Step 6: Installing npm packages..."
    npm install
    
    echo "Step 7: Waiting for database at ${aws_db_instance.postgres.address}..."
    for i in {1..60}; do
        if PGPASSWORD=beacoder_password psql -h ${aws_db_instance.postgres.address} -U beacoder_user -d postgres -c '\q' 2>/dev/null; then
            echo "Database is ready!"
            break
        fi
        echo "Waiting for database... attempt $i/60"
        sleep 5
    done
    
    echo "Step 8: Creating beacoder database..."
    PGPASSWORD=beacoder_password psql -h ${aws_db_instance.postgres.address} -U beacoder_user -d postgres <<-EOSQL
        SELECT 'CREATE DATABASE beacoder'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'beacoder')\gexec
    EOSQL
    
    echo "Step 9: Creating environment file..."
    cat > .env <<ENVEOF
    NODE_ENV=production
    PORT=3000
    PG_DB_URI=postgres://beacoder_user:beacoder_password@${aws_db_instance.postgres.address}:5432/beacoder?sslmode=no-verify
    ENVEOF
    
    echo "Step 10: Installing PM2..."
    sudo npm install -g pm2
    
    echo "Step 11: Starting application with PM2..."
    sudo pm2 start app.js --name beacoder-backend --log /var/log/beacoder-backend.log --time
    
    sudo m2 save
    sudo pm2 startup systemd -u ec2-user --hp /home/ec2-user
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
    
    sudo pm2 status
    
    echo "Step 12: Setting up CloudWatch Logs..."
    sudo yum install -y awslogs
    
    cat > /etc/awslogs/awslogs.conf <<LOGCONF
    [general]
    state_file = /var/awslogs/state/agent-state
    
    [/var/log/user-data.log]
    file = /var/log/user-data.log
    log_group_name = /beacoder-backend-app
    log_stream_name = user-data-{instance_id}
    datetime_format = %Y-%m-%d %H:%M:%S
    
    [/var/log/beacoder-backend.log]
    file = /var/log/beacoder-backend.log
    log_group_name = /beacoder-backend-app
    log_stream_name = app-{instance_id}
    datetime_format = %Y-%m-%d %H:%M:%S
    LOGCONF
    
    cat > /etc/awslogs/awscli.conf <<AWSCONF
    [plugins]
    cwlogs = cwlogs
    [default]
    region = ap-south-1
    AWSCONF
    
    systemctl enable awslogsd
    systemctl start awslogsd
    
    echo "=== Setup Complete at $(date) ==="
    echo "PM2 Status:"
    sudo pm2 status
    
    echo "Port 3000 Status:"
    netstat -tlnp | grep 3000 || echo "Port 3000 not listening yet"
    
    echo "Application should be accessible at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
    
    echo "=== User Data Script Finished ==="
  EOF

  tags = {
    Name = "BeACoderAppServer2"
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
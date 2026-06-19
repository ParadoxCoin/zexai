#!/bin/bash

# AI SaaS Platform - Production Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${DOMAIN:-"yourdomain.com"}
EMAIL=${EMAIL:-"admin@yourdomain.com"}
ENVIRONMENT=${ENVIRONMENT:-"production"}

echo -e "${BLUE}🚀 AI SaaS Platform - Production Deployment${NC}"
echo -e "${BLUE}Domain: $DOMAIN${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo "=================================================="

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    print_error "backend/.env file not found. Please copy from .env.example and configure."
    exit 1
fi

print_status "Prerequisites check passed"

# Validate configuration
echo -e "${BLUE}🔍 Validating configuration...${NC}"
cd backend
python3 scripts/validate_config.py
if [ $? -ne 0 ]; then
    print_error "Configuration validation failed. Please fix the errors above."
    exit 1
fi
cd ..
print_status "Configuration validation passed"

# Setup database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd backend
python3 scripts/setup_database.py
if [ $? -ne 0 ]; then
    print_error "Database setup failed"
    exit 1
fi
cd ..
print_status "Database setup completed"

# SSL Certificate setup
echo -e "${BLUE}🔐 Setting up SSL certificate...${NC}"
if [ ! -d "ssl" ]; then
    mkdir ssl
fi

if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
    print_warning "SSL certificates not found in ssl/ directory"
    
    # Check if certbot is available for Let's Encrypt
    if command -v certbot &> /dev/null; then
        echo "Would you like to generate Let's Encrypt certificates? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
            
            # Copy certificates to ssl directory
            sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/cert.pem
            sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/key.pem
            sudo chown $USER:$USER ssl/*.pem
            
            print_status "Let's Encrypt certificates generated"
        else
            print_warning "Please place your SSL certificates in ssl/cert.pem and ssl/key.pem"
            print_warning "Continuing with self-signed certificates for testing..."
            
            # Generate self-signed certificates for testing
            openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        fi
    else
        print_warning "Certbot not found. Please install certbot or provide SSL certificates manually."
        print_warning "Generating self-signed certificates for testing..."
        
        # Generate self-signed certificates for testing
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    fi
else
    print_status "SSL certificates found"
fi

# Update nginx configuration with domain
echo -e "${BLUE}🌐 Updating nginx configuration...${NC}"
sed -i "s/yourdomain.com/$DOMAIN/g" nginx.conf
sed -i "s/www.yourdomain.com/www.$DOMAIN/g" nginx.conf
print_status "Nginx configuration updated"

# Build and start services
echo -e "${BLUE}🐳 Building and starting Docker services...${NC}"

# Stop existing services
docker-compose -f docker-compose.production.yml down

# Build and start services
docker-compose -f docker-compose.production.yml up -d --build

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Health check
echo -e "${BLUE}🏥 Performing health checks...${NC}"

# Check backend health
if curl -f -s "http://localhost:8000/api/v1/health" > /dev/null; then
    print_status "Backend health check passed"
else
    print_error "Backend health check failed"
    docker-compose -f docker-compose.production.yml logs backend
    exit 1
fi

# Check if HTTPS is working
if curl -f -s -k "https://localhost/api/v1/health" > /dev/null; then
    print_status "HTTPS health check passed"
else
    print_warning "HTTPS health check failed - check nginx logs"
    docker-compose -f docker-compose.production.yml logs nginx
fi

# Setup log rotation
echo -e "${BLUE}📝 Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/ai-saas > /dev/null <<EOF
/var/log/ai-saas/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose -f $(pwd)/docker-compose.production.yml restart nginx
    endscript
}
EOF
print_status "Log rotation configured"

# Setup backup cron job
echo -e "${BLUE}💾 Setting up backup cron job...${NC}"
BACKUP_SCRIPT="$(pwd)/scripts/backup.sh"
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p "$BACKUP_DIR"

# MongoDB backup
docker exec ai-saas-production_mongodb_1 mongodump --out="/tmp/backup_$DATE"
docker cp ai-saas-production_mongodb_1:/tmp/backup_$DATE "$BACKUP_DIR/"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.tar.gz"
EOF

chmod +x scripts/backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * $BACKUP_SCRIPT") | crontab -
print_status "Backup cron job configured"

# Final status
echo "=================================================="
print_status "Deployment completed successfully!"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose -f docker-compose.production.yml ps

echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo -e "Frontend: https://$DOMAIN"
echo -e "API Docs: https://$DOMAIN/docs"
echo -e "Health Check: https://$DOMAIN/api/v1/health"
echo -e "Metrics: https://$DOMAIN/api/v1/metrics"
echo -e "Grafana: http://$DOMAIN:3001 (admin/admin)"

echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Update DNS records to point to this server"
echo "2. Configure monitoring alerts"
echo "3. Test all functionality"
echo "4. Update API keys in production"
echo "5. Configure backup verification"

echo ""
print_status "AI SaaS Platform is now running in production!"
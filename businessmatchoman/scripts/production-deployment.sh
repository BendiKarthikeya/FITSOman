#!/bin/bash
# TEEJARTI Production Deployment Script

echo "🚀 TEEJARTI Production Deployment Starting..."

# Set script to exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables from secrets file if available
ENV_FILE="${ENV_FILE:-secrets/.env.production}"
if [ -f "$ENV_FILE" ]; then
    print_status "Loading environment variables from $ENV_FILE"
    set -o allexport
    source "$ENV_FILE"
    set +o allexport
else
    print_warning "Environment file $ENV_FILE not found; relying on existing shell environment"
fi

# Check if running in production mode
if [ "$NODE_ENV" != "production" ]; then
    print_error "NODE_ENV must be set to 'production'"
    exit 1
fi

print_status "Checking required environment variables..."

# Check required environment variables
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "SENDGRID_API_KEY"
    "HUGGINGFACE_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "All required environment variables are set"

# Backup current database before deployment
print_status "Creating database backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_file="backup_pre_production_${timestamp}.sql"

# Extract database details from DATABASE_URL for pg_dump
if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$backup_file"
    print_success "Database backup created: $backup_file"
else
    print_warning "pg_dump not found, skipping database backup"
fi

# Install dependencies
print_status "Installing production dependencies..."
npm ci --only=production

# Build the application
print_status "Building application..."
npm run build

# Run database migrations
print_status "Running database migrations..."
npm run db:push

# Clean up demo data
print_status "Cleaning up demo data..."
if [ -f "scripts/production-cleanup.sql" ]; then
    psql "$DATABASE_URL" -f scripts/production-cleanup.sql
    print_success "Demo data cleanup completed"
else
    print_warning "Cleanup script not found, skipping demo data cleanup"
fi

# Create uploads directory with proper permissions
print_status "Setting up uploads directory..."
mkdir -p public/uploads
chmod 755 public/uploads

# Remove demo files
print_status "Removing demo files..."
find public/uploads -name "*test*" -delete
find public/uploads -name "*demo*" -delete
find public/uploads -name "*sample*" -delete

# Start the application
print_status "Starting TEEJARTI in production mode..."

# Use PM2 if available, otherwise use npm
if command -v pm2 &> /dev/null; then
    print_status "Starting with PM2..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    print_success "TEEJARTI started with PM2"
else
    print_status "Starting with npm..."
    npm start &
    print_success "TEEJARTI started"
fi

print_success "🎉 TEEJARTI Production Deployment Complete!"

# Print post-deployment instructions
echo ""
echo "=== POST-DEPLOYMENT CHECKLIST ==="
echo "1. Verify application is running at your domain"
echo "2. Test user registration flow"
echo "3. Test email delivery (SendGrid)"
echo "4. Test KYC document upload"
echo "5. Verify Arabic/RTL functionality"
echo "6. Check admin panel access"
echo "7. Monitor logs for any errors"
echo ""
echo "Access your application at: https://yourdomain.com"
echo "Admin panel: https://yourdomain.com/admin"
echo ""
print_success "Deployment completed successfully!"

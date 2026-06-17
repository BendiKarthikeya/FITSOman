#!/bin/bash

# TEEJARTI Deployment Script
echo "🚀 Building TEEJARTI for production deployment..."

# Build the application
echo "📦 Building frontend and backend..."
npm run build

# Copy static files to correct location for production server
echo "📁 Copying static files to server directory..."
mkdir -p server/public
cp -r dist/public/* server/public/

echo "✅ Build completed successfully!"
echo "📍 Built files are ready in:"
echo "   - dist/index.js (backend)"
echo "   - server/public/ (frontend static files)"
echo ""
echo "🔧 Production server can now be started with: npm run start"
echo "🌐 Deployment ready for Replit deployment system!"
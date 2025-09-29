#!/bin/bash

# AI Tutor KB - VPS Deployment Script
echo "🚀 Starting AI Tutor KB deployment..."

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build the application
echo "🔨 Building application..."
npm run build

# Start with PM2
echo "🔄 Starting application with PM2..."
pm2 delete aitutor-kb 2>/dev/null || true
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
echo "🌐 Your app should be running on port 5000"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs aitutor-kb"
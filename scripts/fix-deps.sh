#!/bin/bash

echo "🔧 Fixing Vite module resolution error..."
echo ""

# Check if running in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Step 1: Removing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo "🧹 Step 2: Clearing npm cache..."
npm cache clean --force

echo "📥 Step 3: Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies reinstalled successfully!"
echo ""
echo "🚀 You can now run 'npm run dev' to start the development server."

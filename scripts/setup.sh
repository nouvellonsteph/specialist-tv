#!/bin/bash

# Knowledge Management POC Setup Script
# This script helps set up all the required Cloudflare services

echo "🚀 Setting up Knowledge Management POC..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare first:"
    echo "wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI found and user is logged in"

# Create D1 database
echo "📊 Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create specialist-tv-db 2>&1)
if [[ $? -eq 0 ]]; then
    echo "✅ D1 database created successfully"
    
    # Extract database ID from output
    DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)
    if [[ -n "$DB_ID" ]]; then
        echo "📝 Database ID: $DB_ID"
        
        # Update wrangler.jsonc with the actual database ID
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-database-id/$DB_ID/g" wrangler.jsonc
        else
            # Linux
            sed -i "s/your-database-id/$DB_ID/g" wrangler.jsonc
        fi
        echo "✅ Updated wrangler.jsonc with database ID"
    fi
else
    echo "⚠️  D1 database might already exist or there was an error"
fi

# Initialize database schema
echo "🗃️  Setting up database schema..."
wrangler d1 execute specialist-tv-db --file=./schema.sql
if [[ $? -eq 0 ]]; then
    echo "✅ Database schema initialized"
else
    echo "❌ Failed to initialize database schema"
fi

# Create R2 bucket
echo "🪣 Creating R2 bucket..."
wrangler r2 bucket create specialist-tv-thumbnails
if [[ $? -eq 0 ]]; then
    echo "✅ R2 bucket created successfully"
else
    echo "⚠️  R2 bucket might already exist or there was an error"
fi

# Create Queue
echo "📬 Creating Queue..."
wrangler queues create video-processing
if [[ $? -eq 0 ]]; then
    echo "✅ Queue created successfully"
else
    echo "⚠️  Queue might already exist or there was an error"
fi

# Set up environment variables
echo "🔧 Setting up environment variables..."
echo ""
echo "Please set the following secrets using wrangler:"
echo ""
echo "wrangler secret put STREAM_API_TOKEN"
echo "wrangler secret put STREAM_ACCOUNT_ID"
echo "wrangler secret put WEBHOOK_SECRET (optional)"
echo ""
echo "You can find your Stream API token and Account ID in the Cloudflare dashboard:"
echo "https://dash.cloudflare.com/profile/api-tokens"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [[ $? -eq 0 ]]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Set the required secrets (see above)"
echo "2. Run 'npm run dev' for local development"
echo "3. Run 'npm run deploy' to deploy to Cloudflare"
echo ""
echo "📚 Check README.md for detailed instructions"

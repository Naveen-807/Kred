#!/bin/bash

echo "🔑 Setting up PKP Wallet System for OfflinePay..."
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f sms-gateway 2>/dev/null
pkill -f ngrok 2>/dev/null
sleep 2

# Navigate to backend
cd /Users/naveen/Desktop/OfflinePay/backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps @lit-protocol/lit-node-client@latest @lit-protocol/contracts-sdk@latest @lit-protocol/constants@latest mongoose express body-parser 2>&1 | grep -v "deprecated\|warn"

# Check MongoDB
echo ""
echo "🗄️  Checking MongoDB..."
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is installed"
    # Try to start MongoDB if not running
    if ! pgrep -x mongod > /dev/null; then
        echo "Starting MongoDB..."
        mongod --fork --logpath /tmp/mongodb.log --dbpath /usr/local/var/mongodb 2>/dev/null || brew services start mongodb-community 2>/dev/null || echo "⚠️  Please start MongoDB manually"
    else
        echo "✅ MongoDB is running"
    fi
else
    echo "⚠️  MongoDB not found - installing..."
    brew install mongodb-community 2>/dev/null || echo "Please install MongoDB manually"
fi

# Start PKP SMS Gateway
echo ""
echo "🚀 Starting PKP SMS Gateway..."
nohup node pkp-sms-gateway.js > pkp-gateway.log 2>&1 &
PID=$!
echo "✅ Gateway started (PID: $PID)"

sleep 3

# Start ngrok
echo ""
echo "🌐 Starting ngrok tunnel..."
nohup ngrok http 8080 --log=stdout > /tmp/ngrok.log 2>&1 &
sleep 4

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    NGROK_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           📱 PKP SMS Gateway - READY!                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📡 Webhook URL (for Automate.io):"
echo "   $NGROK_URL/sms"
echo ""
echo "🔑 Features:"
echo "   • Auto-mint PKP wallets for new phone numbers"
echo "   • Decentralized wallet management"
echo "   • Lit Protocol integration"
echo ""
echo "📱 SMS Commands:"
echo "   WALLET - Create PKP wallet"
echo "   BALANCE - Check balance"
echo "   ADDRESS - Get wallet address"
echo "   HELP - Show commands"
echo ""
echo "🧪 Test the gateway:"
echo "   curl -X POST $NGROK_URL/sms \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"from\":\"+1234567890\",\"body\":\"WALLET\"}'"
echo ""
echo "📋 View logs:"
echo "   tail -f pkp-gateway.log"
echo ""
echo "═══════════════════════════════════════════════════════════════"

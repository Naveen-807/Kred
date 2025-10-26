#!/bin/bash
# Quick Start Script for SMS Gateway

echo "╔════════════════════════════════════════════╗"
echo "║   📱 SMS Gateway - Quick Start            ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found. Please install ngrok first."
    echo "   Visit: https://ngrok.com/download"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Start backend
echo "🚀 Starting backend server..."
cd "$(dirname "$0")/backend"

# Kill existing processes
pkill -f "sms-gateway.js" 2>/dev/null
pkill -f "ngrok http 8080" 2>/dev/null

# Start backend in background
node sms-gateway.js > /tmp/sms-gateway.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
echo "   Logs: tail -f /tmp/sms-gateway.log"

sleep 2

# Start ngrok
echo ""
echo "🌍 Starting ngrok tunnel..."
ngrok http 8080 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "✅ Ngrok started (PID: $NGROK_PID)"

sleep 3

# Get ngrok URL
echo ""
echo "📡 Your ngrok URL:"
curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    url = data['tunnels'][0]['public_url']
    print(f'   {url}')
    print(f'   ')
    print(f'   ⚠️  Use this URL in Automate app:')
    print(f'   {url}/sms')
except:
    print('   ❌ Could not get URL. Check http://localhost:4040')
"

echo ""
echo "═══════════════════════════════════════════"
echo "✅ SMS Gateway is ready!"
echo "═══════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Note the ngrok URL above"
echo "2. Install 'Automate' app on your gateway phone"
echo "3. Create flow as described in SMS_GATEWAY_GUIDE.md"
echo "4. Use the ngrok URL in HTTP Request block"
echo "5. Test by sending SMS to gateway phone"
echo ""
echo "To stop:"
echo "  kill $BACKEND_PID $NGROK_PID"
echo ""
echo "Dashboard: http://localhost:4040 (ngrok)"
echo "Test page: http://localhost:8080"
echo ""

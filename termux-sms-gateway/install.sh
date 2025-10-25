#!/data/data/com.termux/files/usr/bin/bash

# Installation script for Termux SMS Gateway
# Run this once to set up everything

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   OfflinePay Termux SMS Gateway - Installation          ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Update Termux packages
echo "📦 Updating Termux packages..."
pkg update -y && pkg upgrade -y

# Install required packages
echo "📦 Installing required packages..."
pkg install -y \
    termux-api \
    curl \
    jq \
    git \
    nano

# Check if Termux:API app is installed
echo ""
echo "⚠️  IMPORTANT: Termux:API Plugin Required"
echo ""
echo "This gateway requires the Termux:API plugin app."
echo "Please install it from F-Droid if you haven't already:"
echo ""
echo "https://f-droid.org/en/packages/com.termux.api/"
echo ""
echo "Press Enter once you've installed Termux:API..."
read

# Test Termux API
echo "Testing Termux API..."
if termux-sms-inbox -l 1 > /dev/null 2>&1; then
    echo "✅ Termux API is working!"
else
    echo "❌ Termux API test failed!"
    echo ""
    echo "Please:"
    echo "1. Install Termux:API from F-Droid"
    echo "2. Grant SMS permissions to Termux"
    echo "3. Run this install script again"
    exit 1
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x *.sh

# Configure backend URL
echo ""
echo "⚙️  Configuration"
echo ""
echo "Enter your backend URL (e.g., http://192.168.1.100:8080):"
read -r backend_url

echo "Enter your API key (from backend .env GATEWAY_API_KEY):"
read -r api_key

# Update config file
sed -i "s|export BACKEND_URL=.*|export BACKEND_URL=\"$backend_url\"|" config.sh
sed -i "s|export API_KEY=.*|export API_KEY=\"$api_key\"|" config.sh

echo "✅ Configuration saved!"

# Create log directory
mkdir -p "$HOME/sms-gateway-logs"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   ✅ Installation Complete!                              ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "To start the gateway, run:"
echo "  ./gateway.sh"
echo ""
echo "To stop the gateway, press Ctrl+C or run:"
echo "  pkill -f gateway.sh"
echo ""
echo "To view logs:"
echo "  tail -f ~/sms-gateway-logs/gateway.log"
echo ""
echo "To edit configuration:"
echo "  nano config.sh"
echo ""

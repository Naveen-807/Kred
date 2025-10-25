#!/data/data/com.termux/files/usr/bin/bash

# Configuration file for Termux SMS Gateway
# Edit these values before running the gateway

# Backend server URL (your Node.js server)
# For local testing: http://192.168.x.x:8080 (your laptop IP on same WiFi)
# For cloud: https://your-server.com
export BACKEND_URL="http://192.168.1.100:8080"

# API Key for authentication (must match backend .env GATEWAY_API_KEY)
export API_KEY="your-secure-api-key-here"

# Gateway ID (unique identifier for this device)
export GATEWAY_ID="gateway-$(termux-telephony-deviceinfo | jq -r '.device_id' || echo 'default')"

# Poll interval (seconds) - how often to check for outgoing messages
export POLL_INTERVAL=5

# Log file location
export LOG_DIR="$HOME/sms-gateway-logs"
export LOG_FILE="$LOG_DIR/gateway.log"

# Maximum log file size (MB)
export MAX_LOG_SIZE=10

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "✅ Configuration loaded"
echo "   Backend: $BACKEND_URL"
echo "   Gateway ID: $GATEWAY_ID"
echo "   Poll Interval: ${POLL_INTERVAL}s"
echo "   Logs: $LOG_FILE"

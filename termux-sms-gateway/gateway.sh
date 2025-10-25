#!/data/data/com.termux/files/usr/bin/bash

# Main Gateway Script
# Runs both SMS listener and sender in parallel

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║        OfflinePay Termux SMS Gateway                    ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Gateway ID: $GATEWAY_ID"
echo "Logs: $LOG_FILE"
echo ""

# Check if already running
if pgrep -f "sms-listener.sh" > /dev/null; then
    echo "❌ Gateway is already running!"
    echo "To stop it, run: pkill -f gateway.sh"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    log "INFO" "Shutting down gateway..."
    pkill -P $$  # Kill all child processes
    log "INFO" "Gateway stopped"
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGINT SIGTERM

log "INFO" "Starting OfflinePay SMS Gateway..."

# Start SMS listener in background
log "INFO" "Starting SMS listener..."
bash "$SCRIPT_DIR/sms-listener.sh" &
LISTENER_PID=$!

# Wait a moment
sleep 2

# Start SMS sender in background
log "INFO" "Starting SMS sender..."
bash "$SCRIPT_DIR/sms-sender.sh" &
SENDER_PID=$!

log "INFO" "✅ Gateway started successfully!"
log "INFO" "Listener PID: $LISTENER_PID"
log "INFO" "Sender PID: $SENDER_PID"
log "INFO" ""
log "INFO" "Press Ctrl+C to stop the gateway"
log "INFO" "Logs are being written to: $LOG_FILE"

# Monitor both processes
while true; do
    # Check if listener is still running
    if ! kill -0 $LISTENER_PID 2>/dev/null; then
        log "ERROR" "SMS Listener crashed! Restarting..."
        bash "$SCRIPT_DIR/sms-listener.sh" &
        LISTENER_PID=$!
    fi
    
    # Check if sender is still running
    if ! kill -0 $SENDER_PID 2>/dev/null; then
        log "ERROR" "SMS Sender crashed! Restarting..."
        bash "$SCRIPT_DIR/sms-sender.sh" &
        SENDER_PID=$!
    fi
    
    # Wait before next check
    sleep 10
done

#!/data/data/com.termux/files/usr/bin/bash

# SMS Listener
# Monitors incoming SMS and forwards to backend

# Load config and utils
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"

log "INFO" "========================================="
log "INFO" "Starting SMS Listener"
log "INFO" "========================================="

# Check Termux API
check_termux_api

# Register with backend
register_gateway

# Last processed SMS ID (to avoid duplicates)
LAST_SMS_ID=""

# Main loop - continuously monitor SMS inbox
while true; do
    # Get latest SMS messages (last 5)
    SMS_JSON=$(termux-sms-inbox -l 5 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$SMS_JSON" ]; then
        log "WARN" "Failed to read SMS inbox, retrying..."
        sleep 5
        continue
    fi
    
    # Process each SMS
    echo "$SMS_JSON" | jq -c '.[]' | while read -r sms; do
        # Extract SMS details
        sms_id=$(echo "$sms" | jq -r '._id')
        sender=$(echo "$sms" | jq -r '.number')
        body=$(echo "$sms" | jq -r '.body')
        timestamp=$(echo "$sms" | jq -r '.received')
        
        # Skip if already processed
        if [ "$sms_id" = "$LAST_SMS_ID" ]; then
            continue
        fi
        
        # Skip if empty
        if [ -z "$body" ] || [ "$body" = "null" ]; then
            continue
        fi
        
        log "INFO" "📱 New SMS from $sender: ${body:0:50}..."
        
        # Forward to backend
        request_data=$(jq -n \
            --arg from "$sender" \
            --arg body "$body" \
            --arg ts "$timestamp" \
            --arg gid "$GATEWAY_ID" \
            '{
                from: $from,
                body: $body,
                timestamp: $ts,
                gatewayId: $gid
            }')
        
        log "INFO" "Forwarding SMS to backend..."
        response=$(http_post "$BACKEND_URL/webhook/sms-gateway" "$request_data")
        
        if [ $? -eq 0 ]; then
            log "INFO" "✅ SMS forwarded successfully"
            log "DEBUG" "Response: $response"
            
            # Update last processed ID
            LAST_SMS_ID="$sms_id"
            
            # Check if there's a direct response to send
            # (Note: We're using queue system, so this is just for logging)
            sms_response=$(echo "$response" | jq -r '.smsResponse // empty')
            if [ -n "$sms_response" ] && [ "$sms_response" != "null" ]; then
                log "INFO" "Backend queued response: ${sms_response:0:50}..."
            fi
        else
            log "ERROR" "❌ Failed to forward SMS to backend"
        fi
        
    done
    
    # Send heartbeat every 30 seconds
    if [ $(($(date +%s) % 30)) -eq 0 ]; then
        send_heartbeat
    fi
    
    # Wait before next check (avoid high CPU usage)
    sleep 2
    
done

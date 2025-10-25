#!/data/data/com.termux/files/usr/bin/bash

# SMS Sender
# Polls backend for outgoing messages and sends via SMS

# Load config and utils
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/utils.sh"

log "INFO" "========================================="
log "INFO" "Starting SMS Sender"
log "INFO" "========================================="

# Check Termux API
check_termux_api

# Main loop - continuously poll for outgoing messages
while true; do
    # Check internet connectivity
    if ! check_internet; then
        log "WARN" "No internet connection, waiting..."
        sleep 10
        continue
    fi
    
    # Poll backend for pending messages
    response=$(http_get "$BACKEND_URL/api/gateway/outgoing?limit=5")
    
    if [ $? -ne 0 ] || [ -z "$response" ]; then
        log "WARN" "Failed to fetch outgoing messages, retrying..."
        sleep "$POLL_INTERVAL"
        continue
    fi
    
    # Check if there are messages to send
    message_count=$(echo "$response" | jq '.messages | length')
    
    if [ "$message_count" -gt 0 ]; then
        log "INFO" "📬 Found $message_count message(s) to send"
        
        # Process each message
        echo "$response" | jq -c '.messages[]' | while read -r msg; do
            msg_id=$(echo "$msg" | jq -r '.id')
            to=$(echo "$msg" | jq -r '.to')
            body=$(echo "$msg" | jq -r '.body')
            priority=$(echo "$msg" | jq -r '.priority')
            
            log "INFO" "Sending message $msg_id to $to (priority: $priority)"
            
            # Send SMS
            if send_sms "$to" "$body"; then
                # Mark as sent in backend
                sent_data=$(jq -n --arg mid "$msg_id" '{messageId: $mid}')
                sent_response=$(http_post "$BACKEND_URL/api/gateway/sent" "$sent_data")
                
                if echo "$sent_response" | jq -e '.success' > /dev/null 2>&1; then
                    log "INFO" "✅ Message $msg_id marked as sent"
                else
                    log "WARN" "⚠️  Failed to mark message as sent: $sent_response"
                fi
            else
                # Mark as failed in backend
                failed_data=$(jq -n \
                    --arg mid "$msg_id" \
                    --arg err "SMS send failed" \
                    '{messageId: $mid, error: $err}')
                
                http_post "$BACKEND_URL/api/gateway/failed" "$failed_data" > /dev/null
                log "ERROR" "❌ Message $msg_id marked as failed"
            fi
            
            # Small delay between messages to avoid rate limiting
            sleep 1
        done
    fi
    
    # Wait before next poll
    sleep "$POLL_INTERVAL"
    
done

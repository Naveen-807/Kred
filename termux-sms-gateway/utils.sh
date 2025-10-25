#!/data/data/com.termux/files/usr/bin/bash

# Utility functions for SMS gateway

# Get current timestamp
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Log message to file and console
log() {
    local level="$1"
    shift
    local message="$@"
    local log_entry="[$(timestamp)] [$level] $message"
    
    echo "$log_entry"
    echo "$log_entry" >> "$LOG_FILE"
    
    # Rotate log if too large
    if [ -f "$LOG_FILE" ]; then
        local size=$(du -m "$LOG_FILE" | cut -f1)
        if [ "$size" -gt "$MAX_LOG_SIZE" ]; then
            mv "$LOG_FILE" "$LOG_FILE.old"
            echo "[$(timestamp)] [INFO] Log rotated" > "$LOG_FILE"
        fi
    fi
}

# Make HTTP POST request with JSON
http_post() {
    local url="$1"
    local data="$2"
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -H "X-Gateway-Id: $GATEWAY_ID" \
        -d "$data" \
        "$url"
}

# Make HTTP GET request
http_get() {
    local url="$1"
    
    curl -s -X GET \
        -H "X-API-Key: $API_KEY" \
        -H "X-Gateway-Id: $GATEWAY_ID" \
        "$url"
}

# Send SMS using Termux API
send_sms() {
    local number="$1"
    local message="$2"
    
    log "INFO" "Sending SMS to $number: ${message:0:50}..."
    
    # Use termux-sms-send
    termux-sms-send -n "$number" "$message"
    
    if [ $? -eq 0 ]; then
        log "INFO" "✅ SMS sent successfully to $number"
        return 0
    else
        log "ERROR" "❌ Failed to send SMS to $number"
        return 1
    fi
}

# URL encode string
urlencode() {
    local string="$1"
    echo "$string" | jq -sRr @uri
}

# Check if Termux API is available
check_termux_api() {
    if ! command -v termux-sms-inbox &> /dev/null; then
        log "ERROR" "Termux:API not found! Please install it from F-Droid."
        exit 1
    fi
    log "INFO" "✅ Termux:API detected"
}

# Check internet connectivity
check_internet() {
    if curl -s --max-time 5 "$BACKEND_URL/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Register gateway with backend
register_gateway() {
    log "INFO" "Registering gateway with backend..."
    
    local device_info=$(termux-telephony-deviceinfo 2>/dev/null || echo '{}')
    local phone_number=$(echo "$device_info" | jq -r '.phone_number // "unknown"')
    
    local data=$(jq -n \
        --arg gid "$GATEWAY_ID" \
        --arg phone "$phone_number" \
        --arg platform "android-termux" \
        --arg version "1.0.0" \
        '{
            gatewayId: $gid,
            phoneNumber: $phone,
            platform: $platform,
            version: $version
        }')
    
    local response=$(http_post "$BACKEND_URL/api/gateway/register" "$data")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        log "INFO" "✅ Gateway registered successfully"
        return 0
    else
        log "WARN" "⚠️  Gateway registration failed: $response"
        return 1
    fi
}

# Send heartbeat to backend
send_heartbeat() {
    local data=$(jq -n \
        --arg gid "$GATEWAY_ID" \
        --arg ts "$(date -Iseconds)" \
        '{
            gatewayId: $gid,
            timestamp: $ts
        }')
    
    http_post "$BACKEND_URL/api/gateway/heartbeat" "$data" > /dev/null 2>&1
}

export -f timestamp log http_post http_get send_sms urlencode
export -f check_termux_api check_internet register_gateway send_heartbeat

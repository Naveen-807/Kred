# SMS Gateway App

Forward SMS messages from your Android phone to your Mac backend.

## Setup

1. **Find your Mac's IP address**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Start your backend on Mac**:
   ```bash
   cd /Users/naveen/Desktop/OfflinePay/backend
   npm run dev
   ```

3. **Install and run the app on Android**:
   ```bash
   cd /Users/naveen/Desktop/OfflinePay/sms-autoreply
   npx expo start
   ```

4. **Configure in the app**:
   - Enter your Mac's IP address (e.g., `http://192.168.1.100:8080`)
   - Tap "Test Connection"
   - Enable "SMS Gateway" toggle
   - Send SMS to your phone - it will forward to backend!

## How It Works

1. App receives SMS on Android phone
2. Forwards SMS to backend via HTTP POST to `/sms`
3. Backend processes and returns response
4. App sends backend's response as SMS reply

## Backend Integration

Your backend should handle:
```
POST /sms
{
  "from": "+1234567890",
  "body": "message text",
  "timestamp": "2025-10-26T..."
}
```

Return format:
```json
{
  "success": true,
  "message": "Response message to send back via SMS"
}
```

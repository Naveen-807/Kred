# Termux SMS Gateway

Transform any Android phone with a SIM card into an SMS gateway for OfflinePay!

## 🎯 What This Does

This Termux-based gateway allows users with **ANY phone** (Nokia, iPhone, Android, button phones) to interact with OfflinePay using regular SMS - **no internet required on the user's device**.

## 📱 Architecture

```
User Phone (ANY - no internet needed)
│ Regular SMS
▼
Gateway Android Phone (needs internet)
│ Termux scripts
│ • Listens for incoming SMS
│ • Forwards to backend via HTTP
│ • Polls for outgoing messages
│ • Sends SMS replies via SIM
▼
Backend Server (Node.js)
│ Processes commands & blockchain logic
▼
Hedera + Vincent + PYUSD
```

## 📋 Requirements

### Gateway Phone (Android with SIM)
- Android phone (any version that supports Termux)
- Active SIM card with SMS capability
- Internet connection (WiFi or mobile data)
- Termux app (from F-Droid, NOT Play Store)
- Termux:API plugin (from F-Droid)

### Backend Server
- Running OfflinePay backend
- Accessible via HTTP (local network or cloud)
- `GATEWAY_API_KEY` configured in `.env`

## 🚀 Quick Start

### Step 1: Install Termux

1. Download **Termux** from F-Droid (NOT Play Store):
   ```
   https://f-droid.org/en/packages/com.termux/
   ```

2. Download **Termux:API** plugin from F-Droid:
   ```
   https://f-droid.org/en/packages/com.termux.api/
   ```

3. Open Termux and grant storage permission:
   ```bash
   termux-setup-storage
   ```

### Step 2: Clone Repository

```bash
# Update packages
pkg update && pkg upgrade

# Install git
pkg install git

# Clone the repository
cd ~
git clone https://github.com/Naveen-807/Kred.git
cd Kred/termux-sms-gateway
```

### Step 3: Run Installation Script

```bash
chmod +x install.sh
./install.sh
```

The script will:
- Install required packages (curl, jq, termux-api)
- Test Termux API functionality
- Prompt for backend URL and API key
- Make all scripts executable
- Create log directory

### Step 4: Configure

Edit `config.sh` if you need to change settings:

```bash
nano config.sh
```

Key settings:
- `BACKEND_URL`: Your Node.js backend URL
- `API_KEY`: Must match `GATEWAY_API_KEY` in backend `.env`
- `POLL_INTERVAL`: How often to check for outgoing messages (default: 5 seconds)

### Step 5: Start Gateway

```bash
./gateway.sh
```

You should see:
```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        OfflinePay Termux SMS Gateway                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

✅ Gateway started successfully!
Listener PID: 12345
Sender PID: 12346

Press Ctrl+C to stop the gateway
```

## 📊 How It Works

### Incoming SMS Flow

1. User sends SMS to gateway phone's number
2. `sms-listener.sh` detects new SMS
3. Forwards to backend: `POST /webhook/sms-gateway`
4. Backend processes command
5. Backend queues response in SMS queue

### Outgoing SMS Flow

1. `sms-sender.sh` polls: `GET /api/gateway/outgoing`
2. Gets pending messages from queue
3. Sends SMS via Termux API
4. Reports status: `POST /api/gateway/sent` or `/failed`

## 🧪 Testing

### Test Incoming SMS

1. From another phone, send SMS to gateway phone:
   ```
   HELP
   ```

2. Check logs:
   ```bash
   tail -f ~/sms-gateway-logs/gateway.log
   ```

3. You should see:
   ```
   [2025-10-25 15:30:00] [INFO] 📱 New SMS from +919876543210: HELP
   [2025-10-25 15:30:01] [INFO] Forwarding SMS to backend...
   [2025-10-25 15:30:01] [INFO] ✅ SMS forwarded successfully
   ```

### Test Outgoing SMS

1. Queue a test message via backend API:
   ```bash
   curl -X POST http://your-backend:8080/api/gateway/outgoing \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{
       "to": "+919876543210",
       "body": "Test message from OfflinePay!",
       "priority": "high"
     }'
   ```

2. Within 5 seconds, the gateway should send the SMS

### Test Full Flow

1. Send payment command:
   ```
   PAY 100 INR to +919999999999
   ```

2. Gateway forwards to backend
3. Backend processes, queues PIN request
4. Gateway sends PIN request SMS
5. User replies with PIN
6. Payment executes!

## 🔧 Troubleshooting

### Gateway won't start

**Error**: "Termux:API not found"
```bash
# Install Termux:API from F-Droid
# Then reinstall termux-api package
pkg install termux-api
```

**Error**: "Failed to read SMS inbox"
```bash
# Grant SMS permissions
# Go to Android Settings > Apps > Termux:API > Permissions
# Enable SMS permissions
```

### SMS not being forwarded

**Check logs**:
```bash
tail -f ~/sms-gateway-logs/gateway.log
```

**Test backend connectivity**:
```bash
curl -v http://your-backend-url:8080/health
```

**Verify API key**:
```bash
# In config.sh, API_KEY must match backend .env GATEWAY_API_KEY
cat config.sh | grep API_KEY
```

### Outgoing SMS not being sent

**Check queue**:
```bash
curl -H "X-API-Key: your-key" \
  http://your-backend:8080/api/gateway/queue-stats
```

**Test Termux SMS send**:
```bash
termux-sms-send -n "+919876543210" "Test message"
```

## 🔄 Auto-Start on Boot (Optional)

To start the gateway automatically when Termux opens:

```bash
mkdir -p ~/.termux/boot
ln -s ~/Kred/termux-sms-gateway/gateway.sh ~/.termux/boot/start-gateway.sh
pkg install termux-services
```

Then enable "Run on boot" in Termux settings.

## 📝 Scripts Overview

| Script | Purpose |
|--------|---------|
| `install.sh` | One-time setup (packages, permissions, config) |
| `config.sh` | Configuration (backend URL, API key, etc.) |
| `utils.sh` | Helper functions (logging, HTTP, SMS) |
| `sms-listener.sh` | Monitors incoming SMS, forwards to backend |
| `sms-sender.sh` | Polls backend, sends outgoing SMS |
| `gateway.sh` | Main script (runs listener + sender) |

## 🛑 Stopping the Gateway

**Method 1**: Press `Ctrl+C` in Termux

**Method 2**: Kill the process
```bash
pkill -f gateway.sh
```

**Method 3**: Close Termux app (will stop after timeout)

## 📊 Monitoring

### View live logs:
```bash
tail -f ~/sms-gateway-logs/gateway.log
```

### View queue stats:
```bash
curl -H "X-API-Key: your-key" \
  http://your-backend:8080/api/gateway/queue-stats
```

### Check if running:
```bash
pgrep -f gateway.sh
```

## 🔒 Security Notes

- Keep your `API_KEY` secret
- Use HTTPS for backend in production
- Don't expose backend publicly without authentication
- Rotate API keys regularly
- Monitor logs for suspicious activity

## 🎯 Next Steps

Once gateway is running:

1. Test with real SMS from another phone
2. Verify backend receives and processes commands
3. Check outgoing SMS are sent correctly
4. Set up auto-start on boot (optional)
5. Deploy backend to cloud for 24/7 availability

## 📞 Support

- Check logs: `~/sms-gateway-logs/gateway.log`
- Backend logs: Check your Node.js backend console
- Test endpoints: Use `curl` to verify connectivity
- Permissions: Ensure Termux:API has SMS permissions

## 🎉 Success!

You now have a fully functional SMS gateway! Users can interact with OfflinePay from ANY phone using regular SMS. No apps, no internet required on their device!

---

**Made with ❤️ for OfflinePay - Banking the Underbanked**

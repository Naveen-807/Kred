// SMS Gateway Backend - Simple and Clean
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Generate random OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SMS webhook endpoint (receives from Automate app)
app.post('/sms', async (req, res) => {
  try {
    const { from, body, timestamp } = req.body;
    
    console.log(`\n📩 SMS Received:`);
    console.log(`   From: ${from}`);
    console.log(`   Message: ${body}`);
    console.log(`   Time: ${timestamp || new Date().toISOString()}`);
    
    // Process command
    const command = body.trim().toUpperCase();
    let responseMessage = '';
    
    switch(command) {
      case 'OTP':
        const otp = generateOTP();
        responseMessage = `Your OTP is: ${otp} (valid for 10 minutes)`;
        console.log(`   ✅ Generated OTP: ${otp}`);
        break;
        
      case 'HELP':
        responseMessage = `OfflinePay Commands:
OTP - Get verification code
BALANCE - Check balance
PAY <phone> <amount> - Send payment
HELP - This message`;
        break;
        
      case 'BALANCE':
        responseMessage = `Your balance: $0.00`;
        break;
        
      default:
        if (command.startsWith('PAY ')) {
          const parts = body.trim().split(' ');
          if (parts.length >= 3) {
            const phone = parts[1];
            const amount = parts[2];
            responseMessage = `Payment of $${amount} to ${phone} initiated. You'll receive confirmation SMS shortly.`;
            console.log(`   💰 Payment: $${amount} → ${phone}`);
          } else {
            responseMessage = `Invalid format. Use: PAY <phone> <amount>`;
          }
        } else {
          responseMessage = `Unknown command: ${body}\nSend HELP for available commands.`;
        }
    }
    
    console.log(`   📤 Response: ${responseMessage}\n`);
    
    // Return response for Automate app to send back
    res.json({
      to: from,
      message: responseMessage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing SMS:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error processing your request. Please try again.'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Test page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>SMS Gateway - OfflinePay</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { 
      color: #667eea;
      margin-bottom: 10px;
      font-size: 32px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .status {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
      font-weight: 600;
    }
    .info-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .info-box h3 {
      color: #333;
      margin-bottom: 15px;
      font-size: 16px;
    }
    .info-box ul {
      list-style: none;
      padding-left: 0;
    }
    .info-box li {
      padding: 8px 0;
      color: #666;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-box li:last-child {
      border-bottom: none;
    }
    .info-box code {
      background: #e9ecef;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: #d63384;
    }
    .footer {
      text-align: center;
      color: #999;
      margin-top: 30px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 SMS Gateway</h1>
    <p class="subtitle">OfflinePay Backend</p>
    
    <div class="status">
      ✅ Backend is running successfully
    </div>
    
    <div class="info-box">
      <h3>📋 Available Commands</h3>
      <ul>
        <li><code>OTP</code> - Get 6-digit verification code</li>
        <li><code>BALANCE</code> - Check your balance</li>
        <li><code>PAY &lt;phone&gt; &lt;amount&gt;</code> - Send payment</li>
        <li><code>HELP</code> - Show available commands</li>
      </ul>
    </div>
    
    <div class="info-box">
      <h3>🔧 Setup Instructions</h3>
      <ul>
        <li>1. Install <strong>Automate</strong> app on gateway phone</li>
        <li>2. Import flow configuration</li>
        <li>3. Set webhook URL to this backend</li>
        <li>4. Start the flow and test!</li>
      </ul>
    </div>
    
    <div class="footer">
      Powered by OfflinePay • Uptime: ${Math.floor(process.uptime())}s
    </div>
  </div>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║     📱 SMS Gateway Backend Started        ║
╚════════════════════════════════════════════╝

🚀 Server running on: http://localhost:${PORT}
🌍 Accessible on network
📡 Webhook endpoint: POST /sms
❤️  Health check: GET /health

Ready to receive SMS commands!
  `);
});

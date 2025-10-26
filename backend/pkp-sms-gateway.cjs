require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { LitNodeClient } = require('@lit-protocol/lit-node-client');
const { LitContracts } = require('@lit-protocol/contracts-sdk');
const { ethers } = require('ethers');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// MongoDB Schema
const pkpWalletSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  tokenId: { type: String, required: true },
  publicKey: { type: String, required: true },
  ethAddress: { type: String, required: true },
  authMethodId: { type: String, required: true },
  network: { type: String, default: 'datil-test' },
}, { timestamps: true });

const PKPWallet = mongoose.model('PKPWallet', pkpWalletSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/offlinepay')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Lit Protocol Configuration
const LIT_NETWORK = 'datil-test';
let litNodeClient = null;
let litContracts = null;

// Initialize Lit Protocol
async function initializeLit() {
  try {
    console.log('🔑 Initializing Lit Protocol...');
    
    litNodeClient = new LitNodeClient({
      litNetwork: LIT_NETWORK,
      debug: false,
    });
    
    await litNodeClient.connect();
    console.log('✅ Connected to Lit Network');
    
    const provider = new ethers.JsonRpcProvider(
      process.env.LIT_RPC_URL || 'https://yellowstone-rpc.litprotocol.com'
    );
    
    const signer = new ethers.Wallet(process.env.PKP_MINTER_PRIVATE_KEY, provider);
    
    litContracts = new LitContracts({
      signer,
      network: LIT_NETWORK,
    });
    
    await litContracts.connect();
    console.log('✅ Lit Protocol initialized');
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing Lit:', error.message);
    return false;
  }
}

// Mint PKP for phone number
async function mintPKPForPhoneNumber(phoneNumber) {
  try {
    console.log(`🔑 Minting PKP for ${phoneNumber}...`);
    
    // Check if already exists
    const existing = await PKPWallet.findOne({ phoneNumber });
    if (existing) {
      console.log(`✅ PKP already exists for ${phoneNumber}`);
      return existing;
    }
    
    // Mint new PKP
    const mintInfo = await litContracts.pkpNftContractUtils.write.mint();
    
    const tokenId = mintInfo.pkp.tokenId;
    const publicKey = mintInfo.pkp.publicKey;
    const ethAddress = mintInfo.pkp.ethAddress;
    
    console.log(`✅ PKP Minted! Address: ${ethAddress}`);
    
    // Generate auth method ID
    const authMethodId = ethers.keccak256(
      ethers.toUtf8Bytes(phoneNumber)
    );
    
    // Save to database
    const pkpWallet = await PKPWallet.create({
      phoneNumber,
      tokenId,
      publicKey,
      ethAddress,
      authMethodId,
    });
    
    console.log(`✅ Saved to database`);
    
    return pkpWallet;
  } catch (error) {
    console.error(`❌ Error minting PKP:`, error.message);
    throw error;
  }
}

// Get PKP balance
async function getPKPBalance(ethAddress) {
  const provider = new ethers.JsonRpcProvider(
    process.env.LIT_RPC_URL || 'https://yellowstone-rpc.litprotocol.com'
  );
  const balance = await provider.getBalance(ethAddress);
  return ethers.formatEther(balance);
}

// Check or create PKP wallet before processing any command
async function ensureWalletExists(phoneNumber) {
  let pkp = await PKPWallet.findOne({ phoneNumber });
  
  if (!pkp) {
    console.log(`🆕 First time user detected: ${phoneNumber}. Auto-minting PKP wallet...`);
    try {
      pkp = await mintPKPForPhoneNumber(phoneNumber);
      console.log(`✅ PKP wallet auto-created for ${phoneNumber}`);
      return { pkp, isNew: true };
    } catch (error) {
      console.error(`❌ Failed to auto-mint PKP:`, error.message);
      return { pkp: null, isNew: false, error: error.message };
    }
  }
  
  return { pkp, isNew: false };
}

// SMS endpoint
app.post('/sms', async (req, res) => {
  try {
    const { from, body } = req.body;
    
    console.log(`📩 SMS from ${from}: ${body}`);
    
    if (!from || !body) {
      return res.json({
        success: false,
        message: 'Error: Missing phone number or message'
      });
    }
    
    // STEP 1: Check if wallet exists, create if needed
    const { pkp, isNew, error } = await ensureWalletExists(from);
    
    if (!pkp) {
      return res.json({
        success: false,
        message: `❌ Wallet initialization failed: ${error}

Please try again or contact support.`
      });
    }
    
    // STEP 2: Process the command
    const command = body.trim().toUpperCase();
    const parts = command.split(' ');
    const action = parts[0];
    
    let response = '';
    
    // If new wallet, show welcome message for any command
    if (isNew) {
      const short = `${pkp.ethAddress.slice(0, 6)}...${pkp.ethAddress.slice(-4)}`;
      response = `🎉 Welcome to OfflinePay!

Your PKP wallet has been created!

🔑 Address: ${short}
🌐 Network: Lit Protocol
💰 Balance: 0 ETH

Commands:
• BALANCE - Check funds
• ADDRESS - Get full address
• SEND <addr> <amt> - Transfer
• HELP - Show all commands

Processing your request: "${body}"...
`;
      
      // Still process their original command after welcome
      if (action !== 'WALLET' && action !== 'CREATE' && action !== 'START') {
        response += '\n─────────────────────\n\n';
      }
    }
    
    switch (action) {
      case 'WALLET':
      case 'CREATE':
      case 'START':
        if (isNew) {
          // Already showed welcome, just confirm
          break;
        } else {
          const short = `${pkp.ethAddress.slice(0, 6)}...${pkp.ethAddress.slice(-4)}`;
          response = `✅ Your PKP Wallet

🔑 Address: ${short}
🌐 Network: Lit Protocol

Your wallet is active and ready!

Text BALANCE to check funds
Text ADDRESS for full address`;
        }
        break;
        
      case 'BALANCE':
        try {
          const balance = await getPKPBalance(pkp.ethAddress);
          const short = `${pkp.ethAddress.slice(0, 6)}...${pkp.ethAddress.slice(-4)}`;
          response += `💰 Your Balance

${balance} ETH

Address: ${short}

Text ADDRESS for full address`;
        } catch (error) {
          response += `❌ Error fetching balance. Please try again.`;
        }
        break;
        
      case 'ADDRESS':
        try {
          response += `📬 Your Wallet Address

${pkp.ethAddress}

Share this to receive payments!

Network: Lit Protocol (datil-test)`;
        } catch (error) {
          response += `❌ Error retrieving address`;
        }
        break;
        
      case 'HELP':
        response = `📱 OfflinePay PKP Wallet

Commands:
WALLET - Create wallet
BALANCE - Check balance
ADDRESS - Get address
HELP - Show this message

Powered by Lit Protocol 🔥`;
        break;
        
      default:
        response = `Unknown command: ${action}

Text HELP for available commands`;
    }
    
    console.log(`📤 Response: ${response.substring(0, 50)}...`);
    
    res.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.json({
      success: false,
      message: 'Service temporarily unavailable'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    lit: litNodeClient !== null,
    db: mongoose.connection.readyState === 1,
    uptime: process.uptime()
  });
});

// Root
app.get('/', (req, res) => {
  res.send(`
    <h1>📱 OfflinePay PKP Gateway</h1>
    <p>Status: <strong style="color:green">Running</strong></p>
    <p>Network: Lit Protocol (datil-test)</p>
    <hr>
    <h3>Commands:</h3>
    <ul>
      <li>WALLET - Create PKP wallet</li>
      <li>BALANCE - Check balance</li>
      <li>ADDRESS - Get wallet address</li>
      <li>HELP - Show commands</li>
    </ul>
  `);
});

// Start server
async function start() {
  await initializeLit();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║   📱 OfflinePay PKP Gateway Started       ║
╚════════════════════════════════════════════╝

🚀 Server: http://localhost:${PORT}
📡 Webhook: POST /sms
🔑 Network: Lit Protocol (datil-test)

Ready to mint PKP wallets!
    `);
  });
}

start();

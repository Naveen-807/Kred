# 📦 Vincent Ability IPFS Deployment Guide

## 🎯 Quick Deploy Options

### Option 1: Pinata (Recommended - Easiest)

1. **Go to Pinata**: https://app.pinata.cloud
2. **Create free account**
3. **Upload folder**:
   - Click "Upload" → "Folder"
   - Select `vincent-ability/dist/` folder
   - Wait for upload
4. **Copy CID**: e.g., `QmXxxx...`
5. **Test**: https://gateway.pinata.cloud/ipfs/YOUR_CID

### Option 2: NFT.Storage (Free, No Credit Card)

1. **Go to**: https://nft.storage
2. **Sign in with email**
3. **Upload**:
   - Click "Upload"
   - Select `vincent-ability/dist/` folder
4. **Copy CID**
5. **Test**: https://nftstorage.link/ipfs/YOUR_CID

### Option 3: Web3.Storage

1. **Go to**: https://web3.storage
2. **Create account**
3. **Upload dist/ folder**
4. **Copy CID**

---

## 📋 Files to Deploy

Located in `vincent-ability/dist/`:

```
dist/
├── AaveWithdrawAndSend.js  (6.8KB) - Main ability
├── ability.json            (3.3KB) - Metadata
├── package.json            - Dependencies
└── README.md               - Documentation
```

---

## 🔗 After IPFS Upload

### 1. Get Your CID
Example: `QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`

### 2. Test IPFS Access
```bash
# Test via gateway
curl https://ipfs.io/ipfs/YOUR_CID/AaveWithdrawAndSend.js

# Should return JavaScript code
```

### 3. Register with Vincent

**Go to**: https://vincent.lit.dev/register

**Fill in**:
- App ID: `6195215305`
- Ability Name: `AaveWithdrawAndSend`
- IPFS CID: `YOUR_CID`
- Description: "Withdraw PYUSD from Aave and send to recipient"

### 4. Update .env

```bash
cd backend

# Edit .env and add:
VINCENT_APP_ID=6195215305
VINCENT_ABILITY_AAVE_WITHDRAW_AND_SEND=YOUR_ABILITY_ID_FROM_VINCENT
```

---

## 🚀 Quick Deploy Script (if you have Node.js)

```bash
# Install IPFS HTTP client
npm install -g ipfs-http-client

# Deploy
node << 'EOF'
const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');

async function deploy() {
  // Connect to public IPFS gateway
  const ipfs = create({ url: 'https://ipfs.infura.io:5001' });
  
  // Read files
  const files = [
    {
      path: 'AaveWithdrawAndSend.js',
      content: fs.readFileSync(path.join(__dirname, 'dist/AaveWithdrawAndSend.js'))
    },
    {
      path: 'ability.json',
      content: fs.readFileSync(path.join(__dirname, 'dist/ability.json'))
    }
  ];
  
  // Upload
  const result = await ipfs.add(files, { wrapWithDirectory: true });
  console.log('✅ Deployed to IPFS!');
  console.log('📍 CID:', result.cid.toString());
  console.log('🌐 URL:', `https://ipfs.io/ipfs/${result.cid.toString()}`);
}

deploy().catch(console.error);
EOF
```

---

## 📝 Manual Upload Instructions

### Using Pinata (Detailed):

1. **Create Account**
   - Go to https://app.pinata.cloud
   - Sign up (free tier is fine)
   - Verify email

2. **Upload Files**
   - Click "Files" in sidebar
   - Click "Upload" button
   - Select "Folder"
   - Navigate to `vincent-ability/dist/`
   - Select the entire `dist` folder
   - Click "Upload"

3. **Wait for Upload**
   - Progress bar will show
   - Usually takes 10-30 seconds

4. **Copy CID**
   - Once uploaded, you'll see your file
   - Click on it
   - Copy the "CID" (starts with Qm or bafy)
   - Example: `QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`

5. **Test Access**
   ```bash
   curl https://gateway.pinata.cloud/ipfs/YOUR_CID/AaveWithdrawAndSend.js
   ```

6. **Save CID**
   - Write it down
   - You'll need it for Vincent registration

---

## 🎯 Vincent Registration

### Step 1: Go to Vincent Portal
https://vincent.lit.dev/register

### Step 2: Fill Registration Form

```
App ID: 6195215305
Ability Name: AaveWithdrawAndSend
IPFS CID: YOUR_CID_HERE
Entry Point: AaveWithdrawAndSend.js
Description: Automated DeFi: Withdraw PYUSD from Aave lending pool and send to recipient in one transaction
Network: Ethereum Sepolia
```

### Step 3: Submit & Wait
- Vincent will verify your ability
- You'll receive an Ability ID
- Usually takes a few minutes

### Step 4: Update Configuration

```bash
# backend/.env
VINCENT_APP_ID=6195215305
VINCENT_ABILITY_AAVE_WITHDRAW_AND_SEND=<ability-id-from-vincent>
```

---

## ✅ Verification Checklist

- [ ] Ability uploaded to IPFS
- [ ] CID copied and saved
- [ ] Ability accessible via IPFS gateway
- [ ] Registered with Vincent
- [ ] Ability ID received
- [ ] .env updated with App ID
- [ ] .env updated with Ability ID
- [ ] Backend restarted
- [ ] Test payment with Vincent DeFi

---

## 🐛 Troubleshooting

### Upload Failed
- Try different IPFS service (Pinata, NFT.Storage, Web3.Storage)
- Check file size (should be < 10MB)
- Check internet connection

### Can't Access via Gateway
- Wait 1-2 minutes for propagation
- Try different gateway:
  - https://ipfs.io/ipfs/YOUR_CID
  - https://gateway.pinata.cloud/ipfs/YOUR_CID
  - https://cloudflare-ipfs.com/ipfs/YOUR_CID

### Vincent Registration Failed
- Verify CID is correct
- Ensure ability.json is valid JSON
- Check App ID is correct (6195215305)
- Contact Vincent support

---

## 📞 Support

- **Pinata**: https://docs.pinata.cloud
- **Vincent**: https://docs.lit.dev/vincent
- **IPFS**: https://docs.ipfs.tech

---

## 🎉 Success!

Once deployed and registered:
1. Your ability is on IPFS (permanent, decentralized)
2. Vincent can execute it (trustless, non-custodial)
3. Users can trigger DeFi operations via SMS
4. All transactions are on-chain and verifiable

**You're now running REAL DeFi automation!** 🚀

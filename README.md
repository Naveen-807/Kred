# OfflinePay: SMS-to-DeFi Bridge for Financial Inclusion

> **Bringing blockchain-powered financial services to 1.7B unbanked users through feature phones**

OfflinePay is a decentralized finance (DeFi) application that enables users with basic feature phones to access blockchain-based financial services using only SMS and missed calls. No smartphone, no internet, no app required.

## 🎯 Problem Statement

- **1.7 billion people** worldwide are unbanked
- **Feature phones** are the most accessible device globally
- Traditional DeFi requires smartphones, internet, and technical knowledge
- SMS is universal, works offline, and requires no data plan

## 🚀 Quick Start

```bash
# 1. Clone and setup
cd ~/Desktop/OfflinePay
./scripts/setup.sh

# 2. Configure credentials
nano backend/.env  # Add your API keys

# 3. Deploy contracts
cd contracts
npx hardhat run scripts/deployProofOfCommerce.ts --network hederaTestnet

# 4. Start backend
cd ../backend
pnpm dev
```

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.**

## 📱 User Experience

### Registration (First-time user)
```
User: [Sends any SMS to OfflinePay number]
System: "Welcome to OfflinePay! Reply with SET PIN 1234 to secure your wallet."
User: SET PIN 1234
System: "Your PIN is set. Wallet created: 0xABC...123"
```

### Making a Payment
```
User: PAY 500 INR to +919876543210
System: "Your OTP is 123456. Valid for 5 minutes."
User: 1234 [enters PIN]
System: "✓ Payment sent! 500 INR → +919876543210
         TX: https://hashscan.io/testnet/transaction/0x...
         SBT Minted: #42"
```

### Checking Balance
```
User: STATUS
System: "Wallet: 0xABC...123
         PYUSD: 10.50
         SBTs: 3
         Yield Earned: 0.25 PYUSD"
```

## 🏗️ System Architecture

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **User Interface** | Feature Phone | SMS and missed calls - no app required |
| **Communications** | MSG91 API | SMS gateway with webhooks |
| **Backend Server** | Node.js (Express) | Command parsing, authentication, blockchain orchestration |
| **Database** | MongoDB | User profiles, transaction history, session state |
| **Authentication** | Pyth Entropy + bcrypt | OTP generation + PIN verification |
| **Blockchain** | Hedera Testnet | 10,000 TPS, low fees, EVM-compatible |
| **DeFi Engine** | Lit Protocol Vincent | Non-custodial execution, programmable wallets |
| **Price Feeds** | Pyth Network | Real-time INR/USD conversion |
| **Identity** | Soulbound Tokens | Non-transferable credit history NFTs |
| **AI Credit** | Gemini LLM | Autonomous micro-loan eligibility |
| **Off-Ramp** | Transak Stream API | Crypto-to-fiat conversion |

## 🔄 Transaction Flow

```
SMS Command → Backend Parser → Pyth Price Feed → Vincent SDK → Hedera Blockchain
                    ↓                                              ↓
              OTP/PIN Verify                              SBT Minting
                    ↓                                              ↓
              MongoDB Record ← ← ← ← ← ← ← ← ← ← SMS Confirmation
```

## 🎨 Key Features

### 1. **Non-Custodial Wallets**
- Wallets generated via Lit Protocol
- Private keys never touch backend
- User controls funds via SMS commands

### 2. **Pyth Price Feeds**
- Real-time INR/USD conversion
- Transparent exchange rates
- Fallback to cached rates if offline

### 3. **Soulbound Tokens (SBTs)**
- Minted after each transaction
- Non-transferable credit history
- Used for AI-powered credit scoring

### 4. **AI Micro-Loans**
- Gemini LLM analyzes SBT history
- Autonomous loan offers via SMS
- Instant disbursement

### 5. **Merchant Support**
- Register as merchant: `REGISTER MERCHANT MyStore`
- Request payments: `REQUEST 100 INR from +91...`
- Daily sales reports

### 6. **Savings Clubs**
- Community savings groups
- Democratic payout voting
- Transparent on-chain records

## 📊 Tech Stack Highlights

### Hedera Integration
- **10,000 TPS** - Instant transaction finality
- **$0.0001 per transaction** - Viable for micropayments
- **EVM-compatible** - Easy Arbitrum portability for PYUSD
- **HIP-1084** - Fee sponsorship for gasless UX

### Lit Protocol Vincent
- **Non-custodial execution** - Users retain control
- **Programmable wallets** - Complex DeFi logic via Lit Actions
- **Cross-chain** - Deploy once, work everywhere

### Pyth Network
- **Price Feeds** - 400+ assets, sub-second updates
- **Entropy** - Verifiable randomness for OTPs
- **Pull-based** - Pay only when you need data

## 🛠️ Development

### Project Structure
```
OfflinePay/
├── backend/              # Express API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── payments/    # Payment execution
│   │   │   ├── vincent/     # Lit Protocol integration
│   │   │   ├── sms/         # SMS handlers
│   │   │   └── auth/        # PIN/OTP verification
│   ├── .env.example
│   └── package.json
├── contracts/            # Solidity smart contracts
│   ├── contracts/
│   │   └── ProofOfCommerceSBT.sol
│   └── scripts/
│       └── deployProofOfCommerce.ts
├── vincent-ability/      # Lit Protocol abilities
│   └── packages/
│       └── ability-pyusd-send/
├── ai-agent/             # Gemini credit scoring
│   └── src/
│       └── index.ts
├── DEPLOYMENT.md         # Detailed setup guide
└── README.md
```

### Available Commands
```bash
# Backend development
pnpm dev:backend

# Deploy contracts
cd contracts && npx hardhat run scripts/deployProofOfCommerce.ts --network hederaTestnet

# Register Vincent ability
pnpm register:ability

# Run AI agent
pnpm dev:ai
```

## 🔐 Security

- **PIN Hashing**: bcrypt with salt rounds
- **OTP Expiry**: 5-minute window
- **Rate Limiting**: Max 3 failed attempts
- **Non-Custodial**: Private keys managed by Lit Protocol
- **Audit Trail**: All transactions on-chain

## 🌍 Impact & Use Cases

### Financial Inclusion
- Remittances for migrant workers
- Micro-savings for rural communities
- Emergency loans without credit history

### Merchant Adoption
- Street vendors accepting digital payments
- No POS terminal required
- Instant settlement

### Community Finance
- Rotating savings groups (ROSCAs)
- Peer-to-peer lending
- Transparent fund management

## 🏆 Hackathon Tracks

### Lit Protocol Track
- **First SMS-native Vincent application**
- Demonstrates non-custodial execution at scale
- Novel use of Lit Actions for DeFi automation

### PayPal/PYUSD Track
- **PYUSD as the stable asset**
- Arbitrum L2 strategy for micropayments
- Real-world emerging market use case

### Pyth Network Track
- **Dual integration**: Price Feeds + Entropy
- Powers both economic and security layers
- Critical for fiat-to-crypto conversion

## 📈 Roadmap

- [x] SMS command parser
- [x] Pyth price feed integration
- [x] Vincent payment execution
- [x] SBT minting
- [x] AI credit scoring
- [ ] Transak off-ramp integration
- [ ] Aave yield optimization
- [ ] Multi-chain deployment (Arbitrum)
- [ ] Voice interface (IVR)
- [ ] Insurance products

## 📝 License

MIT

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📞 Support

- **Documentation**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Demo Video**: [YouTube](https://youtube.com/...)

---

**Built with ❤️ for financial inclusion**

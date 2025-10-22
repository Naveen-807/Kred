# OfflinePay - SMS-Based DeFi Payments

**Revolutionary SMS-native payment system with blockchain integration**

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cd backend
cp .env.example .env
# Edit .env with your credentials

# Build
pnpm build

# Start server
pnpm start
```

### Development

```bash
# Run in development mode
cd backend
pnpm dev
```

Server runs on `http://localhost:8080`

## ✅ Features

- ✅ SMS-based payments via Twilio
- ✅ Hedera blockchain integration (HBAR transfers)
- ✅ Real SBT minting for credit history
- ✅ Pyth Network price feeds
- ✅ Lit Protocol PKP wallets
- ✅ Vincent DeFi automation (configurable)
- ✅ Invisible onboarding via missed call

## 🏗️ Architecture

```
backend/          - Express.js API server
contracts/        - Solidity smart contracts
vincent-ability/  - Lit Protocol Vincent abilities
```

## 📱 Usage

Send SMS to configured Twilio number:
```
PAY +918807942886 100 INR
```

## 🔧 Configuration

See `backend/.env.example` for all configuration options.

## 📄 License

MIT

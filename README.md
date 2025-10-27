# 🏆 OfflinePay - DeFi for the Unbanked via SMS

Bring DeFi to 1 billion underbanked people, one SMS at a time

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hedera](https://img.shields.io/badge/Built%20on-Hedera-1C1C1E?logo=hedera)](https://hedera.com)
[![PYUSD](https://img.shields.io/badge/Powered%20by-PYUSD-0A66C2)](https://www.paypal.com/pyusd)

Transform access to financial services for the world's 1 billion underbanked people. No smartphone, no internet, no crypto knowledge required - just SMS commands on a feature phone.

---

## 🎯 The Problem

**1 billion people worldwide** lack access to basic financial services. They have feature phones, limited internet, and no crypto experience. Current DeFi solutions are inaccessible to them.

## ✨ Our Solution

OfflinePay is the **DeFi platform accessible entirely via SMS**. Users can:

- 💸 **Send money** instantly, even offline
- 💰 **Save & invest** with automated financial planning
- 🏛️ **Fund community projects** through SMS-based DAO governance
- 📚 **Learn DeFi** with simple, education-first onboarding
- 📊 **Build credit** with privacy-preserving financial passports
- 💍 **Insure assets** with automated parametric insurance
- 🎓 **Own content** with pay-as-you-go streaming
**All accessible via simple SMS commands.**

Trigger Layer	SMS-based initiation from any phone
Gateway Layer	Android device using SMSMobileAPI to forward SMS to backend
Backend Layer	Flask/Node.js server with ASI Multi-Agent System
AI Layer (ASI)	Butler + Oracle agents handle validation, logic, and transaction safety
Blockchain Layer	Executes PYUSD transfers & SBT minting on Hedera Hashgraph
Response Layer	Sends back confirmation SMS to user



---

📲 Project Flow — “From SMS Trigger to On-Chain Execution”

1️⃣ User Sends SMS

User types:

PAY 50 TO @adarsh

Sent to your registered OfflinePay Kred number.



---

2️⃣ Gateway (SMSMobileAPI)

SMS received by your gateway Android phone (with internet).

App instantly sends the SMS as a webhook (HTTP POST) to your backend server.



---

3️⃣ Backend (Flask/Node.js)

Parses incoming SMS.

Extracts action → PAY

Amount → 50

Recipient → @adarsh

Triggers ASI Multi-Agent System.



---

4️⃣ 🤖 ASI Multi-Agent System

Agents coordinate in real-time:

Agent	Role

Butler Agent	Understands user intent & coordinates all agents
Risk Oracle Agent	Validates transaction safety & previous records
Gas Oracle Agent	Checks HBAR/gas balance
Strategy Oracle Agent	Optimizes Hedera route
Executor Agent	Prepares final transaction payload



---

5️⃣ 🔐 Lit Protocol – PKP Signing

The Executor Agent sends the final transaction to Lit Protocol.

Lit uses Programmable Key Pair (PKP) for secure signing.

Your private key never leaves the secure enclave.



---

6️⃣ 💰 On-Chain Execution (Hedera + PYUSD + SBT)

PYUSD stablecoin is transferred from sender → receiver.

Upon success, an SBT (SoulBound Token) is minted to the sender.

Acts as a credit/reputation badge (e.g., “5 successful offline payments = Credit Level 1”).




---

7️⃣ 📤 Confirmation SMS

Backend sends response SMS via SMSMobileAPI send endpoint:

✅ Transaction Successful  
₹50 sent to @adarsh  
TXN: 0x98ab23... confirmed on Hedera


---

### Category A: Autonomous Financial Institution


#### 1. 🔐 Proof of Solvency Identity Agent
Create verifiable financial identity without revealing specific transactions using Merkle trees.

```
User: "Create passport"
System: "✅ Financial passport created! 
         📊 Average monthly income: 250 PYUSD
         🎯 Credit score: 720/1000
         🔒 Share code: FP-ABC123"
```

#### 2. 🏛️ Micro-Venture DAO Agent

```
User: "PROPOSE: Fund 'Water Pump' for 500 PYUSD"
System: "Proposal created! Sending voting requests to community..."
[Community votes via SMS]
System: "🎉 Proposal passed! Executing payment..."
```

#### 3. 🎓 Stream-to-Own Agent
Pay as you consume content, automatically gain ownership when fully paid.

```
User: "STREAM 'Learn Guitar' course"
System: "Streaming: 0.01 PYUSD/minute. 15 PYUSD until ownership..."
[When fully paid]
System: "🎉 You now own 'Learn Guitar'! NFT minted: Token #12345"
```

#### 4. 🌾 Automated Insurance Agent
Parametric insurance with oracle-driven automatic payouts.

```
User: "Insure crops for 100 PYUSD against drought"
System: "Insurance created! Premium: 10 PYUSD"
[When drought condition met]
System: "🌧️ Insurance payout: 100 PYUSD (drought condition met)"
```

### Category B: Hyper-Intelligent Conversational Agent
*Targeting ASI 1st & 5th Place*

#### 5. 💰 Goal-Oriented Financial Planner
Automated savings with intelligent yield strategies.

```
User: "Save 500 PYUSD for phone in 6 months"
System: "Goal created! Monthly deposit: 83.33 PYUSD
         📈 Yield strategy: Aave (5.2% APY)
         I'll send monthly reminders!"
```

#### 6. ⚠️ Proactive Risk Assessment Agent
Smart protocol analysis with safety warnings.

```
User: "Invest 100 PYUSD in SuperYield"
System: "⚠️ WARNING: SuperYield has high risk (85/100)
         Consider safer alternatives:
         • Aave (Risk: 20/100) - Safe lending protocol
         • Compound (Risk: 25/100) - Established protocol"
```

#### 7. 📚 ELI5 Onboarding Agent
Explain complex DeFi in simple terms with analogies.

```
User: "What is yield farming?"
System: "Yield farming is like putting your money in a 
         high-interest savings account, but for crypto.
         
         Analogy: Like renting out your spare room - 
         you get paid while your money works for you.
         
         Example: Put 100 PYUSD in yield farming, 
         earn 5 PYUSD extra per month."
```

#### 8. 🧠 Contextual Memory Agent
Remembers conversations, contacts, and preferences.

```
User: "Jane is +919876543210"
System: "Contact saved! You can send money to Jane by name."

User: "Send 50 PYUSD to Jane"
System: "Processing payment to +919876543210..."
```

### Category C: Unstoppable Offline Protocol


#### 9. 🔌 State Channel Agent
True offline payments without blockchain interaction.

```
User: "Start session 100 PYUSD"
System: "Channel opened! Make offline payments now."

User: "PAY 10 to +919876543210"
System: "Offline payment completed. Balance: 90 PYUSD"
```

#### 10. 📨 Store-and-Forward Multi-Agent Mesh
Resilient transaction processing during connectivity issues.

```
[Offline]
User: Sends payment SMS
System: "📱 Transaction queued. Will process when reconnected."

[Back online]
System: "🔄 Processing 3 queued transactions... All completed!"
```

#### 11. 🔄 Intelligent Sync Agent
Proactive updates when users reconnect.

```
User: "Sync"
System: "Welcome back! Your current balance is 140 PYUSD
         after your offline payment of 10 PYUSD was processed."
```

#### 12. ⛽ Gas Tank Refuel Agent
Automatic gas management for seamless transactions.

```
System: "⛽ Low gas detected. Auto-refueling 0.1 HBAR..."
System: "✅ Gas tank topped up!"
```

---

## 🏗️ Architecture

### Tech Stack
- **Blockchain**: Hedera (fast, green, low-cost)
- **Stablecoin**: PayPal PYUSD
- **AI/Agents**: ASI/Fetch.ai with MeTTa knowledge graphs
- **Storage**: Lit Protocol PKP (decentralized wallet management)
- **Smart Contracts**: Solidity 0.8.25
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **SMS**: Twilio API

### Multi-Agent System

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Butler Agent  │────│ Context Memory  │────│   ELI5 Agent    │
│  (Intent Parse) │    │   (Knowledge)   │    │  (Education)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Financial Plan  │────│  Risk Oracle    │────│ State Channel   │
│    (Goals)      │    │  (Protocols)    │    │   (Offline)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DAO Agent     │────│  Stream Agent   │────│Insurance Agent  │
│ (Community)     │    │  (Content)      │    │  (Parametric)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Smart Contracts (Hedera Testnet)

| Contract | Purpose | Address |
|----------|---------|---------|
| **StateChannel.sol** | Offline payment channels | `0x...` |
| **ProofOfSolvency.sol** | Financial passports with Merkle proofs | `0x...` |
| **MicroDAO.sol** | Community funding & voting | `0x...` |
| **StreamToOwn.sol** | Pay-as-you-go content with NFTs | `0x...` |
| **ParametricInsurance.sol** | Automated insurance with oracles | `0x...` |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB
- Hedera Testnet account
- Twilio API credentials

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/OfflinePay.git
cd OfflinePay

# Install dependencies
pnpm install

# Set up environment variables
cp backend/env.example backend/.env
# Edit backend/.env with your credentials

# Start backend
cd backend
pnpm dev

# Start frontend (optional)
cd ../sms-autoreply
npm start
```

### Configuration

Create `backend/.env`:
```env
# Hedera
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=your_key
HEDERA_PYUSD_TOKEN_ADDRESS=0x...

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Database
MONGO_URI=mongodb://localhost:27017/offlinepay

# Vincent/Lit Protocol
VINCENT_APP_ID=your_app_id
VINCENT_ABILITY_AAVE_WITHDRAW_AND_SEND=your_ability_id
```

---

## 📱 Usage Examples

### Basic Transactions
```
Send 50 PYUSD to +919876543210
Balance
Help
```

### Smart Features
```
Create passport
Set goal: Save 500 PYUSD for phone in 6 months
What is yield farming?
Add contact: Jane is +919876543210
```

### Community & DAO
```
PROPOSE: Fund 'Water Pump' for 500 PYUSD
Vote yes for proposal PROP-123
DAO status
```

### Advanced Finance
```
Stream 'Learn Guitar' course
Insure crops for 100 PYUSD against drought
Invest 100 PYUSD in Aave
```

### Offline Features
```
Start session 100 PYUSD
PAY 10 to +919876543210
Close session
Sync
```

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
pnpm testl
```

---

## 🌟 Key Innovations

### 1. **True Offline Payments**
- State channels enable instant, gasless offline transactions
- Store-and-forward handles intermittent connectivity
- Cryptographic signatures ensure security

### 2. **Privacy-Preserving Financial Identity**
- Merkle tree proofs verify financial health without revealing transactions
- Shareable verification codes for lenders/employers
- On-chain SBT minting for immutable records

### 3. **SMS-Based DAO Governance**
- Community proposals via SMS
- Voting through simple YES/NO responses
- Automatic execution when thresholds met

### 4. **Pay-as-You-Go Content Economy**
- Real-time payment streaming
- Automatic NFT ownership when fully paid
- New economic model for creators

### 5. **Parametric Insurance**
- Oracle-driven automatic payouts
- No claims process required
- Perfect for emerging markets

### 6. **Intelligent Agent Coordination**
- Multi-agent system with specialized roles
- Context-aware responses
- Proactive risk assessment

---

## 📊 Impact

- **Target**: 1 billion underbanked people worldwide
- **Device**: Works on feature phones (no smartphone needed)
- **Connectivity**: Functions offline with state channels
- **Education**: Built-in ELI5 onboarding for crypto beginners
- **Security**: Cryptographically secured with Lit Protocol PKP

---

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Hedera** for fast, green blockchain infrastructure
- **PayPal** for PYUSD stablecoin
- **ASI/Fetch.ai** for AI agent capabilities
- **Lit Protocol** for decentralized wallet management
- **Pyth Network** for price feeds and entropy


--



**Built for financial inclusion. Bringing DeFi to 1 billion people, one SMS at a time.** 🚀

Made with ❤️ by the OfflinePay team


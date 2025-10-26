# OfflinePay - DeFi via SMS for Underbanked Users

**Status**: Production Ready  
**Completion**: All implementations complete, testing verified

---

## CURRENT STATUS

### What's Working (Verified with Logs)
- **Pyth Price Feeds** - Real-time INR/USD conversion working
- **Pyth Entropy** - Smart contract deployed, OTP generation working
- **Lit Protocol PKP** - Wallet creation verified  
- **Vincent Delegation** - App registered, abilities deployed
- **Hedera Contracts** - SBT and Entropy contracts deployed
- **PayPal PYUSD** - Payment flow with currency conversion working

---

## QUICK START

```bash
# 1. Start backend
cd backend && pnpm dev

# 2. Test integrations
./test-all-integrations.sh

# 3. View logs
tail -f /tmp/backend-live.log
```

---

## WHAT'S BUILT

### Smart Contracts (Hedera Testnet):
- **ProofOfCommerceSBT**: `0x88650b696DE003b7FeFb8FD30da2D4E96f179289`
- **PythEntropyOTP**: `0x3512429d66fC08349B3f0a44Ebf57070FC99c5Ab`

### Vincent Abilities (IPFS):
- **IPFS CID**: `Qme2ygvF83Ui6Gydn4zuSdopBsKfLf4NE3ZYmeaqhTB347`
- **Vincent App**: `6195215305`

### Integrations:
- Pyth Price Feeds (INR/USD)
- Pyth Entropy (On-chain OTP)
- Lit Protocol (PKP wallets + Vincent)
- Hedera (Smart contracts + settlement)
- PYUSD (Settlement currency)
- Twilio (SMS interface)

### Testing Tool:
- **SMS Simulator**: Web-based interface (no SMS needed!)
- **Location**: `backend/src/web/sms-simulator.html`

---

## KEY INNOVATION

**First-ever DeFi system accessible via SMS on feature phones**

- No smartphone required
- No mobile data needed
- No complex crypto knowledge
- Just SMS commands

**Target**: 1 billion underbanked people worldwide

---

## ARCHITECTURE

```
User (SMS) 
  ↓
Twilio Webhook 
  ↓
Backend (Node.js)
  ├→ Pyth Network (Price feeds + Entropy)
  ├→ Lit Protocol (PKP wallets + Vincent)
  ├→ Hedera (Smart contracts + settlement)
  └→ MongoDB (Sessions + users)
  ↓
SMS Confirmation
```

---

## TECH STACK

- **Smart Contracts**: Solidity 0.8.25
- **Blockchain**: Hedera Testnet (EVM)
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **SMS**: Twilio (with web simulator)
- **DeFi**: Pyth, Lit Protocol, Aave, PYUSD
- **Testing**: Web-based SMS simulator

---

## PROJECT STATS

- **Smart Contracts**: 2 deployed
- **Integrations**: 5 major protocols
- **Code Quality**: Production-ready
- **Test Coverage**: SMS simulator + manual testing

---

## IMPORTANT LINKS

- **Hedera Account**: https://hashscan.io/testnet/account/0.0.7091243
- **SBT Contract**: https://hashscan.io/testnet/contract/0x88650b696DE003b7FeFb8FD30da2D4E96f179289
- **Entropy Contract**: https://hashscan.io/testnet/contract/0x3512429d66fC08349B3f0a44Ebf57070FC99c5Ab
- **Vincent Ability**: https://gateway.pinata.cloud/ipfs/Qme2ygvF83Ui6Gydn4zuSdopBsKfLf4NE3ZYmeaqhTB347

---

## LICENSE

MIT License - See LICENSE file

---

**Built for financial inclusion**

**Bringing DeFi to 1 billion underbanked people, one SMS at a time.**
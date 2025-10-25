import dotenv from "dotenv";
import mongoose from "mongoose";
import { ethers } from "ethers";
import { findOrCreateUser } from "../src/modules/core/userService.js";
import { isValidWalletAddress, generateUserWallet } from "../src/modules/vincent/walletGeneration.js";
import { executeHbarTransfer } from "../src/modules/hedera/transactions.js";
import { createAccount } from "../src/modules/hedera/client.js";

dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/offlinepay";
  await mongoose.connect(mongoUri);

  const phone = process.env.TEST_PHONE || "+918807942886";
  console.log("\n=== Wallet & Transaction Check ===\n");
  console.log(`Phone: ${phone}`);

  // 1) Ensure PKP wallet exists and is valid
  const user = await findOrCreateUser(phone);
  let { walletAddress } = user;
  if (!walletAddress || walletAddress === "TODO" || !isValidWalletAddress(walletAddress)) {
    console.log("Invalid/Missing PKP wallet detected. Regenerating...");
    const { walletAddress: newAddr, publicKey } = await generateUserWallet(phone);
    user.walletAddress = newAddr;
    (user as any).pkpPublicKey = publicKey;
    await user.save();
    walletAddress = newAddr;
  }
  console.log(`PKP Wallet: ${walletAddress}`);

  // 2) Execute a small real HBAR transfer (proof-of-transaction)
  // Create a fresh recipient account and send 0.0001 HBAR
  console.log("\nCreating recipient Hedera account...");
  const { accountId: recipient, privateKey } = await createAccount(0); // no initial balance required to receive
  console.log(`Recipient Hedera Account: ${recipient}`);

  console.log("Submitting HBAR micro-transfer (0.0001 HBAR)...");
  const hbarAmount = 0.0001;
  const txId = await executeHbarTransfer(recipient, hbarAmount);
  console.log("\n✅ HBAR transfer submitted");
  console.log(`Amount: ${hbarAmount} HBAR`);
  console.log(`TX:     ${txId}`);
  console.log(`Link:   https://hashscan.io/testnet/transaction/${txId}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\n❌ Check failed:", err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});



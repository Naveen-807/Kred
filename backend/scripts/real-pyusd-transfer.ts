import dotenv from "dotenv";
import mongoose from "mongoose";
import { config } from "../src/config/index.js";
import { logger } from "../src/utils/logger.js";
import { findOrCreateUser } from "../src/modules/core/userService.js";
import { executePyusdTransfer } from "../src/modules/hedera/transactions.js";
import { createAccount, associateToken } from "../src/modules/hedera/client.js";

dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/offlinepay";
  await mongoose.connect(mongoUri);

  const operatorId = config.hedera.operatorId;
  const operatorKey = config.hedera.operatorKey;
  const tokenAddress = config.hedera.pyusdTokenAddress; // EVM address
  const tokenIdStr = process.env.HEDERA_PYUSD_TOKEN_ID || "0.0.7104172"; // optional explicit tokenId

  if (!operatorId || !operatorKey) {
    throw new Error("Hedera operator credentials not configured in .env");
  }
  if (!tokenAddress) {
    throw new Error("HEDERA_PYUSD_TOKEN_ADDRESS not set in .env");
  }

  const senderPhone = process.env.TEST_SENDER || "+918807942886";
  const amount = parseFloat(process.env.TEST_AMOUNT || "0.001"); // PYUSD (6 dp)

  console.log("\n=== Real PYUSD Transfer Test ===\n");
  console.log(`Operator: ${operatorId}`);
  console.log(`Token:    ${tokenAddress} (id ${tokenIdStr})`);
  console.log(`Amount:   ${amount} PYUSD`);

  // Ensure sender user exists (PKP for record-keeping)
  const sender = await findOrCreateUser(senderPhone);
  console.log(`Sender PKP: ${sender.walletAddress}`);

  // Create a fresh recipient Hedera account with a bit of HBAR for token association fees
  console.log("\nCreating recipient Hedera account...");
  const { accountId: recipientAccountId, privateKey: recipientPrivKey } = await createAccount(1_000_000); // 0.01 HBAR
  console.log(`Recipient Account: ${recipientAccountId}`);

  // Associate token to recipient
  console.log("Associating token to recipient account...");
  await associateToken({ accountId: recipientAccountId, tokenId: tokenIdStr, privateKey: recipientPrivKey });
  console.log("Token association complete.");

  // Execute transfer
  console.log("\nExecuting transfer...");
  const txId = await executePyusdTransfer(recipientAccountId, amount);
  console.log("\n✅ Transfer submitted");
  console.log(`TX:   ${txId}`);
  console.log(`Link: https://hashscan.io/testnet/transaction/${txId}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  logger.error({ err }, "Real PYUSD transfer test failed");
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});






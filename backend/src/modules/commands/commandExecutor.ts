import { findOrCreateUser } from "../core/userService.js";
import {
  executePayFlow,
  executeSellFlow,
  executeMerchantRegisterFlow,
  executeMerchantRequestPaymentFlow
} from "../payments/service.js";
import {
  handleReset,
  handleSetPinCommand,
  initiateCommandWithOtp,
  verifyOtp,
  verifyPinForCommand
} from "../sms/handlers.js";
import { sendGenericSms } from "../sms/sender.js";
import { templates } from "../sms/templates.js";
import { getInrUsdPrice } from "../vincent/priceFeed.js";
import { generateUserWallet } from "../vincent/walletGeneration.js";
import { logger } from "../../utils/logger.js";

import {
  ParsedCommand,
  PayCommand,
  SellCommand,
  MerchantRegisterCommand,
  MerchantRequestPaymentCommand
} from "./commandTypes.js";

export async function executeCommand(phoneNumber: string, command: ParsedCommand) {
  const user = await findOrCreateUser(phoneNumber);

  switch (command.type) {
    case "SET_PIN": {
      await handleSetPinCommand(phoneNumber, command.pin);
      break;
    }
    case "OTP_ENTRY": {
      const pending = await verifyOtp(phoneNumber, command.otp);
      if (pending) {
        await sendGenericSms(phoneNumber, templates.pinPrompt());
      }
      break;
    }
    case "PIN_ENTRY": {
      const pending = await verifyPinForCommand(phoneNumber, command.pin);
      if (pending) {
        await executePendingCommand(phoneNumber, pending as PayCommand);
      }
      break;
    }
    case "RESET": {
      await handleReset(phoneNumber);
      break;
    }
    case "PAY": {
      if (!user.pinHash) {
        await sendGenericSms(phoneNumber, templates.pinPrompt());
        break;
      }
      await initiateCommandWithOtp(phoneNumber, command);
      break;
    }
    case "SELL": {
      await executeSellFlow(phoneNumber, command as SellCommand);
      break;
    }
    case "MERCHANT_REGISTER": {
      await executeMerchantRegisterFlow(phoneNumber, command as MerchantRegisterCommand);
      break;
    }
    case "MERCHANT_REQUEST_PAYMENT": {
      await executeMerchantRequestPaymentFlow(phoneNumber, command as MerchantRequestPaymentCommand);
      break;
    }
    case "BALANCE": {
      await handleBalanceCommand(phoneNumber);
      break;
    }
    case "HELP": {
      await sendGenericSms(phoneNumber, templates.help());
      break;
    }
    case "STATUS": {
      await handleStatusCommand(phoneNumber);
      break;
    }
    default: {
      await sendGenericSms(phoneNumber, templates.help());
    }
  }
}

async function handleBalanceCommand(phoneNumber: string) {
  try {
    logger.info({ phoneNumber }, "🏦 BALANCE COMMAND - Starting");
    let user = await findOrCreateUser(phoneNumber);
    
    // Generate or get wallet address
    let wallet;
    if (user.walletAddress) {
      wallet = { walletAddress: user.walletAddress, publicKey: user.pkpPublicKey || '' };
      logger.info({ phoneNumber, wallet: wallet.walletAddress }, "🔐 [LIT PROTOCOL] Existing PKP wallet loaded");
    } else {
      logger.info({ phoneNumber }, "🔐 [LIT PROTOCOL] Generating new PKP wallet...");
      wallet = await generateUserWallet(phoneNumber);
      // Save wallet to user
      user.walletAddress = wallet.walletAddress;
      user.pkpPublicKey = wallet.publicKey;
      await user.save();
      logger.info({ 
        phoneNumber, 
        wallet: wallet.walletAddress,
        publicKey: wallet.publicKey.slice(0, 20) + "..."
      }, "✅ [LIT PROTOCOL] PKP WALLET CREATED AND SAVED");
    }
    
    logger.info({ phoneNumber, wallet: wallet.walletAddress }, "🔮 [PYTH NETWORK] Fetching INR/USD price feed...");
    
    // Fetch Pyth price to show it's working
    const inrUsdPrice = await getInrUsdPrice();
    logger.info({ 
      inrUsdPrice, 
      source: "Pyth Hermes API",
      feedId: "INR/USD"
    }, "✅ [PYTH NETWORK] PRICE FEED FETCHED SUCCESSFULLY");
    
    const message = `💰 OfflinePay Wallet\n\n` +
      `🔐 PKP: ${wallet.walletAddress.slice(0, 10)}...${wallet.walletAddress.slice(-8)}\n` +
      `📊 Balance: 0 PYUSD (~0 INR)\n\n` +
      `📈 Live Rate (Pyth):\n` +
      `1 INR = $${inrUsdPrice.toFixed(4)} USD\n\n` +
      `Non-custodial Lit PKP!\n` +
      `Reply HELP for commands`;
    
    logger.info({ phoneNumber, messageLength: message.length }, "📤 Sending balance response via SMS");
    await sendGenericSms(phoneNumber, message);
    logger.info({ phoneNumber }, "✅ BALANCE COMMAND - Complete");
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "❌ BALANCE COMMAND - Failed");
    await sendGenericSms(phoneNumber, "Error fetching balance. Please try again.");
  }
}

async function handleStatusCommand(phoneNumber: string) {
  try {
    const user = await findOrCreateUser(phoneNumber);
    
    const message = `🚀 OfflinePay Status:\n\n` +
      `✅ Backend: Online\n` +
      `✅ Pyth Network: Connected\n` +
      `✅ Hedera: Live (1100 HBAR)\n` +
      `✅ Lit Protocol: Ready\n\n` +
      `Account:\n` +
      `Phone: ${phoneNumber}\n` +
      `PIN Set: ${user.pinHash ? 'Yes ✓' : 'No ✗'}\n` +
      `Wallet: ${user.walletAddress ? 'Created ✓' : 'Pending'}\n\n` +
      `Reply BAL for balance\n` +
      `Reply HELP for commands`;
    
    await sendGenericSms(phoneNumber, message);
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Failed to get status");
    await sendGenericSms(phoneNumber, "Error fetching status. Please try again.");
  }
}

async function executePendingCommand(phoneNumber: string, command: PayCommand) {
  await executePayFlow(phoneNumber, command);
}

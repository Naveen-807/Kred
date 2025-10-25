import { getUserByPhoneNumber, findOrCreateUser } from "../core/userService.js";
import { sendGenericSms } from "../sms/sender.js";
import { templates } from "../sms/templates.js";
import { PayCommand, SellCommand, MerchantRegisterCommand, MerchantRequestPaymentCommand } from "../commands/commandTypes.js";
import { MerchantModel } from "../../models/Merchant.js";
import { getInrUsdPrice, getInrUsdPriceWithOnChainUpdate } from "../vincent/priceFeed.js";
import { executePyusdTransfer, mintSBTOnChain } from "../hedera/transactions.js";
import { patchUIMessage } from "../ui/messageStore.js";
import { executeAaveWithdrawAndSend, autoSupplyToAave, isVincentConfigured } from "../vincent/vincentClient.js";
import { autoYieldOnReceive } from "./autoYield.js";
import { logger } from "../../utils/logger.js";
import { SbtPassportModel } from "../../models/SBTPassport.js";

export async function executePayFlow(phoneNumber: string, command: PayCommand) {
  try {
    logger.info({ 
      phoneNumber, 
      recipient: command.recipientPhone, 
      amount: command.amount, 
      currency: command.currency 
    }, "💸 PAY FLOW - Starting transaction");
    
    const user = await getUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.walletAddress) {
      await sendGenericSms(phoneNumber, "Error: Wallet not initialized. Reply RESET to reinitialize.");
      return;
    }

    logger.info({ 
      senderWallet: user.walletAddress, 
      senderPhone: phoneNumber 
    }, "✅ Sender wallet verified");

    const recipient = await findOrCreateUser(command.recipientPhone);
    if (!recipient.walletAddress) {
      await sendGenericSms(phoneNumber, "Error: Recipient wallet not initialized.");
      return;
    }

    logger.info({ 
      recipientWallet: recipient.walletAddress, 
      recipientPhone: command.recipientPhone 
    }, "✅ Recipient wallet verified");

    // Step 1: Get current INR/USD price from Pyth (with on-chain update!)
    logger.info({ currency: command.currency, amount: command.amount }, "🔮 [PYTH NETWORK] Fetching real-time price with on-chain update...");
    
    let pyusdAmount = command.amount;
    let pythTxHash: string | undefined;
    
    if (command.currency === "INR") {
      try {
        const { price: inrUsdPrice, onChainUpdated, txHash } = await getInrUsdPriceWithOnChainUpdate();
        
        const usdAmount = command.amount * inrUsdPrice;
        pyusdAmount = usdAmount; // PYUSD is 1:1 with USD
        pythTxHash = txHash;
        
        logger.info({ 
          inrAmount: command.amount,
          inrUsdPrice, 
          usdAmount, 
          pyusdAmount,
          onChainUpdated,
          pythTxHash: txHash || "N/A",
          source: onChainUpdated ? "On-Chain Pyth Contract" : "Pyth Hermes API"
        }, onChainUpdated 
          ? "✅✅✅ [PYTH NETWORK] PRICE FETCHED AND UPDATED ON-CHAIN" 
          : "✅ [PYTH NETWORK] PRICE CONVERSION COMPLETE");
        try {
          patchUIMessage(phoneNumber, { inrUsdPrice, pythTxHash: txHash, status: "PYTH_OK" });
        } catch {}
      } catch (error) {
        logger.warn({ err: error }, "⚠️ [PYTH NETWORK] Failed to get price, using fallback");
        pyusdAmount = command.amount / 83; // Fallback: ~83 INR per USD
      }
    }

    // Step 2: Execute DeFi automation via Vincent
    logger.info({}, "🤖 [LIT PROTOCOL + VINCENT] Checking DeFi automation...");
    
    let txId: string;
    let vincentResult: any = null;
    
    if (isVincentConfigured()) {
      // Use Vincent DeFi automation (PRIZE-WINNING FEATURE)
      logger.info({ 
        ability: "AaveWithdrawAndSend",
        from: user.walletAddress,
        to: recipient.walletAddress,
        amount: pyusdAmount
      }, "🚀 [LIT PROTOCOL] Executing Vincent ability...");
      
      vincentResult = await executeAaveWithdrawAndSend(
        user.walletAddress,
        phoneNumber,
        {
          recipient: recipient.walletAddress,
          amount: pyusdAmount.toFixed(2),
          network: "sepolia"
        }
      );
      
      if (vincentResult.success) {
        txId = vincentResult.transferTxHash || vincentResult.withdrawTxHash || "vincent-tx-" + Date.now();
        logger.info({ 
          txHash: txId,
          withdrawTx: vincentResult.withdrawTxHash,
          transferTx: vincentResult.transferTxHash
        }, "✅ [LIT PROTOCOL + VINCENT] DeFi automation SUCCESSFUL");
      } else {
        // Fallback to direct Hedera transfer
        logger.warn({ error: vincentResult.error }, "⚠️ [VINCENT] Execution failed, using Hedera fallback");
        logger.info({ to: recipient.walletAddress, amount: pyusdAmount }, "⛓️  [HEDERA] Executing direct PYUSD transfer...");
        txId = await executePyusdTransfer(recipient.walletAddress, pyusdAmount);
        logger.info({ txId }, "✅ [HEDERA] Transfer complete");
      }
    } else {
      // Fallback: Direct Hedera transfer (for demo without Vincent config)
      logger.info({}, "ℹ️  [VINCENT] Not configured, using direct Hedera");
      logger.info({ to: recipient.walletAddress, amount: pyusdAmount }, "⛓️  [HEDERA] Executing PYUSD transfer...");
      txId = await executePyusdTransfer(recipient.walletAddress, pyusdAmount);
      logger.info({ txId }, "✅ [HEDERA] Transfer complete");
    }

    // Reflect transaction hash to UI for terminal dashboard
    try {
      patchUIMessage(phoneNumber, { txHash: txId, status: "TX_CONFIRMED" });
    } catch {}

    // Step 3: Mint SBT on Hedera smart contract
    logger.info({ 
      recipient: recipient.walletAddress, 
      paymentTxId: txId,
      amount: command.amount,
      currency: command.currency
    }, "🎖️  [HEDERA SBT] Minting Proof of Commerce NFT...");
    
    const sbtTxId = await mintSBTOnChain(recipient.walletAddress, command.amount, command.currency, pyusdAmount, txId);
    
    logger.info({ 
      sbtTxId,
      recipient: recipient.walletAddress
    }, "✅ [HEDERA SBT] NFT minted successfully");
    try {
      patchUIMessage(phoneNumber, { status: "SBT_MINTED" });
    } catch {}

    // Step 4: Store transaction record in database
    const sbtRecord = new SbtPassportModel({
      walletAddress: recipient.walletAddress,
      tokenId: sbtTxId,
      fiatAmount: command.amount,
      fiatCurrency: command.currency,
      pyusdAmount,
      senderPhone: phoneNumber,
      recipientPhone: command.recipientPhone,
      transactionHash: txId,
      timestamp: new Date()
    });
    await sbtRecord.save();

    // Step 5: Send confirmation SMS with Hedera link
    const hashscanLink = `https://hashscan.io/testnet/transaction/${txId}`;
    await sendGenericSms(
      phoneNumber,
      `✓ Payment sent!\n${command.amount} ${command.currency} → ${command.recipientPhone}\nTX: ${hashscanLink}\nSBT: ${sbtTxId}`
    );

    await sendGenericSms(
      recipient.phoneNumber,
      `✓ Payment received!\n${command.amount} ${command.currency} from ${phoneNumber}\nSBT: ${sbtTxId}\nTX: ${hashscanLink}\n💰 Auto-earning yield!`
    );

    // Step 6: AUTO-YIELD - Automatically supply received funds to Aave
    // This is the KILLER FEATURE: Every wallet is now yield-bearing!
    // User's money is NEVER idle - it's always earning interest
    logger.info({ recipient: recipient.phoneNumber, amount: pyusdAmount }, "Triggering auto-yield");
    await autoYieldOnReceive(recipient.phoneNumber, recipient.walletAddress, pyusdAmount);

    logger.info({ txId, sbtTxId }, "Payment completed successfully with auto-yield");
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Payment execution failed");
    await sendGenericSms(
      phoneNumber,
      `Payment failed: ${(error as Error).message}. Reply HELP for support.`
    );
  }
}

export async function executeSellFlow(phoneNumber: string, command: SellCommand) {
  try {
    const user = await getUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.walletAddress) {
      await sendGenericSms(phoneNumber, "Error: Wallet not initialized. Reply RESET to reinitialize.");
      return;
    }

    logger.info({ phoneNumber, amount: command.amount }, "Processing sell (off-ramp)");

    // Get current PYUSD/INR price
    let inrAmount = command.amount;
    if (command.currency === "PYUSD") {
      try {
        const inrUsdPrice = await getInrUsdPrice();
        inrAmount = command.amount * inrUsdPrice;
        logger.info({ inrUsdPrice, inrAmount }, "Converted PYUSD to INR");
      } catch (error) {
        logger.warn({ err: error }, "Failed to get Pyth price, using fallback");
        inrAmount = command.amount * 83; // Fallback
      }
    }

    // TODO: Integrate Transak Stream API for actual off-ramp
    // For now, send confirmation
    await sendGenericSms(
      phoneNumber,
      `Sell request received for ${command.amount} PYUSD (~₹${inrAmount.toFixed(2)})\nProcessing off-ramp...\nYou'll receive funds in 2-3 business days.`
    );

    logger.info({ phoneNumber, pyusdAmount: command.amount, inrAmount }, "Sell request initiated");
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Sell execution failed");
    await sendGenericSms(phoneNumber, `Sell failed: ${(error as Error).message}`);
  }
}

export async function executeMerchantRegisterFlow(phoneNumber: string, command: MerchantRegisterCommand) {
  try {
    const user = await getUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new Error("User not found");
    }

    const merchant = new MerchantModel({
      storeName: command.name,
      phoneNumber: phoneNumber,
      dailyStats: {
        date: new Date().toISOString().split('T')[0],
        totalSales: 0,
        transactions: 0
      }
    });
    await merchant.save();

    await sendGenericSms(phoneNumber, `✓ Merchant registered: ${command.name}\nYou can now request payments from customers.`);
    logger.info({ phoneNumber, merchantName: command.name }, "Merchant registered");
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Merchant registration failed");
    await sendGenericSms(phoneNumber, `Registration failed: ${(error as Error).message}`);
  }
}

export async function executeMerchantRequestPaymentFlow(phoneNumber: string, command: MerchantRequestPaymentCommand) {
  try {
    const merchantUser = await getUserByPhoneNumber(phoneNumber);
    if (!merchantUser) {
      throw new Error("Merchant user not found");
    }

    const merchant = await MerchantModel.findOne({ owner: merchantUser._id });
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    const customer = await findOrCreateUser(command.customerPhone);

    await sendGenericSms(
      customer.phoneNumber,
      templates.merchantPaymentRequest(merchant.storeName, command.amount, command.currency, command.note)
    );

    logger.info({ merchant: merchant.storeName, customer: command.customerPhone }, "Payment request sent");
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Merchant payment request failed");
    await sendGenericSms(phoneNumber, `Request failed: ${(error as Error).message}`);
  }
}
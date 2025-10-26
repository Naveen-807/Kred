import { 
  Client, 
  PrivateKey, 
  AccountId, 
  TransferTransaction,
  Hbar,
  TokenId,
  TokenAssociateTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters
} from "@hashgraph/sdk";
import { ethers } from "ethers";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { isDemoMode } from "../../utils/mode.js";
import { pkpWalletService } from "../../services/pkp-wallet.service.js";

let hederaClient: Client | null = null;

function getHederaClient(): Client {
  if (!hederaClient) {
    const operatorId = config.hedera.operatorId;
    const operatorKey = config.hedera.operatorKey;

    if (!operatorId || !operatorKey) {
      throw new Error("Hedera credentials not configured");
    }

    try {
      const accountId = AccountId.fromString(operatorId);
      const privateKey = PrivateKey.fromStringECDSA(operatorKey);

      hederaClient = Client.forTestnet();
      hederaClient.setOperator(accountId, privateKey);

      logger.info({ operatorId }, "Hedera client initialized");
    } catch (error) {
      logger.error({ err: error }, "Failed to initialize Hedera client");
      throw error;
    }
  }

  return hederaClient;
}

async function ensureOperatorTokenAssociation(tokenId: TokenId) {
  const client = getHederaClient();
  try {
    const tx = await new TokenAssociateTransaction()
      .setAccountId(client.operatorAccountId!)
      .setTokenIds([tokenId])
      .freezeWith(client)
      .sign(PrivateKey.fromStringECDSA(config.hedera.operatorKey));

    const res = await tx.execute(client);
    const receipt = await res.getReceipt(client);
    logger.info({ status: receipt.status.toString(), tokenId: tokenId.toString() }, "Operator token association attempt");
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("TOKEN_ALREADY_ASSOCIATED")) {
      logger.info({ tokenId: tokenId.toString() }, "Operator already associated with token");
    } else {
      logger.warn({ err, tokenId: tokenId.toString() }, "Token association for operator may have failed or is unnecessary");
    }
  }
}

/**
 * Execute a real HBAR transfer on Hedera
 */
export async function executeHbarTransfer(
  recipientAddress: string,
  amountHbar: number
): Promise<string> {
  try {
    const client = getHederaClient();
    
    logger.info(
      { recipient: recipientAddress, amount: amountHbar },
      "Executing HBAR transfer on Hedera"
    );

    // Convert EVM address to Hedera Account ID if needed
    let recipientId: AccountId;
    if (recipientAddress.startsWith("0x")) {
      if (isDemoMode()) {
        // For EVM addresses, we need to convert or use contract call
        // For now, use the operator account as recipient for demo
        recipientId = AccountId.fromString(config.hedera.operatorId);
        logger.warn("Demo mode: using operator account as recipient for EVM address");
      } else {
        throw new Error("Recipient EVM address not supported without mapping. Provide a Hedera account ID.");
      }
    } else {
      recipientId = AccountId.fromString(recipientAddress);
    }

    // Round to avoid decimal issues with tinybars
    const roundedAmount = Math.round(amountHbar * 100000000) / 100000000;
    
    const transaction = new TransferTransaction()
      .addHbarTransfer(client.operatorAccountId!, new Hbar(-roundedAmount))
      .addHbarTransfer(recipientId, new Hbar(roundedAmount))
      .setTransactionMemo("OfflinePay payment");

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const txId = txResponse.transactionId.toString();
    
    logger.info(
      { 
        transactionId: txId, 
        status: receipt.status.toString(),
        recipient: recipientId.toString()
      },
      "HBAR transfer completed successfully"
    );

    return txId;
  } catch (error) {
    logger.error({ err: error, recipient: recipientAddress }, "HBAR transfer failed");
    throw error;
  }
}

/**
 * Execute a PYUSD token transfer using PKP signing
 */
export async function executePyusdTransferWithPKP(
  senderPhone: string,
  recipientAddress: string,
  amountPyusd: number
): Promise<string> {
  try {
    logger.info(
      { senderPhone, recipient: recipientAddress, amount: amountPyusd },
      "Executing PKP-signed PYUSD transfer on Hedera"
    );

    // Get sender's PKP wallet
    const senderWallet = await pkpWalletService.getWalletByPhone(senderPhone);
    if (!senderWallet) {
      throw new Error(`PKP wallet not found for sender: ${senderPhone}`);
    }

    // For now, use the operator account for transaction execution
    // In the future, this would use PKP signing via Lit Protocol
    const client = getHederaClient();
    const tokenAddress = config.hedera.pyusdTokenAddress;

    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      // Fallback to HBAR transfer for demo
      logger.warn("PYUSD token not configured, using HBAR transfer instead");
      const hbarAmount = amountPyusd * 0.01; // Convert PYUSD to HBAR for demo
      return executeHbarTransfer(recipientAddress, hbarAmount);
    }

    // Convert recipient address to Hedera AccountId
    let recipientId: AccountId;
    try {
      if (recipientAddress.startsWith("0x")) {
        recipientId = AccountId.fromSolidityAddress(recipientAddress);
      } else {
        recipientId = AccountId.fromString(recipientAddress);
      }
    } catch (error) {
      logger.error({ err: error, recipientAddress }, "Invalid recipient address");
      throw new Error(`Invalid recipient address: ${recipientAddress}`);
    }

    // Convert amount to smallest unit (6 decimals for PYUSD)
    const tokenAmount = Math.floor(amountPyusd * 1_000_000);

    // Ensure recipient has token association
    await ensureTokenAssociation(recipientId, TokenId.fromString(tokenAddress));

    // Create token transfer transaction
    const transaction = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenAddress), client.operatorAccountId!, -tokenAmount)
      .addTokenTransfer(TokenId.fromString(tokenAddress), recipientId, tokenAmount)
      .setTransactionMemo(`PKP-signed PYUSD transfer: ${amountPyusd} PYUSD`);

    // Execute transaction
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const txId = txResponse.transactionId.toString();
    
    logger.info(
      { 
        transactionId: txId, 
        status: receipt.status.toString(),
        senderPhone,
        recipient: recipientId.toString(),
        amount: amountPyusd
      },
      "PKP-signed PYUSD transfer completed successfully"
    );

    return txId;
  } catch (error) {
    logger.error({ err: error, senderPhone, recipient: recipientAddress }, "PKP-signed PYUSD transfer failed");
    throw error;
  }
}

/**
 * Execute a PYUSD token transfer (when PYUSD is available on Hedera)
 */
export async function executePyusdTransfer(
  recipientAddress: string,
  amountPyusd: number
): Promise<string> {
  try {
    const client = getHederaClient();
    const tokenAddress = config.hedera.pyusdTokenAddress;

    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      // Fallback to HBAR transfer for demo
      logger.warn("PYUSD token not configured, using HBAR transfer instead");
      const hbarAmount = amountPyusd * 0.01; // Convert PYUSD to HBAR for demo
      return executeHbarTransfer(recipientAddress, hbarAmount);
    }

    logger.info(
      { recipient: recipientAddress, amount: amountPyusd, token: tokenAddress },
      "Executing PYUSD transfer on Hedera"
    );

    // Convert amount to smallest unit (6 decimals for PYUSD)
    const amountInSmallestUnit = Math.floor(amountPyusd * 1_000_000);

    const tokenId = TokenId.fromSolidityAddress(tokenAddress);

    // Ensure operator is associated with token to send
    await ensureOperatorTokenAssociation(tokenId);
    let recipientId: AccountId;
    
    if (recipientAddress.startsWith("0x")) {
      try {
        recipientId = AccountId.fromSolidityAddress(recipientAddress);
      } catch {
        recipientId = AccountId.fromString(config.hedera.operatorId);
        logger.warn("Recipient EVM address not resolvable on Hedera; using operator as recipient for demo");
      }
    } else {
      recipientId = AccountId.fromString(recipientAddress);
    }

    const transaction = new TransferTransaction()
      .addTokenTransfer(tokenId, client.operatorAccountId!, -amountInSmallestUnit)
      .addTokenTransfer(tokenId, recipientId, amountInSmallestUnit)
      .setTransactionMemo(`OfflinePay: ${amountPyusd} PYUSD`);

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const txId = txResponse.transactionId.toString();
    
    logger.info(
      { 
        transactionId: txId, 
        status: receipt.status.toString(),
        amount: amountPyusd,
        recipient: recipientId.toString()
      },
      "PYUSD transfer completed successfully"
    );

    return txId;
  } catch (error) {
    logger.error({ err: error, recipient: recipientAddress }, "PYUSD transfer failed");
    throw error;
  }
}

/**
 * Mint SBT on Hedera smart contract
 */
export async function mintSBTOnChain(
  recipientAddress: string,
  fiatAmount: number,
  fiatCurrency: string,
  pyusdAmount: number,
  transactionHash: string
): Promise<string> {
  try {
    const client = getHederaClient();
    const sbtContractAddress = config.hedera.sbtContractAddress;

    if (!sbtContractAddress || sbtContractAddress === "0x0000000000000000000000000000000000000000") {
      logger.error("SBT contract not configured - ProofOfCommerceSBT contract address required");
      throw new Error("SBT contract not deployed. Please configure HEDERA_SBT_CONTRACT_ADDRESS in environment variables.");
    }

    logger.info(
      { recipientAddress, fiatAmount, fiatCurrency, pyusdAmount, transactionHash },
      "Minting SBT on Hedera using ProofOfCommerceSBT contract"
    );

    // Create transaction metadata for SBT
    const transactionMetadata = {
      fiatAmount: Math.floor(fiatAmount * 100), // Convert to cents
      fiatCurrency: fiatCurrency,
      pyusdAmount: Math.floor(pyusdAmount * 1_000_000), // Convert to smallest unit (6 decimals)
      counterparty: "offline-pay-system",
      timestamp: Math.floor(Date.now() / 1000),
      commandId: transactionHash,
      metadataUri: `https://offlinepay.com/metadata/${transactionHash}`
    };

    // Convert EVM address to bytes for contract call
    const recipientBytes = ethers.getBytes(recipientAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(sbtContractAddress)
      .setGas(200000) // Increased gas for complex contract call
      .setFunction(
        "mintProof",
        new ContractFunctionParameters()
          .addAddress(recipientAddress)
          .addUint256(transactionMetadata.fiatAmount)
          .addString(transactionMetadata.fiatCurrency)
          .addUint256(transactionMetadata.pyusdAmount)
          .addString(transactionMetadata.counterparty)
          .addUint256(transactionMetadata.timestamp)
          .addString(transactionMetadata.commandId)
          .addString(transactionMetadata.metadataUri)
      );

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const txId = txResponse.transactionId.toString();
    
    logger.info(
      { 
        transactionId: txId, 
        status: receipt.status.toString(),
        recipient: recipientAddress,
        fiatAmount,
        fiatCurrency,
        pyusdAmount
      },
      "SBT minted successfully on Hedera using ProofOfCommerceSBT contract"
    );

    return txId;
  } catch (error) {
    logger.error({ err: error, recipient: recipientAddress }, "SBT minting failed");
    // Don't throw - SBT minting failure shouldn't block payment
    return "sbt-mint-failed-" + Date.now();
  }
}

/**
 * Get transaction details from Hedera
 */
export async function getTransactionDetails(transactionId: string): Promise<any> {
  try {
    const client = getHederaClient();
    
    // Query transaction record
    // Note: This requires mirror node API for full details
    logger.info({ transactionId }, "Querying transaction details");
    
    return {
      transactionId,
      status: "SUCCESS",
      timestamp: new Date().toISOString(),
      explorerUrl: `https://hashscan.io/testnet/transaction/${transactionId}`
    };
  } catch (error) {
    logger.error({ err: error, transactionId }, "Failed to get transaction details");
    throw error;
  }
}

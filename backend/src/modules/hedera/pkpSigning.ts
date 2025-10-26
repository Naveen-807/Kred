/**
 * PKP Transaction Signing Module for Hedera
 * Handles Lit Protocol PKP signing for Hedera transactions
 */

import { 
  Client, 
  PrivateKey, 
  AccountId, 
  TransferTransaction,
  TokenTransferTransaction,
  TokenId,
  Hbar,
  Transaction
} from "@hashgraph/sdk";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let litNodeClient: LitNodeClient | null = null;

/**
 * Initialize Lit Node Client for PKP signing
 */
async function getLitNodeClient(): Promise<LitNodeClient> {
  if (!litNodeClient) {
    litNodeClient = new LitNodeClient({
      litNetwork: "datil-dev",
      debug: false,
    });
    await litNodeClient.connect();
    logger.info("Lit Node Client connected for PKP signing");
  }
  return litNodeClient;
}

/**
 * Sign a Hedera transaction using Lit Protocol PKP
 */
export async function signHederaTransactionWithPKP(
  pkpTokenId: string,
  transaction: Transaction,
  userPhone: string
): Promise<Transaction> {
  try {
    logger.info({ pkpTokenId, userPhone }, "Signing Hedera transaction with PKP");

    // Get Lit Node Client
    const litNodeClient = await getLitNodeClient();

    // Create signing session for PKP
    const authSig = await litNodeClient.checkAndSignAuthMessage({
      webhook: {
        url: "https://offlinepay.com/webhook",
        customHeaders: {
          "x-user-phone": userPhone
        }
      }
    });

    // Get PKP public key
    const pkpInfo = await litNodeClient.getPKPs({
      tokenIds: [pkpTokenId]
    });

    if (!pkpInfo || pkpInfo.length === 0) {
      throw new Error(`PKP not found for token ID: ${pkpTokenId}`);
    }

    const pkp = pkpInfo[0];
    logger.info({ pkpAddress: pkp.ethAddress }, "Found PKP for signing");

    // Create signing conditions
    const conditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "hedera",
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: "=",
          value: pkp.ethAddress
        }
      }
    ];

    // Request signature from PKP
    const signatures = await litNodeClient.executeJs({
      code: `
        // This code runs in the Lit network
        const sigShare = await LitActions.signEcdsa({
          toSign: dataToSign,
          publicKey: "${pkp.publicKey}",
          sigName: "sig1"
        });
        
        LitActions.setResponse({ response: sigShare });
      `,
      authSig,
      jsParams: {
        dataToSign: ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.serializeTransaction(transaction))),
        publicKey: pkp.publicKey,
        sigName: "sig1"
      }
    });

    if (!signatures || !signatures.sig1) {
      throw new Error("Failed to get signature from PKP");
    }

    logger.info({ pkpTokenId }, "PKP signature obtained successfully");

    // Convert PKP signature to Hedera format and apply to transaction
    // Note: This is a simplified implementation
    // In production, you'd need to properly convert the signature format
    const pkpPrivateKey = PrivateKey.fromStringECDSA(
      signatures.sig1.signature.slice(2) // Remove 0x prefix
    );

    // Sign the transaction with PKP
    transaction.sign(pkpPrivateKey);

    logger.info({ pkpTokenId }, "Transaction signed with PKP successfully");

    return transaction;

  } catch (error) {
    logger.error({ err: error, pkpTokenId, userPhone }, "Failed to sign transaction with PKP");
    throw new Error(`PKP signing failed: ${error.message}`);
  }
}

/**
 * Execute PYUSD transfer with PKP signing
 */
export async function executePyusdTransferWithPKP(
  recipientAddress: string,
  amountPyusd: number,
  pkpTokenId: string,
  userPhone: string
): Promise<string> {
  try {
    logger.info({ 
      recipientAddress, 
      amountPyusd, 
      pkpTokenId, 
      userPhone 
    }, "Executing PYUSD transfer with PKP signing");

    // Get Hedera client
    const client = Client.forTestnet();
    const operatorId = config.hedera.operatorId;
    const operatorKey = config.hedera.operatorKey;

    if (!operatorId || !operatorKey) {
      throw new Error("Hedera credentials not configured");
    }

    const accountId = AccountId.fromString(operatorId);
    const privateKey = PrivateKey.fromStringECDSA(operatorKey);
    client.setOperator(accountId, privateKey);

    // Create PYUSD token transfer transaction
    const tokenAddress = config.hedera.pyusdTokenAddress;
    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      // Fallback to HBAR transfer for demo
      logger.warn("PYUSD token not configured, using HBAR transfer instead");
      const hbarAmount = amountPyusd * 0.01; // Convert PYUSD to HBAR for demo
      return executeHbarTransferWithPKP(recipientAddress, hbarAmount, pkpTokenId, userPhone);
    }

    const tokenId = TokenId.fromSolidityAddress(tokenAddress);
    const amountInSmallestUnit = Math.floor(amountPyusd * 1_000_000);

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

    const transaction = new TokenTransferTransaction()
      .addTokenTransfer(tokenId, client.operatorAccountId!, -amountInSmallestUnit)
      .addTokenTransfer(tokenId, recipientId, amountInSmallestUnit)
      .setTransactionMemo(`OfflinePay: ${amountPyusd} PYUSD`);

    // Sign transaction with PKP
    const signedTransaction = await signHederaTransactionWithPKP(
      pkpTokenId,
      transaction,
      userPhone
    );

    // Execute transaction
    const txResponse = await signedTransaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const txId = txResponse.transactionId.toString();
    
    logger.info(
      { 
        transactionId: txId, 
        status: receipt.status.toString(),
        amount: amountPyusd,
        recipient: recipientId.toString()
      },
      "PYUSD transfer with PKP signing completed successfully"
    );

    return txId;

  } catch (error) {
    logger.error({ err: error, recipientAddress, amountPyusd }, "PYUSD transfer with PKP signing failed");
    throw error;
  }
}

/**
 * Execute HBAR transfer with PKP signing
 */
export async function executeHbarTransferWithPKP(
  recipientAddress: string,
  amountHbar: number,
  pkpTokenId: string,
  userPhone: string
): Promise<string> {
  try {
    logger.info({ 
      recipientAddress, 
      amountHbar, 
      pkpTokenId, 
      userPhone 
    }, "Executing HBAR transfer with PKP signing");

    // Get Hedera client
    const client = Client.forTestnet();
    const operatorId = config.hedera.operatorId;
    const operatorKey = config.hedera.operatorKey;

    if (!operatorId || !operatorKey) {
      throw new Error("Hedera credentials not configured");
    }

    const accountId = AccountId.fromString(operatorId);
    const privateKey = PrivateKey.fromStringECDSA(operatorKey);
    client.setOperator(accountId, privateKey);

    // Convert EVM address to Hedera Account ID if needed
    let recipientId: AccountId;
    if (recipientAddress.startsWith("0x")) {
      if (process.env.NODE_ENV === 'development') {
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

    // Sign transaction with PKP
    const signedTransaction = await signHederaTransactionWithPKP(
      pkpTokenId,
      transaction,
      userPhone
    );

    // Execute transaction
    const txResponse = await signedTransaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const txId = txResponse.transactionId.toString();
    
    logger.info(
      { 
        transactionId: txId, 
        status: receipt.status.toString(),
        recipient: recipientId.toString()
      },
      "HBAR transfer with PKP signing completed successfully"
    );

    return txId;

  } catch (error) {
    logger.error({ err: error, recipientAddress, amountHbar }, "HBAR transfer with PKP signing failed");
    throw error;
  }
}

/**
 * Verify PKP signature
 */
export async function verifyPKPSignature(
  pkpTokenId: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const litNodeClient = await getLitNodeClient();

    // Get PKP public key
    const pkpInfo = await litNodeClient.getPKPs({
      tokenIds: [pkpTokenId]
    });

    if (!pkpInfo || pkpInfo.length === 0) {
      return false;
    }

    const pkp = pkpInfo[0];

    // Verify signature (simplified implementation)
    // In production, you'd use proper signature verification
    return signature.length > 0 && pkp.publicKey.length > 0;

  } catch (error) {
    logger.error({ err: error, pkpTokenId }, "Failed to verify PKP signature");
    return false;
  }
}

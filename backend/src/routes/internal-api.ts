/**
 * Internal API Routes for ASI Agents
 * Provides backend functions that agents can call via HTTP
 */

import express from 'express';
import { executePyusdTransferWithPKP } from '../modules/hedera/transactions.js';
import { getUserByPhoneNumber } from '../modules/users/service.js';
import { logger } from '../utils/logger.js';
import { Client, AccountId, AccountBalanceQuery, TokenBalanceQuery, PrivateKey } from '@hashgraph/sdk';
import { config } from '../../config/index.js';
import { pkpWalletService } from '../services/pkp-wallet.service.js';

const router = express.Router();

/**
 * Get real user balances from Hedera
 */
async function getUserRealBalances(walletAddress: string): Promise<any> {
  try {
    const client = Client.forTestnet();
    const operatorId = config.hedera.operatorId;
    const operatorKey = config.hedera.operatorKey;

    if (!operatorId || !operatorKey) {
      throw new Error("Hedera credentials not configured");
    }

    const accountId = AccountId.fromString(operatorId);
    const privateKey = PrivateKey.fromStringECDSA(operatorKey);
    client.setOperator(accountId, privateKey);

    // Convert wallet address to Hedera Account ID
    let userAccountId: AccountId;
    if (walletAddress.startsWith("0x")) {
      try {
        userAccountId = AccountId.fromSolidityAddress(walletAddress);
      } catch {
        // If EVM address can't be converted, use operator account for demo
        userAccountId = AccountId.fromString(operatorId);
        logger.warn("EVM address not resolvable on Hedera; using operator account");
      }
    } else {
      userAccountId = AccountId.fromString(walletAddress);
    }

    // Query HBAR balance
    const hbarBalance = await new AccountBalanceQuery()
      .setAccountId(userAccountId)
      .execute(client);

    const hbarAmount = hbarBalance.hbars.toTinybars().toNumber() / 100_000_000; // Convert tinybars to HBAR

    // Query PYUSD token balance if configured
    let pyusdAmount = 0;
    const pyusdTokenAddress = config.hedera.pyusdTokenAddress;
    if (pyusdTokenAddress && pyusdTokenAddress !== "0x0000000000000000000000000000000000000000") {
      try {
        const tokenBalance = await new TokenBalanceQuery()
          .setAccountId(userAccountId)
          .setTokenId(pyusdTokenAddress)
          .execute(client);
        
        pyusdAmount = tokenBalance.balance / 1_000_000; // Convert to PYUSD (6 decimals)
      } catch (error) {
        logger.warn({ err: error }, "Could not query PYUSD balance");
      }
    }

    return {
      pyusd: pyusdAmount,
      hbar: hbarAmount,
      walletAddress: walletAddress,
      hederaAccountId: userAccountId.toString()
    };

  } catch (error) {
    logger.error({ err: error, walletAddress }, "Failed to get real user balances");
    // Fallback to zero balances if query fails
    return {
      pyusd: 0,
      hbar: 0,
      walletAddress: walletAddress,
      error: "Failed to query balances"
    };
  }
}

// Middleware to authenticate agent requests
const authenticateAgent = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-agent-api-key'];
  const expectedKey = process.env.AGENT_API_KEY || 'agent-secret-key';
  
  if (apiKey !== expectedKey) {
    logger.warn({ ip: req.ip }, 'Unauthorized agent API request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

/**
 * POST /api/internal/execute-hedera-transaction
 * Execute Hedera transaction (called by Executor Agent)
 */
router.post('/execute-hedera-transaction', authenticateAgent, async (req, res) => {
  try {
    const { senderPhone, recipientPhone, amount, currency } = req.body;
    
    logger.info({ 
      senderPhone, 
      recipientPhone, 
      amount, 
      currency 
    }, 'Executing Hedera transaction via internal API');
    
    // Validate required fields
    if (!senderPhone || !recipientPhone || !amount || !currency) {
      return res.status(400).json({ 
        error: 'Missing required fields: senderPhone, recipientPhone, amount, currency' 
      });
    }
    
    // Get sender's PKP wallet
    const senderWallet = await pkpWalletService.getWalletByPhone(senderPhone);
    if (!senderWallet) {
      return res.status(400).json({ error: 'Sender wallet not found' });
    }
    
    // Get or create recipient's PKP wallet
    const recipientWallet = await pkpWalletService.getWalletByPhone(recipientPhone);
    if (!recipientWallet) {
      logger.info({ recipientPhone }, 'Creating wallet for recipient');
      const newRecipientWallet = await pkpWalletService.getOrCreatePKP(recipientPhone);
      if (!newRecipientWallet) {
        return res.status(500).json({ error: 'Failed to create recipient wallet' });
      }
    }
    
    // Execute PYUSD transfer with PKP signing
    const transactionId = await executePyusdTransferWithPKP(senderPhone, recipientWallet, amount);
    
    logger.info({ 
      transactionId, 
      senderPhone, 
      recipientPhone, 
      amount 
    }, 'PYUSD transfer executed successfully');
    
    // Mint SBT for credit history
    let sbtTransactionId = '';
    try {
      sbtTransactionId = await mintSBTOnChain(
        senderWallet,
        amount * 83, // Convert PYUSD to INR (approximate)
        'INR',
        amount,
        transactionId
      );
      
      logger.info({ sbtTransactionId }, 'SBT minted successfully');
    } catch (sbtError) {
      logger.error({ err: sbtError }, 'SBT minting failed, but transaction succeeded');
    }
    
    // Return transaction details
    res.json({
      success: true,
      transactionId,
      sbtTransactionId,
      gasUsed: 100000, // Estimated gas used
      timestamp: new Date().toISOString(),
      senderWallet,
      recipientWallet,
      amount,
      currency
    });
    
  } catch (error) {
    logger.error({ err: error }, 'Error executing Hedera transaction via internal API');
    res.status(500).json({ 
      error: 'Transaction execution failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/internal/execute-pyusd-transfer
 * Execute PYUSD transfer on Hedera (called by Executor Agent)
 */
router.post('/execute-pyusd-transfer', authenticateAgent, async (req, res) => {
  try {
    const { recipientAddress, amountPyusd, pkpTokenId, userPhone } = req.body;
    
    logger.info({ 
      recipientAddress, 
      amountPyusd, 
      pkpTokenId, 
      userPhone 
    }, 'Executing PYUSD transfer via internal API');
    
    // Validate required fields
    if (!recipientAddress || !amountPyusd || !userPhone) {
      return res.status(400).json({ 
        error: 'Missing required fields: recipientAddress, amountPyusd, userPhone' 
      });
    }
    
    // Get user information
    const user = await getUserByPhoneNumber(userPhone);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.walletAddress) {
      return res.status(400).json({ error: 'User wallet not initialized' });
    }
    
    // Execute PYUSD transfer
    const transactionId = await executePyusdTransfer(recipientAddress, amountPyusd);
    
    logger.info({ 
      transactionId, 
      userPhone, 
      recipientAddress, 
      amountPyusd 
    }, 'PYUSD transfer executed successfully');
    
    // Mint SBT for credit history
    let sbtTransactionId = '';
    try {
      sbtTransactionId = await mintSBTOnChain(
        user.walletAddress,
        amountPyusd * 83, // Convert PYUSD to INR (approximate)
        'INR',
        amountPyusd,
        transactionId
      );
      
      logger.info({ sbtTransactionId }, 'SBT minted successfully');
    } catch (sbtError) {
      logger.error({ err: sbtError }, 'SBT minting failed, but transaction succeeded');
    }
    
    // Return transaction details
    res.json({
      success: true,
      transactionId,
      sbtTransactionId,
      gasUsed: 100000, // Estimated gas used
      timestamp: new Date().toISOString(),
      senderWallet: user.walletAddress,
      recipientAddress,
      amountPyusd
    });
    
  } catch (error) {
    logger.error({ err: error }, 'Error executing PYUSD transfer via internal API');
    res.status(500).json({ 
      error: 'Transaction execution failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/internal/get-user-balance
 * Get user balance (called by agents)
 */
router.post('/get-user-balance', authenticateAgent, async (req, res) => {
  try {
    const { userPhone } = req.body;
    
    if (!userPhone) {
      return res.status(400).json({ error: 'Missing userPhone' });
    }
    
    // Get user information
    const user = await getUserByPhoneNumber(userPhone);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Query real balances from Hedera
    const balance = await getUserRealBalances(user.walletAddress);
    
    res.json({
      success: true,
      balance
    });
    
  } catch (error) {
    logger.error({ err: error }, 'Error getting user balance via internal API');
    res.status(500).json({ 
      error: 'Failed to get user balance',
      message: error.message 
    });
  }
});

/**
 * POST /api/internal/get-user-wallet
 * Get user wallet information (called by agents)
 */
router.post('/get-user-wallet', authenticateAgent, async (req, res) => {
  try {
    const { userPhone } = req.body;
    
    if (!userPhone) {
      return res.status(400).json({ error: 'Missing userPhone' });
    }
    
    // Get user information
    const user = await getUserByPhoneNumber(userPhone);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.walletAddress) {
      return res.status(400).json({ error: 'User wallet not initialized' });
    }
    
    // Get real PKP wallet data
    const pkpInfo = await pkpWalletService.getPKPInfo(userPhone);
    if (!pkpInfo) {
      return res.status(400).json({ error: 'PKP wallet not found for user' });
    }

    const walletInfo = {
      ethAddress: pkpInfo.ethAddress,
      hederaAccount: pkpInfo.ethAddress, // PKP ETH address can be used as Hedera account
      publicKey: pkpInfo.publicKey,
      tokenId: pkpInfo.tokenId
    };
    
    res.json({
      success: true,
      wallet: walletInfo
    });
    
  } catch (error) {
    logger.error({ err: error }, 'Error getting user wallet via internal API');
    res.status(500).json({ 
      error: 'Failed to get user wallet',
      message: error.message 
    });
  }
});

/**
 * GET /api/internal/health
 * Health check for internal API
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Internal API for ASI Agents',
    timestamp: new Date().toISOString()
  });
});

export { router as internalApiRouter };

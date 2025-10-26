import { Router, Request, Response } from 'express';
import { pkpWalletService } from '../services/pkp-wallet.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * SMS Gateway endpoint for PKP wallet operations
 */
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const { from, body } = req.body;

    logger.info(`📩 SMS received from ${from}: ${body}`);

    if (!from || !body) {
      return res.json({
        success: false,
        message: 'Error: Missing phone number or message',
      });
    }

    const command = body.trim().toUpperCase();
    const parts = command.split(' ');
    const action = parts[0];

    let response = '';

    switch (action) {
      case 'WALLET':
      case 'CREATE':
      case 'START':
        response = await handleCreateWallet(from);
        break;

      case 'BALANCE':
      case 'BAL':
        response = await handleBalance(from);
        break;

      case 'ADDRESS':
      case 'ADDR':
        response = await handleGetAddress(from);
        break;

      case 'SEND':
      case 'PAY':
        response = await handleSend(from, parts);
        break;

      case 'INFO':
        response = await handleWalletInfo(from);
        break;

      case 'HELP':
        response = getHelpMessage();
        break;

      default:
        response = `Unknown command: ${action}

Text HELP for available commands`;
    }

    logger.info(`📤 Response to ${from}: ${response.substring(0, 50)}...`);

    res.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Error processing SMS:', error);
    res.json({
      success: false,
      message: 'Service temporarily unavailable. Please try again in a moment.',
    });
  }
});

/**
 * Create PKP wallet for phone number
 */
async function handleCreateWallet(phoneNumber: string): Promise<string> {
  try {
    logger.info(`🔑 Creating PKP wallet for ${phoneNumber}`);

    const pkp = await pkpWalletService.getOrCreatePKP(phoneNumber);

    const shortAddress = `${pkp.ethAddress.slice(0, 6)}...${pkp.ethAddress.slice(-4)}`;

    return `✅ PKP Wallet Ready!

🔑 Address: ${shortAddress}
🌐 Network: Lit Protocol (Datil)

Your decentralized wallet is now active!

Commands:
• BALANCE - Check funds
• ADDRESS - Get full address
• INFO - View wallet details

Send crypto to your address to get started!`;
  } catch (error) {
    logger.error('Error creating wallet:', error);
    return `❌ Error creating wallet

Please try again in a moment. If the problem persists, contact support.`;
  }
}

/**
 * Get PKP wallet balance
 */
async function handleBalance(phoneNumber: string): Promise<string> {
  try {
    const pkp = await pkpWalletService.getPKPInfo(phoneNumber);

    if (!pkp) {
      return `❌ No wallet found

Text WALLET to create your PKP wallet`;
    }

    const balance = await pkpWalletService.getPKPBalance(phoneNumber);
    const shortAddress = `${pkp.ethAddress.slice(0, 6)}...${pkp.ethAddress.slice(-4)}`;

    return `💰 Your Balance

${balance} ETH

Address: ${shortAddress}

Text ADDRESS for full address
Text SEND <address> <amount> to transfer`;
  } catch (error) {
    logger.error('Error getting balance:', error);
    return `❌ Error fetching balance

Please try again in a moment.`;
  }
}

/**
 * Get full wallet address
 */
async function handleGetAddress(phoneNumber: string): Promise<string> {
  try {
    const pkp = await pkpWalletService.getPKPInfo(phoneNumber);

    if (!pkp) {
      return `❌ No wallet found

Text WALLET to create your PKP wallet`;
    }

    return `📬 Your Wallet Address

${pkp.ethAddress}

Share this address to receive payments!

Network: Lit Protocol (Datil)
Type: PKP (Programmable Key Pair)`;
  } catch (error) {
    logger.error('Error getting address:', error);
    return '❌ Error retrieving address';
  }
}

/**
 * Get detailed wallet info
 */
async function handleWalletInfo(phoneNumber: string): Promise<string> {
  try {
    const pkp = await pkpWalletService.getPKPInfo(phoneNumber);

    if (!pkp) {
      return `❌ No wallet found

Text WALLET to create your PKP wallet`;
    }

    const balance = await pkpWalletService.getPKPBalance(phoneNumber);
    const shortAddress = `${pkp.ethAddress.slice(0, 6)}...${pkp.ethAddress.slice(-4)}`;
    const shortTokenId = `${pkp.tokenId.slice(0, 8)}...${pkp.tokenId.slice(-6)}`;

    return `📊 Wallet Info

🔑 Address: ${shortAddress}
💰 Balance: ${balance} ETH
🎫 Token ID: ${shortTokenId}

🌐 Network: Lit Protocol
🔐 Type: PKP Wallet

Text ADDRESS for full address
Text BALANCE to refresh`;
  } catch (error) {
    logger.error('Error getting wallet info:', error);
    return '❌ Error fetching wallet info';
  }
}

/**
 * Send transaction (placeholder - requires additional implementation)
 */
async function handleSend(phoneNumber: string, parts: string[]): Promise<string> {
  if (parts.length < 3) {
    return `❌ Invalid format

Usage: SEND <address> <amount>

Example:
SEND 0x742d35... 0.1`;
  }

  const toAddress = parts[1];
  const amount = parts[2];

  // Validate address format
  if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
    return `❌ Invalid address format

Address must start with 0x and be 42 characters long`;
  }

  // Validate amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return `❌ Invalid amount

Amount must be a positive number`;
  }

  try {
    const pkp = await pkpWalletService.getPKPInfo(phoneNumber);

    if (!pkp) {
      return `❌ No wallet found

Text WALLET to create your PKP wallet`;
    }

    // Check balance
    const balance = await pkpWalletService.getPKPBalance(phoneNumber);
    if (parseFloat(balance) < amountNum) {
      return `❌ Insufficient balance

Your balance: ${balance} ETH
Requested: ${amount} ETH

Please add funds to your wallet`;
    }

    // For now, return a message that transaction feature is coming soon
    return `🚧 Transaction Feature Coming Soon

From: ${pkp.ethAddress.slice(0, 10)}...
To: ${toAddress.slice(0, 10)}...
Amount: ${amount} ETH

This feature will be enabled once the signing functionality is fully integrated.`;

    // TODO: Implement actual transaction signing with PKP
    // const txHash = await pkpWalletService.signTransaction(phoneNumber, toAddress, amount);
    // return `✅ Transaction Sent!\n\nTx Hash: ${txHash}...`;
  } catch (error) {
    logger.error('Error sending transaction:', error);
    return `❌ Transaction failed

${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Get help message
 */
function getHelpMessage(): string {
  return `📱 OfflinePay PKP Wallet

Commands:
━━━━━━━━━━━━━━━━━━━
WALLET - Create/activate wallet
BALANCE - Check balance
ADDRESS - Get wallet address
INFO - View wallet details
SEND <addr> <amt> - Send funds
HELP - Show this message

Example:
SEND 0x742d... 0.5

Powered by Lit Protocol 🔥`;
}

export default router;

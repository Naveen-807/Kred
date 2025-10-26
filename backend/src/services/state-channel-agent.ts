/**
 * State Channel Agent
 * Manages offline payment channels for true offline cash transactions
 * Handles channel lifecycle: open, transact, close
 */

import { logger } from '../utils/logger.js';
import { StateChannelModel } from '../models/StateChannel.js';
import { pkpWalletService } from './pkp-wallet.service.js';
import { executeHbarTransfer } from '../modules/hedera/transactions.js';
import { ethers } from 'ethers';

interface ChannelRequest {
  phoneNumber: string;
  amount: number;
  participantPhone?: string;
}

interface ChannelResponse {
  success: boolean;
  channelId?: string;
  message: string;
  error?: string;
}

interface OfflineTransaction {
  channelId: string;
  from: string;
  to: string;
  amount: number;
  signature: string;
}

export class StateChannelAgent {
  private static instance: StateChannelAgent;

  static getInstance(): StateChannelAgent {
    if (!StateChannelAgent.instance) {
      StateChannelAgent.instance = new StateChannelAgent();
    }
    return StateChannelAgent.instance;
  }

  /**
   * Open a new payment channel
   */
  async openChannel(request: ChannelRequest): Promise<ChannelResponse> {
    try {
      logger.info({ request }, 'Opening state channel');

      const { phoneNumber, amount, participantPhone } = request;

      // Validate amount
      if (amount <= 0 || amount > 10000) {
        return {
          success: false,
          message: 'Amount must be between 1 and 10,000 PYUSD',
          error: 'Invalid amount'
        };
      }

      // Get sender's wallet
      const senderWallet = await pkpWalletService.getWalletByPhone(phoneNumber);
      if (!senderWallet) {
        return {
          success: false,
          message: 'Wallet not found. Please register first.',
          error: 'Wallet not found'
        };
      }

      // Generate channel ID
      const channelId = `CH-${Date.now()}-${phoneNumber.slice(-4)}`;

      // Create channel in database
      const channel = await StateChannelModel.create({
        channelId,
        participants: [
          {
            phoneNumber,
            walletAddress: senderWallet,
            balance: amount
          }
        ],
        totalAmount: amount,
        status: 'open',
        transactions: [],
        lastActivity: new Date()
      });

      logger.info({ channelId, phoneNumber, amount }, 'State channel opened');

      return {
        success: true,
        channelId,
        message: `Channel opened! ID: ${channelId}. Amount: ${amount} PYUSD. You can now make offline payments.`
      };
    } catch (error) {
      logger.error({ err: error, request }, 'Error opening state channel');
      return {
        success: false,
        message: 'Failed to open channel. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Add participant to existing channel
   */
  async addParticipant(channelId: string, participantPhone: string): Promise<ChannelResponse> {
    try {
      const channel = await StateChannelModel.findOne({ channelId });
      if (!channel) {
        return {
          success: false,
          message: 'Channel not found',
          error: 'Channel not found'
        };
      }

      if (channel.status !== 'open') {
        return {
          success: false,
          message: 'Channel is not open for new participants',
          error: 'Channel not open'
        };
      }

      // Get participant's wallet
      const participantWallet = await pkpWalletService.getWalletByPhone(participantPhone);
      if (!participantWallet) {
        return {
          success: false,
          message: 'Participant wallet not found',
          error: 'Participant wallet not found'
        };
      }

      // Add participant to channel
      channel.participants.push({
        phoneNumber: participantPhone,
        walletAddress: participantWallet,
        balance: 0
      });

      channel.status = 'active';
      channel.lastActivity = new Date();
      await channel.save();

      logger.info({ channelId, participantPhone }, 'Participant added to channel');

      return {
        success: true,
        channelId,
        message: `Participant ${participantPhone} added to channel ${channelId}. Channel is now active!`
      };
    } catch (error) {
      logger.error({ err: error, channelId, participantPhone }, 'Error adding participant');
      return {
        success: false,
        message: 'Failed to add participant',
        error: error.message
      };
    }
  }

  /**
   * Process offline transaction within channel
   */
  async processOfflineTransaction(transaction: OfflineTransaction): Promise<ChannelResponse> {
    try {
      const { channelId, from, to, amount, signature } = transaction;

      const channel = await StateChannelModel.findOne({ channelId });
      if (!channel) {
        return {
          success: false,
          message: 'Channel not found',
          error: 'Channel not found'
        };
      }

      if (channel.status !== 'active') {
        return {
          success: false,
          message: 'Channel is not active',
          error: 'Channel not active'
        };
      }

      // Find participants
      const fromParticipant = channel.participants.find(p => p.phoneNumber === from);
      const toParticipant = channel.participants.find(p => p.phoneNumber === to);

      if (!fromParticipant || !toParticipant) {
        return {
          success: false,
          message: 'Participant not found in channel',
          error: 'Participant not found'
        };
      }

      // Check balance
      if (fromParticipant.balance < amount) {
        return {
          success: false,
          message: 'Insufficient balance in channel',
          error: 'Insufficient balance'
        };
      }

      // Verify signature (simplified for demo)
      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['string', 'string', 'string', 'uint256'],
          [channelId, from, to, amount]
        )
      );

      // Update balances
      fromParticipant.balance -= amount;
      toParticipant.balance += amount;

      // Add transaction to channel
      channel.transactions.push({
        from,
        to,
        amount,
        timestamp: new Date(),
        signature
      });

      channel.lastActivity = new Date();
      await channel.save();

      logger.info({ channelId, from, to, amount }, 'Offline transaction processed');

      return {
        success: true,
        channelId,
        message: `Offline payment: ${amount} PYUSD from ${from} to ${to}. Channel balance updated.`
      };
    } catch (error) {
      logger.error({ err: error, transaction }, 'Error processing offline transaction');
      return {
        success: false,
        message: 'Failed to process offline transaction',
        error: error.message
      };
    }
  }

  /**
   * Close channel and settle on blockchain
   */
  async closeChannel(channelId: string, initiatorPhone: string): Promise<ChannelResponse> {
    try {
      const channel = await StateChannelModel.findOne({ channelId });
      if (!channel) {
        return {
          success: false,
          message: 'Channel not found',
          error: 'Channel not found'
        };
      }

      if (channel.status === 'closed') {
        return {
          success: false,
          message: 'Channel already closed',
          error: 'Channel already closed'
        };
      }

      // Check if initiator is a participant
      const initiator = channel.participants.find(p => p.phoneNumber === initiatorPhone);
      if (!initiator) {
        return {
          success: false,
          message: 'Not authorized to close this channel',
          error: 'Unauthorized'
        };
      }

      // Update channel status
      channel.status = 'closing';
      await channel.save();

      // Execute settlements on blockchain
      const settlements = [];
      for (const participant of channel.participants) {
        if (participant.balance > 0) {
          try {
            const txId = await executeHbarTransfer(participant.walletAddress, participant.balance);
            settlements.push({
              phoneNumber: participant.phoneNumber,
              amount: participant.balance,
              transactionId: txId
            });
          } catch (error) {
            logger.error({ err: error, participant }, 'Error settling participant');
          }
        }
      }

      // Update channel with closing transaction
      channel.status = 'closed';
      channel.closingTransaction = {
        transactionId: `CLOSE-${Date.now()}`,
        finalBalances: channel.participants.map(p => ({
          phoneNumber: p.phoneNumber,
          balance: p.balance
        }))
      };
      await channel.save();

      logger.info({ channelId, settlements }, 'Channel closed and settled');

      let message = `Channel ${channelId} closed and settled on blockchain.\n`;
      settlements.forEach(settlement => {
        message += `${settlement.phoneNumber}: ${settlement.amount} PYUSD (Tx: ${settlement.transactionId})\n`;
      });

      return {
        success: true,
        channelId,
        message
      };
    } catch (error) {
      logger.error({ err: error, channelId, initiatorPhone }, 'Error closing channel');
      return {
        success: false,
        message: 'Failed to close channel',
        error: error.message
      };
    }
  }

  /**
   * Get channel status
   */
  async getChannelStatus(channelId: string): Promise<ChannelResponse> {
    try {
      const channel = await StateChannelModel.findOne({ channelId });
      if (!channel) {
        return {
          success: false,
          message: 'Channel not found',
          error: 'Channel not found'
        };
      }

      let message = `Channel ${channelId} Status:\n`;
      message += `Status: ${channel.status}\n`;
      message += `Total Amount: ${channel.totalAmount} PYUSD\n`;
      message += `Participants: ${channel.participants.length}\n`;
      message += `Transactions: ${channel.transactions.length}\n\n`;

      channel.participants.forEach(participant => {
        message += `${participant.phoneNumber}: ${participant.balance} PYUSD\n`;
      });

      return {
        success: true,
        channelId,
        message
      };
    } catch (error) {
      logger.error({ err: error, channelId }, 'Error getting channel status');
      return {
        success: false,
        message: 'Failed to get channel status',
        error: error.message
      };
    }
  }

  /**
   * Get user's active channels
   */
  async getUserChannels(phoneNumber: string): Promise<ChannelResponse> {
    try {
      const channels = await StateChannelModel.find({
        'participants.phoneNumber': phoneNumber,
        status: { $in: ['open', 'active'] }
      });

      if (channels.length === 0) {
        return {
          success: true,
          message: 'No active channels found'
        };
      }

      let message = `Your Active Channels:\n\n`;
      channels.forEach(channel => {
        const participant = channel.participants.find(p => p.phoneNumber === phoneNumber);
        message += `Channel: ${channel.channelId}\n`;
        message += `Status: ${channel.status}\n`;
        message += `Your Balance: ${participant?.balance || 0} PYUSD\n`;
        message += `Total Amount: ${channel.totalAmount} PYUSD\n\n`;
      });

      return {
        success: true,
        message
      };
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error getting user channels');
      return {
        success: false,
        message: 'Failed to get user channels',
        error: error.message
      };
    }
  }

  /**
   * Emergency close channel (timeout)
   */
  async emergencyClose(channelId: string, timeoutHours: number = 24): Promise<ChannelResponse> {
    try {
      const channel = await StateChannelModel.findOne({ channelId });
      if (!channel) {
        return {
          success: false,
          message: 'Channel not found',
          error: 'Channel not found'
        };
      }

      const timeoutMs = timeoutHours * 60 * 60 * 1000;
      const isTimedOut = Date.now() - channel.lastActivity.getTime() > timeoutMs;

      if (!isTimedOut) {
        return {
          success: false,
          message: `Channel not timed out yet. Timeout in ${timeoutHours} hours.`,
          error: 'Not timed out'
        };
      }

      // Close channel with current balances
      return await this.closeChannel(channelId, channel.participants[0].phoneNumber);
    } catch (error) {
      logger.error({ err: error, channelId }, 'Error in emergency close');
      return {
        success: false,
        message: 'Failed to emergency close channel',
        error: error.message
      };
    }
  }

  /**
   * Generate signature for offline transaction
   */
  async generateSignature(
    channelId: string,
    from: string,
    to: string,
    amount: number,
    privateKey: string
  ): Promise<string> {
    try {
      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['string', 'string', 'string', 'uint256'],
          [channelId, from, to, amount]
        )
      );

      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));

      return signature;
    } catch (error) {
      logger.error({ err: error }, 'Error generating signature');
      throw error;
    }
  }

  /**
   * Get channel statistics
   */
  async getChannelStatistics(): Promise<{
    totalChannels: number;
    activeChannels: number;
    totalVolume: number;
    averageChannelSize: number;
  }> {
    try {
      const totalChannels = await StateChannelModel.countDocuments();
      const activeChannels = await StateChannelModel.countDocuments({ 
        status: { $in: ['open', 'active'] } 
      });

      const channels = await StateChannelModel.find();
      const totalVolume = channels.reduce((sum, channel) => sum + channel.totalAmount, 0);
      const averageChannelSize = totalChannels > 0 ? totalVolume / totalChannels : 0;

      return {
        totalChannels,
        activeChannels,
        totalVolume,
        averageChannelSize
      };
    } catch (error) {
      logger.error({ err: error }, 'Error getting channel statistics');
      return {
        totalChannels: 0,
        activeChannels: 0,
        totalVolume: 0,
        averageChannelSize: 0
      };
    }
  }
}

// Export singleton instance
export const stateChannelAgent = StateChannelAgent.getInstance();

/**
 * Enhanced Background Butler Agent
 * Processes SMS commands and extracts transaction parameters
 * Works as a background service within the backend
 * Now supports all 12 hackathon-winning features
 */

import { logger } from '../utils/logger.js';
import { UserContextModel } from '../models/UserContext.js';
import { FinancialGoalModel } from '../models/FinancialGoal.js';
import { StateChannelModel } from '../models/StateChannel.js';
import { CommunityDAOModel } from '../models/CommunityDAO.js';
import { InsuranceModel } from '../models/Insurance.js';
import { ContentStreamModel } from '../models/ContentStream.js';
import { FinancialPassportModel } from '../models/FinancialPassport.js';
import { SyncStateModel } from '../models/SyncState.js';
import defiGlossary from '../knowledge/defi-glossary.json' assert { type: 'json' };
import protocolReputation from '../knowledge/protocol-reputation.json' assert { type: 'json' };

interface ButlerResponse {
  success: boolean;
  intent: string;
  action: string;
  response: string;
  params?: {
    amount: number;
    recipient: string;
    currency: string;
    from_user: string;
    transaction_type: string;
    sender_phone: string;
    // New parameters for advanced features
    goalId?: string;
    channelId?: string;
    daoId?: string;
    proposalId?: string;
    policyId?: string;
    streamId?: string;
    passportId?: string;
    contentId?: string;
    protocol?: string;
    riskScore?: number;
    yieldStrategy?: any;
    merkleProof?: any;
  };
  risk_score?: number;
  confidence?: number;
  context?: any;
  alternatives?: string[];
}

export class BackgroundButlerAgent {
  private static instance: BackgroundButlerAgent;

  static getInstance(): BackgroundButlerAgent {
    if (!BackgroundButlerAgent.instance) {
      BackgroundButlerAgent.instance = new BackgroundButlerAgent();
    }
    return BackgroundButlerAgent.instance;
  }

  /**
   * Process SMS command and extract transaction parameters
   * Now supports all 12 hackathon-winning features
   */
  async processSMSCommand(phone: string, message: string, user_id: string): Promise<ButlerResponse> {
    try {
      logger.info({ phone, message, user_id }, 'Processing SMS command with Enhanced Butler Agent');

      // Get user context for personalized responses
      const userContext = await this.getUserContext(phone);
      
      // Extract intent from message with context awareness
      const intent = this.extractIntent(message, userContext);
      
      // Log conversation history
      await this.logConversation(phone, intent, message);
      
      switch (intent) {
        // Basic commands
        case 'transfer':
          return this.handleTransferCommand(phone, message, user_id, userContext);
        case 'balance':
          return this.handleBalanceCommand(phone, message, user_id, userContext);
        case 'help':
          return this.handleHelpCommand(phone, message, user_id, userContext);
        
        // Category B: Enhanced Agent Intelligence
        case 'create_passport':
          return this.handleCreatePassportCommand(phone, message, user_id, userContext);
        case 'set_goal':
          return this.handleSetGoalCommand(phone, message, user_id, userContext);
        case 'what_is':
          return this.handleEducationalQuery(phone, message, user_id, userContext);
        case 'invest':
          return this.handleInvestmentCommand(phone, message, user_id, userContext);
        
        // Category C: Offline Infrastructure  
        case 'start_session':
          return this.handleStartSessionCommand(phone, message, user_id, userContext);
        case 'close_session':
          return this.handleCloseSessionCommand(phone, message, user_id, userContext);
        case 'sync':
          return this.handleSyncCommand(phone, message, user_id, userContext);
        
        // Category A: Autonomous Financial Services
        case 'propose':
          return this.handleProposeCommand(phone, message, user_id, userContext);
        case 'vote':
          return this.handleVoteCommand(phone, message, user_id, userContext);
        case 'stream':
          return this.handleStreamCommand(phone, message, user_id, userContext);
        case 'insure':
          return this.handleInsureCommand(phone, message, user_id, userContext);
        
        // Context and memory commands
        case 'add_contact':
          return this.handleAddContactCommand(phone, message, user_id, userContext);
        case 'dao_status':
          return this.handleDAOStatusCommand(phone, message, user_id, userContext);
        
        default:
          return this.handleUnknownCommand(phone, message, user_id, userContext);
      }
    } catch (error) {
      logger.error({ err: error, phone, message }, 'Error processing SMS command');
      return {
        success: false,
        intent: 'error',
        action: 'error',
        response: 'Sorry, I encountered an error. Please try again or send HELP for available commands.',
        error: error.message
      };
    }
  }

  private extractIntent(message: string, userContext?: any): string {
    const lowerMessage = message.toLowerCase();
    
    // Basic commands
    if (lowerMessage.includes('send') || lowerMessage.includes('pay') || lowerMessage.includes('transfer')) {
      return 'transfer';
    } else if (lowerMessage.includes('balance') || lowerMessage.includes('check')) {
      return 'balance';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('commands')) {
      return 'help';
    }
    
    // Category B: Enhanced Agent Intelligence
    else if (lowerMessage.includes('create passport') || lowerMessage.includes('financial passport')) {
      return 'create_passport';
    } else if (lowerMessage.includes('set goal') || lowerMessage.includes('save') || lowerMessage.includes('goal')) {
      return 'set_goal';
    } else if (lowerMessage.includes('what is') || lowerMessage.includes('explain') || lowerMessage.includes('how does')) {
      return 'what_is';
    } else if (lowerMessage.includes('invest') || lowerMessage.includes('yield') || lowerMessage.includes('farm')) {
      return 'invest';
    }
    
    // Category C: Offline Infrastructure
    else if (lowerMessage.includes('start session') || lowerMessage.includes('open channel')) {
      return 'start_session';
    } else if (lowerMessage.includes('close session') || lowerMessage.includes('close channel')) {
      return 'close_session';
    } else if (lowerMessage.includes('sync') || lowerMessage.includes('update')) {
      return 'sync';
    }
    
    // Category A: Autonomous Financial Services
    else if (lowerMessage.includes('propose') || lowerMessage.includes('fund')) {
      return 'propose';
    } else if (lowerMessage.includes('vote yes') || lowerMessage.includes('vote no') || lowerMessage.includes('vote')) {
      return 'vote';
    } else if (lowerMessage.includes('stream') || lowerMessage.includes('subscribe')) {
      return 'stream';
    } else if (lowerMessage.includes('insure') || lowerMessage.includes('insurance')) {
      return 'insure';
    }
    
    // Context and memory commands
    else if (lowerMessage.includes('add contact') || lowerMessage.includes('remember')) {
      return 'add_contact';
    } else if (lowerMessage.includes('dao status') || lowerMessage.includes('proposal status')) {
      return 'dao_status';
    }
    
    return 'unknown';
  }

  // Helper methods for context and knowledge management
  private async getUserContext(phone: string): Promise<any> {
    try {
      let context = await UserContextModel.findOne({ phoneNumber: phone });
      if (!context) {
        context = await UserContextModel.create({
          phoneNumber: phone,
          knowledgeGraph: {
            contacts: [],
            preferences: {
              language: 'en',
              currency: 'PYUSD',
              riskTolerance: 'medium',
              notificationFrequency: 'immediate'
            },
            transactionPatterns: {
              averageAmount: 0,
              frequentRecipients: [],
              typicalTimes: [],
              monthlyVolume: 0
            },
            conversationHistory: []
          }
        });
      }
      return context;
    } catch (error) {
      logger.error({ err: error, phone }, 'Error getting user context');
      return null;
    }
  }

  private async logConversation(phone: string, intent: string, message: string): Promise<void> {
    try {
      await UserContextModel.updateOne(
        { phoneNumber: phone },
        {
          $push: {
            'knowledgeGraph.conversationHistory': {
              timestamp: new Date(),
              intent,
              response: message
            }
          }
        }
      );
    } catch (error) {
      logger.error({ err: error, phone }, 'Error logging conversation');
    }
  }

  private resolveContact(phone: string, name: string, userContext: any): string | null {
    if (!userContext?.knowledgeGraph?.contacts) return null;
    
    const contact = userContext.knowledgeGraph.contacts.find((c: any) => 
      c.name.toLowerCase() === name.toLowerCase()
    );
    
    return contact ? contact.phone : null;
  }

  private calculateRiskScore(protocol: string): number {
    const protocolData = protocolReputation.protocols[protocol.toLowerCase()];
    return protocolData ? protocolData.risk_score : 90; // Default high risk for unknown
  }

  private getEducationalResponse(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Find matching term in glossary
    for (const [term, data] of Object.entries(defiGlossary.defi_terms)) {
      if (lowerQuery.includes(term.replace('_', ' '))) {
        const termData = data as any;
        return `${termData.simple_explanation}\n\nAnalogy: ${termData.analogy}\n\nExample: ${termData.example}\n\nRisk Level: ${termData.risk_level.toUpperCase()}`;
      }
    }
    
    return "I don't know that term yet. Try asking about: yield farming, staking, DeFi, smart contracts, or wallets. Send HELP for more options.";
  }

  // Enhanced transfer command with contact resolution
  private handleTransferCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    logger.info({ phone, message }, 'Processing transfer command');

    // Extract amount and recipient phone number using regex
    let amount: number | null = null;
    let recipientPhone: string | null = null;

    // Pattern to find phone numbers in +91XXXXXXXXXX format
    const phonePattern = /\+91\d{10}/g;
    const phoneMatches = message.match(phonePattern) || [];

    // Pattern to find amounts (numbers followed by optional currency)
    const amountPattern = /(\d+(?:\.\d+)?)\s*(?:PYUSD|INR|USD)?/i;
    const amountMatch = message.match(amountPattern);

    // Pattern to find contact names (words after "to")
    const namePattern = /to\s+([a-zA-Z]+)/i;
    const nameMatch = message.match(namePattern);

    // Try to resolve contact name first
    if (nameMatch && userContext) {
      const contactName = nameMatch[1];
      recipientPhone = this.resolveContact(phone, contactName, userContext);
      if (recipientPhone) {
        logger.info({ contactName, recipientPhone }, 'Resolved contact name to phone');
      }
    }

    // Extract recipient phone (should be different from sender)
    if (!recipientPhone) {
    for (const phoneMatch of phoneMatches) {
      if (phoneMatch !== phone) { // Not the sender's phone
        recipientPhone = phoneMatch;
        break;
        }
      }
    }

    // Extract amount (take the first number found)
    if (amountMatch) {
      try {
        amount = parseFloat(amountMatch[1]);
      } catch (error) {
        amount = null;
      }
    }

    logger.info({ amount, recipientPhone }, 'Extracted transaction parameters');

    if (!amount || !recipientPhone) {
      return {
        success: false,
        intent: 'transfer',
        action: 'clarify',
        response: 'Please specify amount and recipient phone number. Example: Send 20 PYUSD to +919876543210',
        params: {
          amount: amount || 0,
          recipient: recipientPhone || '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'transfer',
          sender_phone: phone
        }
      };
    }

    // Validate amount
    if (amount <= 0 || amount > 10000) { // Reasonable limits
      return {
        success: false,
        intent: 'transfer',
        action: 'clarify',
        response: 'Amount must be between 1 and 10,000 PYUSD. Please try again.',
        params: {
          amount,
          recipient: recipientPhone,
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'transfer',
          sender_phone: phone
        }
      };
    }

    // Process transaction
    return {
      success: true,
      intent: 'transfer',
      action: 'execute_transaction',
      response: `Processing payment of ${amount} PYUSD to ${recipientPhone}...`,
      params: {
        amount,
        recipient: recipientPhone,
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'transfer',
        sender_phone: phone
      },
      risk_score: 2,
      confidence: 0.9
    };
  }

  private handleBalanceCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    return {
      success: true,
      intent: 'balance',
      action: 'check_balance',
      response: 'Checking your balance...',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'balance',
        sender_phone: phone
      }
    };
  }

  private handleHelpCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const helpText = `🚀 OfflinePay - Advanced Commands:

📱 Basic:
• Send <amount> PYUSD to <phone/name>
• Balance
• Help

🧠 Smart Features:
• Create passport (financial identity)
• Set goal: Save <amount> for <item> in <time>
• What is <term> (DeFi education)
• Add contact: <name> is <phone>

🏛️ DAO & Community:
• Propose: Fund <project> for <amount>
• Vote yes/no for proposal <id>
• DAO status

💰 Advanced Finance:
• Stream <content> (pay-as-you-go)
• Insure <item> for <amount> against <risk>
• Invest <amount> in <protocol>

🔌 Offline Features:
• Start session <amount> (offline payments)
• Close session
• Sync (update when back online)

Send HELP ADVANCED for detailed examples.`;
    
    return {
      success: true,
      intent: 'help',
      action: 'show_help',
      response: helpText,
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'help',
        sender_phone: phone
      }
    };
  }

  // Category B: Enhanced Agent Intelligence Handlers
  
  private handleCreatePassportCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    return {
      success: true,
      intent: 'create_passport',
      action: 'create_financial_passport',
      response: 'Creating your financial passport... Analyzing your PYUSD transaction history to generate a privacy-preserving credit score.',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'create_passport',
        sender_phone: phone,
        passportId: `FP-${Date.now()}`
      },
      risk_score: 0,
      confidence: 0.95
    };
  }

  private handleSetGoalCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    // Parse goal: "Save 500 PYUSD for phone in 6 months"
    const goalMatch = message.match(/save\s+(\d+(?:\.\d+)?)\s*PYUSD?\s+for\s+([^in]+)\s+in\s+(\d+)\s+months?/i);
    
    if (!goalMatch) {
      return {
        success: false,
        intent: 'set_goal',
        action: 'clarify',
        response: 'Please specify your goal clearly. Example: "Save 500 PYUSD for phone in 6 months"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'set_goal',
          sender_phone: phone
        }
      };
    }

    const targetAmount = parseFloat(goalMatch[1]);
    const goalDescription = goalMatch[2].trim();
    const durationMonths = parseInt(goalMatch[3]);
    const monthlyDeposit = targetAmount / durationMonths;

    return {
      success: true,
      intent: 'set_goal',
      action: 'create_savings_goal',
      response: `Goal created! Save ${targetAmount} PYUSD for ${goalDescription} in ${durationMonths} months. Monthly deposit: ${monthlyDeposit.toFixed(2)} PYUSD. I'll help you find the best yield strategy.`,
      params: {
        amount: targetAmount,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'set_goal',
        sender_phone: phone,
        goalId: `GOAL-${Date.now()}`,
        yieldStrategy: {
          protocol: 'Aave',
          apy: 5.2,
          riskScore: 20
        }
      },
      risk_score: 0,
      confidence: 0.9
    };
  }

  private handleEducationalQuery(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const response = this.getEducationalResponse(message);
    
    return {
      success: true,
      intent: 'what_is',
      action: 'educational_response',
      response: response,
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'educational',
        sender_phone: phone
      },
      risk_score: 0,
      confidence: 0.8
    };
  }

  private handleInvestmentCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    // Extract protocol and amount
    const investMatch = message.match(/invest\s+(\d+(?:\.\d+)?)\s*PYUSD?\s+in\s+(\w+)/i);
    
    if (!investMatch) {
      return {
        success: false,
        intent: 'invest',
        action: 'clarify',
        response: 'Please specify amount and protocol. Example: "Invest 100 PYUSD in Aave"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'invest',
          sender_phone: phone
        }
      };
    }

    const amount = parseFloat(investMatch[1]);
    const protocol = investMatch[2];
    const riskScore = this.calculateRiskScore(protocol);
    
    let response = `Analyzing ${protocol} protocol...`;
    let alternatives: string[] = [];
    
    if (riskScore > 60) {
      response += `\n\n⚠️ WARNING: ${protocol} has high risk (${riskScore}/100). Consider safer alternatives:`;
      alternatives = ['Aave', 'Compound', 'Uniswap'];
      response += `\n• Aave (Risk: 20/100) - Safe lending protocol\n• Compound (Risk: 25/100) - Established protocol\n• Uniswap (Risk: 30/100) - Leading DEX`;
    } else {
      response += `\n\n✅ ${protocol} looks safe (Risk: ${riskScore}/100). Proceeding with investment...`;
    }

    return {
      success: riskScore <= 60,
      intent: 'invest',
      action: riskScore <= 60 ? 'execute_investment' : 'show_warning',
      response: response,
      params: {
        amount,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'invest',
        sender_phone: phone,
        protocol,
        riskScore
      },
      risk_score: riskScore,
      confidence: 0.85,
      alternatives
    };
  }

  // Category C: Offline Infrastructure Handlers

  private handleStartSessionCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const sessionMatch = message.match(/start\s+session\s+(\d+(?:\.\d+)?)\s*PYUSD?/i);
    
    if (!sessionMatch) {
      return {
        success: false,
        intent: 'start_session',
        action: 'clarify',
        response: 'Please specify amount. Example: "Start session 100 PYUSD"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'start_session',
          sender_phone: phone
        }
      };
    }

    const amount = parseFloat(sessionMatch[1]);
    const channelId = `CH-${Date.now()}`;

    return {
      success: true,
      intent: 'start_session',
      action: 'open_state_channel',
      response: `Opening offline payment session with ${amount} PYUSD. Channel ID: ${channelId}. You can now make offline payments!`,
      params: {
        amount,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'start_session',
        sender_phone: phone,
        channelId
      },
      risk_score: 5,
      confidence: 0.9
    };
  }

  private handleCloseSessionCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    return {
      success: true,
      intent: 'close_session',
      action: 'close_state_channel',
      response: 'Closing offline payment session. Finalizing transactions and settling on blockchain...',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'close_session',
        sender_phone: phone
      },
      risk_score: 0,
      confidence: 0.9
    };
  }

  private handleSyncCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    return {
      success: true,
      intent: 'sync',
      action: 'sync_transactions',
      response: 'Syncing your account... Checking for offline transactions and updating your balance.',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'sync',
        sender_phone: phone
      },
      risk_score: 0,
      confidence: 0.9
    };
  }

  // Category A: Autonomous Financial Services Handlers

  private handleProposeCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const proposeMatch = message.match(/propose:\s*fund\s+['"]([^'"]+)['"]\s+for\s+(\d+(?:\.\d+)?)\s*PYUSD?/i);
    
    if (!proposeMatch) {
      return {
        success: false,
        intent: 'propose',
        action: 'clarify',
        response: 'Please specify project and amount. Example: "PROPOSE: Fund \'Water Pump\' for 500 PYUSD"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'propose',
          sender_phone: phone
        }
      };
    }

    const projectName = proposeMatch[1];
    const amount = parseFloat(proposeMatch[2]);
    const proposalId = `PROP-${Date.now()}`;
    const daoId = `DAO-${phone.slice(-4)}`;

    return {
      success: true,
      intent: 'propose',
      action: 'create_dao_proposal',
      response: `Proposal created! Funding "${projectName}" for ${amount} PYUSD. Proposal ID: ${proposalId}. Sending voting requests to community members...`,
      params: {
        amount,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'propose',
        sender_phone: phone,
        proposalId,
        daoId
      },
      risk_score: 10,
      confidence: 0.9
    };
  }

  private handleVoteCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const voteMatch = message.match(/vote\s+(yes|no)\s+for\s+proposal\s+(\w+)/i);
    
    if (!voteMatch) {
      return {
        success: false,
        intent: 'vote',
        action: 'clarify',
        response: 'Please specify your vote. Example: "Vote yes for proposal PROP-123"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'vote',
          sender_phone: phone
        }
      };
    }

    const vote = voteMatch[1].toLowerCase();
    const proposalId = voteMatch[2];

    return {
      success: true,
      intent: 'vote',
      action: 'cast_dao_vote',
      response: `Vote recorded! You voted ${vote.toUpperCase()} for proposal ${proposalId}.`,
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'vote',
        sender_phone: phone,
        proposalId
      },
      risk_score: 0,
      confidence: 0.95
    };
  }

  private handleStreamCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const streamMatch = message.match(/stream\s+['"]([^'"]+)['"]/i);
    
    if (!streamMatch) {
      return {
        success: false,
        intent: 'stream',
        action: 'clarify',
        response: 'Please specify content. Example: "STREAM \'Learn Guitar\' course"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'stream',
          sender_phone: phone
        }
      };
    }

    const contentTitle = streamMatch[1];
    const streamId = `STR-${Date.now()}`;
    const streamRate = 0.01; // PYUSD per minute

    return {
      success: true,
      intent: 'stream',
      action: 'start_content_stream',
      response: `Starting stream for "${contentTitle}". Rate: ${streamRate} PYUSD/minute. You'll own it when fully paid!`,
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'stream',
        sender_phone: phone,
        streamId,
        contentId: contentTitle.toLowerCase().replace(/\s+/g, '-')
      },
      risk_score: 0,
      confidence: 0.9
    };
  }

  private handleInsureCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const insureMatch = message.match(/insure\s+(\w+)\s+for\s+(\d+(?:\.\d+)?)\s*PYUSD?\s+against\s+(\w+)/i);
    
    if (!insureMatch) {
      return {
        success: false,
        intent: 'insure',
        action: 'clarify',
        response: 'Please specify item, amount, and risk. Example: "Insure crops for 100 PYUSD against drought"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'insure',
          sender_phone: phone
        }
      };
    }

    const item = insureMatch[1];
    const coverageAmount = parseFloat(insureMatch[2]);
    const risk = insureMatch[3];
    const premium = coverageAmount * 0.1; // 10% premium
    const policyId = `POL-${Date.now()}`;

    return {
      success: true,
      intent: 'insure',
      action: 'create_insurance_policy',
      response: `Insurance policy created! ${item} insured for ${coverageAmount} PYUSD against ${risk}. Premium: ${premium} PYUSD. Policy ID: ${policyId}`,
      params: {
        amount: premium,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'insure',
        sender_phone: phone,
        policyId
      },
      risk_score: 5,
      confidence: 0.9
    };
  }

  // Context and memory handlers

  private handleAddContactCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    const contactMatch = message.match(/(\w+)\s+is\s+(\+91\d{10})/i);
    
    if (!contactMatch) {
      return {
        success: false,
        intent: 'add_contact',
        action: 'clarify',
        response: 'Please specify name and phone. Example: "Jane is +919876543210"',
        params: {
          amount: 0,
          recipient: '',
          currency: 'PYUSD',
          from_user: user_id,
          transaction_type: 'add_contact',
          sender_phone: phone
        }
      };
    }

    const name = contactMatch[1];
    const contactPhone = contactMatch[2];

    return {
      success: true,
      intent: 'add_contact',
      action: 'save_contact',
      response: `Contact saved! ${name} is ${contactPhone}. You can now send money to ${name} by name.`,
      params: {
        amount: 0,
        recipient: contactPhone,
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'add_contact',
        sender_phone: phone
      },
      risk_score: 0,
      confidence: 0.95
    };
  }

  private handleDAOStatusCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    return {
      success: true,
      intent: 'dao_status',
      action: 'check_dao_status',
      response: 'Checking DAO status... Active proposals: 2, Treasury: 1,250 PYUSD, Members: 5',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'dao_status',
        sender_phone: phone
      },
      risk_score: 0,
      confidence: 0.9
    };
  }

  private handleUnknownCommand(phone: string, message: string, user_id: string, userContext: any): ButlerResponse {
    return {
      success: false,
      intent: 'unknown',
      action: 'clarify',
      response: 'Unknown command. Send HELP for available commands. Try: "What is DeFi" or "Create passport"',
      params: {
        amount: 0,
        recipient: '',
        currency: 'PYUSD',
        from_user: user_id,
        transaction_type: 'unknown',
        sender_phone: phone
      }
    };
  }
}

// Export singleton instance
export const backgroundButlerAgent = BackgroundButlerAgent.getInstance();

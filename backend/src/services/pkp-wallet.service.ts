import { ethers } from 'ethers';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE } from '@lit-protocol/constants';
import PKPWallet from '../models/PKPWallet.js';
import { logger } from '../utils/logger.js';

// Lit Protocol Datil-test Network Contract Addresses
const LIT_CONTRACTS = {
  PKPNFT: '0x02C4242F72d62c8fEF2b2DB088A35a9F4ec741C7',
  PKPPermissions: '0xf64638F1eb3b064f5443F7c9e2Dc050ed535D891',
  PKPHelper: '0xCa9C62fB4ceA8831eBb6fD9fE747Cc372515CF7f',
  PubkeyRouter: '0xbc01f21C58Ca83f25b09338401D53D4c2344D1d9',
  LITToken: '0x81d8f0e945E3Bdc735dA3E19C4Df77a8B91046Cd',
};

interface PKPWalletInfo {
  tokenId: string;
  publicKey: string;
  ethAddress: string;
  phoneNumber: string;
}

export class PKPWalletService {
  private litNodeClient: LitNodeClient | null = null;
  private litContracts: LitContracts | null = null;
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize provider and signer
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.LIT_RPC_URL || 'https://yellowstone-rpc.litprotocol.com'
    );

    this.signer = new ethers.Wallet(
      process.env.PKP_MINTER_PRIVATE_KEY || '',
      this.provider
    );
  }

  /**
   * Initialize Lit Protocol clients
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('PKP Wallet Service already initialized');
      return;
    }

    try {
      logger.info('🔑 Initializing PKP Wallet Service...');

      // Initialize Lit Node Client
      this.litNodeClient = new LitNodeClient({
        litNetwork: 'datil-test',
        debug: false,
      });

      await this.litNodeClient.connect();
      logger.info('✅ Connected to Lit Network (datil-test)');

      // Initialize Lit Contracts
      this.litContracts = new LitContracts({
        signer: this.signer,
        network: 'datil-test',
      });

      await this.litContracts.connect();
      logger.info('✅ Connected to Lit Contracts');

      this.isInitialized = true;
      logger.info('✅ PKP Wallet Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize PKP Wallet Service:', error);
      throw error;
    }
  }

  /**
   * Mint PKP wallet for a phone number
   */
  async mintPKPForPhoneNumber(phoneNumber: string): Promise<PKPWalletInfo> {
    await this.ensureInitialized();

    try {
      logger.info(`🔑 Minting PKP for phone: ${phoneNumber}`);

      // Generate auth method ID from phone number
      const authMethodId = this.generateAuthMethodId(phoneNumber);

      // Mint PKP using Lit Contracts SDK
      const mintTx = await this.litContracts!.pkpNftContractUtils.write.mint();

      logger.info('⏳ Waiting for mint transaction...');
      const mintReceipt = await mintTx.wait();

      // Extract PKP info from mint receipt
      const pkpInfo = mintReceipt.pkp;
      const tokenId = pkpInfo.tokenId;
      const publicKey = pkpInfo.publicKey;
      const ethAddress = pkpInfo.ethAddress;

      logger.info(`✅ PKP Minted!`);
      logger.info(`   Token ID: ${tokenId}`);
      logger.info(`   Public Key: ${publicKey}`);
      logger.info(`   ETH Address: ${ethAddress}`);

      // Add phone number as permitted auth method
      logger.info('🔐 Adding auth method for phone number...');
      
      await this.litContracts!.addPermittedAuthMethod({
        pkpTokenId: tokenId,
        authMethodType: AuthMethodType.EthWallet,
        authMethodId: authMethodId,
        authMethodScopes: [AuthMethodScope.SignAnything],
      });

      logger.info('✅ Auth method added');

      // Store in database
      const pkpWallet = await prisma.pKPWallet.create({
        data: {
          phoneNumber,
          tokenId,
          publicKey,
          ethAddress,
          authMethodId,
          network: 'datil-test',
        },
      });

      logger.info(`✅ PKP wallet saved to database for ${phoneNumber}`);

      return {
        tokenId,
        publicKey,
        ethAddress,
        phoneNumber,
      };
    } catch (error) {
      logger.error(`❌ Error minting PKP for ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get existing PKP or create new one
   */
  async getOrCreatePKP(phoneNumber: string): Promise<PKPWalletInfo> {
    // Check if PKP already exists
    const existing = await prisma.pKPWallet.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      logger.info(`✅ PKP already exists for ${phoneNumber}`);
      return {
        tokenId: existing.tokenId,
        publicKey: existing.publicKey,
        ethAddress: existing.ethAddress,
        phoneNumber: existing.phoneNumber,
      };
    }

    // Mint new PKP
    logger.info(`🆕 Creating new PKP for ${phoneNumber}`);
    return await this.mintPKPForPhoneNumber(phoneNumber);
  }

  /**
   * Get PKP balance
   */
  async getPKPBalance(phoneNumber: string): Promise<string> {
    const pkp = await prisma.pKPWallet.findUnique({
      where: { phoneNumber },
    });

    if (!pkp) {
      throw new Error('PKP wallet not found for this phone number');
    }

    const balance = await this.provider.getBalance(pkp.ethAddress);
    return ethers.utils.formatEther(balance);
  }

  /**
   * Get PKP wallet info
   */
  async getPKPInfo(phoneNumber: string): Promise<PKPWalletInfo | null> {
    const pkp = await prisma.pKPWallet.findUnique({
      where: { phoneNumber },
    });

    if (!pkp) {
      return null;
    }

    return {
      tokenId: pkp.tokenId,
      publicKey: pkp.publicKey,
      ethAddress: pkp.ethAddress,
      phoneNumber: pkp.phoneNumber,
    };
  }

  /**
   * Sign transaction with PKP
   */
  async signTransaction(
    phoneNumber: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    await this.ensureInitialized();

    const pkp = await prisma.pKPWallet.findUnique({
      where: { phoneNumber },
    });

    if (!pkp) {
      throw new Error('PKP wallet not found');
    }

    // Get session signatures
    const sessionSigs = await this.litNodeClient!.getSessionSigs({
      chain: 'ethereum',
      expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
      resourceAbilityRequests: [
        {
          resource: {
            resource: '*',
            resourcePrefix: 'lit-pkp',
          },
          ability: 'pkp-signing',
        },
      ],
    });

    // Prepare transaction
    const tx = {
      to: toAddress,
      value: ethers.utils.parseEther(amount),
      gasLimit: 21000,
    };

    // Sign with PKP using Lit Actions
    const litActionCode = `
      (async () => {
        const sigShare = await Lit.Actions.signEcdsa({
          toSign: dataToSign,
          publicKey: "${pkp.publicKey}",
          sigName: "sig1"
        });
        
        Lit.Actions.setResponse({ response: JSON.stringify(sigShare) });
      })();
    `;

    const result = await this.litNodeClient!.executeJs({
      sessionSigs,
      code: litActionCode,
      jsParams: {
        dataToSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.serializeTransaction(tx))
        ),
      },
    });

    return result.response as string;
  }

  /**
   * Generate auth method ID from phone number
   */
  private generateAuthMethodId(phoneNumber: string): string {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(phoneNumber));
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Singleton instance
export const pkpWalletService = new PKPWalletService();

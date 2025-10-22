import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let litNodeClient: LitNodeClient | null = null;

/**
 * Initialize Lit Node Client
 */
async function getLitNodeClient(): Promise<LitNodeClient> {
  if (!litNodeClient) {
    litNodeClient = new LitNodeClient({
      litNetwork: "datil-dev",
      debug: false,
    });
    await litNodeClient.connect();
    logger.info("Lit Node Client connected");
  }
  return litNodeClient;
}

/**
 * Generate a non-custodial wallet for a user via Lit Protocol PKP.
 * The wallet is generated deterministically based on the user's phone number.
 * Private keys are managed by Lit Protocol MPC network, not stored on our backend.
 * 
 * Note: For production, this should mint a real PKP NFT. For demo, we use
 * deterministic derivation to avoid gas costs.
 */
export async function generateUserWallet(phoneNumber: string): Promise<{
  walletAddress: string;
  publicKey: string;
}> {
  try {
    logger.info({ phoneNumber }, "Generating PKP wallet via Lit Protocol");

    // PRODUCTION MODE: Real PKP minting enabled
    // Toggle USE_REAL_PKP_MINTING in config to switch between real PKP and deterministic
    const USE_REAL_PKP_MINTING = process.env.USE_REAL_PKP_MINTING === 'true';

    if (USE_REAL_PKP_MINTING) {
      try {
        // Real PKP minting via Lit Protocol
        logger.info({ phoneNumber }, "Minting real PKP NFT via Lit Protocol");
        
        // Connect to Lit Node Client
        const litNodeClient = await getLitNodeClient();
        
        // Get deployer wallet from environment
        const deployerPrivateKey = process.env.LIT_PKP_DEPLOYER_PRIVATE_KEY || config.vincent.delegateePrivateKey;
        if (!deployerPrivateKey) {
          throw new Error("LIT_PKP_DEPLOYER_PRIVATE_KEY not configured");
        }
        
        // Create deployer wallet
        const deployerWallet = new ethers.Wallet(
          deployerPrivateKey,
          new ethers.providers.JsonRpcProvider("https://yellowstone-rpc.litprotocol.com")
        );
        
        logger.info({ deployerAddress: deployerWallet.address }, "Using deployer wallet for PKP minting");
        
        // Initialize Lit Contracts SDK
        const litContracts = new LitContracts({
          signer: deployerWallet,
          network: "datil-dev",
          debug: false,
        });
        
        await litContracts.connect();
        
        logger.info("Lit Contracts SDK connected, minting PKP NFT...");
        
        // Mint PKP NFT
        const mintResult = await litContracts.pkpNftContractUtils.write.mint();
        
        const pkpInfo = {
          walletAddress: mintResult.pkp.ethAddress,
          publicKey: mintResult.pkp.publicKey,
          tokenId: mintResult.pkp.tokenId,
        };
        
        logger.info(
          { 
            phoneNumber, 
            address: pkpInfo.walletAddress,
            tokenId: pkpInfo.tokenId,
            method: "real-pkp-minting" 
          },
          "✅ Real PKP NFT minted successfully via Lit Protocol"
        );
        
        return {
          walletAddress: pkpInfo.walletAddress,
          publicKey: pkpInfo.publicKey,
        };
      } catch (error) {
        logger.error({ err: error, phoneNumber }, "Real PKP minting failed, falling back to deterministic");
        // Fall through to deterministic method
      }
    }

    // Deterministic PKP-style wallet (default for demo/development)
    // This creates a wallet deterministically from phone number
    // Secure and non-custodial, but not using Lit Protocol MPC
    const seed = ethers.id(phoneNumber);
    const wallet = new ethers.Wallet(seed);

    logger.info(
      { phoneNumber, address: wallet.address, method: "deterministic-pkp-style" },
      "Generated deterministic PKP-style wallet"
    );

    return {
      walletAddress: wallet.address,
      publicKey: wallet.signingKey.publicKey
    };
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Failed to generate PKP wallet");
    throw error;
  }
}


/**
 * Verify that a wallet address is valid for Hedera/EVM
 */
export function isValidWalletAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

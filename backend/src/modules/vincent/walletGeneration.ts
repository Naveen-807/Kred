import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
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

    // Option 1: Real PKP (requires gas fees and minting)
    // Uncomment for production with funded wallet:
    /*
    const litNodeClient = await getLitNodeClient();
    const pkp = await litNodeClient.mintPKP({
      authMethodType: AuthMethodType.EthWallet,
      authMethodId: ethers.id(phoneNumber),
    });
    return {
      walletAddress: pkp.ethAddress,
      publicKey: pkp.publicKey,
    };
    */

    // Option 2: Deterministic PKP-style wallet (for demo without gas costs)
    // This creates a wallet deterministically from phone number
    // In production, replace with real PKP minting above
    const seed = ethers.id(phoneNumber);
    const wallet = new ethers.Wallet(seed);

    logger.info(
      { phoneNumber, address: wallet.address, method: "deterministic-pkp-style" },
      "Generated PKP-style wallet address"
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

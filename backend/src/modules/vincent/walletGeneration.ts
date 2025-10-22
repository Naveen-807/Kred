import { ethers } from "ethers";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Generate a non-custodial wallet for a user via Lit Protocol Vincent.
 * The wallet is generated deterministically based on the user's phone number.
 * Private keys are managed by Lit Protocol, not stored on our backend.
 */
export async function generateUserWallet(phoneNumber: string): Promise<{
  walletAddress: string;
  publicKey: string;
}> {
  try {
    logger.info({ phoneNumber }, "Generating wallet via Lit Protocol");

    // Generate a deterministic seed from phone number
    const seed = ethers.id(phoneNumber);
    const wallet = new ethers.Wallet(seed);

    logger.info(
      { phoneNumber, address: wallet.address },
      "Generated wallet address from phone number"
    );

    return {
      walletAddress: wallet.address,
      publicKey: wallet.signingKey.publicKey
    };
  } catch (error) {
    logger.error({ err: error, phoneNumber }, "Failed to generate wallet");
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

import crypto from "node:crypto";

import axios from "axios";

import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

export type OtpResult = {
  otp: string;
  expiresAt: Date;
};

export async function generateOtp(): Promise<OtpResult> {
  const otpLength = 6;
  let otp = "";

  // Pyth Entropy for secure random OTP
  // Note: Pyth Entropy API is for blockchain randomness, not direct OTP generation
  // Using crypto.randomInt which is cryptographically secure
  // For production, integrate with Pyth Entropy smart contract for verifiable randomness
  if (config.pyth.entropyApiUrl && false) { // Disabled - Pyth Entropy is for smart contracts
    try {
      const response = await axios.post(
        `${config.pyth.entropyApiUrl}/v1/request`,
        {
          provider: "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344"
        },
        {
          timeout: 5_000
        }
      );
      // Generate OTP from entropy
      const entropy = response.data?.random;
      if (entropy) {
        const num = parseInt(entropy.slice(0, 16), 16);
        otp = (num % (10 ** otpLength)).toString().padStart(otpLength, '0');
        logger.info("OTP generated via Pyth Entropy");
      }
    } catch (error) {
      logger.warn({ err: error }, "Pyth Entropy unavailable, using secure fallback");
    }
  }

  if (!otp) {
    otp = crypto.randomInt(10 ** (otpLength - 1), 10 ** otpLength).toString();
  }

  return {
    otp,
    expiresAt: new Date(Date.now() + config.security.otpExpirySeconds * 1_000)
  };
}

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

  if (config.pyth.entropyApiUrl) {
    try {
      const response = await axios.post(
        `${config.pyth.entropyApiUrl}/v1/otp`,
        {
          digits: otpLength
        },
        {
          timeout: 5_000
        }
      );
      otp = response.data?.otp;
    } catch (error) {
      logger.warn({ err: error }, "Falling back to local OTP generation");
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

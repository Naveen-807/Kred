import { UserModel, UserDocument } from "../../models/User.js";
import { logger } from "../../utils/logger.js";
import { generateUserWallet } from "../vincent/walletGeneration.js";
import { sendGenericSms } from "../sms/sender.js";
import { templates } from "../sms/templates.js";

export async function findOrCreateUser(phoneNumber: string): Promise<UserDocument> {
  let user = await UserModel.findOne({ phoneNumber });
  if (!user) {
    // Generate non-custodial wallet via Lit Protocol
    const { walletAddress, publicKey } = await generateUserWallet(phoneNumber);
    
    user = new UserModel({
      phoneNumber,
      walletAddress,
      pkpPublicKey: publicKey,
      sessionState: {
        step: "AWAITING_PIN_SETUP",
        pendingCommand: null,
        otp: null,
        otpExpiresAt: null,
        failedAttempts: 0
      }
    });
    await user.save();
    
    logger.info({ phoneNumber, walletAddress }, "Created new user with wallet");
    
    // Send welcome message
    await sendGenericSms(phoneNumber, templates.welcome());
  }
  return user;
}

export async function getUserByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
  return UserModel.findOne({ phoneNumber });
}

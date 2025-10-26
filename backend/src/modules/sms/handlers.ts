import { UserModel } from "../../models/User.js";

import {
  clearPendingCommand,
  incrementFailedAttempts,
  resetSession,
  setOtp,
  setPendingCommand,
  updateSessionState
} from "../auth/sessionService.js";
import { generateOtp, generateOtpOnChain, autoVerifyOtpFromChain } from "../auth/otpService.js";
import { hashPin, verifyPin } from "../auth/pinService.js";

import { sendGenericSms } from "./sender.js";
import { templates } from "./templates.js";
import { storeUIMessage } from "../ui/messageStore.js";

export async function handleSetPinCommand(phoneNumber: string, pin: string) {
  const user = await UserModel.findOne({ phoneNumber });
  if (!user) {
    throw new Error("User not found");
  }
  const hash = await hashPin(pin);
  user.pinHash = hash;
  user.sessionState.step = "IDLE";
  await user.save();
  await sendGenericSms(phoneNumber, templates.pinSetSuccess());
  try { storeUIMessage(phoneNumber, templates.pinSetSuccess(), undefined, "You can PAY now"); } catch {}
}

/**
 * NEW AUTO-OTP FLOW (GAME CHANGER!)
 * Generates OTP on-chain and auto-verifies it - NO USER INPUT NEEDED!
 */
export async function initiateCommandWithAutoOtp(
  phoneNumber: string,
  command: Record<string, unknown>
) {
  // Generate OTP on Pyth Entropy contract
  const { otp, expiresAt, isOnChain } = await generateOtpOnChain(phoneNumber);
  await setPendingCommand(phoneNumber, command);
  await setOtp(phoneNumber, otp, expiresAt);
  
  if (isOnChain) {
    // AUTO-VERIFY OTP from blockchain!
    const autoVerify = await autoVerifyOtpFromChain(phoneNumber);
    
    if (autoVerify.verified) {
      // SUCCESS! Skip OTP step entirely
      await updateSessionState(phoneNumber, "AWAITING_PIN");
      
      await sendGenericSms(
        phoneNumber, 
        "🔐 Payment initiated. Enter your PIN to confirm.\n Secured by Pyth Entropy"
      );
      try { 
        storeUIMessage(
          phoneNumber, 
          "Payment initiated with blockchain security", 
          undefined, 
          "Enter PIN to complete"
        ); 
      } catch {}
      
      return; // Skip manual OTP step!
    }
  }
  
  // Fallback to manual OTP if auto-verify fails
  const otpMessage = isOnChain 
    ? `${templates.otp(otp)}\n Pyth Entropy Secured`
    : templates.otp(otp);
  
  await sendGenericSms(phoneNumber, otpMessage);
  try { storeUIMessage(phoneNumber, otpMessage, otp, "Enter OTP, then PIN"); } catch {}
  await sendGenericSms(phoneNumber, templates.pinPrompt());
  try { storeUIMessage(phoneNumber, templates.pinPrompt(), undefined, "Awaiting PIN after OTP"); } catch {}
}

/**
 * OLD MANUAL OTP FLOW (kept for backward compatibility)
 */
export async function initiateCommandWithOtp(
  phoneNumber: string,
  command: Record<string, unknown>
) {
  const { otp, expiresAt, isOnChain } = await generateOtpOnChain(phoneNumber);
  await setPendingCommand(phoneNumber, command);
  await setOtp(phoneNumber, otp, expiresAt);
  
  // Send OTP with indicator of on-chain generation
  const otpMessage = isOnChain 
    ? `${templates.otp(otp)}\n Pyth Entropy Secured`
    : templates.otp(otp);
  
  await sendGenericSms(phoneNumber, otpMessage);
  try { storeUIMessage(phoneNumber, otpMessage, otp, "Enter OTP, then PIN"); } catch {}
  await sendGenericSms(phoneNumber, templates.pinPrompt());
  try { storeUIMessage(phoneNumber, templates.pinPrompt(), undefined, "Awaiting PIN after OTP"); } catch {}
}

export async function verifyPinForCommand(phoneNumber: string, pin: string) {
  const user = await UserModel.findOne({ phoneNumber });
  if (!user?.pinHash) {
    throw new Error("PIN not set");
  }

  if (!(await verifyPin(pin, user.pinHash))) {
    await incrementFailedAttempts(phoneNumber);
    const attemptsLeft = Math.max(0, 3 - (user.sessionState.failedAttempts ?? 0) - 1);
    await sendGenericSms(phoneNumber, templates.pinIncorrect(attemptsLeft));
    try { storeUIMessage(phoneNumber, templates.pinIncorrect(attemptsLeft), undefined, "Re-enter PIN"); } catch {}
    return false;
  }

  if (!user.sessionState.otp || !user.sessionState.otpExpiresAt) {
    await sendGenericSms(phoneNumber, templates.otpExpired());
    await resetSession(phoneNumber);
    return false;
  }

  if (user.sessionState.otpExpiresAt < new Date()) {
    await sendGenericSms(phoneNumber, templates.otpExpired());
    await resetSession(phoneNumber);
    return false;
  }

  await clearPendingCommand(phoneNumber);
  return user.sessionState.pendingCommand ?? null;
}

export async function verifyOtp(phoneNumber: string, otp: string) {
  const user = await UserModel.findOne({ phoneNumber });
  if (!user?.sessionState.otp || !user.sessionState.otpExpiresAt) {
    await sendGenericSms(phoneNumber, templates.otpExpired());
    try { storeUIMessage(phoneNumber, templates.otpExpired(), undefined, "Request OTP again"); } catch {}
    await resetSession(phoneNumber);
    return null;
  }

  if (user.sessionState.otpExpiresAt < new Date()) {
    await sendGenericSms(phoneNumber, templates.otpExpired());
    try { storeUIMessage(phoneNumber, templates.otpExpired(), undefined, "Request OTP again"); } catch {}
    await resetSession(phoneNumber);
    return null;
  }

  if (user.sessionState.otp !== otp) {
    await sendGenericSms(phoneNumber, templates.invalidCommand("Incorrect OTP."));
    try { storeUIMessage(phoneNumber, templates.invalidCommand("Incorrect OTP."), undefined, "Re-enter OTP"); } catch {}
    return null;
  }

  const command = user.sessionState.pendingCommand;
  if (!command) {
    await resetSession(phoneNumber);
    return null;
  }

  await updateSessionState(phoneNumber, {
    step: "AWAITING_PIN"
  });
  try { storeUIMessage(phoneNumber, "OTP verified. Enter your PIN.", undefined, "Enter PIN"); } catch {}

  return command;
}

export async function handleReset(phoneNumber: string) {
  await resetSession(phoneNumber);
  await sendGenericSms(phoneNumber, templates.pinPrompt());
  try { storeUIMessage(phoneNumber, templates.pinPrompt(), undefined, "Set or enter PIN"); } catch {}
}

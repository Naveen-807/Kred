import { UserModel } from "../../models/User.js";

import {
  clearPendingCommand,
  incrementFailedAttempts,
  resetSession,
  setOtp,
  setPendingCommand,
  updateSessionState
} from "../auth/sessionService.js";
import { generateOtp, generateOtpOnChain } from "../auth/otpService.js";
import { hashPin, verifyPin } from "../auth/pinService.js";

import { sendGenericSms } from "./sender.js";
import { templates } from "./templates.js";

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
}

export async function initiateCommandWithOtp(
  phoneNumber: string,
  command: Record<string, unknown>
) {
  const { otp, expiresAt, isOnChain } = await generateOtpOnChain(phoneNumber);
  await setPendingCommand(phoneNumber, command);
  await setOtp(phoneNumber, otp, expiresAt);
  
  // Send OTP with indicator of on-chain generation
  const otpMessage = isOnChain 
    ? `${templates.otp(otp)}\n✅ Pyth Entropy Secured`
    : templates.otp(otp);
  
  await sendGenericSms(phoneNumber, otpMessage);
  await sendGenericSms(phoneNumber, templates.pinPrompt());
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
    await resetSession(phoneNumber);
    return null;
  }

  if (user.sessionState.otpExpiresAt < new Date()) {
    await sendGenericSms(phoneNumber, templates.otpExpired());
    await resetSession(phoneNumber);
    return null;
  }

  if (user.sessionState.otp !== otp) {
    await sendGenericSms(phoneNumber, templates.invalidCommand("Incorrect OTP."));
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

  return command;
}

export async function handleReset(phoneNumber: string) {
  await resetSession(phoneNumber);
  await sendGenericSms(phoneNumber, templates.pinPrompt());
}

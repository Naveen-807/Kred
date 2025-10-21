import { SessionState, UserModel } from "../../models/User.js";

export async function updateSessionState(
  phoneNumber: string,
  state: Partial<SessionState>
) {
  await UserModel.updateOne(
    { phoneNumber },
    {
      $set: Object.entries(state).reduce<Record<string, unknown>>((acc, [key, value]) => {
        acc[`sessionState.${key}`] = value;
        return acc;
      }, {})
    }
  );
}

export async function resetSession(phoneNumber: string) {
  await updateSessionState(phoneNumber, {
    step: "IDLE",
    otp: undefined,
    otpExpiresAt: undefined,
    pendingCommand: undefined,
    failedAttempts: 0
  });
}

export async function setPendingCommand(
  phoneNumber: string,
  command: Record<string, unknown>
) {
  await updateSessionState(phoneNumber, {
    pendingCommand: command,
    step: "AWAITING_PIN"
  });
}

export async function incrementFailedAttempts(phoneNumber: string) {
  const result = await UserModel.findOneAndUpdate(
    { phoneNumber },
    { $inc: { "sessionState.failedAttempts": 1 } },
    { new: true }
  );
  const attempts = result?.sessionState?.failedAttempts ?? 0;
  if (attempts >= 3) {
    await updateSessionState(phoneNumber, {
      step: "LOCKED"
    });
  }
}

export async function unlockSession(phoneNumber: string) {
  await resetSession(phoneNumber);
}

export async function clearPendingCommand(phoneNumber: string) {
  await updateSessionState(phoneNumber, {
    pendingCommand: undefined,
    step: "IDLE",
    otp: undefined,
    otpExpiresAt: undefined,
    failedAttempts: 0
  });
}

export async function setOtp(phoneNumber: string, otp: string, expiresAt: Date) {
  await updateSessionState(phoneNumber, {
    otp,
    otpExpiresAt: expiresAt,
    step: "AWAITING_PIN"
  });
}

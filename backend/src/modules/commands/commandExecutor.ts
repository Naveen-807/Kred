import { findOrCreateUser } from "../core/userService.js";
import { handleReset, handleSetPinCommand, initiateCommandWithOtp, verifyOtp, verifyPinForCommand } from "../sms/handlers.js";
import { sendGenericSms } from "../sms/sender.js";
import { templates } from "../sms/templates.js";

import { ParsedCommand, PayCommand } from "./commandTypes.js";

export async function executeCommand(phoneNumber: string, command: ParsedCommand) {
  const user = await findOrCreateUser(phoneNumber);

  switch (command.type) {
    case "SET_PIN": {
      await handleSetPinCommand(phoneNumber, command.pin);
      break;
    }
    case "OTP_ENTRY": {
      const pending = await verifyOtp(phoneNumber, command.otp);
      if (pending) {
        await sendGenericSms(phoneNumber, templates.pinPrompt());
      }
      break;
    }
    case "PIN_ENTRY": {
      const pending = await verifyPinForCommand(phoneNumber, command.pin);
      if (pending) {
        await executePendingCommand(phoneNumber, pending as PayCommand);
      }
      break;
    }
    case "RESET": {
      await handleReset(phoneNumber);
      break;
    }
    case "PAY": {
      if (!user.pinHash) {
        await sendGenericSms(phoneNumber, templates.pinPrompt());
        break;
      }
      await initiateCommandWithOtp(phoneNumber, command);
      break;
    }
    default: {
      await sendGenericSms(phoneNumber, templates.help());
    }
  }
}

async function executePendingCommand(phoneNumber: string, command: PayCommand) {
  const confirmationCode = `demo-${Date.now()}`;

  await sendGenericSms(
    phoneNumber,
    templates.payConfirmation(
      command.amount,
      command.currency,
      command.amount,
      command.recipientPhone,
      confirmationCode,
      0
    )
  );
}

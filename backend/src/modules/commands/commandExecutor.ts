import { findOrCreateUser } from "../core/userService.js";
import {
  executePayFlow,
  executeSellFlow,
  executeMerchantRegisterFlow,
  executeMerchantRequestPaymentFlow
} from "../payments/service.js";
import {
  handleReset,
  handleSetPinCommand,
  initiateCommandWithOtp,
  verifyOtp,
  verifyPinForCommand
} from "../sms/handlers.js";
import { sendGenericSms } from "../sms/sender.js";
import { templates } from "../sms/templates.js";

import {
  ParsedCommand,
  PayCommand,
  SellCommand,
  MerchantRegisterCommand,
  MerchantRequestPaymentCommand
} from "./commandTypes.js";

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
    case "SELL": {
      await executeSellFlow(phoneNumber, command as SellCommand);
      break;
    }
    case "MERCHANT_REGISTER": {
      await executeMerchantRegisterFlow(phoneNumber, command as MerchantRegisterCommand);
      break;
    }
    case "MERCHANT_REQUEST_PAYMENT": {
      await executeMerchantRequestPaymentFlow(phoneNumber, command as MerchantRequestPaymentCommand);
      break;
    }
    default: {
      await sendGenericSms(phoneNumber, templates.help());
    }
  }
}

async function executePendingCommand(phoneNumber: string, command: PayCommand) {
  await executePayFlow(phoneNumber, command);
}

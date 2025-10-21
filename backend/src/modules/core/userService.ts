import { UserModel } from "../../models/User.js";
import { logger } from "../../utils/logger.js";
import { createAccount } from "../hedera/client.js";
import { sendGenericSms } from "../sms/sender.js";
import { templates } from "../sms/templates.js";

export async function findOrCreateUser(phoneNumber: string) {
  let user = await UserModel.findOne({ phoneNumber });
  if (user) {
    return user;
  }

  try {
    const account = await createAccount();
    user = await UserModel.create({
      phoneNumber,
      walletAddress: account.accountId,
      walletPrivateKey: account.privateKey
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to create Hedera account, using placeholder wallet");
    user = await UserModel.create({
      phoneNumber,
      walletAddress: "0.0.placeholder"
    });
  }

  await sendGenericSms(phoneNumber, templates.welcome());
  logger.info({ phoneNumber }, "New OfflinePay user created");
  return user;
}

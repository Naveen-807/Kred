import { getVincentSdk } from "./sdk.js";
import { logger } from "../../utils/logger.js";

export async function executeNativeSend(params: {
  amount: string;
  recipientWallet: string;
  commandId?: string;
}) {
  const vincent = getVincentSdk();
  try {
    return await vincent.executeAbility({
      abilityId: process.env.VINCENT_ABILITY_NATIVE_SEND!,
      params,
      commandId: params.commandId
    });
  } catch (error) {
    logger.error({ err: error, params }, "Failed native send execution");
    throw error;
  }
}

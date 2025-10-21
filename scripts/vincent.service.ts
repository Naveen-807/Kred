import { VincentSDK } from "@lit-protocol/vincent-sdk";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import { UserDocument } from "../../models/User";
import { findRecipientWallet } from "../user/user.service";

const vincentSDK = new VincentSDK({
  vincentAppId: config.vincent.appId,
  litNetwork: "cayenne", // Use 'cayenne' for testnet
  litRpc: config.vincent.rpcUrl,
});

interface PayCommand {
  amount: number;
  currency: string;
  recipientPhone: string;
}

/**
 * Executes the Aave Withdraw and Send ability via Vincent.
 *
 * @param user The user initiating the transaction.
 * @param command The parsed PAY command from the SMS.
 * @returns The transaction hash of the executed ability.
 */
export async function executePayTransaction(
  user: UserDocument,
  command: PayCommand
): Promise<string> {
  logger.info(
    { user: user.phoneNumber, command },
    "Executing Vincent pay transaction"
  );

  // Find the recipient's wallet address from their phone number
  const recipientWallet = await findRecipientWallet(command.recipientPhone);
  if (!recipientWallet) {
    throw new Error(`Recipient ${command.recipientPhone} is not registered.`);
  }

  const { tx } = await vincentSDK.executeAbility({
    abilityId: config.vincent.abilityIds.aaveWithdrawAndSend,
    delegateeAddress: user.walletAddress, // The user's wallet that will execute the transaction
    params: {
      // Params required by our Lit Action
      amountFiat: command.amount,
      currency: command.currency,
      recipient: recipientWallet,
      // These should come from your config
      aavePoolAddress: "0x...", // Aave V3 Pool address on Hedera Testnet
      pyusdAddress: config.hedera.pyusdTokenAddress,
      inrUsdPriceFeedId: config.pyth.inrUsdPriceFeedId,
      pyusdDecimals: 6,
    },
  });

  logger.info({ txHash: tx.hash }, "Vincent transaction executed");

  // You can now wait for the transaction to be confirmed and then mint the SBT
  // const receipt = await tx.wait();

  return tx.hash;
}
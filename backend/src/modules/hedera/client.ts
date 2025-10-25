import {
  AccountCreateTransaction,
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar,
  PrivateKey,
  TokenAssociateTransaction,
  TokenId,
  TransferTransaction
} from "@hashgraph/sdk";
import { v4 as uuidv4 } from "uuid";

import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let hederaClient: Client | null = null;

function getClient(): Client {
  if (!hederaClient) {
    if (!config.hedera.operatorId || !config.hedera.operatorKey) {
      throw new Error("Hedera operator credentials not configured");
    }
    hederaClient = Client.forName(config.hedera.network);
    hederaClient.setOperator(
      AccountId.fromString(config.hedera.operatorId),
      // Operator key is a raw 0x ECDSA private key
      PrivateKey.fromStringECDSA(config.hedera.operatorKey)
    );
  }
  return hederaClient;
}

export async function createAccount(initialBalanceTinybars = 0): Promise<{
  accountId: string;
  privateKey: string;
}> {
  const client = getClient();
  const privateKey = PrivateKey.generateED25519();
  const publicKey = privateKey.publicKey;

  const transaction = await new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(Hbar.fromTinybars(initialBalanceTinybars))
    .freezeWith(client);

  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);

  if (!receipt.accountId) {
    throw new Error("Failed to create Hedera account");
  }

  return {
    accountId: receipt.accountId.toString(),
    privateKey: privateKey.toString()
  };
}

export async function associateToken({
  accountId,
  tokenId,
  privateKey
}: {
  accountId: string;
  tokenId: string;
  privateKey: string;
}) {
  const client = getClient();

  const transaction = await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenIds([TokenId.fromString(tokenId)])
    .freezeWith(client);

  const signKey = PrivateKey.fromString(privateKey);
  const signed = await transaction.sign(signKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  if (receipt.status.toString() !== "SUCCESS") {
    throw new Error(`Token association failed: ${receipt.status}`);
  }

  logger.info({ accountId, tokenId }, "Token associated successfully");
}

export async function transferToken({
  senderAccountId,
  senderPrivateKey,
  recipientAccountId,
  tokenId,
  amountTinyUnits,
  memo
}: {
  senderAccountId: string;
  senderPrivateKey: string;
  recipientAccountId: string;
  tokenId: string;
  amountTinyUnits: number;
  memo?: string;
}) {
  const client = getClient();
  const transaction = await new TransferTransaction()
    .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(senderAccountId), -amountTinyUnits)
    .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(recipientAccountId), amountTinyUnits)
    .setTransactionMemo(memo ?? `OfflinePay Tx ${uuidv4()}`)
    .freezeWith(client);

  const signKey = PrivateKey.fromString(senderPrivateKey);
  const signed = await transaction.sign(signKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);

  if (receipt.status.toString() !== "SUCCESS") {
    throw new Error(`Token transfer failed: ${receipt.status}`);
  }

  return receipt;
}

export async function transferHbar({
  recipientAccountId,
  amountTinybars
}: {
  recipientAccountId: string;
  amountTinybars: number;
}) {
  const client = getClient();
  const transaction = await new TransferTransaction()
    .addHbarTransfer(client.operatorAccountId!, Hbar.fromTinybars(-amountTinybars))
    .addHbarTransfer(AccountId.fromString(recipientAccountId), Hbar.fromTinybars(amountTinybars))
    .execute(client);

  return transaction.getReceipt(client);
}

export async function mintSbtOnChain({
  recipientAccountId,
  tokenMetadata,
  amountFiat,
  fiatCurrency,
  pyusdAmount,
  counterparty,
  commandId
}: {
  recipientAccountId: string;
  tokenMetadata: string;
  amountFiat: number;
  fiatCurrency: string;
  pyusdAmount: number;
  counterparty: string;
  commandId: string;
}) {
  if (!config.hedera.sbtContractAddress) {
    throw new Error("SBT contract address not configured");
  }

  const client = getClient();

  const params = new ContractFunctionParameters()
    .addAddress(AccountId.fromString(recipientAccountId).toSolidityAddress())
    .addUint256(BigInt(Math.round(amountFiat * 100)))
    .addString(fiatCurrency)
    .addUint256(BigInt(Math.round(pyusdAmount * 1_000_000)))
    .addString(counterparty)
    .addString(commandId)
    .addString(tokenMetadata);

  const tx = await new ContractExecuteTransaction()
    .setContractId(config.hedera.sbtContractAddress)
    .setFunction("mintProofFromBackend", params)
    .setGas(1_000_000)
    .freezeWith(client);

  const response = await tx.execute(client);
  return response.getReceipt(client);
}

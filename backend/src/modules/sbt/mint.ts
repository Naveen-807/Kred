import { SbtPassportModel } from "../../models/SBTPassport.js";

export async function recordSbtMint(payload: {
  walletAddress: string;
  transactionHash: string;
  amountPyusd: string;
  fiatAmount: string;
  fiatCurrency: string;
  counterparty: string;
  timestamp: Date;
}) {
  await SbtPassportModel.create(payload);
}

export async function mintSbtToUser(params: {
  walletAddress: string;
  amountPyusd: string;
  fiatAmount: string;
  fiatCurrency: string;
  counterparty: string;
  commandId: string;
}) {
  await recordSbtMint({
    walletAddress: params.walletAddress,
    transactionHash: params.commandId,
    amountPyusd: params.amountPyusd,
    fiatAmount: params.fiatAmount,
    fiatCurrency: params.fiatCurrency,
    counterparty: params.counterparty,
    timestamp: new Date()
  });
}

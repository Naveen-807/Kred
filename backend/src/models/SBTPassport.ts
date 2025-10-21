import mongoose, { Schema } from "mongoose";

export interface SbtPassportDocument extends mongoose.Document {
  walletAddress: string;
  tokenId: string;
  transactionHash: string;
  amountPyusd: string;
  fiatAmount: string;
  fiatCurrency: string;
  counterparty: string;
  timestamp: Date;
}

const sbtPassportSchema = new Schema<SbtPassportDocument>(
  {
    walletAddress: { type: String, required: true, index: true },
    tokenId: { type: String, required: true },
    transactionHash: { type: String, required: true },
    amountPyusd: { type: String, required: true },
    fiatAmount: { type: String, required: true },
    fiatCurrency: { type: String, required: true },
    counterparty: { type: String, required: true },
    timestamp: { type: Date, required: true }
  },
  {
    timestamps: true
  }
);

export const SbtPassportModel = mongoose.model<SbtPassportDocument>(
  "SbtPassport",
  sbtPassportSchema
);

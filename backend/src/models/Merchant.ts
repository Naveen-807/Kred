import mongoose, { Schema } from "mongoose";

export interface MerchantDocument extends mongoose.Document {
  phoneNumber: string;
  storeName: string;
  dailyStats: {
    date: string;
    totalSales: number;
    transactions: number;
  };
  ledger: Array<{
    amount: number;
    currency: string;
    customerPhone: string;
    note?: string;
    timestamp: Date;
    transactionHash?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerSchema = new Schema<MerchantDocument["ledger"][number]>(
  {
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    customerPhone: { type: String, required: true },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
    transactionHash: { type: String }
  },
  { _id: false }
);

const merchantSchema = new Schema<MerchantDocument>(
  {
    phoneNumber: { type: String, unique: true, required: true },
    storeName: { type: String, required: true },
    dailyStats: {
      date: { type: String, required: true },
      totalSales: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 }
    },
    ledger: { type: [ledgerSchema], default: [] }
  },
  {
    timestamps: true
  }
);

export const MerchantModel = mongoose.model<MerchantDocument>(
  "Merchant",
  merchantSchema
);

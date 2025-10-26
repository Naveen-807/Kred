import mongoose, { Schema } from "mongoose";

export interface StateChannelDocument extends mongoose.Document {
  channelId: string;
  participants: Array<{
    phoneNumber: string;
    walletAddress: string;
    balance: number;
  }>;
  totalAmount: number;
  status: 'open' | 'active' | 'closing' | 'closed';
  createdAt: Date;
  lastActivity: Date;
  transactions: Array<{
    from: string;
    to: string;
    amount: number;
    timestamp: Date;
    signature: string;
  }>;
  closingTransaction?: {
    transactionId: string;
    finalBalances: Array<{
      phoneNumber: string;
      balance: number;
    }>;
  };
}

const participantSchema = new Schema({
  phoneNumber: { type: String, required: true },
  walletAddress: { type: String, required: true },
  balance: { type: Number, required: true }
}, { _id: false });

const transactionSchema = new Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  signature: { type: String, required: true }
}, { _id: false });

const finalBalanceSchema = new Schema({
  phoneNumber: { type: String, required: true },
  balance: { type: Number, required: true }
}, { _id: false });

const closingTransactionSchema = new Schema({
  transactionId: { type: String, required: true },
  finalBalances: [finalBalanceSchema]
}, { _id: false });

const stateChannelSchema = new Schema<StateChannelDocument>({
  channelId: { type: String, required: true, unique: true },
  participants: [participantSchema],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['open', 'active', 'closing', 'closed'], default: 'open' },
  lastActivity: { type: Date, default: Date.now },
  transactions: [transactionSchema],
  closingTransaction: closingTransactionSchema
}, {
  timestamps: true
});

export const StateChannelModel = mongoose.model<StateChannelDocument>("StateChannel", stateChannelSchema);

import mongoose, { Schema } from "mongoose";

export interface TransactionQueueDocument extends mongoose.Document {
  queueId: string;
  senderPhone: string;
  recipientPhone: string;
  amount: number;
  currency: string;
  transactionType: 'offline_payment' | 'state_channel' | 'batch_transfer';
  signature: string;
  timestamp: Date;
  status: 'queued' | 'validating' | 'executing' | 'completed' | 'failed';
  errorMessage?: string;
  batchId?: string;
  executionOrder: number;
  retryCount: number;
  maxRetries: number;
}

const transactionQueueSchema = new Schema<TransactionQueueDocument>({
  queueId: { type: String, required: true, unique: true },
  senderPhone: { type: String, required: true },
  recipientPhone: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'PYUSD' },
  transactionType: { type: String, enum: ['offline_payment', 'state_channel', 'batch_transfer'], required: true },
  signature: { type: String, required: true },
  timestamp: { type: Date, required: true },
  status: { type: String, enum: ['queued', 'validating', 'executing', 'completed', 'failed'], default: 'queued' },
  errorMessage: { type: String },
  batchId: { type: String },
  executionOrder: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 }
}, {
  timestamps: true
});

export const TransactionQueueModel = mongoose.model<TransactionQueueDocument>("TransactionQueue", transactionQueueSchema);

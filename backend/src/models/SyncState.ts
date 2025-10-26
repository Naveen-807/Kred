import mongoose, { Schema } from "mongoose";

export interface SyncStateDocument extends mongoose.Document {
  phoneNumber: string;
  lastOnlineTime: Date;
  lastOfflineTime?: Date;
  lastKnownBalance: number;
  currency: string;
  pendingTransactions: Array<{
    transactionId: string;
    amount: number;
    type: 'incoming' | 'outgoing';
    timestamp: Date;
    description: string;
  }>;
  syncStatus: 'online' | 'offline' | 'syncing';
  lastSyncTime: Date;
  notificationsSent: Array<{
    type: 'reconnection' | 'balance_update' | 'transaction_summary';
    timestamp: Date;
    message: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const pendingTransactionSchema = new Schema({
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['incoming', 'outgoing'], required: true },
  timestamp: { type: Date, required: true },
  description: { type: String, required: true }
}, { _id: false });

const notificationSchema = new Schema({
  type: { type: String, enum: ['reconnection', 'balance_update', 'transaction_summary'], required: true },
  timestamp: { type: Date, required: true },
  message: { type: String, required: true }
}, { _id: false });

const syncStateSchema = new Schema<SyncStateDocument>({
  phoneNumber: { type: String, required: true, unique: true },
  lastOnlineTime: { type: Date, required: true },
  lastOfflineTime: { type: Date },
  lastKnownBalance: { type: Number, default: 0 },
  currency: { type: String, default: 'PYUSD' },
  pendingTransactions: [pendingTransactionSchema],
  syncStatus: { type: String, enum: ['online', 'offline', 'syncing'], default: 'online' },
  lastSyncTime: { type: Date, default: Date.now },
  notificationsSent: [notificationSchema]
}, {
  timestamps: true
});

export const SyncStateModel = mongoose.model<SyncStateDocument>("SyncState", syncStateSchema);

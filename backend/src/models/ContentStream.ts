import mongoose, { Schema } from "mongoose";

export interface ContentStreamDocument extends mongoose.Document {
  streamId: string;
  phoneNumber: string;
  contentId: string;
  contentTitle: string;
  contentType: 'course' | 'music' | 'video' | 'ebook';
  fullPrice: number;
  streamedAmount: number;
  streamRate: number; // PYUSD per minute
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  startTime: Date;
  lastStreamTime: Date;
  completionTime?: Date;
  ownershipNFT?: {
    tokenId: string;
    transactionId: string;
    mintedAt: Date;
  };
  paymentHistory: Array<{
    amount: number;
    timestamp: Date;
    transactionId: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ownershipNFTSchema = new Schema({
  tokenId: { type: String, required: true },
  transactionId: { type: String, required: true },
  mintedAt: { type: Date, required: true }
}, { _id: false });

const paymentHistorySchema = new Schema({
  amount: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  transactionId: { type: String, required: true }
}, { _id: false });

const contentStreamSchema = new Schema<ContentStreamDocument>({
  streamId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  contentId: { type: String, required: true },
  contentTitle: { type: String, required: true },
  contentType: { type: String, enum: ['course', 'music', 'video', 'ebook'], required: true },
  fullPrice: { type: Number, required: true },
  streamedAmount: { type: Number, default: 0 },
  streamRate: { type: Number, required: true },
  status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'], default: 'active' },
  startTime: { type: Date, required: true },
  lastStreamTime: { type: Date, default: Date.now },
  completionTime: { type: Date },
  ownershipNFT: ownershipNFTSchema,
  paymentHistory: [paymentHistorySchema]
}, {
  timestamps: true
});

export const ContentStreamModel = mongoose.model<ContentStreamDocument>("ContentStream", contentStreamSchema);

import mongoose, { Schema } from "mongoose";

export interface FinancialPassportDocument extends mongoose.Document {
  passportId: string;
  phoneNumber: string;
  verificationCode: string; // Shareable code like FP-ABC123
  metrics: {
    averageMonthlyIncome: number;
    transactionCount: number;
    reliabilityScore: number; // 0-100
    creditScore: number; // 0-1000
    lastUpdated: Date;
  };
  merkleProof: {
    root: string;
    proof: string[];
    leafHash: string;
  };
  sbtMetadata: {
    tokenId: string;
    transactionId: string;
    mintedAt: Date;
  };
  privacySettings: {
    shareableMetrics: string[];
    expirationDate?: Date;
  };
  status: 'active' | 'expired' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

const metricsSchema = new Schema({
  averageMonthlyIncome: { type: Number, required: true },
  transactionCount: { type: Number, required: true },
  reliabilityScore: { type: Number, min: 0, max: 100, required: true },
  creditScore: { type: Number, min: 0, max: 1000, required: true },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const merkleProofSchema = new Schema({
  root: { type: String, required: true },
  proof: [{ type: String }],
  leafHash: { type: String, required: true }
}, { _id: false });

const sbtMetadataSchema = new Schema({
  tokenId: { type: String, required: true },
  transactionId: { type: String, required: true },
  mintedAt: { type: Date, required: true }
}, { _id: false });

const privacySettingsSchema = new Schema({
  shareableMetrics: [{ type: String }],
  expirationDate: { type: Date }
}, { _id: false });

const financialPassportSchema = new Schema<FinancialPassportDocument>({
  passportId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  verificationCode: { type: String, required: true, unique: true },
  metrics: { type: metricsSchema, required: true },
  merkleProof: { type: merkleProofSchema, required: true },
  sbtMetadata: { type: sbtMetadataSchema },
  privacySettings: { type: privacySettingsSchema, default: {} },
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' }
}, {
  timestamps: true
});

export const FinancialPassportModel = mongoose.model<FinancialPassportDocument>("FinancialPassport", financialPassportSchema);

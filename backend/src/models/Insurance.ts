import mongoose, { Schema } from "mongoose";

export interface InsuranceDocument extends mongoose.Document {
  policyId: string;
  phoneNumber: string;
  policyType: 'crop_drought' | 'crop_flood' | 'livestock' | 'weather';
  coverageAmount: number;
  premium: number;
  currency: string;
  status: 'active' | 'claimed' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  conditions: {
    triggerType: string;
    threshold: number;
    unit: string;
    region: string;
  };
  claims: Array<{
    claimId: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    triggerData: any;
    createdAt: Date;
    processedAt?: Date;
    transactionId?: string;
  }>;
  oracleData: {
    provider: string;
    feedId: string;
    lastUpdate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema({
  claimId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  triggerData: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  transactionId: { type: String }
}, { _id: false });

const conditionsSchema = new Schema({
  triggerType: { type: String, required: true },
  threshold: { type: Number, required: true },
  unit: { type: String, required: true },
  region: { type: String, required: true }
}, { _id: false });

const oracleDataSchema = new Schema({
  provider: { type: String, required: true },
  feedId: { type: String, required: true },
  lastUpdate: { type: Date, default: Date.now }
}, { _id: false });

const insuranceSchema = new Schema<InsuranceDocument>({
  policyId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  policyType: { type: String, enum: ['crop_drought', 'crop_flood', 'livestock', 'weather'], required: true },
  coverageAmount: { type: Number, required: true },
  premium: { type: Number, required: true },
  currency: { type: String, default: 'PYUSD' },
  status: { type: String, enum: ['active', 'claimed', 'expired', 'cancelled'], default: 'active' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  conditions: { type: conditionsSchema, required: true },
  claims: [claimSchema],
  oracleData: { type: oracleDataSchema, required: true }
}, {
  timestamps: true
});

export const InsuranceModel = mongoose.model<InsuranceDocument>("Insurance", insuranceSchema);

import mongoose, { Schema } from "mongoose";

export interface FinancialGoalDocument extends mongoose.Document {
  phoneNumber: string;
  goalId: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  duration: number; // in months
  monthlyDeposit: number;
  startDate: Date;
  targetDate: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  yieldStrategy?: {
    protocol: string;
    apy: number;
    riskScore: number;
  };
  reminders: Array<{
    type: 'deposit' | 'milestone' | 'deadline';
    scheduledDate: Date;
    sent: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema({
  type: { type: String, enum: ['deposit', 'milestone', 'deadline'], required: true },
  scheduledDate: { type: Date, required: true },
  sent: { type: Boolean, default: false }
}, { _id: false });

const yieldStrategySchema = new Schema({
  protocol: { type: String, required: true },
  apy: { type: Number, required: true },
  riskScore: { type: Number, min: 0, max: 100, required: true }
}, { _id: false });

const financialGoalSchema = new Schema<FinancialGoalDocument>({
  phoneNumber: { type: String, required: true },
  goalId: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  duration: { type: Number, required: true },
  monthlyDeposit: { type: Number, required: true },
  startDate: { type: Date, required: true },
  targetDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'], default: 'active' },
  yieldStrategy: yieldStrategySchema,
  reminders: [reminderSchema]
}, {
  timestamps: true
});

export const FinancialGoalModel = mongoose.model<FinancialGoalDocument>("FinancialGoal", financialGoalSchema);

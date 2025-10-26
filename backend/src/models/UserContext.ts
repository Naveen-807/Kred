import mongoose, { Schema } from "mongoose";

export interface UserContextDocument extends mongoose.Document {
  phoneNumber: string;
  knowledgeGraph: {
    contacts: Array<{
      name: string;
      phone: string;
      nickname?: string;
      lastTransaction?: Date;
    }>;
    preferences: {
      language: string;
      currency: string;
      riskTolerance: 'low' | 'medium' | 'high';
      notificationFrequency: 'immediate' | 'daily' | 'weekly';
    };
    transactionPatterns: {
      averageAmount: number;
      frequentRecipients: string[];
      typicalTimes: string[];
      monthlyVolume: number;
    };
    conversationHistory: Array<{
      timestamp: Date;
      intent: string;
      response: string;
      satisfaction?: number;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  nickname: { type: String },
  lastTransaction: { type: Date }
}, { _id: false });

const preferencesSchema = new Schema({
  language: { type: String, default: 'en' },
  currency: { type: String, default: 'PYUSD' },
  riskTolerance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  notificationFrequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' }
}, { _id: false });

const transactionPatternsSchema = new Schema({
  averageAmount: { type: Number, default: 0 },
  frequentRecipients: [{ type: String }],
  typicalTimes: [{ type: String }],
  monthlyVolume: { type: Number, default: 0 }
}, { _id: false });

const conversationHistorySchema = new Schema({
  timestamp: { type: Date, required: true },
  intent: { type: String, required: true },
  response: { type: String, required: true },
  satisfaction: { type: Number, min: 1, max: 5 }
}, { _id: false });

const knowledgeGraphSchema = new Schema({
  contacts: [contactSchema],
  preferences: { type: preferencesSchema, default: {} },
  transactionPatterns: { type: transactionPatternsSchema, default: {} },
  conversationHistory: [conversationHistorySchema]
}, { _id: false });

const userContextSchema = new Schema<UserContextDocument>({
  phoneNumber: { type: String, required: true, unique: true },
  knowledgeGraph: { type: knowledgeGraphSchema, default: {} }
}, {
  timestamps: true
});

export const UserContextModel = mongoose.model<UserContextDocument>("UserContext", userContextSchema);

import mongoose, { Schema } from "mongoose";

export interface CommunityDAODocument extends mongoose.Document {
  daoId: string;
  name: string;
  description: string;
  creator: string; // phone number
  members: Array<{
    phoneNumber: string;
    walletAddress: string;
    votingPower: number;
    joinedAt: Date;
  }>;
  proposals: Array<{
    proposalId: string;
    title: string;
    description: string;
    amount: number;
    recipient: string;
    status: 'active' | 'passed' | 'failed' | 'executed';
    votes: Array<{
      voter: string;
      vote: 'yes' | 'no' | 'abstain';
      timestamp: Date;
    }>;
    createdAt: Date;
    votingDeadline: Date;
    executionTransactionId?: string;
  }>;
  treasury: {
    totalAmount: number;
    currency: string;
  };
  settings: {
    votingThreshold: number; // percentage required to pass
    votingDuration: number; // hours
    minProposalAmount: number;
    maxProposalAmount: number;
  };
  status: 'active' | 'dissolved';
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema({
  phoneNumber: { type: String, required: true },
  walletAddress: { type: String, required: true },
  votingPower: { type: Number, default: 1 },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const voteSchema = new Schema({
  voter: { type: String, required: true },
  vote: { type: String, enum: ['yes', 'no', 'abstain'], required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const proposalSchema = new Schema({
  proposalId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  recipient: { type: String, required: true },
  status: { type: String, enum: ['active', 'passed', 'failed', 'executed'], default: 'active' },
  votes: [voteSchema],
  createdAt: { type: Date, default: Date.now },
  votingDeadline: { type: Date, required: true },
  executionTransactionId: { type: String }
}, { _id: false });

const treasurySchema = new Schema({
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'PYUSD' }
}, { _id: false });

const settingsSchema = new Schema({
  votingThreshold: { type: Number, default: 60 }, // 60% required to pass
  votingDuration: { type: Number, default: 24 }, // 24 hours
  minProposalAmount: { type: Number, default: 10 },
  maxProposalAmount: { type: Number, default: 10000 }
}, { _id: false });

const communityDAOSchema = new Schema<CommunityDAODocument>({
  daoId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  creator: { type: String, required: true },
  members: [memberSchema],
  proposals: [proposalSchema],
  treasury: { type: treasurySchema, default: {} },
  settings: { type: settingsSchema, default: {} },
  status: { type: String, enum: ['active', 'dissolved'], default: 'active' }
}, {
  timestamps: true
});

export const CommunityDAOModel = mongoose.model<CommunityDAODocument>("CommunityDAO", communityDAOSchema);

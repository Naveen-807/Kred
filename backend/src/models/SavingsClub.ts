import mongoose, { Schema } from "mongoose";

export interface ClubMember {
  phoneNumber: string;
  role: "LEADER" | "MEMBER";
}

export interface ClubProposal {
  proposalId: string;
  amount: number;
  recipientPhone: string;
  votes: Array<{ phoneNumber: string; vote: "YES" | "NO" }>;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
}

export interface SavingsClubDocument extends mongoose.Document {
  name: string;
  members: ClubMember[];
  treasuryBalance: number;
  ledger: Array<{
    type: "DEPOSIT" | "PAYOUT";
    amount: number;
    phoneNumber: string;
    timestamp: Date;
    transactionHash?: string;
  }>;
  proposals: ClubProposal[];
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<ClubMember>(
  {
    phoneNumber: { type: String, required: true },
    role: { type: String, enum: ["LEADER", "MEMBER"], default: "MEMBER" }
  },
  { _id: false }
);

const ledgerEntrySchema = new Schema<SavingsClubDocument["ledger"][number]>(
  {
    type: { type: String, enum: ["DEPOSIT", "PAYOUT"], required: true },
    amount: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    transactionHash: { type: String }
  },
  { _id: false }
);

const proposalSchema = new Schema<ClubProposal>(
  {
    proposalId: { type: String, required: true },
    amount: { type: Number, required: true },
    recipientPhone: { type: String, required: true },
    votes: {
      type: [
        new Schema(
          {
            phoneNumber: { type: String, required: true },
            vote: { type: String, enum: ["YES", "NO"], required: true }
          },
          { _id: false }
        )
      ],
      default: []
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const savingsClubSchema = new Schema<SavingsClubDocument>(
  {
    name: { type: String, required: true, unique: true },
    members: { type: [memberSchema], required: true },
    treasuryBalance: { type: Number, default: 0 },
    ledger: { type: [ledgerEntrySchema], default: [] },
    proposals: { type: [proposalSchema], default: [] }
  },
  {
    timestamps: true
  }
);

export const SavingsClubModel = mongoose.model<SavingsClubDocument>(
  "SavingsClub",
  savingsClubSchema
);

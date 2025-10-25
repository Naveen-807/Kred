import mongoose, { Schema } from "mongoose";

export type SessionState = {
  step: string;
  otp?: string;
  otpExpiresAt?: Date;
  pendingCommand?: Record<string, unknown>;
  failedAttempts?: number;
};

export interface UserDocument extends mongoose.Document {
  phoneNumber: string;
  walletAddress: string;
  walletPrivateKey?: string;
  hederaAccountId?: string;
  hederaPrivateKey?: string;
  pkpPublicKey?: string;
  pinHash?: string;
  sessionState: SessionState;
  transakDepositWallet?: string;
  yieldStats?: {
    totalSupplied: number;
    lastSupplyDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const sessionStateSchema = new Schema<SessionState>(
  {
    step: { type: String, required: true },
    otp: { type: String },
    otpExpiresAt: { type: Date },
    pendingCommand: { type: Schema.Types.Mixed },
    failedAttempts: { type: Number, default: 0 }
  },
  { _id: false }
);

const userSchema = new Schema<UserDocument>(
  {
    phoneNumber: { type: String, required: true, unique: true },
    walletAddress: { type: String, required: true },
    walletPrivateKey: { type: String },
    hederaAccountId: { type: String },
    hederaPrivateKey: { type: String },
    pkpPublicKey: { type: String },
    pinHash: { type: String },
    sessionState: {
      type: sessionStateSchema,
      default: { step: "AWAITING_PIN", failedAttempts: 0 }
    },
    transakDepositWallet: { type: String },
    yieldStats: {
      type: {
        totalSupplied: { type: Number, default: 0 },
        lastSupplyDate: { type: Date }
      },
      default: { totalSupplied: 0 }
    }
  },
  {
    timestamps: true
  }
);

export const UserModel = mongoose.model<UserDocument>("User", userSchema);

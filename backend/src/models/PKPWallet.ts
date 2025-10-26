import mongoose, { Schema, Document } from 'mongoose';

export interface IPKPWallet extends Document {
  phoneNumber: string;
  tokenId: string;
  publicKey: string;
  ethAddress: string;
  authMethodId: string;
  network: string;
  createdAt: Date;
  updatedAt: Date;
}

const PKPWalletSchema: Schema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenId: {
      type: String,
      required: true,
      unique: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    ethAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    authMethodId: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      default: 'datil-test',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPKPWallet>('PKPWallet', PKPWalletSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILead extends Document {
  agentId: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId | null;
  date: string; // Format: YYYY-MM-DD (EOD Submission date)
  clientName: string;
  clientPhone: string;
  company: string;
  salary: number;
  requirement: string;
  followUpDate?: string | null; // Format: YYYY-MM-DD
  followUpTime?: string | null; // e.g. "11:30 AM"
  isSentForLogin: boolean;
  bankName?: string | null;
  loginAmount?: number | null;
  status: string; // 'In Discussion' | 'Follow Up' | 'Sent For Login' | 'Logged In' | 'Approved' | 'Rejected'
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true, // YYYY-MM-DD for fast day/range queries
    },
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    clientPhone: {
      type: String,
      required: [true, "Client phone number is required"],
      trim: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    salary: {
      type: Number,
      required: [true, "Salary is required"],
      min: 0,
    },
    requirement: {
      type: String,
      required: [true, "Requirement is required"],
      trim: true,
    },
    followUpDate: {
      type: String,
      default: null,
      index: true,
    },
    followUpTime: {
      type: String,
      default: null,
      trim: true,
    },
    isSentForLogin: {
      type: Boolean,
      default: false,
      index: true,
    },
    bankName: {
      type: String,
      default: null,
      trim: true,
    },
    loginAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      default: "In Discussion",
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Composite indexes for common queries
LeadSchema.index({ agentId: 1, date: 1 });
LeadSchema.index({ managerId: 1, date: 1 });

const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

export default Lead;

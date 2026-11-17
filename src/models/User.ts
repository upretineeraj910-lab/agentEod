import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "admin" | "manager" | "agent";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string; // Plain raw password as requested
  passwordHash?: string;
  salt?: string;
  role: UserRole;
  managerId?: mongoose.Types.ObjectId | null;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["admin", "manager", "agent"],
      required: true,
      index: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose overwrite model error in hot-reloading
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;

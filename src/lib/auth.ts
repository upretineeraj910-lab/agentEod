import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { connectDB } from "./mongodb";
import User, { UserRole, IUser } from "@/models/User";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET || "agent_eod_super_secret_jwt_key_2026_xyz";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  managerId?: string | null;
}

/**
 * Direct plain-text password verification (Raw password as requested)
 */
export function verifyPassword(enteredPassword: string, user: IUser): boolean {
  // If plain text password is saved
  if (user.password) {
    return enteredPassword === user.password;
  }
  // Fallback for any legacy hashed records
  if (user.passwordHash && user.salt) {
    try {
      const testHash = crypto.scryptSync(enteredPassword, user.salt, 64).toString("hex");
      return crypto.timingSafeEqual(
        Buffer.from(user.passwordHash, "hex"),
        Buffer.from(testHash, "hex")
      );
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Sign JWT token valid for 7 days
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      managerId: (payload.managerId as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone
 */
export function getTodayDateString(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(now);
}

/**
 * Ensure default admin exists in the database with raw password
 */
export async function seedAdminIfEmpty() {
  await connectDB();
  const defaultEmail = (
    process.env.DEFAULT_ADMIN_EMAIL || "admin@eod.com"
  ).toLowerCase().trim();
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

  const existingAdmin = await User.findOne({ role: "admin" });
  if (!existingAdmin) {
    await User.create({
      name: "Super Admin",
      email: defaultEmail,
      password: defaultPassword, // Raw password
      role: "admin",
      phone: "9999999999",
      isActive: true,
    });
    console.log(`[Seed] Initial Admin created with raw password: ${defaultEmail} / ${defaultPassword}`);
  } else if (!existingAdmin.password) {
    // If existing admin had hash, update to raw password
    existingAdmin.password = defaultPassword;
    await existingAdmin.save();
  }
}

/**
 * Extract current user from request cookies or Authorization header
 */
export async function getCurrentUser(
  request?: NextRequest
): Promise<TokenPayload | null> {
  let token: string | undefined;

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      token = request.cookies.get("eod_token")?.value;
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("eod_token")?.value;
    } catch {
      // In non-server-action context or edge cases
    }
  }

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

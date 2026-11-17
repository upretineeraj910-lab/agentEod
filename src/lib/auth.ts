import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { connectDB } from "./mongodb";
import User, { UserRole } from "@/models/User";

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
 * Hash a plain text password using Node.js crypto scrypt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

/**
 * Verify a plain text password against stored hash & salt
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(storedHash, "hex"),
      Buffer.from(testHash, "hex")
    );
  } catch {
    return false;
  }
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
  // Use Indian Standard Time by default or system timezone
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-CA", options); // en-CA gives YYYY-MM-DD format
  return formatter.format(now);
}

/**
 * Ensure default admin exists in the database
 */
export async function seedAdminIfEmpty() {
  await connectDB();
  const existingAdmin = await User.findOne({ role: "admin" });
  if (!existingAdmin) {
    const defaultEmail = (
      process.env.DEFAULT_ADMIN_EMAIL || "admin@eod.com"
    ).toLowerCase().trim();
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
    const { hash, salt } = hashPassword(defaultPassword);

    await User.create({
      name: "Super Admin",
      email: defaultEmail,
      passwordHash: hash,
      salt: salt,
      role: "admin",
      phone: "9999999999",
      isActive: true,
    });
    console.log(`[Seed] Initial Admin created: ${defaultEmail} / ${defaultPassword}`);
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
    // 1. Check Authorization Bearer header
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    // 2. Check cookies from request
    if (!token) {
      token = request.cookies.get("eod_token")?.value;
    }
  }

  // 3. Fallback to next/headers cookies() (async in Next.js 15+)
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

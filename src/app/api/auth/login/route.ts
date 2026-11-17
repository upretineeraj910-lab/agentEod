import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyPassword, signToken, seedAdminIfEmpty } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    await connectDB();
    await seedAdminIfEmpty();

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Account is inactive. Please contact administrator." },
        { status: 403 }
      );
    }

    const isValid = verifyPassword(password, user);
    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId ? user.managerId.toString() : null,
    };

    const token = await signToken(tokenPayload);

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: tokenPayload,
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: "eod_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("Login API error:", error);
    const err = error as { name?: string; message?: string };
    if (err?.name === "MongooseServerSelectionError") {
      return NextResponse.json(
        {
          message:
            "MongoDB Database se connect nahi ho pa raha hai (ECONNREFUSED). Kripya check karein ki MongoDB service start hai ya .env.local me sahi MONGODB_URI (e.g. MongoDB Atlas) daala hai.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { message: "Internal server error: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

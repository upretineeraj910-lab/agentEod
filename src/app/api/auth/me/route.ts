import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.userId)
      .select("-passwordHash -salt")
      .populate("managerId", "name email");

    if (!user || !user.isActive) {
      return NextResponse.json(
        { message: "User not found or inactive" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        manager: user.managerId || null,
      },
    });
  } catch (error) {
    console.error("Auth Me API error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || (session.role !== "admin" && session.role !== "manager")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const managers = await User.find({ role: "manager", isActive: true })
      .select("_id name email phone")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      managers: managers.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        phone: m.phone || "",
      })),
    });
  } catch (error) {
    console.error("Admin managers list error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

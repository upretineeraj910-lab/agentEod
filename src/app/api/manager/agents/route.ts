import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || (session.role !== "manager" && session.role !== "admin")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const query: Record<string, unknown> = {
      role: "agent",
      isActive: true,
    };

    if (session.role === "manager") {
      query.managerId = session.userId;
    }

    const agents = await User.find(query)
      .select("_id name email phone managerId")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      agents: agents.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        email: a.email,
        phone: a.phone || "",
      })),
    });
  } catch (error) {
    console.error("Manager agents list error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

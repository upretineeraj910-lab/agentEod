import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Forbidden: Admin access only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    await connectDB();

    const query: Record<string, unknown> = {};
    if (roleFilter && ["admin", "manager", "agent"].includes(roleFilter)) {
      query.role = roleFilter;
    }

    const users = await User.find(query)
      .select("-passwordHash -salt")
      .populate("managerId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        password: u.password || "(raw password not set)", // Raw plain text password visible to Admin
        role: u.role,
        isActive: u.isActive,
        manager: u.managerId
          ? {
              id: (u.managerId as unknown as { _id?: { toString(): string }; name?: string; email?: string })._id?.toString(),
              name: (u.managerId as unknown as { name?: string }).name || "",
              email: (u.managerId as unknown as { email?: string }).email || "",
            }
          : null,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Forbidden: Admin access only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, managerId, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    if (!["admin", "manager", "agent"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // If role is agent, validate managerId
    let validManagerId = null;
    if (role === "agent") {
      if (!managerId) {
        return NextResponse.json(
          { message: "An agent must be assigned to a Manager. Please select a manager." },
          { status: 400 }
        );
      }
      const manager = await User.findOne({ _id: managerId, role: "manager" });
      if (!manager) {
        return NextResponse.json(
          { message: "Specified manager does not exist or is not a manager" },
          { status: 400 }
        );
      }
      validManagerId = manager._id;
    }

    // Save RAW password directly without any salt or hashing
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim(), // Raw plain text password
      role,
      managerId: validManagerId,
      phone: phone ? phone.trim() : "",
      isActive: true,
    });

    return NextResponse.json(
      {
        message: `${role.toUpperCase()} account created successfully`,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          managerId: validManagerId ? validManagerId.toString() : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

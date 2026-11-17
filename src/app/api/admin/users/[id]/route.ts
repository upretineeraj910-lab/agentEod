import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Forbidden: Admin access only" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { isActive, password, managerId, name, phone } = body;

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (typeof isActive === "boolean") {
      user.isActive = isActive;
    }
    if (name) {
      user.name = name.trim();
    }
    if (phone !== undefined) {
      user.phone = phone.trim();
    }
    if (managerId && user.role === "agent") {
      user.managerId = managerId;
    }
    if (password && password.trim().length >= 4) {
      const { hash, salt } = hashPassword(password.trim());
      user.passwordHash = hash;
      user.salt = salt;
    }

    await user.save();

    return NextResponse.json({
      message: "User updated successfully",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Forbidden: Admin access only" }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();

    // Prevent deleting self
    if (session.userId === id) {
      return NextResponse.json(
        { message: "You cannot delete your own admin account" },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

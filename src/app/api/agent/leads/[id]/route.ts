import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getTodayDateString } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "agent") {
      return NextResponse.json({ message: "Unauthorized. Agent access only." }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();

    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ message: "Lead not found." }, { status: 404 });
    }

    // Verify ownership
    if (lead.agentId.toString() !== session.userId) {
      return NextResponse.json({ message: "You do not have permission to edit this record." }, { status: 403 });
    }

    // STRICT CHECK: Past day record cannot be edited!
    const today = getTodayDateString();
    if (lead.date !== today) {
      return NextResponse.json(
        {
          message:
            "Record locked: Historical records from previous days cannot be modified. Only today's submissions are editable.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      clientName,
      clientPhone,
      company,
      salary,
      requirement,
      followUpDate,
      followUpTime,
      isSentForLogin,
      bankName,
      loginAmount,
      isDisbursed,
      disbursedBank,
      disbursedAmount,
      disbursedDate,
      status,
      remarks,
    } = body;

    if (clientName) lead.clientName = clientName.trim();
    if (clientPhone) lead.clientPhone = clientPhone.trim();
    if (company) lead.company = company.trim();
    if (salary !== undefined) lead.salary = Number(salary);
    if (requirement) lead.requirement = requirement.trim();
    lead.followUpDate = followUpDate ? followUpDate.trim() : null;
    lead.followUpTime = followUpTime ? followUpTime.trim() : null;

    if (typeof isSentForLogin === "boolean") {
      lead.isSentForLogin = isSentForLogin;
      if (isSentForLogin) {
        if (!bankName || !loginAmount) {
          return NextResponse.json(
            { message: "Bank name and login amount are required when sent for login." },
            { status: 400 }
          );
        }
        lead.bankName = bankName.trim();
        lead.loginAmount = Number(loginAmount);
      } else {
        lead.bankName = null;
        lead.loginAmount = null;
      }
    }

    if (typeof isDisbursed === "boolean") {
      lead.isDisbursed = isDisbursed;
      if (isDisbursed) {
        lead.disbursedBank = disbursedBank ? disbursedBank.trim() : lead.bankName || "";
        lead.disbursedAmount = disbursedAmount ? Number(disbursedAmount) : lead.loginAmount || 0;
        lead.disbursedDate = disbursedDate ? disbursedDate.trim() : today;
      } else {
        lead.disbursedBank = null;
        lead.disbursedAmount = null;
        lead.disbursedDate = null;
      }
    } else if (status === "Disbursed") {
      lead.isDisbursed = true;
      lead.disbursedBank = disbursedBank ? disbursedBank.trim() : lead.bankName || "";
      lead.disbursedAmount = disbursedAmount ? Number(disbursedAmount) : lead.loginAmount || 0;
      lead.disbursedDate = disbursedDate ? disbursedDate.trim() : today;
    }

    if (status) lead.status = status.trim();
    if (remarks !== undefined) lead.remarks = remarks.trim();

    await lead.save();

    return NextResponse.json({
      message: "Lead updated successfully.",
      lead,
    });
  } catch (error) {
    console.error("Agent update lead error:", error);
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
    if (!session || session.role !== "agent") {
      return NextResponse.json({ message: "Unauthorized. Agent access only." }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();

    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ message: "Lead not found." }, { status: 404 });
    }

    if (lead.agentId.toString() !== session.userId) {
      return NextResponse.json({ message: "You do not have permission to delete this record." }, { status: 403 });
    }

    // STRICT CHECK: Past day record cannot be deleted
    const today = getTodayDateString();
    if (lead.date !== today) {
      return NextResponse.json(
        {
          message:
            "Record locked: Historical records from previous days cannot be removed under EOD compliance policy.",
        },
        { status: 403 }
      );
    }

    await Lead.findByIdAndDelete(id);

    return NextResponse.json({ message: "Lead record deleted successfully." });
  } catch (error) {
    console.error("Agent delete lead error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

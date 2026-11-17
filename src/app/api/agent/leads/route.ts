import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getTodayDateString } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "agent") {
      return NextResponse.json({ message: "Forbidden: Agent access only" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // e.g. YYYY-MM-DD
    const followUpOnly = searchParams.get("followUpOnly") === "true";
    const search = searchParams.get("search")?.trim();

    const today = getTodayDateString();
    const query: Record<string, unknown> = {
      agentId: session.userId,
    };

    if (followUpOnly) {
      // Leads that have a follow-up date set
      query.followUpDate = { $ne: null };
    } else if (date) {
      query.date = date;
    }

    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: "i" } },
        { clientPhone: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { requirement: { $regex: search, $options: "i" } },
        { bankName: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();

    // Calculate today's stats for this agent
    const todayLeads = await Lead.find({ agentId: session.userId, date: today }).lean();
    const todayTotalLeads = todayLeads.length;
    const todayLogins = todayLeads.filter((l) => l.isSentForLogin).length;
    const todayLoginAmount = todayLeads.reduce(
      (sum, l) => sum + (l.isSentForLogin && l.loginAmount ? l.loginAmount : 0),
      0
    );

    // Follow-ups scheduled for today
    const todayFollowUps = await Lead.countDocuments({
      agentId: session.userId,
      followUpDate: today,
    });

    return NextResponse.json({
      today,
      stats: {
        totalLeadsToday: todayTotalLeads,
        totalLoginsToday: todayLogins,
        totalLoginAmountToday: todayLoginAmount,
        todayFollowUps,
      },
      leads: leads.map((l) => ({
        id: l._id.toString(),
        date: l.date,
        clientName: l.clientName,
        clientPhone: l.clientPhone,
        company: l.company,
        salary: l.salary,
        requirement: l.requirement,
        followUpDate: l.followUpDate || null,
        followUpTime: l.followUpTime || null,
        isSentForLogin: l.isSentForLogin,
        bankName: l.bankName || "",
        loginAmount: l.loginAmount || 0,
        status: l.status,
        remarks: l.remarks || "",
        isToday: l.date === today,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("Agent get leads error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "agent") {
      return NextResponse.json({ message: "Forbidden: Agent access only" }, { status: 403 });
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
      status,
      remarks,
    } = body;

    // Basic validations
    if (!clientName || !clientPhone || !company || salary === undefined || !requirement) {
      return NextResponse.json(
        { message: "Client name, phone, company, salary, and requirement are required." },
        { status: 400 }
      );
    }

    if (isSentForLogin && (!bankName || !loginAmount)) {
      return NextResponse.json(
        { message: "Bank name and login amount are required when sent for login." },
        { status: 400 }
      );
    }

    await connectDB();

    // Get agent's current assigned manager
    const agentUser = await User.findById(session.userId);
    if (!agentUser || !agentUser.isActive) {
      return NextResponse.json({ message: "Agent account invalid or inactive." }, { status: 401 });
    }

    // Force date to strictly be today's date!
    const today = getTodayDateString();

    const newLead = await Lead.create({
      agentId: agentUser._id,
      managerId: agentUser.managerId || null,
      date: today,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      company: company.trim(),
      salary: Number(salary),
      requirement: requirement.trim(),
      followUpDate: followUpDate ? followUpDate.trim() : null,
      followUpTime: followUpTime ? followUpTime.trim() : null,
      isSentForLogin: Boolean(isSentForLogin),
      bankName: isSentForLogin && bankName ? bankName.trim() : null,
      loginAmount: isSentForLogin && loginAmount ? Number(loginAmount) : null,
      status: status ? status.trim() : isSentForLogin ? "Sent For Login" : "In Discussion",
      remarks: remarks ? remarks.trim() : "",
    });

    return NextResponse.json(
      {
        message: "EOD lead entry added successfully for today",
        lead: {
          id: newLead._id.toString(),
          date: newLead.date,
          clientName: newLead.clientName,
          clientPhone: newLead.clientPhone,
          company: newLead.company,
          salary: newLead.salary,
          requirement: newLead.requirement,
          followUpDate: newLead.followUpDate,
          followUpTime: newLead.followUpTime,
          isSentForLogin: newLead.isSentForLogin,
          bankName: newLead.bankName,
          loginAmount: newLead.loginAmount,
          status: newLead.status,
          remarks: newLead.remarks,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agent create lead error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getTodayDateString } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "agent") {
      return NextResponse.json({ message: "Unauthorized. Agent access only." }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // e.g. YYYY-MM-DD
    const startDate = searchParams.get("startDate"); // e.g. YYYY-MM-DD
    const endDate = searchParams.get("endDate"); // e.g. YYYY-MM-DD
    const followUpOnly = searchParams.get("followUpOnly") === "true";
    const disbursedOnly = searchParams.get("disbursedOnly") === "true";
    const search = searchParams.get("search")?.trim();

    const today = getTodayDateString();
    const andClauses: Record<string, unknown>[] = [{ agentId: session.userId }];

    // Build date filter (single date or range)
    let dateFilter: unknown = null;
    if (startDate && endDate) {
      dateFilter = startDate === endDate ? startDate : { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      dateFilter = { $gte: startDate };
    } else if (endDate) {
      dateFilter = { $lte: endDate };
    } else if (date) {
      dateFilter = date;
    }

    if (disbursedOnly) {
      andClauses.push({
        $or: [{ isDisbursed: true }, { status: "Disbursed" }],
      });
      if (dateFilter) {
        andClauses.push({
          $or: [{ disbursedDate: dateFilter }, { date: dateFilter }],
        });
      }
    } else if (followUpOnly) {
      if (dateFilter) {
        andClauses.push({ followUpDate: dateFilter });
      } else {
        andClauses.push({ followUpDate: { $ne: null } });
      }
    } else if (dateFilter) {
      andClauses.push({ date: dateFilter });
    }

    if (search) {
      andClauses.push({
        $or: [
          { clientName: { $regex: search, $options: "i" } },
          { clientPhone: { $regex: search, $options: "i" } },
          { company: { $regex: search, $options: "i" } },
          { requirement: { $regex: search, $options: "i" } },
          { bankName: { $regex: search, $options: "i" } },
          { disbursedBank: { $regex: search, $options: "i" } },
        ],
      });
    }

    const query = andClauses.length > 1 ? { $and: andClauses } : andClauses[0];

    const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();

    // Calculate view-specific stats for the filtered query (e.g. specific date)
    const viewTotalLeads = leads.length;
    const viewLogins = leads.filter((l) => l.isSentForLogin).length;
    const viewLoginAmount = leads.reduce(
      (sum, l) => sum + (l.isSentForLogin && l.loginAmount ? l.loginAmount : 0),
      0
    );
    const viewDisbursed = leads.filter((l) => l.isDisbursed || l.status === "Disbursed").length;
    const viewDisbursedAmount = leads.reduce(
      (sum, l) =>
        sum +
        ((l.isDisbursed || l.status === "Disbursed") && l.disbursedAmount
          ? l.disbursedAmount
          : (l.isDisbursed || l.status === "Disbursed") && l.loginAmount
          ? l.loginAmount
          : 0),
      0
    );

    // Calculate today's stats for this agent
    const todayLeads = await Lead.find({ agentId: session.userId, date: today }).lean();
    const todayTotalLeads = todayLeads.length;
    const todayLogins = todayLeads.filter((l) => l.isSentForLogin).length;
    const todayLoginAmount = todayLeads.reduce(
      (sum, l) => sum + (l.isSentForLogin && l.loginAmount ? l.loginAmount : 0),
      0
    );

    const todayDisbursed = todayLeads.filter((l) => l.isDisbursed || l.status === "Disbursed").length;
    const todayDisbursedAmount = todayLeads.reduce(
      (sum, l) =>
        sum +
        ((l.isDisbursed || l.status === "Disbursed") && l.disbursedAmount
          ? l.disbursedAmount
          : (l.isDisbursed || l.status === "Disbursed") && l.loginAmount
          ? l.loginAmount
          : 0),
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
        totalDisbursedToday: todayDisbursed,
        totalDisbursedAmountToday: todayDisbursedAmount,
        todayFollowUps,
      },
      viewStats: {
        filterDate: date || null,
        startDate: startDate || null,
        endDate: endDate || null,
        totalLeads: viewTotalLeads,
        totalLogins: viewLogins,
        totalLoginAmount: viewLoginAmount,
        totalDisbursed: viewDisbursed,
        totalDisbursedAmount: viewDisbursedAmount,
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
        isDisbursed: Boolean(l.isDisbursed || l.status === "Disbursed"),
        disbursedBank: l.disbursedBank || l.bankName || "",
        disbursedAmount: l.disbursedAmount || (l.status === "Disbursed" ? l.loginAmount : 0),
        disbursedDate: l.disbursedDate || null,
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
      return NextResponse.json({ message: "Unauthorized. Agent access only." }, { status: 403 });
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
      return NextResponse.json({ message: "Agent account is inactive or not found." }, { status: 401 });
    }

    // Force date to strictly be today's date!
    const today = getTodayDateString();

    const determinedStatus = status
      ? status.trim()
      : isDisbursed
      ? "Disbursed"
      : isSentForLogin
      ? "Sent For Login"
      : "In Discussion";

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
      isSentForLogin: Boolean(isSentForLogin || determinedStatus === "Sent For Login" || determinedStatus === "Disbursed"),
      bankName: isSentForLogin && bankName ? bankName.trim() : null,
      loginAmount: isSentForLogin && loginAmount ? Number(loginAmount) : null,
      isDisbursed: Boolean(isDisbursed || determinedStatus === "Disbursed"),
      disbursedBank: disbursedBank ? disbursedBank.trim() : bankName ? bankName.trim() : null,
      disbursedAmount: disbursedAmount ? Number(disbursedAmount) : determinedStatus === "Disbursed" && loginAmount ? Number(loginAmount) : null,
      disbursedDate: disbursedDate ? disbursedDate.trim() : determinedStatus === "Disbursed" ? today : null,
      status: determinedStatus,
      remarks: remarks ? remarks.trim() : "",
    });

    return NextResponse.json(
      {
        message: "EOD lead entry submitted successfully.",
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
          isDisbursed: newLead.isDisbursed,
          disbursedBank: newLead.disbursedBank,
          disbursedAmount: newLead.disbursedAmount,
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

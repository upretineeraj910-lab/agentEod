import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getTodayDateString } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || (session.role !== "manager" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const agentId = searchParams.get("agentId");
    const search = searchParams.get("search")?.trim();
    const followUpOnly = searchParams.get("followUpOnly") === "true";
    const disbursedOnly = searchParams.get("disbursedOnly") === "true";

    const managerId = session.userId;
    const today = getTodayDateString();

    // 1. Get all agents under this manager
    const agents = await User.find({ managerId, role: "agent" })
      .select("_id name email phone")
      .lean();

    const agentIds = agents.map((a) => a._id);

    // Build lead query
    const query: Record<string, unknown> = {
      agentId: { $in: agentIds },
    };

    if (agentId) {
      if (agentIds.some((id) => id.toString() === agentId)) {
        query.agentId = agentId;
      }
    }

    if (disbursedOnly) {
      query.$or = [{ isDisbursed: true }, { status: "Disbursed" }];
    } else if (followUpOnly) {
      query.followUpDate = { $ne: null };
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
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
        { disbursedBank: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(query)
      .populate("agentId", "name email phone")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Aggregate statistics
    let totalLeads = 0;
    let totalLogins = 0;
    let totalLoginAmount = 0;
    let totalDisbursed = 0;
    let totalDisbursedAmount = 0;
    let todayFollowUps = 0;

    // Agent-wise aggregation map
    const agentSummaryMap: Record<
      string,
      {
        agentId: string;
        agentName: string;
        agentPhone: string;
        leadsCount: number;
        loginsCount: number;
        loginAmount: number;
        disbursedCount: number;
        disbursedAmount: number;
      }
    > = {};

    for (const a of agents) {
      agentSummaryMap[a._id.toString()] = {
        agentId: a._id.toString(),
        agentName: a.name,
        agentPhone: a.phone || "",
        leadsCount: 0,
        loginsCount: 0,
        loginAmount: 0,
        disbursedCount: 0,
        disbursedAmount: 0,
      };
    }

    for (const l of leads) {
      totalLeads += 1;
      const isLogin = Boolean(l.isSentForLogin);
      const amount = isLogin && l.loginAmount ? Number(l.loginAmount) : 0;
      const isDisbursed = Boolean(l.isDisbursed || l.status === "Disbursed");
      const disbAmount = isDisbursed && l.disbursedAmount ? Number(l.disbursedAmount) : isDisbursed && l.loginAmount ? Number(l.loginAmount) : 0;

      if (isLogin) {
        totalLogins += 1;
        totalLoginAmount += amount;
      }

      if (isDisbursed) {
        totalDisbursed += 1;
        totalDisbursedAmount += disbAmount;
      }

      if (l.followUpDate === today) {
        todayFollowUps += 1;
      }

      const aId = (l.agentId as unknown as { _id?: { toString(): string } })?._id?.toString();
      if (aId && agentSummaryMap[aId]) {
        agentSummaryMap[aId].leadsCount += 1;
        if (isLogin) {
          agentSummaryMap[aId].loginsCount += 1;
          agentSummaryMap[aId].loginAmount += amount;
        }
        if (isDisbursed) {
          agentSummaryMap[aId].disbursedCount += 1;
          agentSummaryMap[aId].disbursedAmount += disbAmount;
        }
      }
    }

    return NextResponse.json({
      today,
      summary: {
        totalLeads,
        totalLogins,
        totalLoginAmount,
        totalDisbursed,
        totalDisbursedAmount,
        todayFollowUps,
        teamSize: agents.length,
      },
      agentSummaries: Object.values(agentSummaryMap),
      leads: leads.map((l) => {
        const ag = l.agentId as unknown as {
          _id?: { toString(): string };
          name?: string;
          phone?: string;
        } | null;

        return {
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
          agent: ag
            ? {
                id: ag._id?.toString() || "",
                name: ag.name || "",
                phone: ag.phone || "",
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("Manager reports error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

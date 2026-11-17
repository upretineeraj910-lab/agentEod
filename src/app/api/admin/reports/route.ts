import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getTodayDateString } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Forbidden: Admin access only" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const managerId = searchParams.get("managerId");
    const agentId = searchParams.get("agentId");
    const search = searchParams.get("search")?.trim();
    const followUpOnly = searchParams.get("followUpOnly") === "true";

    const today = getTodayDateString();

    // Fetch all managers and agents
    const allManagers = await User.find({ role: "manager" })
      .select("_id name email phone isActive")
      .lean();

    const allAgents = await User.find({ role: "agent" })
      .select("_id name email phone managerId isActive")
      .populate("managerId", "name email")
      .lean();

    // Build lead query
    const query: Record<string, unknown> = {};

    if (agentId) {
      query.agentId = agentId;
    } else if (managerId) {
      // Find all agents under this manager
      const teamAgentIds = allAgents
        .filter((a) => {
          const mId = (a.managerId as unknown as { _id?: { toString(): string } })?._id || a.managerId;
          return mId?.toString() === managerId;
        })
        .map((a) => a._id);

      query.agentId = { $in: teamAgentIds };
    }

    if (followUpOnly) {
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
      ];
    }

    const leads = await Lead.find(query)
      .populate("agentId", "name email phone managerId")
      .populate("managerId", "name email")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    let totalLeads = 0;
    let totalLogins = 0;
    let totalLoginAmount = 0;
    let todayFollowUps = 0;

    // Structure Manager-wise aggregation
    const managerMap: Record<
      string,
      {
        managerId: string;
        managerName: string;
        managerEmail: string;
        teamCount: number;
        leadsCount: number;
        loginsCount: number;
        loginAmount: number;
      }
    > = {};

    for (const m of allManagers) {
      const teamCount = allAgents.filter((a) => {
        const mId = (a.managerId as unknown as { _id?: { toString(): string } })?._id || a.managerId;
        return mId?.toString() === m._id.toString();
      }).length;

      managerMap[m._id.toString()] = {
        managerId: m._id.toString(),
        managerName: m.name,
        managerEmail: m.email,
        teamCount,
        leadsCount: 0,
        loginsCount: 0,
        loginAmount: 0,
      };
    }

    // Structure Agent-wise aggregation
    const agentMap: Record<
      string,
      {
        agentId: string;
        agentName: string;
        managerName: string;
        leadsCount: number;
        loginsCount: number;
        loginAmount: number;
      }
    > = {};

    for (const a of allAgents) {
      const mName = (a.managerId as unknown as { name?: string })?.name || "Unassigned";
      agentMap[a._id.toString()] = {
        agentId: a._id.toString(),
        agentName: a.name,
        managerName: mName,
        leadsCount: 0,
        loginsCount: 0,
        loginAmount: 0,
      };
    }

    for (const l of leads) {
      totalLeads += 1;
      const isLogin = Boolean(l.isSentForLogin);
      const amount = isLogin && l.loginAmount ? Number(l.loginAmount) : 0;

      if (isLogin) {
        totalLogins += 1;
        totalLoginAmount += amount;
      }

      if (l.followUpDate === today) {
        todayFollowUps += 1;
      }

      const agentObj = l.agentId as unknown as {
        _id?: { toString(): string };
        name?: string;
        managerId?: { toString(): string } | string;
      } | null;

      const aId = agentObj?._id?.toString();
      if (aId && agentMap[aId]) {
        agentMap[aId].leadsCount += 1;
        if (isLogin) {
          agentMap[aId].loginsCount += 1;
          agentMap[aId].loginAmount += amount;
        }
      }

      // Manager attribution
      const managerObj = l.managerId as unknown as { _id?: { toString(): string }; name?: string } | null;
      const mId =
        managerObj?._id?.toString() ||
        agentObj?.managerId?.toString();

      if (mId && managerMap[mId]) {
        managerMap[mId].leadsCount += 1;
        if (isLogin) {
          managerMap[mId].loginsCount += 1;
          managerMap[mId].loginAmount += amount;
        }
      }
    }

    return NextResponse.json({
      today,
      summary: {
        totalLeads,
        totalLogins,
        totalLoginAmount,
        todayFollowUps,
        totalManagers: allManagers.length,
        totalAgents: allAgents.length,
      },
      managerTeams: Object.values(managerMap),
      agentPerformance: Object.values(agentMap),
      leads: leads.map((l) => {
        const agentData = l.agentId as unknown as {
          _id?: unknown;
          name?: string;
          phone?: string;
        } | null;
        const managerData = l.managerId as unknown as {
          _id?: unknown;
          name?: string;
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
          status: l.status,
          remarks: l.remarks || "",
          agentName: agentData?.name || "Unknown Agent",
          managerName: managerData?.name || "Unassigned",
          createdAt: l.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("Admin reports error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

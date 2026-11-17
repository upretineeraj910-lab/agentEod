"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  UsersIcon,
  PhoneIcon,
  BuildingIcon,
  IndianRupeeIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  SearchIcon,
  DownloadIcon,
  ShieldIcon,
  BriefcaseIcon,
  TrashIcon,
} from "@/components/Icons";
import { formatINR, exportToCSV } from "@/lib/utils";

interface ManagerTeamSummary {
  managerId: string;
  managerName: string;
  managerEmail: string;
  teamCount: number;
  leadsCount: number;
  loginsCount: number;
  loginAmount: number;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  managerName: string;
  leadsCount: number;
  loginsCount: number;
  loginAmount: number;
}

interface LeadRecord {
  id: string;
  date: string;
  clientName: string;
  clientPhone: string;
  company: string;
  salary: number;
  requirement: string;
  followUpDate: string | null;
  followUpTime: string | null;
  isSentForLogin: boolean;
  bankName: string;
  loginAmount: number;
  status: string;
  remarks: string;
  agentName: string;
  managerName: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: "admin" | "manager" | "agent";
  isActive: boolean;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Tabs: 'leads' | 'teams' | 'agents' | 'users'
  const [activeTab, setActiveTab] = useState<"leads" | "teams" | "agents" | "users">("leads");

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Data States
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [managerTeams, setManagerTeams] = useState<ManagerTeamSummary[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [availableManagers, setAvailableManagers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [todayDate, setTodayDate] = useState<string>("");
  const [summary, setSummary] = useState({
    totalLeads: 0,
    totalLogins: 0,
    totalLoginAmount: 0,
    todayFollowUps: 0,
    totalManagers: 0,
    totalAgents: 0,
  });

  // User Creation Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [modalRole, setModalRole] = useState<"manager" | "agent">("agent");
  const [modalName, setModalName] = useState<string>("");
  const [modalEmail, setModalEmail] = useState<string>("");
  const [modalPhone, setModalPhone] = useState<string>("");
  const [modalPassword, setModalPassword] = useState<string>("");
  const [modalManagerId, setModalManagerId] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState<boolean>(false);

  // Auth Verification
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.user?.role !== "admin") {
          if (data.user?.role === "manager") router.push("/manager");
          else if (data.user?.role === "agent") router.push("/agent");
          else router.push("/login");
          return;
        }
        setCurrentUser(data.user);
      } catch (err) {
        console.error(err);
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    async function loadAll() {
      try {
        const [mgrRes, usersRes] = await Promise.all([
          fetch("/api/admin/managers"),
          fetch("/api/admin/users"),
        ]);

        if (mgrRes.ok) {
          const mgrData = await mgrRes.json();
          if (active) setAvailableManagers(mgrData.managers || []);
        }

        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (active) setUsersList(uData.users || []);
        }

        const params = new URLSearchParams();
        if (selectedDate) params.append("date", selectedDate);
        if (selectedManagerId) params.append("managerId", selectedManagerId);
        if (selectedAgentId) params.append("agentId", selectedAgentId);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());

        const repRes = await fetch(`/api/admin/reports?${params.toString()}`);
        if (repRes.ok) {
          const repData = await repRes.json();
          if (active) {
            setLeads(repData.leads || []);
            setManagerTeams(repData.managerTeams || []);
            setAgentPerformance(repData.agentPerformance || []);
            if (repData.today) setTodayDate(repData.today);
            if (repData.summary) setSummary(repData.summary);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAll();

    return () => {
      active = false;
    };
  }, [currentUser, selectedDate, selectedManagerId, selectedAgentId, searchQuery, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleExport = () => {
    const exportData = leads.map((l) => ({
      Date: l.date,
      "Manager Name": l.managerName,
      "Agent Name": l.agentName,
      "Client Name": l.clientName,
      "Client Phone": l.clientPhone,
      Company: l.company,
      Salary: l.salary,
      Requirement: l.requirement,
      "Follow-up Date": l.followUpDate || "None",
      "Follow-up Time": l.followUpTime || "None",
      "Sent For Login": l.isSentForLogin ? "YES" : "NO",
      "Bank Name": l.bankName || "",
      "Login Amount": l.loginAmount || 0,
      Status: l.status,
      Remarks: l.remarks || "",
    }));

    exportToCSV(exportData, `admin-eod-report-${selectedDate || todayDate || "all"}.csv`);
  };

  const openCreateUserModal = () => {
    setModalRole("agent");
    setModalName("");
    setModalEmail("");
    setModalPhone("");
    setModalPassword("");
    setModalManagerId(availableManagers.length > 0 ? availableManagers[0].id : "");
    setModalError(null);
    setIsUserModalOpen(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalName.trim() || !modalEmail.trim() || !modalPassword.trim() || !modalRole) {
      setModalError("Please fill all required fields.");
      return;
    }

    if (modalRole === "agent" && !modalManagerId) {
      setModalError("Please select a Manager for this Agent. (Ganesh Sir / System requires agent to report to a manager).");
      return;
    }

    setCreatingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalName.trim(),
          email: modalEmail.trim(),
          phone: modalPhone.trim(),
          password: modalPassword.trim(),
          role: modalRole,
          managerId: modalRole === "agent" ? modalManagerId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.message || "Failed to create user.");
        setCreatingUser(false);
        return;
      }

      setIsUserModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      alert(`${modalRole.toUpperCase()} ID created successfully!`);
    } catch (err) {
      console.error(err);
      setModalError("Server connection error.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`Are you sure you want to permanently delete user ${user.name} (${user.role})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete user.");
      }
    } catch (e) {
      console.error(e);
      alert("Error occurred while deleting.");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium">Loading Superadmin Portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Superadmin Control Center
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Manage all Managers & Agents, monitor team-wise logins, and review individual lead pipelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openCreateUserModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm shadow-xs transition"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Manager / Agent ID</span>
            </button>

            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl font-semibold text-sm shadow-xs transition"
            >
              <DownloadIcon className="w-4 h-4 text-gray-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Leads Logged
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <UsersIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {summary.totalLeads}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              {summary.totalManagers} Managers | {summary.totalAgents} Agents
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Files Sent For Login
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {summary.totalLogins}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Dispatched across all partner banks
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Login Volume
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <IndianRupeeIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatINR(summary.totalLoginAmount)}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Cumulative loan value requested
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Follow-ups Scheduled Today
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <ClockIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              {summary.todayFollowUps}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Cases due for follow-up today
            </span>
          </div>
        </div>

        {/* Tab Toolbar */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 mb-6 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setActiveTab("leads")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition ${
                  activeTab === "leads"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All Leads ({summary.totalLeads})
              </button>

              <button
                onClick={() => setActiveTab("teams")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === "teams"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BriefcaseIcon className="w-4 h-4" />
                Managers Teams ({managerTeams.length})
              </button>

              <button
                onClick={() => setActiveTab("agents")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === "agents"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                Individual Agents ({agentPerformance.length})
              </button>

              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === "users"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ShieldIcon className="w-4 h-4" />
                User Directory ({usersList.length})
              </button>
            </div>

            {/* Filters */}
            {activeTab !== "users" && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate("")}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Manager:</span>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => {
                      setSelectedManagerId(e.target.value);
                      setSelectedAgentId("");
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">All Managers</option>
                    {availableManagers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search client, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-44 px-3 py-1.5 pl-8 border border-gray-300 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                  >
                    Filter
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* View: User Directory */}
        {activeTab === "users" ? (
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  User Directory (Admin, Managers & Agents)
                </h2>
                <p className="text-xs text-gray-500">
                  Only Admins can create and manage user credentials.
                </p>
              </div>
              <button
                onClick={openCreateUserModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Password</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Reporting Manager</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span
                          title="Click to select & copy"
                          className="font-mono bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-md text-xs font-semibold select-all inline-block"
                        >
                          {u.password || "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : u.role === "manager"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.role === "agent" ? (
                          u.manager ? (
                            <span className="font-semibold text-gray-900">
                              {u.manager.name}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">Unassigned</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{u.phone || "-"}</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {u.id !== currentUser.userId && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "teams" ? (
          /* View: Managers Team Breakdown */
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Managers Team Overview ({selectedDate || "All Time"})
              </h2>
              <p className="text-xs text-gray-500">
                Performance breakdown by Manager team. Click on any manager to filter leads.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Manager Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4 text-center">Team Agents</th>
                    <th className="py-3.5 px-4 text-center">Total Leads</th>
                    <th className="py-3.5 px-4 text-center">Files Sent For Login</th>
                    <th className="py-3.5 px-4 text-right">Login Volume (₹)</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                  {managerTeams.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No managers created yet. Click &quot;Create Manager / Agent ID&quot; to add one.
                      </td>
                    </tr>
                  ) : (
                    managerTeams.map((m) => (
                      <tr key={m.managerId} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {m.managerName}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{m.managerEmail}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                            {m.teamCount} agents
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                          {m.leadsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {m.loginsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                          {formatINR(m.loginAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedManagerId(m.managerId);
                              setActiveTab("leads");
                            }}
                            className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline"
                          >
                            Filter Leads
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "agents" ? (
          /* View: Individual Agent Performance */
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Individual Agent Performance
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Agent Name</th>
                    <th className="py-3.5 px-4">Assigned Manager</th>
                    <th className="py-3.5 px-4 text-center">Total Leads</th>
                    <th className="py-3.5 px-4 text-center">Files Sent For Login</th>
                    <th className="py-3.5 px-4 text-right">Login Volume (₹)</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                  {agentPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No agents found.
                      </td>
                    </tr>
                  ) : (
                    agentPerformance.map((ag) => (
                      <tr key={ag.agentId} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {ag.agentName}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-600">
                          {ag.managerName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                          {ag.leadsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {ag.loginsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                          {formatINR(ag.loginAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedAgentId(ag.agentId);
                              setActiveTab("leads");
                            }}
                            className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline"
                          >
                            Filter Leads
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* View: Full Leads Table */
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Agent / Manager</th>
                    <th className="py-3.5 px-4">Client Details</th>
                    <th className="py-3.5 px-4">Company & Salary</th>
                    <th className="py-3.5 px-4">Requirement</th>
                    <th className="py-3.5 px-4">Follow-up</th>
                    <th className="py-3.5 px-4">Login Status</th>
                    <th className="py-3.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        Loading lead records...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        No leads found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-900">
                          {lead.date}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-900 block">
                            {lead.agentName}
                          </span>
                          <span className="text-[11px] text-gray-500 block">
                            Mgr: {lead.managerName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">
                            {lead.clientName}
                          </div>
                          <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                            <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{lead.clientPhone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900 flex items-center gap-1">
                            <BuildingIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{lead.company}</span>
                          </div>
                          <div className="text-gray-500 mt-0.5">
                            Salary: {formatINR(lead.salary)}/mo
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-gray-900">
                            {lead.requirement}
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium">
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {lead.followUpDate ? (
                            <div>
                              <div className="font-semibold text-amber-700 flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span>{lead.followUpDate}</span>
                              </div>
                              {lead.followUpTime && (
                                <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <ClockIcon className="w-3 h-3" />
                                  <span>{lead.followUpTime}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {lead.isSentForLogin ? (
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                              <span className="font-bold text-emerald-800 block text-[11px]">
                                SENT FOR LOGIN
                              </span>
                              <div className="text-gray-800 font-semibold mt-0.5">
                                {lead.bankName}
                              </div>
                              <div className="text-emerald-700 font-bold">
                                {formatINR(lead.loginAmount)}
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium">
                              Not Sent
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate" title={lead.remarks}>
                          {lead.remarks || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                Create User Account
              </h2>
              <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2.5 py-1 rounded-full">
                Admin Exclusive
              </span>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Account Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalRole("agent")}
                    className={`py-2 px-3 rounded-xl font-semibold text-xs border transition ${
                      modalRole === "agent"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalRole("manager")}
                    className={`py-2 px-3 rounded-xl font-semibold text-xs border transition ${
                      modalRole === "manager"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Manager
                  </button>
                </div>
              </div>

              {/* Dynamic Manager Dropdown when creating an Agent */}
              {modalRole === "agent" && (
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Assign Reporting Manager *
                  </label>
                  {availableManagers.length === 0 ? (
                    <div className="text-xs text-amber-700 font-medium">
                      ⚠️ No managers available! Please create a Manager account first so agents can be assigned under them.
                    </div>
                  ) : (
                    <select
                      required
                      value={modalManagerId}
                      onChange={(e) => setModalManagerId(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Manager --</option>
                      {availableManagers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[11px] text-blue-700 mt-1">
                    This agent will report to the selected manager.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@company.com"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Set initial password"
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser || (modalRole === "agent" && availableManagers.length === 0)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-60 transition"
                >
                  {creatingUser ? "Creating..." : `Create ${modalRole.toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

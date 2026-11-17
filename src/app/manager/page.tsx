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
  SearchIcon,
  DownloadIcon,
  BriefcaseIcon,
} from "@/components/Icons";
import { formatINR, exportToCSV } from "@/lib/utils";

interface AgentSummary {
  agentId: string;
  agentName: string;
  agentPhone: string;
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
  agent: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
}

export default function ManagerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"leads" | "agents" | "followups">("leads");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Data
  const [teamAgents, setTeamAgents] = useState<{ id: string; name: string }[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [agentSummaries, setAgentSummaries] = useState<AgentSummary[]>([]);
  const [todayDate, setTodayDate] = useState<string>("");
  const [summary, setSummary] = useState({
    totalLeads: 0,
    totalLogins: 0,
    totalLoginAmount: 0,
    todayFollowUps: 0,
    teamSize: 0,
  });

  // Verify auth session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.user?.role !== "manager" && data.user?.role !== "admin") {
          router.push("/login");
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

  // Fetch Team Agents for dropdown
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/manager/agents");
        if (res.ok) {
          const data = await res.json();
          setTeamAgents(data.agents || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (currentUser) {
      fetchAgents();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    async function load() {
      try {
        const params = new URLSearchParams();
        if (selectedDate) params.append("date", selectedDate);
        if (selectedAgentId) params.append("agentId", selectedAgentId);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        if (activeTab === "followups") params.append("followUpOnly", "true");

        const res = await fetch(`/api/manager/reports?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setLeads(data.leads || []);
            setAgentSummaries(data.agentSummaries || []);
            if (data.today) {
              setTodayDate(data.today);
            }
            if (data.summary) setSummary(data.summary);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [currentUser, selectedDate, selectedAgentId, searchQuery, activeTab, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleExport = () => {
    const exportData = leads.map((l) => ({
      Date: l.date,
      "Agent Name": l.agent?.name || "N/A",
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

    exportToCSV(exportData, `team-eod-report-${selectedDate || todayDate}.csv`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium">Loading Manager Portal...</div>
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
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Manager Team Portal
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Review your agents&apos; daily EOD submissions, bank logins, and client follow-ups.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
                Team Leads
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <UsersIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {summary.totalLeads}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              In selected view ({summary.teamSize} active agents)
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Files Logged
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {summary.totalLogins}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Bank logins sent by team
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Team Login Volume
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <IndianRupeeIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatINR(summary.totalLoginAmount)}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Total volume across all banks
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Follow-ups Due Today
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <ClockIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              {summary.todayFollowUps}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Clients scheduled for today
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 mb-6 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("leads")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  activeTab === "leads"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All Team Leads ({summary.totalLeads})
              </button>

              <button
                onClick={() => setActiveTab("agents")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5 ${
                  activeTab === "agents"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BriefcaseIcon className="w-4 h-4" />
                Agent-wise Breakdown
              </button>

              <button
                onClick={() => setActiveTab("followups")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5 ${
                  activeTab === "followups"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                Follow-ups Queue
              </button>
            </div>

            {/* Filter Inputs */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Agent Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Agent:</span>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All My Agents</option>
                  {teamAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search client, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 px-3 py-1.5 pl-8 border border-gray-300 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>

        {/* Content based on Active Tab */}
        {activeTab === "agents" ? (
          /* Agent-wise Breakdown Grid / Table */
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Team Performance Breakdown ({selectedDate || "All Time"})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Agent Name</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-center">Total Leads</th>
                    <th className="py-3.5 px-4 text-center">Logins Sent</th>
                    <th className="py-3.5 px-4 text-right">Login Volume (₹)</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                  {agentSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No agents assigned to your team yet. Please ask Admin to assign agents to you.
                      </td>
                    </tr>
                  ) : (
                    agentSummaries.map((ag) => (
                      <tr key={ag.agentId} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {ag.agentName}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {ag.agentPhone || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-gray-900">
                          {ag.leadsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
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
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                          >
                            View Leads
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
          /* Leads List / Follow-up list */
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Agent</th>
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
                        Loading team leads...
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
                            {lead.agent?.name || "Agent"}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {lead.agent?.phone || ""}
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
    </div>
  );
}

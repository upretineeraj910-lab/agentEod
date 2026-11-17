"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  PhoneIcon,
  BuildingIcon,
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
  disbursedCount: number;
  disbursedAmount: number;
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
  isDisbursed: boolean;
  disbursedBank: string;
  disbursedAmount: number;
  disbursedDate: string | null;
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
  const [activeTab, setActiveTab] = useState<"leads" | "disbursed" | "agents" | "followups">("leads");
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
    totalDisbursed: 0,
    totalDisbursedAmount: 0,
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
        if (activeTab === "disbursed") params.append("disbursedOnly", "true");

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
      "Is Disbursed": l.isDisbursed ? "YES" : "NO",
      "Disbursed Bank": l.disbursedBank || "",
      "Disbursed Amount": l.disbursedAmount || 0,
      Status: l.status,
      Remarks: l.remarks || "",
    }));

    exportToCSV(exportData, `team-eod-report-${selectedDate || todayDate || "all"}.csv`);
  };

  const getStatusBadge = (lead: LeadRecord) => {
    if (lead.isDisbursed || lead.status === "Disbursed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-700" />
          DISBURSED
        </span>
      );
    }
    if (lead.isSentForLogin || lead.status === "Sent For Login") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <BuildingIcon className="w-3.5 h-3.5 text-blue-700" />
          LOGIN SENT
        </span>
      );
    }
    if (lead.status === "Approved") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800">
          Approved
        </span>
      );
    }
    if (lead.status === "Follow Up") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
          Follow Up
        </span>
      );
    }
    if (lead.status === "Documents Pending") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800">
          Docs Pending
        </span>
      );
    }
    if (lead.status === "Rejected") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
        {lead.status || "In Discussion"}
      </span>
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium text-sm">Loading Manager Portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Executive Header Banner */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Manager Team Operations & EOD
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Team performance analytics, bank login tracking, and loan disbursal overview.
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

        {/* 5-Card Executive Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Team Leads
            </span>
            <p className="text-2xl font-extrabold text-gray-900 mt-2">
              {summary.totalLeads}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              {summary.teamSize} Reporting Agents
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Logins Sent
            </span>
            <p className="text-2xl font-extrabold text-blue-700 mt-2">
              {summary.totalLogins}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Files logged into banks
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Login Volume (₹)
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2">
              {formatINR(summary.totalLoginAmount)}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Total volume submitted
            </span>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center justify-between">
              <span>Disbursed Volume</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px]">
                {summary.totalDisbursed} Cases
              </span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-2">
              {formatINR(summary.totalDisbursedAmount)}
            </p>
            <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
              Loan value disbursed
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Follow-ups Today
            </span>
            <p className="text-2xl font-extrabold text-amber-600 mt-2">
              {summary.todayFollowUps}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Due for team contact
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 mb-6 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setActiveTab("leads")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
                  activeTab === "leads"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All Team Leads ({summary.totalLeads})
              </button>

              <button
                onClick={() => setActiveTab("disbursed")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === "disbursed"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <CheckCircleIcon className="w-4 h-4" />
                Disbursals ({summary.totalDisbursed})
              </button>

              <button
                onClick={() => setActiveTab("agents")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === "agents"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BriefcaseIcon className="w-4 h-4" />
                Agent Performance
              </button>

              <button
                onClick={() => setActiveTab("followups")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === "followups"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                Follow-ups Queue
              </button>
            </div>

            {/* Filter Inputs */}
            <div className="flex flex-wrap items-center gap-3">
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

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Agent:</span>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Team Agents</option>
                  {teamAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>

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
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Agent-wise Performance Breakdown ({selectedDate || "All Time"})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Agent Name</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-center">Total Leads</th>
                    <th className="py-3.5 px-4 text-center">Logins Sent</th>
                    <th className="py-3.5 px-4 text-right">Login Volume (₹)</th>
                    <th className="py-3.5 px-4 text-center">Disbursed Cases</th>
                    <th className="py-3.5 px-4 text-right">Disbursed Volume (₹)</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                  {agentSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        No agents currently assigned to your team. Please contact the administrator.
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
                        <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                          {ag.leadsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                            {ag.loginsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-blue-900">
                          {formatINR(ag.loginAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            {ag.disbursedCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                          {formatINR(ag.disbursedAmount)}
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
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Agent</th>
                    <th className="py-3.5 px-4">Client Details</th>
                    <th className="py-3.5 px-4">Company & Income</th>
                    <th className="py-3.5 px-4">Requirement</th>
                    <th className="py-3.5 px-4">Status & Pipeline</th>
                    <th className="py-3.5 px-4">Bank & Amount</th>
                    <th className="py-3.5 px-4">Follow-up</th>
                    <th className="py-3.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/80 text-xs text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-500">
                        Loading team pipeline records...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-500">
                        No records found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-900">
                          {lead.date}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900 block">
                            {lead.agent?.name || "Agent"}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {lead.agent?.phone || ""}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">
                            {lead.clientName}
                          </div>
                          <div className="text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                            <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{lead.clientPhone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900 flex items-center gap-1">
                            <BuildingIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{lead.company}</span>
                          </div>
                          <div className="text-gray-500 mt-0.5 font-medium">
                            Salary: {formatINR(lead.salary)}/mo
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-gray-900">
                            {lead.requirement}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(lead)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {lead.isDisbursed || lead.status === "Disbursed" ? (
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                              <span className="font-bold text-[10px] uppercase text-emerald-800 block">
                                Disbursed: {lead.disbursedBank || lead.bankName || "Bank"}
                              </span>
                              <span className="text-emerald-900 font-extrabold text-xs block mt-0.5">
                                {formatINR(lead.disbursedAmount || lead.loginAmount)}
                              </span>
                            </div>
                          ) : lead.isSentForLogin || lead.status === "Sent For Login" ? (
                            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                              <span className="font-bold text-[10px] uppercase text-blue-800 block">
                                Login: {lead.bankName || "Bank"}
                              </span>
                              <span className="text-blue-900 font-extrabold text-xs block mt-0.5">
                                {formatINR(lead.loginAmount)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {lead.followUpDate ? (
                            <div>
                              <div className="font-bold text-amber-700 flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
                                <span>{lead.followUpDate}</span>
                              </div>
                              {lead.followUpTime && (
                                <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                                  <ClockIcon className="w-3 h-3 text-gray-400" />
                                  <span>{lead.followUpTime}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
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

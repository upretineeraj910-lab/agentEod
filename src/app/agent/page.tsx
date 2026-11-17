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
  EditIcon,
  TrashIcon,
  LockIcon,
  SearchIcon,
} from "@/components/Icons";
import { formatINR } from "@/lib/utils";

interface LeadItem {
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
  isToday: boolean;
  createdAt: string;
}

interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
}

export default function AgentPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"today" | "history" | "followups">("today");

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [todayDate, setTodayDate] = useState<string>("");
  const [stats, setStats] = useState({
    totalLeadsToday: 0,
    totalLoginsToday: 0,
    totalLoginAmountToday: 0,
    todayFollowUps: 0,
  });

  // Filters
  const [historyDate, setHistoryDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [clientName, setClientName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [salary, setSalary] = useState<string>("");
  const [requirement, setRequirement] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpTime, setFollowUpTime] = useState<string>("");
  const [isSentForLogin, setIsSentForLogin] = useState<boolean>(false);
  const [bankName, setBankName] = useState<string>("");
  const [loginAmount, setLoginAmount] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [status, setStatus] = useState<string>("In Discussion");

  // Fetch current session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.user?.role !== "agent") {
          // If not agent, redirect to proper role
          if (data.user?.role === "admin") router.push("/admin");
          else if (data.user?.role === "manager") router.push("/manager");
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

    async function load() {
      try {
        let url = "/api/agent/leads";
        const params = new URLSearchParams();

        if (activeTab === "today") {
          if (todayDate) params.append("date", todayDate);
        } else if (activeTab === "history") {
          if (historyDate) params.append("date", historyDate);
        } else if (activeTab === "followups") {
          params.append("followUpOnly", "true");
        }

        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim());
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (active && res.ok) {
          setLeads(data.leads || []);
          if (data.today) setTodayDate(data.today);
          if (data.stats) setStats(data.stats);
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
  }, [currentUser, activeTab, todayDate, historyDate, searchQuery, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRefreshTrigger((prev) => prev + 1);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setClientName("");
    setClientPhone("");
    setCompany("");
    setSalary("");
    setRequirement("");
    setFollowUpDate("");
    setFollowUpTime("");
    setIsSentForLogin(false);
    setBankName("");
    setLoginAmount("");
    setRemarks("");
    setStatus("In Discussion");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: LeadItem) => {
    if (!item.isToday) {
      alert("Aap purane din ka data update nahi kar sakte! (Only today's records are editable).");
      return;
    }
    setIsEditing(true);
    setEditingId(item.id);
    setClientName(item.clientName);
    setClientPhone(item.clientPhone);
    setCompany(item.company);
    setSalary(String(item.salary || ""));
    setRequirement(item.requirement);
    setFollowUpDate(item.followUpDate || "");
    setFollowUpTime(item.followUpTime || "");
    setIsSentForLogin(item.isSentForLogin);
    setBankName(item.bankName || "");
    setLoginAmount(item.loginAmount ? String(item.loginAmount) : "");
    setRemarks(item.remarks || "");
    setStatus(item.status || "In Discussion");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim() || !clientPhone.trim() || !company.trim() || !salary || !requirement.trim()) {
      setFormError("Please fill all mandatory fields: Name, Phone, Company, Salary, and Requirement.");
      return;
    }

    if (isSentForLogin && (!bankName.trim() || !loginAmount)) {
      setFormError("Bank name and login amount are required when lead is sent for login.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        company: company.trim(),
        salary: Number(salary),
        requirement: requirement.trim(),
        followUpDate: followUpDate ? followUpDate : null,
        followUpTime: followUpTime ? followUpTime : null,
        isSentForLogin,
        bankName: isSentForLogin ? bankName.trim() : null,
        loginAmount: isSentForLogin ? Number(loginAmount) : null,
        status: isSentForLogin ? "Sent For Login" : status,
        remarks: remarks.trim(),
      };

      let res: Response;
      if (isEditing && editingId) {
        res = await fetch(`/api/agent/leads/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/agent/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        setFormError(resData.message || "Failed to save entry.");
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      setFormError("Server connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: LeadItem) => {
    if (!item.isToday) {
      alert("Aap purane din ka data delete nahi kar sakte! (Only today's records can be modified).");
      return;
    }
    if (!confirm(`Are you sure you want to delete lead: ${item.clientName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/agent/leads/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium">Loading Agent Portal...</div>
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
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Agent Daily EOD Tracker
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Today: <span className="font-semibold text-gray-800">{todayDate}</span> | Only today&apos;s leads can be submitted or edited.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm text-sm transition"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Today&apos;s Lead / EOD</span>
            </button>
          </div>
        </div>

        {/* Stats Grid for Today */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Leads Today
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <UsersIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {stats.totalLeadsToday}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Cases entered for today
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Sent For Login
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {stats.totalLoginsToday}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Files dispatched to banks
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Login Value Today
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <IndianRupeeIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatINR(stats.totalLoginAmountToday)}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Total volume submitted
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Follow-ups Scheduled
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <ClockIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              {stats.todayFollowUps}
            </p>
            <span className="text-xs text-gray-500 mt-1 block">
              Follow-ups due today
            </span>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 mb-6 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 border-b sm:border-b-0 pb-3 sm:pb-0 border-gray-100">
              <button
                onClick={() => setActiveTab("today")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  activeTab === "today"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Today&apos;s Submissions ({stats.totalLeadsToday})
              </button>

              <button
                onClick={() => setActiveTab("followups")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  activeTab === "followups"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Follow-ups List
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5 ${
                  activeTab === "history"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LockIcon className="w-4 h-4" />
                History (Past Days)
              </button>
            </div>

            {/* History Date Filter or Search */}
            <div className="flex flex-wrap items-center gap-3">
              {activeTab === "history" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Select Date:</span>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search client, phone, bank..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 px-3 py-1.5 pl-8 border border-gray-300 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        {/* Notice for Past Dates */}
        {activeTab === "history" && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <LockIcon className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Read-Only Archive:</strong> Aap purane din ka data modify ya delete nahi kar sakte. Yeh company policy ke mutabiq locked hai.
            </span>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Client Details</th>
                  <th className="py-3.5 px-4">Company & Salary</th>
                  <th className="py-3.5 px-4">Requirement</th>
                  <th className="py-3.5 px-4">Follow-up</th>
                  <th className="py-3.5 px-4">Login Status</th>
                  <th className="py-3.5 px-4">Remarks</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
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
                      No leads found for this view. Click &quot;Add Today&apos;s Lead&quot; to submit your EOD!
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50/70 transition"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-900">
                        {lead.date}
                        {lead.isToday && (
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            ● Today
                          </span>
                        )}
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
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {lead.isToday ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(lead)}
                              title="Edit Today's Lead"
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(lead)}
                              title="Delete Today's Lead"
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                            <LockIcon className="w-3 h-3 text-gray-400" />
                            <span>Locked</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? "Edit Today's Lead" : "Add Today's EOD Lead"}
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                Date: {todayDate}
              </span>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TCS, Infosys, Reliance..."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Monthly Salary (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Requirement (Loan type / details) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Personal Loan 5 Lakhs, Home Loan 40L, Balance Transfer..."
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Follow-up Section */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                <span className="text-xs font-bold text-amber-900 block mb-2">
                  Follow-up Details (Ganesh Sir: follow-up bhi save karwani hai)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Date to Follow Up
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Time to Follow Up
                    </label>
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sent for Login Section */}
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSentForLogin}
                      onChange={(e) => setIsSentForLogin(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                    />
                    <span>Sent for Login? (File logged into Bank)</span>
                  </label>
                </div>

                {isSentForLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-emerald-200/60">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-800 mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        required={isSentForLogin}
                        placeholder="e.g. HDFC, ICICI, SBI, Axis..."
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-800 mb-1">
                        Login Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required={isSentForLogin}
                        placeholder="e.g. 500000"
                        value={loginAmount}
                        onChange={(e) => setLoginAmount(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="In Discussion">In Discussion</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Documents Pending">Documents Pending</option>
                    <option value="Sent For Login">Sent For Login</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Remarks / Discussion Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Salary slips received, cibil check ok..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-60 transition"
                >
                  {submitting ? "Saving..." : isEditing ? "Update Lead" : "Save Today's EOD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

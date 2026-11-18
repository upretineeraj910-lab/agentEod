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
  PlusIcon,
  EditIcon,
  TrashIcon,
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
  isDisbursed: boolean;
  disbursedBank: string;
  disbursedAmount: number;
  disbursedDate: string | null;
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
  const [activeTab, setActiveTab] = useState<"today" | "disbursed" | "followups" | "history">("today");

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [todayDate, setTodayDate] = useState<string>("");
  const [stats, setStats] = useState({
    totalLeadsToday: 0,
    totalLoginsToday: 0,
    totalLoginAmountToday: 0,
    totalDisbursedToday: 0,
    totalDisbursedAmountToday: 0,
    todayFollowUps: 0,
  });

  // Date Range Filters (From Date -> To Date)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
  const [isDisbursed, setIsDisbursed] = useState<boolean>(false);
  const [disbursedBank, setDisbursedBank] = useState<string>("");
  const [disbursedAmount, setDisbursedAmount] = useState<string>("");
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
          if (startDate && endDate) {
            params.append("startDate", startDate);
            params.append("endDate", endDate);
          } else if (todayDate) {
            params.append("date", todayDate);
          }
        } else if (activeTab === "disbursed") {
          params.append("disbursedOnly", "true");
          if (startDate) params.append("startDate", startDate);
          if (endDate) params.append("endDate", endDate);
        } else if (activeTab === "history") {
          if (startDate) params.append("startDate", startDate);
          if (endDate) params.append("endDate", endDate);
        } else if (activeTab === "followups") {
          params.append("followUpOnly", "true");
          if (startDate) params.append("startDate", startDate);
          if (endDate) params.append("endDate", endDate);
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
  }, [currentUser, activeTab, todayDate, startDate, endDate, searchQuery, refreshTrigger]);

  const applyPresetRange = (preset: "today" | "7days" | "month" | "all") => {
    const today = todayDate || new Date().toISOString().split("T")[0];
    if (preset === "today") {
      setStartDate(today);
      setEndDate(today);
      setActiveTab("today");
    } else if (preset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(today);
      setActiveTab("history");
    } else if (preset === "month") {
      const d = new Date();
      const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(monthStart);
      setEndDate(today);
      setActiveTab("history");
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
      setActiveTab("history");
    }
  };

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
    setIsDisbursed(false);
    setDisbursedBank("");
    setDisbursedAmount("");
    setRemarks("");
    setStatus("In Discussion");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: LeadItem) => {
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
    setIsDisbursed(item.isDisbursed);
    setDisbursedBank(item.disbursedBank || item.bankName || "");
    setDisbursedAmount(item.disbursedAmount ? String(item.disbursedAmount) : "");
    setRemarks(item.remarks || "");
    setStatus(item.status || "In Discussion");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim() || !clientPhone.trim() || !company.trim() || !salary || !requirement.trim()) {
      setFormError("Please complete all required fields: Client Name, Phone, Company, Salary, and Requirement.");
      return;
    }

    if (isSentForLogin && (!bankName.trim() || !loginAmount)) {
      setFormError("Bank Name and Login Amount are required when marking a file as Sent for Login.");
      return;
    }

    if (isDisbursed && (!disbursedAmount || Number(disbursedAmount) <= 0)) {
      setFormError("Please enter a valid Disbursed Amount.");
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
        isSentForLogin: isSentForLogin || status === "Sent For Login" || status === "Disbursed" || isDisbursed,
        bankName: isSentForLogin || isDisbursed ? bankName.trim() : null,
        loginAmount: isSentForLogin || isDisbursed ? Number(loginAmount) : null,
        isDisbursed: isDisbursed || status === "Disbursed",
        disbursedBank: isDisbursed ? (disbursedBank.trim() || bankName.trim()) : null,
        disbursedAmount: isDisbursed ? Number(disbursedAmount) : null,
        status: isDisbursed ? "Disbursed" : isSentForLogin ? "Sent For Login" : status,
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
      setFormError("Unable to connect to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: LeadItem) => {
    if (!confirm(`Are you sure you want to remove lead: ${item.clientName}?`)) {
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
      alert("An unexpected error occurred.");
    }
  };

  const getStatusBadge = (lead: LeadItem) => {
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

  // Real-time computed metrics for the currently viewed leads (by active tab, date, and search)
  const displayDisbursedCases = leads.filter((l) => l.isDisbursed || l.status === "Disbursed");
  const displayDisbursedAmount = displayDisbursedCases.reduce(
    (sum, l) => sum + (l.disbursedAmount || (l.status === "Disbursed" ? l.loginAmount : 0) || 0),
    0
  );
  const displayDisbursedCount = displayDisbursedCases.length;

  const displayLoginCases = leads.filter((l) => l.isSentForLogin);
  const displayLoginAmount = displayLoginCases.reduce(
    (sum, l) => sum + (l.loginAmount || 0),
    0
  );
  const displayLoginCount = displayLoginCases.length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium text-sm">Loading Agent Portal...</div>
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Daily Sales & EOD Portal
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Active Date: <span className="font-semibold text-gray-800">{todayDate}</span> | Same-day lead submission and follow-up management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs text-sm transition"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Record New Lead / EOD</span>
            </button>
          </div>
        </div>

        {/* 5-Card High Impact KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Today&apos;s Leads
            </span>
            <p className="text-2xl font-extrabold text-gray-900 mt-2">
              {stats.totalLeadsToday}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Total entries logged
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Logins Sent
            </span>
            <p className="text-2xl font-extrabold text-blue-700 mt-2">
              {stats.totalLoginsToday}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Dispatched to banks
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Login Value (₹)
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2">
              {formatINR(stats.totalLoginAmountToday)}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Requested volume
            </span>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center justify-between">
              <span>Today Disbursed</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px]">
                {stats.totalDisbursedToday} Cases
              </span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-2">
              {formatINR(stats.totalDisbursedAmountToday)}
            </p>
            <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
              Sanctioned today
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Follow-ups Due
            </span>
            <p className="text-2xl font-extrabold text-amber-600 mt-2">
              {stats.todayFollowUps}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Scheduled calls today
            </span>
          </div>
        </div>

        {/* Tab & Date Range Toolbar */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 mb-6 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            {/* Row 1: Tabs + Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                <button
                  onClick={() => applyPresetRange("today")}
                  className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
                    activeTab === "today"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Today&apos;s Pipeline ({stats.totalLeadsToday})
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
                  Disbursed Cases
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

                <button
                  onClick={() => {
                    setActiveTab("history");
                    if (startDate === todayDate && endDate === todayDate) {
                      setStartDate("");
                      setEndDate("");
                    }
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeTab === "history"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  All Records
                </button>
              </div>

              {/* Search Box */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search client, phone, bank..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 px-3 py-1.5 pl-8 border border-gray-300 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                >
                  Filter
                </button>
              </form>
            </div>

            {/* Row 2: Date Range Filter (From Date -> To Date) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  Date Range:
                </span>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                  <span className="text-[11px] font-semibold text-gray-500 pl-1">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (activeTab === "today") setActiveTab("history");
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-semibold text-gray-500 px-1">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (activeTab === "today") setActiveTab("history");
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyPresetRange("today")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      startDate === todayDate && endDate === todayDate
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetRange("7days")}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetRange("month")}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition"
                  >
                    This Month
                  </button>
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => applyPresetRange("all")}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                      title="Clear date range to see all records"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Indicator */}
              {(startDate || endDate) && (
                <div className="text-xs text-indigo-700 bg-indigo-50 font-semibold px-3 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                  <span>Filtered Range:</span>
                  <span className="font-extrabold">{startDate || "Start"}</span>
                  <span>➔</span>
                  <span className="font-extrabold">{endDate || "End"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Date & Disbursal Performance Summary Banner */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-sm border border-emerald-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full text-white">
                    {activeTab === "today" && (!startDate || (startDate === todayDate && endDate === todayDate))
                      ? "Today's Summary"
                      : activeTab === "disbursed"
                      ? "Disbursal Report"
                      : activeTab === "followups"
                      ? "Follow-ups Queue"
                      : "Date Range Report"}
                  </span>
                  {startDate && endDate ? (
                    <span className="text-xs font-semibold text-emerald-100 flex items-center gap-1 bg-black/20 px-2.5 py-0.5 rounded-md">
                      <CalendarIcon className="w-3.5 h-3.5 text-emerald-200" />
                      Range: {startDate} ➔ {endDate}
                    </span>
                  ) : startDate ? (
                    <span className="text-xs font-semibold text-emerald-100 flex items-center gap-1 bg-black/20 px-2.5 py-0.5 rounded-md">
                      <CalendarIcon className="w-3.5 h-3.5 text-emerald-200" />
                      From: {startDate}
                    </span>
                  ) : activeTab === "today" && todayDate ? (
                    <span className="text-xs font-semibold text-emerald-100 flex items-center gap-1 bg-black/20 px-2.5 py-0.5 rounded-md">
                      <CalendarIcon className="w-3.5 h-3.5 text-emerald-200" />
                      Today: {todayDate}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-100 bg-black/20 px-2.5 py-0.5 rounded-md">
                      All Dates Combined
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-emerald-100">Disbursed Total:</span>
                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {formatINR(displayDisbursedAmount)}
                  </span>
                  <span className="text-xs font-bold text-emerald-100 bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    {displayDisbursedCount} {displayDisbursedCount === 1 ? "Case" : "Cases"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-white/20 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="text-[11px] text-emerald-100 font-medium block">
                  Logins Dispatched
                </span>
                <span className="text-lg font-extrabold text-white">
                  {formatINR(displayLoginAmount)}
                </span>
                <span className="text-[10px] text-emerald-200 block font-medium">
                  {displayLoginCount} {displayLoginCount === 1 ? "File" : "Files"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-emerald-100 font-medium block">
                  Active Leads
                </span>
                <span className="text-lg font-extrabold text-white">
                  {leads.length}
                </span>
                <span className="text-[10px] text-emerald-200 block font-medium">
                  Total in view
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Client Details</th>
                  <th className="py-3.5 px-4">Company & Income</th>
                  <th className="py-3.5 px-4">Requirement</th>
                  <th className="py-3.5 px-4">Status & Pipeline</th>
                  <th className="py-3.5 px-4">Bank & Amount</th>
                  <th className="py-3.5 px-4">Follow-up</th>
                  <th className="py-3.5 px-4">Remarks</th>
                  <th className="py-3.5 px-4 text-right sticky right-0 bg-gray-50/95 border-l border-gray-200 z-10 shadow-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80 text-xs text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      Loading lead pipeline...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      No records found for this view. Use &quot;Record New Lead / EOD&quot; to log client updates.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-900">
                        {lead.date}
                        {lead.isToday && (
                          <span className="block text-[10px] text-indigo-600 font-bold">
                            ● Today
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(lead)}
                            className="font-bold text-gray-900 hover:text-indigo-600 text-left transition"
                            title="Click to edit or mark as disbursed"
                          >
                            {lead.clientName}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(lead)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition shrink-0"
                            title="Edit / Mark Disbursed"
                          >
                            <EditIcon className="w-3 h-3" />
                            Edit
                          </button>
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
                          <span className="text-gray-400 text-xs font-medium">-</span>
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
                      <td className="py-3.5 px-4 text-right whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs border-l border-gray-200 z-10 shadow-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(lead)}
                            title="Edit Lead Entry"
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead)}
                            title="Delete Lead Entry"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {leads.length > 0 && (
                <tfoot className="bg-slate-50/95 border-t-2 border-gray-300 text-xs font-bold text-gray-900">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="uppercase tracking-wider text-[11px] font-extrabold text-slate-700">
                          Total for this Range ({leads.length} {leads.length === 1 ? "Lead" : "Leads"})
                        </span>
                        {startDate && endDate ? (
                          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            Range: {startDate} ➔ {endDate}
                          </span>
                        ) : startDate ? (
                          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            From: {startDate}
                          </span>
                        ) : activeTab === "today" && todayDate ? (
                          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            Today: {todayDate}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {displayDisbursedAmount > 0 && (
                          <div className="text-emerald-800 font-black text-xs">
                            Disbursed: {formatINR(displayDisbursedAmount)}
                            <span className="text-[10px] text-emerald-700 font-semibold ml-1">
                              ({displayDisbursedCount} {displayDisbursedCount === 1 ? "Case" : "Cases"})
                            </span>
                          </div>
                        )}
                        {displayLoginAmount > 0 && (
                          <div className="text-blue-800 font-black text-xs">
                            Login: {formatINR(displayLoginAmount)}
                            <span className="text-[10px] text-blue-700 font-semibold ml-1">
                              ({displayLoginCount} {displayLoginCount === 1 ? "File" : "Files"})
                            </span>
                          </div>
                        )}
                        {displayDisbursedAmount === 0 && displayLoginAmount === 0 && (
                          <span className="text-gray-400 font-medium">₹0</span>
                        )}
                      </div>
                    </td>
                    <td colSpan={3} className="py-3 px-4 text-right text-gray-500 font-medium text-[11px] sticky right-0 bg-slate-50 border-l border-gray-200 z-10">
                      {displayDisbursedCount} Disbursed &bull; {displayLoginCount} Logins
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Lead Record" : "Add Daily EOD Entry"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update customer requirement, login dispatch status, and loan disbursal details.
                </p>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full">
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
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Employer / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TCS, HDFC Bank, Infosys..."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Monthly In-Hand Salary (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 60000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Loan Requirement & Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Personal Loan 8 Lakhs, Home Loan Balance Transfer..."
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Current Case Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setStatus(newStatus);
                    if (newStatus === "Sent For Login") {
                      setIsSentForLogin(true);
                    } else if (newStatus === "Disbursed") {
                      setIsDisbursed(true);
                      setIsSentForLogin(true);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="In Discussion">In Discussion</option>
                  <option value="Follow Up">Follow Up Scheduled</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="Sent For Login">Sent For Login (Bank Submission)</option>
                  <option value="Approved">Loan Approved</option>
                  <option value="Disbursed">Disbursed (Loan Sanctioned & Disbursed)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Sent for Login Section */}
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSentForLogin}
                      onChange={(e) => {
                        setIsSentForLogin(e.target.checked);
                        if (e.target.checked && status === "In Discussion") {
                          setStatus("Sent For Login");
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                    />
                    <span>Sent for Login to Bank</span>
                  </label>
                </div>

                {isSentForLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-200/60">
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

              {/* Loan Disbursed Section */}
              <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDisbursed}
                      onChange={(e) => {
                        setIsDisbursed(e.target.checked);
                        if (e.target.checked) {
                          setStatus("Disbursed");
                          if (!disbursedAmount && loginAmount) {
                            setDisbursedAmount(loginAmount);
                          }
                          if (!disbursedBank && bankName) {
                            setDisbursedBank(bankName);
                          }
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-700" />
                      Mark as Disbursed (Loan Successfully Disbursed)
                    </span>
                  </label>
                </div>

                {isDisbursed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-emerald-200/80">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        Disbursing Bank
                      </label>
                      <input
                        type="text"
                        placeholder="Bank Name (defaults to Login Bank)"
                        value={disbursedBank}
                        onChange={(e) => setDisbursedBank(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        Disbursed Loan Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required={isDisbursed}
                        placeholder="e.g. 500000"
                        value={disbursedAmount}
                        onChange={(e) => setDisbursedAmount(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Follow-up Section */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                <span className="text-xs font-bold text-amber-950 block mb-2">
                  Follow-up Scheduling
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

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Discussion Notes & Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. KYC verified, documents uploaded to portal..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-60 transition"
                >
                  {submitting ? "Saving..." : isEditing ? "Update Lead" : "Save EOD Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, ShieldIcon, BriefcaseIcon, UsersIcon } from "./Icons";

interface NavbarProps {
  user: {
    userId: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "agent";
  };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    router.push("/login");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldIcon className="w-3.5 h-3.5" />
            ADMIN
          </span>
        );
      case "manager":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <BriefcaseIcon className="w-3.5 h-3.5" />
            MANAGER
          </span>
        );
      case "agent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <UsersIcon className="w-3.5 h-3.5" />
            AGENT
          </span>
        );
      default:
        return null;
    }
  };

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              E
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg tracking-tight">
                EOD Portal
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-gray-500 font-medium">
                | Daily Tracking & Follow-up
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
            <span className="font-medium text-gray-700 mr-1.5">Date:</span>
            {todayFormatted}
          </div>

          <div className="flex items-center gap-2">
            {getRoleBadge(user.role)}
            <div className="hidden sm:block text-right ml-1">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 leading-tight">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-red-600 transition"
          >
            <LogOutIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

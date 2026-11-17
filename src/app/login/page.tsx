"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon, LockIcon } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handlePasswordView = () => {
    setShowPassword((v) => !v);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Role based routing
      const role = data.user?.role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "manager") {
        router.push("/manager");
      } else if (role === "agent") {
        router.push("/agent");
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server. Please check MongoDB connection.");
      setLoading(false);
    }
  };

  // Helper to fill default admin credentials for quick testing
  const fillAdmin = () => {
    setEmail("admin@eod.com");
    setPassword("admin123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg mb-4">
          <ShieldIcon className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          EOD Portal Login
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Daily Lead & Login Tracking System for Agents, Managers & Admin
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-4 py-2.5 pr-14 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
                />
                <button
                  type="button"
                  onClick={handlePasswordView}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-1 py-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition"
            >
              {loading ? "Authenticating..." : "Sign In to Portal"}
            </button>
          </form>

          {/* First time / Quick Admin Access hint */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100/70 text-xs text-indigo-900">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold flex items-center gap-1">
                  <LockIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Initial Superadmin Login:
                </span>
                <button
                  type="button"
                  onClick={fillAdmin}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline"
                >
                  Auto-fill
                </button>
              </div>
              <p className="text-gray-600">
                Email: <span className="font-mono text-gray-900">admin@eod.com</span> | Password: <span className="font-mono text-gray-900">admin123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

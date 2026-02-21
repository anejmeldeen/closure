"use client";

import { Users, LayoutDashboard, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { useState, useEffect } from "react";
import { PremiumPaymentFlow } from "./premium-payment";

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    "staff" | "whiteboard" | "messaging"
  >("staff");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans">
      {/* Simple Top Navigation */}
      <nav className="bg-white border-b border-gray-200 p-4 flex items-center shadow-sm">
        <h1 className="text-2xl font-bold mr-10 tracking-tight">NAME</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "staff"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users size={18} /> Staff Coverage
          </button>

          <button
            onClick={() => setActiveTab("whiteboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "whiteboard"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard size={18} /> Whiteboards
          </button>

          <button
            onClick={() => setActiveTab("messaging")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "messaging"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <MessageSquare size={18} /> Messages
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {/* 1. STAFF TAB */}
        {activeTab === "staff" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                  Staff Coverage
                </h2>
                <p className="text-sm text-gray-500">
                  Monitor team availability in real-time
                </p>
              </div>
              {isPremium ? (
                <button className="px-5 py-3 bg-linear-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105 flex items-center gap-2">
                  <Zap size={18} /> Advanced Reassignment
                </button>
              ) : (
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="px-5 py-3 bg-gray-200 text-gray-600 font-semibold rounded-lg cursor-not-allowed flex items-center gap-2 opacity-60"
                >
                  <Lock size={18} /> Advanced Reassignment
                </button>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-500 mb-4 text-sm">
                TODO: Wire up Supabase to fetch team status and capacity.
              </p>

              {/* Barebones mock list to show teammate */}
              <ul className="space-y-3">
                <li className="p-4 bg-linear-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg flex justify-between items-center hover:border-gray-300 transition-colors duration-200">
                  <div>
                    <span className="font-semibold block text-gray-900">
                      Sarah Jenkins
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      Frontend Engineer
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-700 bg-green-100/60 px-3 py-1 rounded-full border border-green-200">
                    Online
                  </span>
                </li>
                <li className="p-4 bg-linear-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg flex justify-between items-center opacity-70 hover:border-gray-300 transition-colors duration-200">
                  <div>
                    <span className="font-semibold block text-gray-900">
                      Marcus Chen
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      Backend Engineer
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-700 bg-red-100/60 px-3 py-1 rounded-full border border-red-200">
                    OOO - Sick
                  </span>
                </li>
              </ul>
            </div>

            {/* Premium Analytics Section */}
            {!isPremium && (
              <div className="mt-8 bg-linear-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-6 rounded-xl hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                    <Lock size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-900">
                    🔒 Team Analytics
                  </h3>
                </div>
                <p className="text-amber-800 mb-5 leading-relaxed font-medium">
                  Unlock advanced team capacity insights, workload distribution,
                  and predictive availability forecasts.
                </p>
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="px-5 py-3 bg-linear-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 transition-all duration-200 hover:scale-105"
                >
                  Upgrade to Premium
                </button>
              </div>
            )}

            {isPremium && (
              <div className="mt-8 bg-linear-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-lg font-bold text-cyan-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">📊</span> Team Analytics Dashboard
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-lg border border-cyan-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <p className="text-gray-600 text-sm font-medium mb-2">
                      Availability Rate
                    </p>
                    <p className="text-3xl font-bold text-cyan-600">92%</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-cyan-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <p className="text-gray-600 text-sm font-medium mb-2">
                      Avg Capacity
                    </p>
                    <p className="text-3xl font-bold text-cyan-600">7.5h/day</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-cyan-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <p className="text-gray-600 text-sm font-medium mb-2">
                      Tasks Reassigned
                    </p>
                    <p className="text-3xl font-bold text-cyan-600">24</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. WHITEBOARD TAB */}
        {activeTab === "whiteboard" && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                Project Whiteboards
              </h2>
              <p className="text-sm text-gray-500">
                Collaborate and sketch ideas with your team
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <p className="text-gray-500 mb-6 text-sm">
                TODO: Integrate Tldraw canvas grid and sync previous project
                files here.
              </p>
              <button className="px-6 py-3 bg-linear-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105">
                + New Whiteboard
              </button>
            </div>
          </div>
        )}

        {/* 3. MESSAGING TAB */}
        {activeTab === "messaging" && (
          <div className="animate-in fade-in duration-300 h-[calc(100vh-12rem)] flex flex-col">
            <h2 className="text-2xl font-bold mb-6">Team Messages</h2>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col">
              {/* Chat History Area */}
              <div className="flex-1 bg-gray-50 rounded-md border border-gray-200 p-4 mb-4 flex items-center justify-center">
                <p className="text-gray-400 text-sm">
                  No messages yet. Wire up Supabase real-time subscriptions
                  here.
                </p>
              </div>

              {/* Chat Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Type a message to the team..."
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-6 py-3 bg-linear-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

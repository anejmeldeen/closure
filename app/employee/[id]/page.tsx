"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Code2, Briefcase, Users, Building2 } from "lucide-react";
import type { Profile } from "@/types/index";
import { mockEmployees } from "@/lib/employees";

export default function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate async data fetch
    const mockData = mockEmployees[id];

    // Use Promise to avoid setState warning
    Promise.resolve().then(() => {
      setEmployee(mockData || null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Loading employee details...
        </p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Employee not found
        </p>
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const utilizationRate = (
    ((employee.meeting_hours_7d + employee.task_hours_7d) /
      employee.max_capacity) *
    100
  ).toFixed(0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100 font-sans">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center shadow-sm">
        <Link
          href="/"
          className="mr-6 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Employee Details</h1>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 mb-8">
          <div className="flex items-start gap-6 mb-8">
            {/* Avatar */}
            <Image
              src={employee.avatar_url || ""}
              alt={employee.full_name}
              width={96}
              height={96}
              className="rounded-lg shadow-md"
            />

            {/* Basic Info */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {employee.full_name}
              </h2>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase
                  size={18}
                  className="text-gray-500 dark:text-gray-400"
                />
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {employee.role}
                </p>
              </div>

              {/* Performance Rating */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Performance:
                </span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < Math.floor(employee.performance_rating)
                          ? "text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {employee.performance_rating}/5
                </span>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="grid grid-cols-2 gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-gray-500 dark:text-gray-400" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Team ID
                </p>
              </div>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {employee.team_id || "N/A"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2
                  size={16}
                  className="text-gray-500 dark:text-gray-400"
                />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Organization ID
                </p>
              </div>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {employee.org_id || "N/A"}
              </p>
            </div>
          </div>

          {/* Capacity & Hours */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2">
                Max Capacity
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {employee.max_capacity}h
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                per week
              </p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold mb-2">
                Meeting Hours
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {employee.meeting_hours_7d}h
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                this week
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2">
                Task Hours
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {employee.task_hours_7d}h
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                this week
              </p>
            </div>
          </div>

          {/* Utilization */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Weekly Utilization
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {utilizationRate}%
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  Number(utilizationRate) > 90
                    ? "bg-red-500"
                    : Number(utilizationRate) > 75
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(Number(utilizationRate), 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {Number(utilizationRate) > 100
                ? "Over capacity - consider reassigning tasks"
                : Number(utilizationRate) > 75
                  ? "High utilization - limited availability"
                  : "Good availability for new work"}
            </p>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code2 size={20} className="text-gray-700 dark:text-gray-300" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Skills
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {employee.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
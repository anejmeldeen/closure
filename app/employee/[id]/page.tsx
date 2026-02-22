"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/utils/supabase";
import {
  ArrowLeft,
  Code2,
  Briefcase,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Profile } from "@/types/index";
import Loader from "@/app/board/[id]/components/Loader";
import { startOfWeek, addWeeks, subWeeks, format, addDays } from "date-fns";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

export default function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [employee, setEmployee] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Week State
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  
  // Slot States
  const [busySlots, setBusySlots] = useState<Set<string>>(new Set());
  const [daysOff, setDaysOff] = useState<Set<string>>(new Set()); // NEW: Track days off

  const weekKey = format(currentWeek, "yyyy-MM-dd");
  const weekEnd = addDays(currentWeek, 6);

  // Load Employee Data
  useEffect(() => {
    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setEmployee(data as Profile);
      setLoading(false);
    };
    fetchEmployee();
  }, [id]);

  // Load Availability & Days Off for Specific Week
  useEffect(() => {
    const fetchSlots = async () => {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("busy_slots, days_off")
        .eq("profile_id", id)
        .eq("week_start_date", weekKey)
        .maybeSingle();

      if (!error && data) {
        setBusySlots(new Set(data.busy_slots as string[] || []));
        if (data.days_off === null) {
          setDaysOff(new Set(["Sat", "Sun"]));
        } else {
          setDaysOff(new Set(data.days_off as string[]));
        }
      } else {
        setBusySlots(new Set());
        setDaysOff(new Set(["Sat", "Sun"]));
      }
    };
    fetchSlots();
  }, [id, weekKey]);

  if (loading) return <Loader />;

  if (!employee) {
    return (
      <div className="min-h-screen cork-texture flex flex-col items-center justify-center p-6">
        <div className="paper-texture bg-[#f5f2e8] p-8 border-4 border-[#2D2A26] shadow-brutal text-center">
          <p className="font-black uppercase mb-4 text-[#2D2A26]">
            Operator Not Found
          </p>
          <Link
            href="/?tab=staff"
            className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-[#D97757]"
          >
            Return to HQ
          </Link>
        </div>
      </div>
    );
  }

  const utilizationRate = (
    ((employee.meeting_hours_7d + employee.task_hours_7d) /
      employee.max_capacity) *
    100
  ).toFixed(0);

  return (
    <>
      <nav className="bg-[#f5f2e8] border-b-2 border-[#2D2A26] px-4 sm:px-8 py-4 flex items-center fixed top-0 left-0 right-0 w-full z-[9999] shadow-md">
        <Link
          href="/?tab=staff"
          className="mr-6 p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all bg-white"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-black tracking-tighter uppercase">
          Personnel Profile
        </h1>
      </nav>

      <div className="min-h-screen cork-texture flex flex-col font-sans text-[#2D2A26] pt-[75px]">
        <main className="flex-1 p-4 sm:p-8 md:p-12 max-w-4xl mx-auto w-full relative z-10">
          {/* Profile Card */}
          <div className="paper-texture bg-[#f5f2e8] border-2 border-[#2D2A26] p-10 shadow-brutal-lg mb-10 relative">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-4 bg-[#ffbb00] opacity-80 border border-[#2D2A26]/10"></div>
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10 pb-10 border-b-2 border-dashed border-[#2D2A26]/20">
              <div className="relative">
                <Image
                  src={
                    employee.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.full_name}`
                  }
                  alt={employee.full_name}
                  width={120}
                  height={120}
                  unoptimized
                  className="bg-white border-2 border-[#2D2A26] shadow-brutal rounded-sm"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">
                  {employee.full_name}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Briefcase size={16} className="opacity-40" />
                  <p className="font-bold text-sm uppercase tracking-widest text-gray-500">
                    {employee.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <Code2 size={20} />
                <h3 className="text-xl font-black uppercase tracking-tight italic">
                  Skills
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {(employee.skills?.length ?? 0) === 0 ? (
                  <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">
                    No skills listed.
                  </p>
                ) : (
                  employee.skills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2 bg-white border-2 border-[#2D2A26] text-[10px] font-black uppercase tracking-widest shadow-brutal-sm"
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Total Utilization */}
            <div className="bg-white border-2 border-[#2D2A26] p-6 shadow-brutal-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Total Utilization
                </p>
                <p className="text-xl font-black">{utilizationRate}%</p>
              </div>
              <div className="w-full bg-[#2D2A26]/10 border border-[#2D2A26] h-4 rounded-none overflow-hidden p-0.5">
                <div
                  className={`h-full transition-all duration-1000 ${Number(utilizationRate) > 90 ? "bg-red-500" : Number(utilizationRate) > 75 ? "bg-[#ffbb00]" : "bg-[#86efac]"}`}
                  style={{
                    width: `${Math.min(Number(utilizationRate), 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Availability Grid */}
          <div className="paper-texture bg-white border-2 border-[#2D2A26] p-8 shadow-brutal mb-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 pb-4 border-b-2 border-[#2D2A26] gap-4">
              <div className="flex items-center gap-3">
                <CalendarIcon size={20} />
                <h3 className="text-xl font-black uppercase tracking-tight italic">
                  Availability Schedule
                </h3>
              </div>

              {/* Week Switcher */}
              <div className="flex items-center border-2 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal-sm">
                <button
                  onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                  className="p-2 hover:bg-white border-r-2 border-[#2D2A26] transition-colors"
                >
                  <ChevronLeft size={16} strokeWidth={3} />
                </button>
                <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest min-w-[150px] text-center">
                  {format(currentWeek, "MMM d")} -{" "}
                  {format(weekEnd, "MMM d, yy")}
                </span>
                <button
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                  className="p-2 hover:bg-white border-l-2 border-[#2D2A26] transition-colors"
                >
                  <ChevronRight size={16} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[700px] border-l-2 border-t-2 border-[#2D2A26]">
                {/* Grid Header */}
                <div className="grid grid-cols-8">
                  <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2"></div>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = addDays(currentWeek, i);
                    return (
                      <div
                        key={i}
                        className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-center flex flex-col items-center justify-center relative"
                      >
                        {/* If it's a day off, show a visual indicator in the header */}
                        {daysOff.has(format(date, "EEE")) && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-[#93c5fd] rounded-full border border-[#2D2A26]" title="Day Off"></div>
                        )}
                        <span className="font-black text-[10px] uppercase">
                          {format(date, "EEE")}
                        </span>
                        <span className="font-bold text-lg leading-none mt-1">
                          {format(date, "d")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Grid Body (Read-Only) */}
                {HOURS.map((hour) => (
                  <div key={hour} className="grid grid-cols-8">
                    <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-right font-black text-[9px] uppercase flex items-center justify-end">
                      {hour > 12
                        ? `${hour - 12} PM`
                        : hour === 12
                          ? "12 PM"
                          : `${hour} AM`}
                    </div>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = addDays(currentWeek, i);
                      const dayName = format(date, "EEE");
                      const slotKey = `${dayName}-${hour}`;
                      
                      const isDayOff = daysOff.has(dayName);
                      const isBusy = busySlots.has(slotKey);

                      // Priority: Day Off (Blue) > Busy (Orange) > Free (White)
                      let bgClass = "bg-white";
                      if (isDayOff) {
                        bgClass = "bg-[#93c5fd]";
                      } else if (isBusy) {
                        bgClass = "bg-[#ffbb00]";
                      }

                      return (
                        <div
                          key={slotKey}
                          className={`border-r-2 border-b-2 border-[#2D2A26] h-10 transition-colors ${bgClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white border-2 border-[#2D2A26]" />
                  <span className="text-[9px] font-black uppercase opacity-60">
                    Free
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#ffbb00] border-2 border-[#2D2A26]" />
                  <span className="text-[9px] font-black uppercase opacity-60">
                    Busy
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#93c5fd] border-2 border-[#2D2A26]" />
                  <span className="text-[9px] font-black uppercase opacity-60">
                    Day Off
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
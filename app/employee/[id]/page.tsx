"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/utils/supabase";
import { ArrowLeft, Code2, Briefcase, Users, Building2, Star } from "lucide-react";
import type { Profile } from "@/types/index";
import Loader from "@/app/board/[id]/components/Loader";

export default function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setEmployee(data as Profile);
      }
      setLoading(false);
    };
    fetchEmployee();
  }, [id]);

  if (loading) return <Loader />;

  if (!employee) {
    return (
      <div className="min-h-screen cork-texture flex flex-col items-center justify-center p-6">
        <div className="paper-texture bg-[#f5f2e8] p-8 border-4 border-[#2D2A26] shadow-brutal text-center">
          <p className="font-black uppercase mb-4 text-[#2D2A26]">Operator Not Found</p>
          <Link href="/?tab=staff" className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-[#D97757]">
            Return to HQ
          </Link>
        </div>
      </div>
    );
  }

  const utilizationRate = (
    ((employee.meeting_hours_7d + employee.task_hours_7d) / employee.max_capacity) * 100
  ).toFixed(0);

  return (
    <div className="min-h-screen cork-texture flex flex-col font-sans text-[#2D2A26]">
      {/* 1. TOP NAV (Paper Texture) */}
      <nav className="paper-texture bg-[#f5f2e8] border-b-2 border-[#2D2A26] px-8 py-4 flex items-center sticky top-0 z-40 shadow-md">
        <Link href="/?tab=staff" className="mr-6 p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all bg-white">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-black tracking-tighter uppercase">Personnel Profile</h1>
      </nav>

      {/* 2. MAIN CONTENT (Pinned Note Style) */}
      <main className="flex-1 p-8 md:p-12 max-w-4xl mx-auto w-full relative z-10">
        
        {/* Profile Card */}
        <div className="paper-texture bg-[#f5f2e8] border-2 border-[#2D2A26] p-10 shadow-brutal-lg mb-10 relative">
          {/* Subtle Orange Tape mark */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-4 bg-[#ffbb00] opacity-80 border border-[#2D2A26]/10"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10 pb-10 border-b-2 border-dashed border-[#2D2A26]/20">
            {/* Avatar */}
            <div className="relative">
              <Image
                src={employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.full_name}`}
                alt={employee.full_name}
                width={120}
                height={120}
                unoptimized
                className="bg-white border-2 border-[#2D2A26] shadow-brutal rounded-sm"
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">
                {employee.full_name}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                <Briefcase size={16} className="opacity-40" />
                <p className="font-bold text-sm uppercase tracking-widest text-gray-500">
                  {employee.role}
                </p>
              </div>

              {/* Performance Rating */}
              <div className="flex items-center justify-center md:justify-start gap-4 bg-white/50 border-2 border-[#2D2A26] p-3 shadow-brutal-sm inline-flex">
                <span className="text-[10px] font-black uppercase">Rating:</span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < Math.floor(employee.performance_rating) ? "#2D2A26" : "none"}
                      className={i < Math.floor(employee.performance_rating) ? "text-[#2D2A26]" : "text-gray-300"}
                    />
                  ))}
                </div>
                <span className="font-mono font-bold text-xs">{employee.performance_rating}/5</span>
              </div>
            </div>
          </div>

          {/* Org Info & Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-white border-2 border-[#2D2A26] shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase opacity-40 mb-2">Capacity</p>
              <p className="text-2xl font-black tracking-tighter">{employee.max_capacity}H</p>
              <p className="text-[9px] font-bold opacity-30 mt-1 uppercase">Per Cycle</p>
            </div>
            <div className="p-6 bg-white border-2 border-[#2D2A26] shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase opacity-40 mb-2">Meetings</p>
              <p className="text-2xl font-black tracking-tighter">{employee.meeting_hours_7d}H</p>
              <p className="text-[9px] font-bold opacity-30 mt-1 uppercase">Logged 7D</p>
            </div>
            <div className="p-6 bg-white border-2 border-[#2D2A26] shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase opacity-40 mb-2">Active Tasks</p>
              <p className="text-2xl font-black tracking-tighter">{employee.task_hours_7d}H</p>
              <p className="text-[9px] font-bold opacity-30 mt-1 uppercase">Production</p>
            </div>
          </div>

          {/* Utilization Progress Bar */}
          <div className="bg-white border-2 border-[#2D2A26] p-6 shadow-brutal-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest">Total Utilization</p>
              <p className="text-xl font-black">{utilizationRate}%</p>
            </div>
            <div className="w-full bg-[#2D2A26]/10 border border-[#2D2A26] h-4 rounded-none overflow-hidden p-0.5">
              <div
                className={`h-full transition-all duration-1000 ${
                  Number(utilizationRate) > 90 ? "bg-red-500" : Number(utilizationRate) > 75 ? "bg-[#ffbb00]" : "bg-[#86efac]"
                }`}
                style={{ width: `${Math.min(Number(utilizationRate), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="paper-texture bg-white border-2 border-[#2D2A26] p-8 shadow-brutal">
          <div className="flex items-center gap-3 mb-6">
            <Code2 size={20} />
            <h3 className="text-xl font-black uppercase tracking-tight italic">Skill Matrix</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {employee.skills?.map((skill) => (
              <span key={skill} className="px-4 py-2 bg-[#f5f2e8] border-2 border-[#2D2A26] text-[10px] font-black uppercase tracking-widest shadow-brutal-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
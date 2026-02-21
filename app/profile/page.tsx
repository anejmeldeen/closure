"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { ArrowLeft, Plus, X, Check } from "lucide-react";
import type { Profile } from "@/types/index";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Generates hours from 8 AM to 6 PM (8 to 18)
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); 

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState("");
  const [editingRole, setEditingRole] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const [savedRole, setSavedRole] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  // --- Click & Drag Calendar State ---
  const [busySlots, setBusySlots] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove' | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (data) {
        setProfile(data as Profile);
        setRoleInput(data.role || "");
        const localSkills = localStorage.getItem(`skills_${data.id}`);
        if (localSkills) setProfile({ ...(data as Profile), skills: JSON.parse(localSkills) });
      }

      // Load saved grid slots
      const savedGrid = localStorage.getItem("busy_slots_grid");
      if (savedGrid) setBusySlots(new Set(JSON.parse(savedGrid)));

      setLoading(false);
    };
    load();
  }, [router]);

  // Global mouse up to stop dragging if the user's cursor leaves the grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragMode(null);
        // Save whenever they finish dragging
        localStorage.setItem("busy_slots_grid", JSON.stringify(Array.from(busySlots)));
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, busySlots]);

  // --- Grid Interaction Logic ---
  const updateSlot = (slotKey: string, mode: 'add' | 'remove') => {
    setBusySlots(prev => {
      const next = new Set(prev);
      mode === 'add' ? next.add(slotKey) : next.delete(slotKey);
      return next;
    });
  };

  const handleMouseDown = (day: string, hour: number) => {
    const slotKey = `${day}-${hour}`;
    const mode = busySlots.has(slotKey) ? 'remove' : 'add';
    setDragMode(mode);
    setIsDragging(true);
    updateSlot(slotKey, mode);
  };

  const handleMouseEnter = (day: string, hour: number) => {
    if (isDragging && dragMode) {
      updateSlot(`${day}-${hour}`, dragMode);
    }
  };

  // --- Profile Logic ---
  const saveSkillsLocally = (skills: string[]) => {
    localStorage.setItem(`skills_${profile?.id}`, JSON.stringify(skills));
  };

  const addSkill = () => {
    const skill = newSkill.trim();
    if (!skill || !profile) return;
    if ((profile.skills || []).includes(skill)) {
      setNewSkill("");
      return;
    }
    const updated = [...(profile.skills || []), skill];
    setProfile({ ...profile, skills: updated });
    saveSkillsLocally(updated);
    setNewSkill("");
    setSkillError(null);
  };

  const removeSkill = (skill: string) => {
    if (!profile) return;
    const updated = (profile.skills || []).filter((s) => s !== skill);
    setProfile({ ...profile, skills: updated });
    saveSkillsLocally(updated);
  };

  const saveRole = async () => {
    if (!profile || !roleInput.trim()) return;
    await supabase.from("profiles").update({ role: roleInput.trim() }).eq("id", profile.id);
    setProfile({ ...profile, role: roleInput.trim() });
    setEditingRole(false);
    setSavedRole(true);
    setTimeout(() => setSavedRole(false), 2000);
  };

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "ME";

  if (loading) {
    return (
      <div className="min-h-screen cork-texture flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2D2A26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen cork-texture font-sans text-[#2D2A26]">
      <nav className="paper-texture border-b-2 border-[#2D2A26] px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
            <ArrowLeft size={16} strokeWidth={3} /> Back
          </Link>
          <span className="text-2xl font-black uppercase tracking-tighter">Profile</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-12 space-y-8">
        {/* Hero Card */}
        <div className="paper-texture border-2 border-[#2D2A26] shadow-brutal-lg p-10 flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <div className="w-24 h-24 bg-[#ffbb00] border-4 border-[#2D2A26] flex items-center justify-center font-black text-4xl uppercase shrink-0 shadow-brutal">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-3">
              {profile?.full_name || "Unknown"}
            </h1>

            {editingRole ? (
              <div className="flex gap-2 items-center">
                <input
                  autoFocus
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRole();
                    if (e.key === "Escape") setEditingRole(false);
                  }}
                  className="border-2 border-[#2D2A26] px-3 py-1.5 text-sm font-bold uppercase bg-white outline-none shadow-brutal-sm"
                  placeholder="e.g. Senior Engineer"
                />
                <button onClick={saveRole} className="px-3 py-1.5 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black text-xs shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                  <Check size={14} strokeWidth={3} />
                </button>
                <button onClick={() => setEditingRole(false)} className="px-3 py-1.5 border-2 border-[#2D2A26] font-black text-xs bg-white hover:bg-[#2D2A26] hover:text-white transition-all">
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingRole(true)} className="group flex items-center gap-2">
                <span className="font-bold text-sm uppercase tracking-widest text-[#2D2A26]/50 group-hover:text-[#2D2A26] transition-colors">
                  {profile?.role || "— Set your role"}
                </span>
                {savedRole && <Check size={14} strokeWidth={3} className="text-green-500" />}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Skills */}
          <div className="paper-texture border-2 border-[#2D2A26] shadow-brutal p-8">
            <h2 className="font-black text-xs uppercase tracking-widest mb-6 pb-4 border-b-2 border-[#2D2A26]">Skills</h2>
            <div className="flex flex-wrap gap-2 mb-6 min-h-12">
              {(profile?.skills || []).length === 0 ? (
                <p className="text-xs font-bold uppercase opacity-30">No skills yet — add some below</p>
              ) : (
                (profile?.skills || []).map((skill) => (
                  <span key={skill} className="group flex items-center gap-1.5 px-3 py-1.5 bg-[#2D2A26] text-white text-[10px] font-black uppercase border-2 border-[#2D2A26] shadow-brutal-sm">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <X size={10} strokeWidth={3} />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addSkill(); }}
                placeholder="Add a skill..."
                className="flex-1 border-2 border-[#2D2A26] px-3 py-2 text-[10px] font-bold uppercase bg-white outline-none placeholder:opacity-30 shadow-brutal-sm"
              />
              <button onClick={addSkill} className="px-4 bg-[#2D2A26] text-white border-2 border-[#2D2A26] hover:bg-[#ffbb00] hover:text-[#2D2A26] transition-all shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5">
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="paper-texture border-2 border-[#2D2A26] shadow-brutal p-8">
            <h2 className="font-black text-xs uppercase tracking-widest mb-6 pb-4 border-b-2 border-[#2D2A26]">Stats</h2>
            <div className="space-y-5">
              {[
                { label: "Capacity", value: profile?.max_capacity ?? "—", unit: "hrs/wk" },
                { label: "Meeting Hours (7d)", value: profile?.meeting_hours_7d ?? "—", unit: "hrs" },
                { label: "Task Hours (7d)", value: profile?.task_hours_7d ?? "—", unit: "hrs" },
                { label: "Performance", value: profile?.performance_rating ? `${profile.performance_rating}/5` : "—", unit: "" },
              ].map(({ label, value, unit }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="font-bold text-[10px] uppercase tracking-widest opacity-50">{label}</span>
                  <span className="font-black text-lg">{value} <span className="text-xs font-bold opacity-40">{unit}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Click & Drag Availability Grid --- */}
        <div className="paper-texture border-2 border-[#2D2A26] shadow-brutal p-8 select-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b-2 border-[#2D2A26] gap-4">
            <div>
              <h2 className="font-black text-xs uppercase tracking-widest">Availability</h2>
              <p className="text-[10px] font-bold opacity-50 uppercase mt-1">Click and drag to mark busy hours</p>
            </div>
            
            <button 
              onClick={() => window.location.href = `/api/auth/connect?provider=google&profileId=${profile?.id}`}
              className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-[#2D2A26] text-[10px] font-black uppercase shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              <div className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">G</div>
              Import Calendar
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[500px] border-l-2 border-t-2 border-[#2D2A26]">
              {/* Grid Header */}
              <div className="grid grid-cols-8">
                <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2"></div>
                {DAYS.map(day => (
                  <div key={day} className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-center font-black text-[10px] uppercase">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8">
                  <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-right font-black text-[9px] uppercase flex items-center justify-end">
                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                  </div>
                  {DAYS.map(day => {
                    const slotKey = `${day}-${hour}`;
                    const isBusy = busySlots.has(slotKey);
                    return (
                      <div
                        key={slotKey}
                        onMouseDown={() => handleMouseDown(day, hour)}
                        onMouseEnter={() => handleMouseEnter(day, hour)}
                        className={`border-r-2 border-b-2 border-[#2D2A26] h-8 cursor-pointer transition-colors ${
                          isBusy ? 'bg-[#ffbb00]' : 'bg-white hover:bg-[#f5f2e8]'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border-2 border-[#2D2A26]" /><span className="text-[9px] font-black uppercase opacity-60">Free</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ffbb00] border-2 border-[#2D2A26]" /><span className="text-[9px] font-black uppercase opacity-60">Busy</span></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
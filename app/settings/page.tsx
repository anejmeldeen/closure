"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import {
  ArrowLeft,
  Plus,
  X,
  Image as ImageIcon,
  Save,
  Calendar,
  Bell,
  Mail,
  Smartphone,
  RefreshCcw,
  User,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import type { Profile } from "@/types/index";
import { startOfWeek, format } from "date-fns";

const AVATAR_SEEDS = [
  "Adrian",
  "Nolan",
  "Alexander",
  "Brian",
  "Jamal",
  "Hiroshi",
  "Omar",
  "Mateo",
  "Avery",
  "Chen",
  "Ravi",
  "Tariq",
  "Diego",
  "Kenji",
  "Andre",
  "Hassan",
  "Wei",
  "Miguel",
  "Jackson",
  "Ali",
  "Sarah",
  "Maria",
  "Fatima",
  "Mei",
  "Brooklynn",
  "Priya",
  "Mason",
  "Sofia",
  "Yuki",
  "Chloe",
];

type TabType = "profile" | "skills" | "notifications" | "integrations";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Form States
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [newSkill, setNewSkill] = useState("");

  // UI & Integration States
  const [syncing, setSyncing] = useState(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [appNotif, setAppNotif] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) {
        setProfile(profileData as Profile);
        setFullName(profileData.full_name || "");
        setRole(profileData.role || "");
      }

      // 2. Check if Google Calendar is linked
      const { data: integData } = await supabase
        .from("calendar_integrations")
        .select("id")
        .eq("profile_id", user.id)
        .eq("provider", "google")
        .maybeSingle();

      if (integData) setIsGoogleLinked(true);

      setLoading(false);
    };
    load();
  }, [router]);

  // --- Profile Saves ---
  const handleProfileSave = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, role: role })
      .eq("id", profile.id);

    if (error) {
      alert("Failed to save profile: " + error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setProfile({ ...profile, full_name: fullName, role: role });
    }
  };

  const updateAvatar = async (url: string) => {
    if (!profile) return;
    setProfile({ ...profile, avatar_url: url });
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", profile.id);
    if (error) alert("Failed to save avatar: " + error.message);
  };

  const handleCustomUrlSave = () => {
    if (!customUrl.trim()) return;
    updateAvatar(customUrl.trim());
    setCustomUrl("");
  };

  const addSkill = async () => {
    const skill = newSkill.trim();
    if (!skill || !profile || (profile.skills || []).includes(skill)) {
      setNewSkill("");
      return;
    }
    const updated = [...(profile.skills || []), skill];
    setProfile({ ...profile, skills: updated });
    setNewSkill("");
    await supabase
      .from("profiles")
      .update({ skills: updated })
      .eq("id", profile.id);
  };

  const removeSkill = async (skill: string) => {
    if (!profile) return;
    const updated = (profile.skills || []).filter((s) => s !== skill);
    setProfile({ ...profile, skills: updated });
    await supabase
      .from("profiles")
      .update({ skills: updated })
      .eq("id", profile.id);
  };

  // --- Integrations ---
  const handleGoogleConnect = () => {
    if (!profile?.id) return;
    window.location.href = `/api/auth/connect?provider=google&profileId=${profile.id}`;
  };

  const handleSync = async () => {
    if (!profile?.id) return;
    setSyncing(true);
    try {
      // Find the current week's Monday to match your database architecture
      const currentMonday = format(
        startOfWeek(new Date(), { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );

      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profile.id,
          week_start: currentMonday,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Pass local TZ so mapping is accurate
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) return handleGoogleConnect();
        throw new Error(data.error || "Failed to sync");
      }

      alert(
        `Success! Imported ${data.slotsAdded} busy blocks to your current week.`,
      );
    } catch (err: any) {
      alert("Sync failed: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen cork-texture flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2D2A26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Identity & Icon", icon: <User size={16} /> },
    { id: "skills", label: "Skills", icon: <Wrench size={16} /> },
    { id: "notifications", label: "Alerts", icon: <Bell size={16} /> },
    { id: "integrations", label: "Integrations", icon: <Calendar size={16} /> },
  ];

  return (
    <div className="min-h-screen cork-texture font-sans text-[#2D2A26] pb-20">
      <nav className="paper-texture border-b-2 border-[#2D2A26] px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={16} strokeWidth={3} /> Back
          </Link>
          <span className="text-2xl font-black uppercase tracking-tighter">
            Settings
          </span>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-8 py-12 flex flex-col md:flex-row gap-10">
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 p-4 border-2 border-[#2D2A26] font-black uppercase text-[11px] tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#2D2A26] text-white shadow-none translate-x-[2px] translate-y-[2px]"
                  : "bg-[#f5f2e8] paper-texture text-[#2D2A26] shadow-brutal hover:bg-white hover:-translate-y-0.5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0 space-y-10">
          {activeTab === "profile" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-10">
              <section className="paper-texture border-4 border-[#2D2A26] shadow-brutal-lg p-8">
                <div className="mb-6 pb-4 border-b-4 border-[#2D2A26] flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tight">
                      Personal Data
                    </h2>
                    <p className="font-bold text-xs uppercase opacity-60 tracking-widest mt-1">
                      Manage your information
                    </p>
                  </div>
                  <button
                    onClick={handleProfileSave}
                    className={`px-6 py-3 border-2 border-[#2D2A26] font-black text-[10px] uppercase shadow-brutal-sm transition-all flex items-center gap-2 ${saveSuccess ? "bg-[#86efac] text-[#2D2A26] translate-y-[2px] translate-x-[2px] shadow-none" : "bg-[#2D2A26] text-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"}`}
                  >
                    <Save size={14} /> {saveSuccess ? "Saved" : "Save Changes"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase mb-2">
                      Full Name
                    </p>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-3 border-2 border-[#2D2A26] font-bold text-sm bg-white focus:outline-none shadow-brutal-sm"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase mb-2">
                      Role
                    </p>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Senior Engineer"
                      className="w-full p-3 border-2 border-[#2D2A26] font-bold text-sm bg-white focus:outline-none shadow-brutal-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="paper-texture border-4 border-[#2D2A26] shadow-brutal-lg p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 pb-6 border-b-4 border-[#2D2A26]">
                  <div className="w-24 h-24 bg-[#f5f2e8] border-4 border-[#2D2A26] shadow-brutal shrink-0">
                    <img
                      src={
                        profile?.avatar_url ||
                        `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile?.id}`
                      }
                      alt="Current Avatar"
                      className="w-full h-full object-cover aspect-square p-1"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tight">
                      Profile Picture
                    </h2>
                    <p className="font-bold text-xs uppercase opacity-60 tracking-widest mt-1">
                      Select an icon or provide a custom image URL
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black uppercase mb-2">
                      Custom Image URL
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://example.com/my-image.jpg"
                        className="flex-1 p-3 border-2 border-[#2D2A26] font-bold text-xs bg-white focus:outline-none shadow-brutal-sm"
                      />
                      <button
                        onClick={handleCustomUrlSave}
                        className="px-6 bg-[#2D2A26] text-white font-black text-[10px] uppercase border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2"
                      >
                        <ImageIcon size={14} /> Set
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase mb-3">
                      Or choose a retro profile
                    </p>
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                      {AVATAR_SEEDS.map((seed) => {
                        const url = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                        const isSelected = profile?.avatar_url === url;
                        return (
                          <button
                            key={seed}
                            onClick={() => updateAvatar(url)}
                            className={`aspect-square border-2 transition-all flex items-center justify-center p-1 ${isSelected ? "border-red-600 bg-red-100 translate-y-[1px] translate-x-[1px]" : "border-[#2D2A26] bg-white hover:bg-[#86efac] shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"}`}
                          >
                            <img
                              src={url}
                              alt={seed}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "skills" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <section className="paper-texture border-4 border-[#2D2A26] shadow-brutal-lg p-8">
                <div className="mb-6 pb-4 border-b-4 border-[#2D2A26]">
                  <h2 className="text-2xl font-black uppercase italic tracking-tight">
                    Skills
                  </h2>
                  <p className="font-bold text-xs uppercase opacity-60 tracking-widest mt-1">
                    Manage your capabilities
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mb-6 min-h-[48px] p-4 bg-white/50 border-2 border-[#2D2A26]/20">
                  {(profile?.skills || []).length === 0 ? (
                    <p className="text-xs font-bold uppercase opacity-30 flex items-center">
                      No skills logged
                    </p>
                  ) : (
                    (profile?.skills || []).map((skill) => (
                      <span
                        key={skill}
                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-[#2D2A26] text-white text-[10px] font-black uppercase border-2 border-[#2D2A26] shadow-sm"
                      >
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="opacity-40 hover:opacity-100 hover:text-red-400 transition-colors"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addSkill();
                    }}
                    placeholder="E.g. React, Logistics, DevOps..."
                    className="flex-1 border-2 border-[#2D2A26] px-4 py-3 text-[12px] font-bold uppercase bg-white outline-none shadow-brutal-sm"
                  />
                  <button
                    onClick={addSkill}
                    className="px-6 bg-[#86efac] text-[#2D2A26] border-2 border-[#2D2A26] hover:bg-[#ffbb00] transition-all shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2 font-black text-[10px] uppercase"
                  >
                    <Plus size={14} strokeWidth={3} /> Add
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <section className="paper-texture border-4 border-[#2D2A26] shadow-brutal-lg p-8">
                <div className="mb-6 pb-4 border-b-4 border-[#2D2A26]">
                  <div className="flex items-center gap-2">
                    <Bell size={24} strokeWidth={2.5} />
                    <h2 className="text-2xl font-black uppercase italic tracking-tight">
                      Alert Preferences
                    </h2>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border-2 border-[#2D2A26] bg-white shadow-brutal-sm">
                    <div className="flex items-center gap-4">
                      <Mail size={20} className="text-[#2D2A26]/50" />
                      <div>
                        <span className="block font-black text-xs uppercase tracking-widest">
                          Email Alerts
                        </span>
                        <span className="text-[10px] font-bold opacity-50">
                          Daily digests and mentions
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setEmailNotif(!emailNotif)}
                      className={`w-12 h-6 border-2 border-[#2D2A26] relative transition-colors ${emailNotif ? "bg-[#86efac]" : "bg-gray-200"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-[#2D2A26] absolute top-0.5 transition-all ${emailNotif ? "left-6" : "left-1"}`}
                      ></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-[#2D2A26] bg-white shadow-brutal-sm">
                    <div className="flex items-center gap-4">
                      <Smartphone size={20} className="text-[#2D2A26]/50" />
                      <div>
                        <span className="block font-black text-xs uppercase tracking-widest">
                          In-App Alerts
                        </span>
                        <span className="text-[10px] font-bold opacity-50">
                          Instant push notifications inside Closure
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setAppNotif(!appNotif)}
                      className={`w-12 h-6 border-2 border-[#2D2A26] relative transition-colors ${appNotif ? "bg-[#86efac]" : "bg-gray-200"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-[#2D2A26] absolute top-0.5 transition-all ${appNotif ? "left-6" : "left-1"}`}
                      ></div>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <section className="paper-texture border-4 border-[#2D2A26] shadow-brutal-lg p-8">
                <div className="mb-6 pb-4 border-b-4 border-[#2D2A26]">
                  <div className="flex items-center gap-2">
                    <Calendar size={24} strokeWidth={2.5} />
                    <h2 className="text-2xl font-black uppercase italic tracking-tight">
                      Connections
                    </h2>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-xs font-bold uppercase opacity-60 leading-relaxed max-w-xl">
                    Sync your external schedule to automatically block off busy
                    hours in the personnel registry. Your events remain private,
                    and you can manually edit the synced data later.
                  </p>

                  {isGoogleLinked ? (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex-1 max-w-sm flex items-center justify-center gap-3 p-4 bg-[#86efac] border-2 border-[#2D2A26] font-black text-[10px] uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                      >
                        {syncing ? (
                          <RefreshCcw
                            size={16}
                            className="animate-spin text-[#2D2A26]"
                          />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        {syncing ? "Pulling Data..." : "Sync Current Week"}
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-100 px-3 py-1 border border-green-700">
                        Linked
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleConnect}
                      className="max-w-sm w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-[#2D2A26] font-black text-xs uppercase shadow-brutal hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <div className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                        G
                      </div>
                      Connect Google Calendar
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

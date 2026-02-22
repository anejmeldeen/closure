"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { ArrowLeft, Plus, X, Image as ImageIcon } from "lucide-react";
import type { Profile } from "@/types/index";

const AVATAR_SEEDS = [
  "Adrian", "Nolan", "Alexander", "Brian", "Jamal", "Hiroshi", "Omar", "Mateo", "Avery", "Chen", 
  "Ravi", "Tariq", "Diego", "Kenji", "Andre", "Hassan", "Wei", "Miguel", "Jackson", "Ali",
  "Sarah", "Maria", "Fatima", "Mei", "Brooklynn", "Priya", "Mason", "Sofia", "Yuki", "Chloe"
];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [customUrl, setCustomUrl] = useState("");
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data as Profile);
      setLoading(false);
    };
    load();
  }, [router]);

  const updateAvatar = async (url: string) => {
    if (!profile) return;
    
    // Update UI instantly
    setProfile({ ...profile, avatar_url: url });
    
    // Save to Database
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
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
    await supabase.from("profiles").update({ skills: updated }).eq("id", profile.id);
  };

  const removeSkill = async (skill: string) => {
    if (!profile) return;
    const updated = (profile.skills || []).filter((s) => s !== skill);
    setProfile({ ...profile, skills: updated });
    await supabase.from("profiles").update({ skills: updated }).eq("id", profile.id);
  };

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
          <span className="text-2xl font-black uppercase tracking-tighter">System Settings</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-8 py-12 space-y-10">
        
        {/* AVATAR CONFIGURATION */}
        <section className="paper-texture border-4 border-[#2D2A26] shadow-brutal-lg p-8">
          <div className="flex items-center gap-6 mb-8 pb-6 border-b-4 border-[#2D2A26]">
            <div className="w-24 h-24 bg-[#f5f2e8] border-4 border-[#2D2A26] shadow-brutal shrink-0">
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile?.id}`}
                alt="Current Avatar"
                className="w-full h-full object-cover aspect-square p-1"
              />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Identity Matrix</h2>
              <p className="font-bold text-xs uppercase opacity-60 tracking-widest mt-1">Select an icon or provide a custom image URL</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Custom URL Input */}
            <div>
              <p className="text-[10px] font-black uppercase mb-2">Custom Image URL</p>
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

            {/* Pixel Grid */}
            <div>
              <p className="text-[10px] font-black uppercase mb-3">Or choose a retro profile</p>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {AVATAR_SEEDS.map((seed) => {
                  const url = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                  const isSelected = profile?.avatar_url === url;
                  
                  return (
                    <button 
                      key={seed} 
                      onClick={() => updateAvatar(url)} 
                      className={`aspect-square border-2 transition-all flex items-center justify-center p-1 ${
                        isSelected 
                          ? "border-red-600 bg-red-100 translate-y-[1px] translate-x-[1px]" 
                          : "border-[#2D2A26] bg-white hover:bg-[#86efac] shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                      }`}
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

        {/* SKILLS CONFIGURATION */}
        <section className="paper-texture border-4 border-[#2D2A26] shadow-brutal-lg p-8">
          <div className="mb-6 pb-4 border-b-4 border-[#2D2A26]">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Personnel Skills</h2>
            <p className="font-bold text-xs uppercase opacity-60 tracking-widest mt-1">Manage your operational capabilities</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 min-h-[48px] p-4 bg-white/50 border-2 border-[#2D2A26]/20">
            {(profile?.skills || []).length === 0 ? (
              <p className="text-xs font-bold uppercase opacity-30 flex items-center">No skills logged</p>
            ) : (
              (profile?.skills || []).map((skill) => (
                <span key={skill} className="group flex items-center gap-1.5 px-3 py-1.5 bg-[#2D2A26] text-white text-[10px] font-black uppercase border-2 border-[#2D2A26] shadow-sm">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="opacity-40 hover:opacity-100 hover:text-red-400 transition-colors">
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
              onKeyDown={(e) => { if (e.key === "Enter") addSkill(); }}
              placeholder="E.g. React, Logistics, DevOps..."
              className="flex-1 border-2 border-[#2D2A26] px-4 py-3 text-[12px] font-bold uppercase bg-white outline-none shadow-brutal-sm"
            />
            <button onClick={addSkill} className="px-6 bg-[#86efac] text-[#2D2A26] border-2 border-[#2D2A26] hover:bg-[#ffbb00] transition-all shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2 font-black text-[10px] uppercase">
              <Plus size={14} strokeWidth={3} /> Add
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
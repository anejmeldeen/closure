'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bell, Link as LinkIcon, ArrowLeft, Check, Save } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/utils/supabase';
import type { Profile } from '@/types/index';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'link-accounts'>('profile');
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Profile Form State
  const [nameInput, setNameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
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
        setNameInput(data.full_name || "");
        setAvatarInput(data.avatar_url || "");
      }
      setLoading(false);
    };
    loadUser();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!profile || !nameInput.trim()) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        full_name: nameInput.trim(),
        avatar_url: avatarInput.trim() || null
      })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, full_name: nameInput.trim(), avatar_url: avatarInput.trim() });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setIsSaving(false);
  };

  const handleConnect = (provider: 'google') => {
    if (!profile) return;
    window.location.href = `/api/auth/connect?provider=${provider}&profileId=${profile.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen cork-texture flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2D2A26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen cork-texture font-sans text-[#2D2A26] flex flex-col">
      {/* Top Navigation */}
      <nav className="paper-texture bg-[#f5f2e8] border-b-2 border-[#2D2A26] px-8 py-4 flex items-center sticky top-0 z-40 shadow-md">
        <Link 
          href="/" 
          className="mr-6 p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all bg-white"
        >
          <ArrowLeft size={18} strokeWidth={3} />
        </Link>
        <h1 className="text-xl font-black tracking-tighter uppercase">Settings</h1>
      </nav>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-3">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 border-2 border-[#2D2A26] font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === 'profile' 
                  ? 'bg-[#2D2A26] text-white shadow-none translate-x-0.5 translate-y-0.5' 
                  : 'bg-white text-[#2D2A26] shadow-brutal hover:bg-[#f5f2e8]'
              }`}
            >
              <User size={16} strokeWidth={3} /> Profile
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 border-2 border-[#2D2A26] font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === 'notifications' 
                  ? 'bg-[#2D2A26] text-white shadow-none translate-x-0.5 translate-y-0.5' 
                  : 'bg-white text-[#2D2A26] shadow-brutal hover:bg-[#f5f2e8]'
              }`}
            >
              <Bell size={16} strokeWidth={3} /> Notifications
            </button>
            <button 
              onClick={() => setActiveTab('link-accounts')}
              className={`w-full flex items-center gap-3 px-4 py-3 border-2 border-[#2D2A26] font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === 'link-accounts' 
                  ? 'bg-[#2D2A26] text-white shadow-none translate-x-0.5 translate-y-0.5' 
                  : 'bg-white text-[#2D2A26] shadow-brutal hover:bg-[#f5f2e8]'
              }`}
            >
              <LinkIcon size={16} strokeWidth={3} /> Link Accounts
            </button>
          </nav>
        </aside>

        {/* Tab Content Area */}
        <div className="flex-1 paper-texture bg-white border-2 border-[#2D2A26] shadow-brutal p-8 md:p-10">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-8 pb-4 border-b-2 border-[#2D2A26]">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Profile Settings</h2>
                <p className="text-[10px] font-bold opacity-50 uppercase mt-1">Update your identity card</p>
              </div>

              <div className="flex flex-col md:flex-row gap-8 mb-8">
                {/* Avatar Preview */}
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="relative w-32 h-32 bg-[#f5f2e8] border-4 border-[#2D2A26] shadow-brutal overflow-hidden flex items-center justify-center">
                    {avatarInput ? (
                      <Image 
                        src={avatarInput} 
                        alt="Avatar preview" 
                        fill 
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="font-black text-4xl opacity-20 uppercase">
                        {nameInput.slice(0, 2) || "ME"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase opacity-40">Preview</span>
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full border-2 border-[#2D2A26] px-4 py-3 text-sm font-bold uppercase bg-[#f5f2e8] outline-none shadow-brutal-sm focus:bg-white transition-colors"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-2">
                      Avatar Image URL
                    </label>
                    <input
                      type="text"
                      value={avatarInput}
                      onChange={(e) => setAvatarInput(e.target.value)}
                      className="w-full border-2 border-[#2D2A26] px-4 py-3 text-[10px] font-bold bg-[#f5f2e8] outline-none shadow-brutal-sm focus:bg-white transition-colors placeholder:uppercase"
                      placeholder="https://example.com/your-image.jpg"
                    />
                    <p className="text-[9px] font-bold opacity-40 uppercase mt-2">
                      Leave blank to use an auto-generated avatar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 border-t-2 border-[#2D2A26] pt-6">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black text-xs uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={16} strokeWidth={3} />
                  )}
                  Save Profile
                </button>
                
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                    <Check size={14} strokeWidth={3} /> Saved
                  </span>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-8 pb-4 border-b-2 border-[#2D2A26]">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Comms Array</h2>
                <p className="text-[10px] font-bold opacity-50 uppercase mt-1">Manage incoming signals</p>
              </div>
              <div className="p-6 border-2 border-dashed border-[#2D2A26]/30 bg-[#f5f2e8] text-center">
                <p className="font-black text-xs uppercase opacity-40">Notification hooks offline.</p>
              </div>
            </div>
          )}

          {/* LINK ACCOUNTS TAB */}
          {activeTab === 'link-accounts' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-8 pb-4 border-b-2 border-[#2D2A26]">
                <h2 className="text-2xl font-black uppercase tracking-tighter">External Integrations</h2>
                <p className="text-[10px] font-bold opacity-50 uppercase mt-1">Sync third-party data streams</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-2 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal-sm gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border-2 border-[#2D2A26] text-red-600 flex items-center justify-center font-black text-xl shadow-brutal-sm shrink-0">
                      G
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-tight">Google Calendar</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Syncs your Google Workspace schedule</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnect('google')}
                    className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-[#2D2A26] text-[10px] font-black uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all shrink-0"
                  >
                    Connect API
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
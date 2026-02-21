'use client';

import { useState } from 'react';
import { User, Bell, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'link-accounts'>('link-accounts');

  // In a real app, you would fetch the logged-in user's profile ID from Supabase Auth
  // Hardcoding for this example so the OAuth flow has an ID to attach to
  const currentProfileId = '123e4567-e89b-12d3-a456-426614174000'; 

  const handleConnect = (provider: 'google' | 'microsoft') => {
    window.location.href = `/api/auth/connect?provider=${provider}&profileId=${currentProfileId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 p-4 flex items-center shadow-sm">
        <Link href="/" className="mr-6 text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </nav>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex gap-8">
        {/* Sidebar Tabs */}
        <aside className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors text-left ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User size={18} /> Profile
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors text-left ${
                activeTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Bell size={18} /> Notifications
            </button>
            <button 
              onClick={() => setActiveTab('link-accounts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors text-left ${
                activeTab === 'link-accounts' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LinkIcon size={18} /> Link Accounts
            </button>
          </nav>
        </aside>

        {/* Tab Content Area */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Profile Settings</h2>
              <p className="text-gray-500 text-sm">Update your name, avatar, and role here.</p>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Notification Preferences</h2>
              <p className="text-gray-500 text-sm">Manage how you receive team updates.</p>
            </div>
          )}

          {activeTab === 'link-accounts' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-xl font-bold mb-2">Connected Accounts</h2>
              <p className="text-gray-500 text-sm mb-8">
                Connect your work calendars so the team can accurately see your free/busy schedule.
              </p>

              <div className="space-y-4 max-w-md">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">G</div>
                    <div>
                      <p className="font-medium">Google Calendar</p>
                      <p className="text-xs text-gray-500">Syncs your Google Workspace schedule</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnect('google')}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Connect
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">M</div>
                    <div>
                      <p className="font-medium">Microsoft Outlook</p>
                      <p className="text-xs text-gray-500">Syncs your Office 365 schedule</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnect('microsoft')}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Connect
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
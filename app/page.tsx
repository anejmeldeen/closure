'use client';

import { useState } from 'react';
import { Users, LayoutDashboard, MessageSquare } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'staff' | 'whiteboard' | 'messaging'>('staff');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans">
      
      {/* Simple Top Navigation */}
      <nav className="bg-white border-b border-gray-200 p-4 flex items-center shadow-sm">
        <h1 className="text-2xl font-bold mr-10 tracking-tight">NAME</h1>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'staff' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={18} /> Staff Coverage
          </button>
          
          <button 
            onClick={() => setActiveTab('whiteboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'whiteboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard size={18} /> Whiteboards
          </button>
          
          <button 
            onClick={() => setActiveTab('messaging')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'messaging' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageSquare size={18} /> Messages
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        
        {/* 1. STAFF TAB */}
        {activeTab === 'staff' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold">Staff Directory & Coverage</h2>
              <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded shadow-sm hover:bg-blue-700 transition-colors">
                Run Reassignment (WIP)
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-500 mb-4 text-sm">TODO: Wire up Supabase to fetch team status and capacity.</p>
              
              {/* Barebones mock list to show teammate */}
              <ul className="space-y-3">
                <li className="p-4 bg-gray-50 border rounded-md flex justify-between items-center">
                  <div>
                    <span className="font-semibold block">Sarah Jenkins</span>
                    <span className="text-xs text-gray-500">Frontend Engineer</span>
                  </div>
                  <span className="text-sm font-medium text-green-700 bg-green-100 px-2 py-1 rounded">Online</span>
                </li>
                <li className="p-4 bg-gray-50 border rounded-md flex justify-between items-center opacity-70">
                  <div>
                    <span className="font-semibold block">Marcus Chen</span>
                    <span className="text-xs text-gray-500">Backend Engineer</span>
                  </div>
                  <span className="text-sm font-medium text-red-700 bg-red-100 px-2 py-1 rounded">OOO - Sick</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* 2. WHITEBOARD TAB */}
        {activeTab === 'whiteboard' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-6">Project Whiteboards</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-500 mb-6 text-sm">TODO: Integrate Tldraw canvas grid and sync previous project files here.</p>
              <button className="px-4 py-2 bg-gray-900 text-white font-medium rounded shadow-sm hover:bg-gray-800 transition-colors">
                + New Whiteboard
              </button>
            </div>
          </div>
        )}

        {/* 3. MESSAGING TAB */}
        {activeTab === 'messaging' && (
          <div className="animate-in fade-in duration-300 h-[calc(100vh-12rem)] flex flex-col">
            <h2 className="text-2xl font-bold mb-6">Team Messages</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col">
              {/* Chat History Area */}
              <div className="flex-1 bg-gray-50 rounded-md border border-gray-200 p-4 mb-4 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No messages yet. Wire up Supabase real-time subscriptions here.</p>
              </div>
              
              {/* Chat Input */}
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Type a message to the team..." 
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded shadow-sm hover:bg-blue-700 transition-colors">
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
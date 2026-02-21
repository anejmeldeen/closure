'use client';

import { useState } from 'react';
// 1. Add Settings to your lucide-react import
import { Users, LayoutDashboard, MessageSquare, Calendar, X, Settings } from 'lucide-react';
// 2. Import the Next.js Link component
import Link from 'next/link';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'staff' | 'whiteboard' | 'messaging'>('staff');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans overflow-x-hidden">
      
      {/* 3. Updated Top Navigation */}
      <nav className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
        
        {/* Left Side: Logo and Tabs */}
        <div className="flex items-center">
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
        </div>

        {/* Right Side: Settings Button */}
        <Link 
          href="/settings"
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          title="Settings"
        >
          <Settings size={20} />
        </Link>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full relative">
        
        {/* 1. STAFF TAB */}
        {activeTab === 'staff' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold">Staff Directory & Coverage</h2>
              <div className="flex gap-3">
                {/* Button to open the calendar drawer */}
                <button 
                  onClick={() => setIsCalendarOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <Calendar size={18} /> View Schedule
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded shadow-sm hover:bg-blue-700 transition-colors">
                  Run Reassignment (WIP)
                </button>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <p className="text-gray-500 mb-4 text-sm">TODO: Wire up Supabase to fetch team status and capacity.</p>
              
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
              <div className="flex-1 bg-gray-50 rounded-md border border-gray-200 p-4 mb-4 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No messages yet. Wire up Supabase real-time subscriptions here.</p>
              </div>
              
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

      {/* --- PULL-OUT CALENDAR DRAWER --- */}
      {/* Background Overlay */}
      {isCalendarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setIsCalendarOpen(false)}
        />
      )}
      
      {/* Sliding Tab */}
      <div 
        className={`fixed top-0 right-0 h-full w-[450px] bg-gray-50 shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isCalendarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              Team Schedule
            </h2>
            <button 
              onClick={() => setIsCalendarOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <AvailabilityCalendar employeeIds={['emp_1', 'emp_2']} />
          </div>
        </div>
      </div>

    </div>
  );
}
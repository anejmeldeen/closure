'use client'
import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        alert(signUpError.message)
        setLoading(false)
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) alert(signInError.message)
      else router.push('/')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else router.push('/')
    }
    setLoading(false)
  }

  return (
    // The Corkboard Background
    <div className="relative flex min-h-screen items-center justify-center cork-texture font-sans overflow-hidden p-6">
      
      {/* ========================================= */}
      {/* THE CORPORATE CHAOS BACKGROUND (Low Z-Index)*/}
      {/* Distributed evenly across the edges */}
      {/* ========================================= */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* 1. TOP-LEFT: Printed Email Thread with Coffee Stain */}
        <div className="absolute top-[2%] left-[2%] md:top-[5%] md:left-[4%] w-64 h-80 bg-white shadow-md rotate-[-8deg] p-6 border border-gray-200 hidden sm:block">
          <div className="absolute top-12 left-12 w-20 h-20 rounded-full border-[6px] border-[#6b4423]/20 mix-blend-multiply"></div> 
          <div className="w-8 h-3 bg-red-500/80 mb-4 rounded-sm"></div> 
          <div className="space-y-2 opacity-30">
            <div className="w-full h-2 bg-gray-800 rounded-full"></div>
            <div className="w-5/6 h-2 bg-gray-800 rounded-full"></div>
            <div className="w-full h-2 bg-gray-800 rounded-full"></div>
            <div className="w-2/3 h-2 bg-gray-800 rounded-full mb-6"></div>
            <div className="pl-4 border-l-2 border-gray-300 space-y-2">
              <div className="w-full h-2 bg-gray-600 rounded-full"></div>
              <div className="w-4/5 h-2 bg-gray-600 rounded-full"></div>
            </div>
          </div>
          <div className="absolute top-2 right-1/2 w-4 h-4 rounded-full bg-blue-600 shadow-sm"></div> 
        </div>

        {/* 2. MIDDLE-LEFT: A Totally Ruined Calendar */}
        <div className="absolute top-[55%] left-[-2%] md:left-[15%] -translate-y-1/2 w-64 h-64 bg-white shadow-lg -rotate-6 p-4">
          <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-purple-600 shadow-sm"></div> 
          <div className="w-full h-8 bg-red-600 mb-2 rounded-sm flex items-center justify-center">
             <div className="w-1/2 h-2 bg-white/50 rounded-full"></div>
          </div>
          <div className="grid grid-cols-7 gap-1 h-40">
            {Array.from({length: 35}).map((_, i) => (
              <div key={i} className="border border-gray-200 p-1">
                {i % 3 === 0 && <div className="w-full h-1 bg-blue-400 mb-0.5"></div>}
                {i % 4 === 0 && <div className="w-full h-1 bg-red-500 mb-0.5"></div>}
                {i % 5 === 0 && <div className="w-full h-1 bg-yellow-500"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* 3. BOTTOM-LEFT: Frantic Yellow Sticky */}
        <div className="absolute bottom-[2%] left-[5%] md:bottom-[8%] md:left-[8%] w-40 h-40 bg-[#FFEB3B] shadow-md rotate-12 p-4">
          <div className="absolute top-2 left-1/2 w-3 h-3 rounded-full bg-red-600 shadow-sm"></div> 
          <div className="mt-4 w-full h-3 bg-red-600/60 rounded-sm mb-2 transform -rotate-2"></div> 
          <div className="w-3/4 h-2 bg-gray-800/40 rounded-full mb-1"></div>
          <div className="w-5/6 h-2 bg-gray-800/40 rounded-full mb-1"></div>
          <div className="w-1/2 h-2 bg-gray-800/40 rounded-full"></div>
        </div>

        {/* 4. TOP-RIGHT: The Nightmare Spreadsheet Printout */}
        <div className="absolute top-[2%] right-[-5%] md:top-[6%] md:right-[5%] w-80 h-96 bg-white shadow-lg rotate-6 p-4 border border-gray-300 hidden md:block">
          <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-green-600 shadow-sm"></div> 
          <div className="w-1/3 h-4 bg-gray-300 mb-4 rounded-sm"></div>
          <div className="grid grid-cols-6 gap-1 opacity-20">
            {Array.from({length: 84}).map((_, i) => (
              <div key={i} className={`h-3 rounded-sm ${i % 7 === 0 ? 'bg-red-500' : 'bg-gray-800'}`}></div>
            ))}
          </div>
        </div>

        {/* 5. MIDDLE-RIGHT: Pink "WHILE YOU WERE OUT" Message Slip */}
        <div className="absolute top-[50%] right-[-5%] md:right-[2%] -translate-y-1/2 w-48 h-56 bg-pink-200 shadow-md -rotate-12 p-4 border-t-8 border-pink-400">
          <div className="w-3/4 h-4 bg-pink-500/50 mb-4 rounded-sm"></div>
          <div className="space-y-3 opacity-50">
            <div className="flex gap-2"><div className="w-4 h-4 border-2 border-gray-800"></div><div className="w-20 h-4 bg-gray-800 rounded-sm"></div></div>
            <div className="flex gap-2"><div className="w-4 h-4 border-2 border-gray-800 bg-gray-800"></div><div className="w-24 h-4 bg-red-600 rounded-sm"></div></div> 
            <div className="w-full h-1 border-b-2 border-dashed border-gray-400 my-2"></div>
            <div className="w-full h-2 bg-gray-800 rounded-full"></div>
            <div className="w-4/5 h-2 bg-gray-800 rounded-full"></div>
          </div>
        </div>

        {/* 6. BOTTOM-RIGHT: Overdue Invoice / Red Stamp */}
        <div className="absolute bottom-[2%] right-[2%] md:bottom-[5%] md:right-[15%] w-56 h-72 bg-[#F5F2E8] shadow-md rotate-[-6deg] p-6 border border-gray-300 hidden sm:block">
          <div className="absolute top-4 left-1/2 w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div> 
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-red-600 text-red-600 text-3xl font-black uppercase tracking-widest p-2 -rotate-12 opacity-80">
            PAST DUE
          </div>
          <div className="w-1/2 h-4 bg-gray-800/30 mb-8 rounded-sm"></div>
          <div className="space-y-4 opacity-30">
            <div className="flex justify-between"><div className="w-20 h-2 bg-gray-800"></div><div className="w-10 h-2 bg-gray-800"></div></div>
            <div className="flex justify-between"><div className="w-24 h-2 bg-gray-800"></div><div className="w-12 h-2 bg-gray-800"></div></div>
            <div className="w-full border-t-2 border-gray-800 my-2"></div>
            <div className="flex justify-between font-bold"><div className="w-16 h-3 bg-gray-800"></div><div className="w-16 h-3 bg-red-600"></div></div>
          </div>
        </div>

        {/* 7. TOP-CENTER: Peeking Blue Note */}
        <div className="absolute top-[5%] left-[50%] md:left-[35%] -translate-x-1/2 w-48 h-48 bg-blue-200 shadow-sm rotate-[-15deg] p-4">
          <div className="absolute top-2 right-4 w-3 h-3 rounded-full bg-orange-500 shadow-sm"></div> 
          <div className="mt-4 w-full h-2 bg-blue-800/40 rounded-full mb-2"></div>
          <div className="w-4/5 h-2 bg-blue-800/40 rounded-full mb-2"></div>
          <div className="w-full h-2 bg-blue-800/40 rounded-full"></div>
        </div>
      </div>

      {/* ========================================= */}
      {/* THE MAIN LOGIN FORM (Oasis of Calm, High Z-Index) */}
      {/* ========================================= */}
      <form 
        onSubmit={handleAuth} 
        className="relative z-50 w-full max-w-xl bg-[#F5F2E8] p-12 sm:p-16 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-[#2D2A26]/10"
      >
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#D97757] shadow-[2px_5px_5px_rgba(0,0,0,0.5)] border-[3px] border-[#A85A40] flex items-center justify-center z-50">
          <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-white/50 rounded-full"></div>
        </div>

        <div className="mb-12 text-center mt-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#2D2A26] tracking-tight">
            [TEMP NAME]
          </h1>
          <p className="text-[#2D2A26]/60 text-lg mt-4 font-medium">
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <label className="text-sm font-semibold text-[#2D2A26] ml-1 opacity-80">Email</label>
            <input
              type="email"
              required
              className="w-full mt-2 px-4 py-4 bg-[#F5F2E8] border-b-2 border-[#2D2A26]/20 text-[#2D2A26] text-lg placeholder-[#2D2A26]/30 focus:outline-none focus:border-[#D97757] focus:bg-[#F5F2E8] transition-all"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#2D2A26] ml-1 opacity-80">Password</label>
            <input
              type="password"
              required
              className="w-full mt-2 px-4 py-4 bg-[#F5F2E8] border-b-2 border-[#2D2A26]/20 text-[#2D2A26] text-lg placeholder-[#2D2A26]/30 focus:outline-none focus:border-[#D97757] focus:bg-[#F5F2E8] transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full mt-12 py-4 bg-[#2D2A26] text-[#F5F2E8] font-bold text-lg hover:bg-[#D97757] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 rounded-sm"
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>

        <p 
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-8 text-center text-sm font-medium text-[#2D2A26]/60 hover:text-[#D97757] cursor-pointer transition-colors underline decoration-transparent hover:decoration-[#D97757] underline-offset-4"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </p>
      </form>
    </div>
  )
}
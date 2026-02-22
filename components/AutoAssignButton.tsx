"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { Zap, RefreshCcw, CheckCircle2, X, AlertTriangle } from "lucide-react";
import type { Profile } from "@/types/index";

interface DbTask {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  estimated_hours: number;
}

interface AutoAssignButtonProps {
  boardId: string;
  task: DbTask;
  profiles: Profile[];
  onSuccess: (primaryId: string, collabs: string[], newDescription: string) => void;
}

export default function AutoAssignButton({ boardId, task, profiles, onSuccess }: AutoAssignButtonProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  // Holds the AI's suggestion BEFORE it hits the database
  const [pendingProposal, setPendingProposal] = useState<{ reasoning: string, team: any[], primaryId: string, collabIds: string[] } | null>(null);
  // Holds the final success state
  const [isApplied, setIsApplied] = useState(false);

  const handleFetchProposal = async () => {
    if (task.estimated_hours <= 0) {
      alert("Please set estimated hours greater than 0 before auto-assigning.");
      return;
    }

    setIsAssigning(true);
    setPendingProposal(null);
    setIsApplied(false);
    
    try {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().split('T')[0];

      const { data: availData } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("week_start_date", weekKey);

      const res = await fetch('/api/drawings/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawings: [task],
          allProfiles: profiles,
          allAvailability: availData || []
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const proposal = data.proposals[0];
      
      if (proposal && proposal.team && proposal.team.length > 0) {
        const sortedTeam = proposal.team.sort((a: any, b: any) => b.allocated_hours - a.allocated_hours);
        const primaryId = sortedTeam[0].id;
        const collabIds = sortedTeam.slice(1).map((t: any) => t.id);

        // DO NOT SAVE TO DB YET. Just hold it in state.
        setPendingProposal({
          reasoning: proposal.reasoning,
          team: sortedTeam,
          primaryId,
          collabIds
        });
      } else {
        alert("AI could not find available personnel. Check their capacity limits!");
      }
    } catch (err: any) {
      alert("AI Assignment Failed: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingProposal) return;
    
    const allocationText = `\n\n--- 🤖 AI ALLOCATION ---\n` +
      pendingProposal.team.map((t: any) => `• ${t.name}: ${t.allocated_hours} hrs`).join('\n') +
      `\n\nReasoning: ${pendingProposal.reasoning}`;
      
    const cleanDesc = (task.description || "").split('\n\n--- 🤖 AI ALLOCATION ---')[0];
    const newDesc = cleanDesc + allocationText;

    // NOW we update the Database!
    await supabase.from("drawings").update({
      assigned_to: pendingProposal.primaryId,
      collaborators: pendingProposal.collabIds,
      description: newDesc
    }).eq("id", boardId);

    // Update the UI on the main page
    onSuccess(pendingProposal.primaryId, pendingProposal.collabIds, newDesc);
    
    setPendingProposal(null);
    setIsApplied(true);
  };

  // 1. STATE: SUCCESS (Already applied to DB)
  if (isApplied) {
    return (
      <div className="mb-6 p-4 border-2 border-[#2D2A26] bg-[#86efac] shadow-brutal-sm flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#2D2A26]" strokeWidth={3} />
          <span className="font-black text-[10px] uppercase tracking-widest text-[#2D2A26]">Team Successfully Assigned</span>
        </div>
        <button onClick={() => setIsApplied(false)} className="opacity-50 hover:opacity-100 transition-opacity">
          <X size={14} strokeWidth={3} />
        </button>
      </div>
    );
  }

  // 2. STATE: PENDING APPROVAL (Waiting for user)
  if (pendingProposal) {
    return (
      <div className="mb-6 p-5 border-4 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal animate-in fade-in zoom-in-95 duration-300 relative">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-[#2D2A26]/20">
          <AlertTriangle size={18} className="text-[#ffbb00]" strokeWidth={3} />
          <h4 className="font-black text-[11px] uppercase tracking-widest text-[#2D2A26]">AI Proposal Review</h4>
        </div>
        
        <p className="text-sm font-bold leading-snug mb-4 text-[#2D2A26]">
          {pendingProposal.reasoning}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {pendingProposal.team.map(t => (
            <span key={t.id} className="px-2 py-1 bg-white border-2 border-[#2D2A26] text-[10px] font-black uppercase shadow-brutal-sm flex items-center gap-1">
              {t.name} <span className="opacity-40">|</span> {t.allocated_hours}H
            </span>
          ))}
        </div>

        {/* APPROVAL BUTTONS */}
        <div className="flex gap-3">
          <button 
            onClick={handleApprove}
            className="flex-1 py-2 bg-[#86efac] border-2 border-[#2D2A26] font-black text-[10px] uppercase tracking-widest shadow-brutal-sm hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} strokeWidth={3} /> Approve & Apply
          </button>
          <button 
            onClick={() => setPendingProposal(null)}
            className="flex-1 py-2 bg-white border-2 border-[#2D2A26] font-black text-[10px] uppercase tracking-widest shadow-brutal-sm hover:bg-red-100 hover:text-red-600 hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <X size={14} strokeWidth={3} /> Discard
          </button>
        </div>
      </div>
    );
  }

  // 3. STATE: DEFAULT BUTTON
  return (
    <button
      onClick={handleFetchProposal}
      disabled={isAssigning}
      className="flex items-center justify-center gap-2 w-full py-4 mb-6 bg-[#ffbb00] border-2 border-[#2D2A26] font-black text-[11px] uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0"
    >
      {isAssigning ? (
        <RefreshCcw size={16} className="animate-spin" />
      ) : (
        <Zap size={16} className="text-red-600 fill-current" />
      )}
      {isAssigning ? "Calculating optimal routing..." : "Auto-Assemble Team"}
    </button>
  );
}
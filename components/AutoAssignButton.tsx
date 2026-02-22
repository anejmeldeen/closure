"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { RefreshCcw, CheckCircle2, X, AlertTriangle, AlertOctagon } from "lucide-react";
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
  const [isApplying, setIsApplying] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<any>(null);
  const [isApplied, setIsApplied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFetchProposal = async () => {
    setErrorMsg(null);
    setPendingProposal(null);
    setIsApplied(false);

    if (task.estimated_hours <= 0) {
      setErrorMsg("Unit hours must be greater than 0.");
      return;
    }

    setIsAssigning(true);
    try {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().split('T')[0];

      const { data: availData } = await supabase.from("availability_slots").select("*").eq("week_start_date", weekKey);

      const res = await fetch('/api/drawings/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawings: [task], allProfiles: profiles, allAvailability: availData || [] })
      });
      
      const text = await res.text();
      if (text.includes("<!DOCTYPE")) throw new Error("Connection Failure: API unreachable.");
      const data = JSON.parse(text);
      if (data.proposals?.[0]?.team?.length > 0) {
        setPendingProposal(data.proposals[0]);
      } else {
        throw new Error("No capacity found across personnel.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingProposal) return;
    setIsApplying(true);
    try {
      const sortedTeam = pendingProposal.team.sort((a: any, b: any) => b.allocated_hours - a.allocated_hours);
      const primaryId = sortedTeam[0].id;
      const collabIds = sortedTeam.slice(1).map((t: any) => t.id);
      const newDesc = `${task.description}\n\n--- AI ALLOCATION ---\n` + 
                      sortedTeam.map((t: any) => `• ${t.name}: ${t.allocated_hours}h`).join('\n') + 
                      `\nReasoning: ${pendingProposal.reasoning}`;

      await supabase.from("drawings").update({ assigned_to: primaryId, collaborators: collabIds, description: newDesc }).eq("id", boardId);
      
      for (const member of sortedTeam) {
        const { data: p } = await supabase.from("profiles").select("task_hours_7d").eq("id", member.id).single();
        await supabase.from("profiles").update({ task_hours_7d: (p?.task_hours_7d || 0) + member.allocated_hours }).eq("id", member.id);
      }

      onSuccess(primaryId, collabIds, newDesc);
      setPendingProposal(null);
      setIsApplied(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsApplying(false);
    }
  };

  if (errorMsg) return (
    <div className="mb-6 p-3 border-2 border-[#2D2A26] bg-red-100 flex justify-between items-center animate-in zoom-in-95">
      <span className="text-[10px] font-black uppercase text-red-800">{errorMsg}</span>
      <button onClick={() => setErrorMsg(null)}><X size={14}/></button>
    </div>
  );

  if (pendingProposal) return (
    <div className="mb-6 p-4 border-2 border-[#2D2A26] bg-white shadow-brutal animate-in fade-in">
      <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Personnel Allocation Proposed</p>
      <p className="text-xs font-bold mb-4 leading-tight">{pendingProposal.reasoning}</p>
      <div className="flex gap-2">
        <button onClick={handleApprove} className="flex-1 py-2 bg-[#2D2A26] text-white font-black text-[10px] uppercase shadow-sm">Confirm Route</button>
        <button onClick={() => setPendingProposal(null)} className="flex-1 py-2 bg-white border-2 border-[#2D2A26] font-black text-[10px] uppercase shadow-sm">Discard</button>
      </div>
    </div>
  );

  return (
    <button 
      onClick={handleFetchProposal} 
      disabled={isAssigning} 
      className="w-full py-3 mb-6 bg-white border-2 border-[#2D2A26] font-black text-[10px] uppercase tracking-[0.2em] shadow-brutal-sm hover:bg-red-50 hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
    >
      {isAssigning ? (
        <RefreshCcw size={14} className="animate-spin inline mr-2" />
      ) : null}
      {isAssigning ? "Analyzing Assets..." : "Allocate Users"}
    </button>
  );
}
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import {
  RefreshCcw,
  CheckCircle2,
  X,
  AlertTriangle,
  Activity,
  User,
  Check,
} from "lucide-react";
import type { Profile } from "@/types/index";

interface BulkAutoAssignProps {
  tasks: any[];
  profiles: Profile[];
  onSuccess: (updates: any[]) => void;
}

export default function BulkAutoAssignButton({
  tasks,
  profiles,
  onSuccess,
}: BulkAutoAssignProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [pendingProposals, setPendingProposals] = useState<any[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isClosing, setIsClosing] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter logic: ignore placeholder projects and tasks already assigned
  const unassigned = tasks.filter(
    (t) =>
      !t.assigned_to &&
      t.status !== "done" &&
      t.title !== "UNTITLED_PROJECT" &&
      t.estimated_hours > 0,
  );

  useEffect(() => {
    if (pendingProposals) {
      setSelectedIds(new Set(pendingProposals.map((p) => p.drawingId)));
    }
  }, [pendingProposals]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleFetchBulk = async () => {
    if (unassigned.length === 0) return;
    setErrorMsg(null);
    setIsAssigning(true);
    try {
      const d = new Date();
      const monday = new Date(d.setDate(d.getDate() - d.getDay() + 1))
        .toISOString()
        .split("T")[0];
      const { data: avail } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("week_start_date", monday);

      const res = await fetch("/api/drawings/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawings: unassigned,
          allProfiles: profiles,
          allAvailability: avail || [],
        }),
      });
      const data = await res.json();
      setPendingProposals(data.proposals);
    } catch (err: any) {
      setErrorMsg("Allocation Interrupted: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleApproveSelected = async () => {
    if (!pendingProposals) return;
    setIsApplying(true);

    // Snapshot current proposals to prevent UI jitter during database sync
    const currentProposalsSnapshot = [...pendingProposals];
    const approvedProposals = currentProposalsSnapshot.filter((p) =>
      selectedIds.has(p.drawingId),
    );

    try {
      const updates = [];
      for (const prop of approvedProposals) {
        if (!prop.team?.length) continue;
        const sortedTeam = prop.team.sort(
          (a: any, b: any) => b.allocated_hours - a.allocated_hours,
        );
        const primaryId = sortedTeam[0].id;
        const collabs = sortedTeam.slice(1).map((t: any) => t.id);
        const originalTask = tasks.find((t) => t.id === prop.drawingId);

        // Removed robot emoji from description block as requested
        const desc =
          `${originalTask?.description || ""}\n\n--- ALLOCATION ---\n` +
          sortedTeam
            .map((t: any) => `• ${t.name}: ${t.allocated_hours}h`)
            .join("\n") +
          `\nReasoning: ${prop.reasoning}`;

        await supabase
          .from("drawings")
          .update({
            assigned_to: primaryId,
            collaborators: collabs,
            description: desc,
          })
          .eq("id", prop.drawingId);
        updates.push({
          id: prop.drawingId,
          assigned_to: primaryId,
          collaborators: collabs,
          description: desc,
        });

        for (const t of prop.team) {
          const { data: p } = await supabase
            .from("profiles")
            .select("task_hours_7d")
            .eq("id", t.id)
            .single();
          await supabase
            .from("profiles")
            .update({
              task_hours_7d: (p?.task_hours_7d || 0) + t.allocated_hours,
            })
            .eq("id", t.id);
        }
      }

      // Snap-Close: Dismiss modal before processing heavy state refresh
      setIsClosing(true);
      setPendingProposals(null);

      onSuccess(updates);

      setIsApplied(true);
      setTimeout(() => {
        setIsApplied(false);
        setIsClosing(false);
      }, 2000);
    } catch (err: any) {
      setErrorMsg("Commit Failed: " + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <button
        onClick={handleFetchBulk}
        disabled={isAssigning || unassigned.length === 0}
        className="group flex items-center gap-3 px-4 py-2 bg-white border-[3px] border-[#2D2A26] text-[11px] font-black uppercase tracking-wider shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-30 disabled:grayscale"
      >
        {isAssigning ? (
          <RefreshCcw size={14} className="animate-spin" />
        ) : (
          <div className="flex items-center justify-center bg-[#2D2A26] text-white w-5 h-5 text-[9px] font-mono shadow-sm group-hover:bg-red-600 transition-colors">
            {unassigned.length}
          </div>
        )}
        <span>{isAssigning ? "Analyzing..." : "Assign Open Tasks"}</span>
      </button>

      {/* --- CENTERED MODAL --- */}
      {((pendingProposals && !isClosing) || errorMsg || isApplied) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl paper-texture border-4 border-[#2D2A26] bg-white shadow-brutal-lg flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b-4 border-[#2D2A26] bg-white">
              <h4 className="font-black text-xl uppercase italic flex items-center gap-3">
                <Activity size={24} strokeWidth={3} />
                Assign Open Tasks
              </h4>
              <button
                onClick={() => setPendingProposals(null)}
                className="p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all bg-white"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#f5f2e8]/30">
              {pendingProposals && (
                <div className="space-y-6">
                  {pendingProposals.map((p, i) => {
                    const isSelected = selectedIds.has(p.drawingId);
                    return (
                      <div
                        key={i}
                        onClick={() => toggleSelection(p.drawingId)}
                        className={`p-5 bg-white border-2 transition-all cursor-pointer ${isSelected ? "border-[#2D2A26] opacity-100 shadow-brutal-sm" : "border-gray-300 opacity-50 grayscale shadow-none"}`}
                      >
                        <div className="flex justify-between items-start mb-3 border-b-2 border-[#2D2A26]/10 pb-2">
                          <p className="font-black text-xs uppercase">
                            {p.drawingName}
                          </p>
                          <div
                            className={`w-5 h-5 border-2 border-[#2D2A26] flex items-center justify-center ${isSelected ? "bg-[#2D2A26] text-white" : "bg-white"}`}
                          >
                            {isSelected && <Check size={14} strokeWidth={4} />}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {p.team?.map((member: any) => (
                            <span
                              key={member.id}
                              className="bg-[#2D2A26] text-white px-2 py-1 text-[9px] font-black uppercase flex items-center gap-1.5"
                            >
                              <User size={10} /> {member.name}{" "}
                              <span className="opacity-40">|</span>{" "}
                              {member.allocated_hours}H
                            </span>
                          ))}
                        </div>

                        <p className="text-[11px] font-bold text-gray-700 leading-relaxed italic border-l-4 border-[#2D2A26]/20 pl-3">
                          "{p.reasoning}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {pendingProposals && (
              <div className="p-6 border-t-4 border-[#2D2A26] bg-white flex gap-4 shrink-0">
                <button
                  onClick={handleApproveSelected}
                  disabled={isApplying || selectedIds.size === 0}
                  className="flex-1 py-4 bg-[#2D2A26] text-white font-black uppercase text-xs tracking-[0.2em] shadow-brutal hover:bg-black hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isApplying ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {isApplying
                    ? "Committing..."
                    : `Finalize ${selectedIds.size} Changes`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

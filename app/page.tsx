"use client";

import { useState, useEffect, MouseEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import {
  Users,
  LayoutDashboard,
  MessageSquare,
  Lock,
  Zap,
  LogOut,
  Calendar,
  X,
  Settings,
  Plus,
  FileText,
  Trash2,
  Clock,
  SquarePen,
  Search,
} from "lucide-react";

import { PremiumPaymentFlow } from "./premium-payment";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import Loader from "@/app/board/[id]/components/Loader";
import EmployeeCard from "@/components/EmployeeCard";
import { mockEmployees, employeeStatuses } from "@/lib/employees";
import { mockTasks } from "@/lib/tasks";
import type { Drawing, DbTask } from "@/types/index";

// --- TYPES ---
interface SupabaseUser {
  id: string;
  email?: string;
}

type TabType = "staff" | "whiteboard" | "messaging";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Instant Tab State
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "staff",
  );

  // App States
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Whiteboard Logic
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [editName, setEditName] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Task Management (Drawings are Tasks)
  const [boardTasks, setBoardTasks] = useState<Record<string, DbTask>>({}); // Each board is a task
  const [detailsModalOpen, setDetailsModalOpen] = useState<string | null>(null); // Task details modal
  const [priorityEditId, setPriorityEditId] = useState<string | null>(null); // Board ID for priority edit

  useEffect(() => {
    const init = async () => {
      const premium = localStorage.getItem("capacity_premium") === "true";
      setIsPremium(premium);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);
      const { data, error } = await supabase
        .from("drawings")
        .select("*")
        .eq("user_id", authUser.id)
        .order("last_modified", { ascending: false });

      let boardsToUse: Drawing[] = [];

      if (!error && data && data.length > 0) {
        boardsToUse = data as Drawing[];
      } else {
        // No boards in database - create mock boards from mockTasks
        boardsToUse = Object.keys(mockTasks).map((boardId) => ({
          id: boardId,
          user_id: authUser.id,
          name: mockTasks[boardId].title,
          completed: false,
          last_modified: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }));
      }

      setDrawings(boardsToUse);

      // Map tasks to boards from mockTasks
      const tasksForBoards: Record<string, DbTask> = {};

      boardsToUse.forEach((board) => {
        const mockTask = mockTasks[board.id];

        if (mockTask) {
          // Use the mockTask for this board, keeping board name
          tasksForBoards[board.id] = {
            ...mockTask,
            id: board.id,
            title: board.name,
          };
        } else {
          // Create default task if not in mockTasks
          tasksForBoards[board.id] = {
            id: board.id,
            title: board.name,
            description: board.name,
            priority: "Low",
            required_skills: [],
            assigned_to: "",
            collaborators: [],
            status: "not-started",
            estimated_hours: 0,
          };
        }
      });

      setBoardTasks(tasksForBoards);
      setLoading(false);
    };
    init();
  }, [router]);

  // Derived Data
  const filteredDrawings = drawings.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const incompleteDrawings = drawings.filter((d) => !d.completed);
  const recentDrawings = drawings.slice(0, 3);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `?tab=${tab}`);
  };

  const createNewDrawing = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("drawings")
      .insert({ user_id: user.id, name: "Untitled Project" })
      .select()
      .single();
    if (data) router.push(`/board/${data.id}?tab=whiteboard`);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const original = [...drawings];
    setDrawings((prev) => prev.filter((d) => d.id !== deleteTargetId));
    setDeleteTargetId(null);
    const { error } = await supabase
      .from("drawings")
      .delete()
      .eq("id", deleteTargetId);
    if (error) {
      alert("Delete failed");
      setDrawings(original);
    }
  };

  const saveRename = async () => {
    if (!editingId) return;
    const timestamp = new Date().toISOString();
    setDrawings(
      drawings.map((d) =>
        d.id === editingId
          ? { ...d, name: editName, last_modified: timestamp }
          : d,
      ),
    );
    setEditingId(null);
    await supabase
      .from("drawings")
      .update({ name: editName, last_modified: timestamp })
      .eq("id", editingId);
  };

  const toggleStatus = async (
    e: MouseEvent,
    id: string,
    currentStatus: boolean,
  ) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    setDrawings(
      drawings.map((d) => (d.id === id ? { ...d, completed: newStatus } : d)),
    );
    await supabase
      .from("drawings")
      .update({ completed: newStatus })
      .eq("id", id);
  };

  const addCollaboratorToTask = (boardId: string, employeeId: string) => {
    setBoardTasks((prev) => ({
      ...prev,
      [boardId]: {
        ...prev[boardId],
        collaborators: prev[boardId].collaborators?.includes(employeeId)
          ? prev[boardId].collaborators
          : [...(prev[boardId].collaborators || []), employeeId],
      },
    }));
  };

  const assignPrimaryPerson = (boardId: string, employeeId: string) => {
    setBoardTasks((prev) => ({
      ...prev,
      [boardId]: {
        ...prev[boardId],
        assigned_to: employeeId,
      },
    }));
  };

  const updateTaskPriority = (
    boardId: string,
    newPriority: "Low" | "Medium" | "High" | "Critical",
  ) => {
    setBoardTasks((prev) => ({
      ...prev,
      [boardId]: {
        ...prev[boardId],
        priority: newPriority,
      },
    }));
    setPriorityEditId(null);
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen cork-texture flex flex-col font-sans text-[#2D2A26]">
      {/* 1. TOP NAV (Now with Paper Texture) */}
      <nav className="paper-texture bg-[#f5f2e8] border-b-2 border-[#2D2A26] px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-12">
          <h1 className="text-2xl font-black tracking-tighter">CAPACITY</h1>

          <div className="flex gap-2">
            {(["staff", "whiteboard", "messaging"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                  activeTab === t
                    ? "bg-[#2D2A26] text-white shadow-brutal -translate-y-0.5"
                    : "text-gray-500 hover:bg-white/50 hover:text-[#2D2A26]"
                }`}
              >
                {t === "staff" && <Users size={16} />}
                {t === "whiteboard" && <LayoutDashboard size={16} />}
                {t === "messaging" && <MessageSquare size={16} />}
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/settings"
            className="p-2 hover:bg-white/50 rounded-full border border-transparent hover:border-[#2D2A26] transition-all"
          >
            <Settings size={20} />
          </Link>
          <button
            onClick={() => setShowPremiumModal(true)}
            className={`px-6 py-2 border-2 border-[#2D2A26] font-bold text-[10px] uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all ${isPremium ? "bg-[#86efac]" : "bg-[#ffbb00]"}`}
          >
            {isPremium ? "Premium" : "Upgrade"}
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="font-bold text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100"
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* 2. MAIN CONTENT AREA (Corkboard Background) */}
      <main className="flex-1 p-8 md:p-12 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-12 relative">
        {/* SIDEBAR (Pinned Notes Look - NO TILT) */}
        <aside className="w-full lg:w-72 flex flex-col gap-10 shrink-0 z-10">
          <div className="relative group paper-texture shadow-brutal-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="SEARCH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#f5f2e8] border-2 border-[#2D2A26] font-bold text-[10px] focus:outline-none placeholder:opacity-30"
            />
          </div>

          <div className="space-y-8">
            <div className="paper-texture p-6 border-2 border-[#2D2A26] shadow-brutal">
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Clock size={14} /> Recent
              </h3>
              <ul className="space-y-3">
                {recentDrawings.map((d) => (
                  <li
                    key={d.id}
                    onClick={() => router.push(`/board/${d.id}?tab=whiteboard`)}
                    className="text-sm font-bold hover:text-[#D97757] cursor-pointer truncate flex items-center gap-2"
                  >
                    <FileText size={14} className="opacity-30" /> {d.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper-texture p-6 border-2 border-[#2D2A26] shadow-brutal">
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <SquarePen size={14} /> Tasks
              </h3>
              <ul className="space-y-3">
                {incompleteDrawings.map((d) => (
                  <li
                    key={d.id}
                    onClick={() => router.push(`/board/${d.id}?tab=whiteboard`)}
                    className="text-sm font-bold hover:text-[#D97757] cursor-pointer truncate flex items-center gap-2"
                  >
                    <FileText size={14} className="opacity-30" /> {d.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <section className="flex-1 min-w-0 z-10">
          {/* STAFF TAB */}
          {activeTab === "staff" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex justify-between items-end mb-8">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                  Team Coverage
                </h2>
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className="px-6 py-3 border-2 border-[#2D2A26] bg-[#f5f2e8] font-bold text-[10px] uppercase shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  View Schedule
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <ul className="space-y-3">
                  {Object.entries(mockEmployees).map(
                    ([employeeId, employee]) => {
                      const statusInfo = employeeStatuses[employeeId] || {
                        status: "Offline",
                        statusColor: "gray" as const,
                        isInactive: false,
                      };
                      return (
                        <EmployeeCard
                          key={employeeId}
                          id={employeeId}
                          name={employee.full_name}
                          role={employee.role}
                          status={statusInfo.status}
                          statusColor={statusInfo.statusColor}
                          isInactive={statusInfo.isInactive}
                        />
                      );
                    },
                  )}
                </ul>

                <div
                  className={`paper-texture mt-8 p-10 border-2 border-[#2D2A26] shadow-brutal-lg ${isPremium ? "bg-white" : "bg-[#ffbb00]"}`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-[#2D2A26] text-white flex items-center justify-center border-2 border-[#2D2A26] shadow-brutal">
                        {isPremium ? <Zap size={28} /> : <Lock size={28} />}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tight">
                          Analytics Dashboard
                        </h3>
                        <p className="text-xs font-bold uppercase opacity-60">
                          Real-time team performance metrics
                        </p>
                      </div>
                    </div>
                    {isPremium ? (
                      <div className="flex gap-10">
                        <div className="text-center">
                          <p className="text-3xl font-black tracking-tighter">
                            92%
                          </p>
                          <p className="text-[10px] font-bold opacity-40 uppercase">
                            Availability
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-black tracking-tighter">
                            7.5h
                          </p>
                          <p className="text-[10px] font-bold opacity-40 uppercase">
                            Load Avg
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowPremiumModal(true)}
                        className="px-8 py-3 bg-[#2D2A26] text-white font-black text-[10px] uppercase shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                      >
                        Upgrade Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WHITEBOARD TAB */}
          {activeTab === "whiteboard" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-8">
                Project Boards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                <button
                  onClick={createNewDrawing}
                  className="h-64 border-2 border-dashed border-[#2D2A26]/30 bg-[#f5f2e8]/40 paper-texture flex flex-col items-center justify-center gap-4 hover:border-[#2D2A26] hover:bg-[#f5f2e8] transition-all group"
                >
                  <Plus
                    size={32}
                    className="text-gray-300 group-hover:text-[#2D2A26] transition-colors"
                  />
                  <span className="font-black text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100">
                    Add Project
                  </span>
                </button>

                {filteredDrawings.map((draw) => {
                  const task = boardTasks[draw.id];
                  if (!task) return null;

                  const assignedPerson = mockEmployees[task.assigned_to];
                  const collaboratorsList = (task.collaborators || [])
                    .map((id) => mockEmployees[id])
                    .filter(Boolean);

                  return (
                    <div
                      key={draw.id}
                      className="group paper-texture bg-[#f5f2e8] border-2 border-[#2D2A26] p-8 shadow-brutal-lg hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between relative"
                    >
                      {/* Priority Bar */}
                      <div
                        className={`absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-3 opacity-80 border border-[#2D2A26]/10 ${
                          task.priority === "Critical"
                            ? "bg-red-600"
                            : task.priority === "High"
                              ? "bg-orange-500"
                              : "bg-[#ffbb00]"
                        }`}
                      ></div>

                      {/* Header: Date + Status */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-[#2D2A26] text-white px-2 py-0.5 font-mono text-[9px] font-bold tracking-tighter">
                          {new Date(draw.last_modified).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) =>
                            toggleStatus(e, draw.id, draw.completed)
                          }
                          className={`w-5 h-5 border-2 border-[#2D2A26] flex items-center justify-center transition-colors ${draw.completed ? "bg-[#86efac]" : "bg-[#ffbb00]"}`}
                        >
                          {draw.completed && <X size={12} strokeWidth={4} />}
                        </button>
                      </div>

                      {/* Title & Priority */}
                      <div className="mb-4">
                        {editingId === draw.id ? (
                          <input
                            autoFocus
                            className="bg-transparent border-b-4 border-[#2D2A26] text-xl font-black outline-none uppercase w-full tracking-tighter"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.key === "Enter" && saveRename()}
                            onBlur={saveRename}
                          />
                        ) : (
                          <>
                            <h3
                              onClick={() =>
                                editingId !== draw.id &&
                                router.push(`/board/${draw.id}?tab=whiteboard`)
                              }
                              className="text-lg font-black leading-tight uppercase tracking-tighter cursor-pointer mb-2"
                            >
                              {draw.name}
                            </h3>
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-[10px] font-black uppercase tracking-widest ${
                                  task.priority === "Critical"
                                    ? "text-red-600"
                                    : task.priority === "High"
                                      ? "text-orange-600"
                                      : "text-gray-600"
                                }`}
                              >
                                {task.priority} Priority
                              </p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                                {task.estimated_hours}h est.
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Assigned Person */}
                      <div className="mb-4 p-3 bg-white/40 rounded border border-[#2D2A26]/20">
                        <p className="text-[8px] font-bold uppercase opacity-60 mb-1">
                          Primary
                        </p>
                        <p className="text-[11px] font-black text-gray-900">
                          {assignedPerson?.full_name || "Unassigned"}
                        </p>
                      </div>

                      {/* Collaborators */}
                      <div className="flex-1 mb-4">
                        {collaboratorsList.length > 0 ? (
                          <>
                            <p className="text-[8px] font-bold uppercase opacity-60 mb-2">
                              Collaborators
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {collaboratorsList.map((collab) => (
                                <span
                                  key={collab.id}
                                  className="text-[9px] font-bold bg-[#86efac] text-gray-900 px-2 py-1 rounded"
                                >
                                  {collab.full_name}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-[9px] opacity-40">
                            No collaborators yet
                          </p>
                        )}
                      </div>

                      {/* Add Person Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsModalOpen(draw.id);
                        }}
                        className="w-full py-2 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-[#2D2A26] transition-all mb-2"
                      >
                        + Details
                      </button>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-3 opacity-0 group-hover:opacity-100 transition-all pt-2 border-t border-[#2D2A26]/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPriorityEditId(draw.id);
                          }}
                          className={`text-[9px] font-black uppercase px-2 py-1 rounded ${
                            task.priority === "Critical"
                              ? "bg-red-600 text-white"
                              : task.priority === "High"
                                ? "bg-orange-500 text-white"
                                : "bg-[#ffbb00] text-gray-900"
                          }`}
                        >
                          {task.priority}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(draw.id);
                              setEditName(draw.name);
                            }}
                            className="text-[10px] font-black uppercase underline decoration-2 underline-offset-2"
                          >
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(draw.id);
                            }}
                            className="text-[#2D2A26] hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MESSAGING TAB */}
          {activeTab === "messaging" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-8">
                Team Chat
              </h2>
              <div className="h-[600px] paper-texture border-4 border-[#2D2A26] shadow-brutal-lg flex items-center justify-center">
                <p className="font-black text-[12px] uppercase tracking-[0.3em] opacity-20">
                  Secure Channel Offline
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 3. CALENDAR DRAWER (The Side Panel) */}
      {isCalendarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCalendarOpen(false)}
          />
          <div
            className={`fixed top-0 right-0 h-full w-full max-w-[550px] bg-[#f5f2e8] border-l-4 border-[#2D2A26] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isCalendarOpen ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="p-12 flex flex-col h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-12 border-b-4 border-[#2D2A26] pb-8">
                <h2 className="text-3xl font-black uppercase italic flex items-center gap-3">
                  <Calendar size={28} /> Schedules
                </h2>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="p-3 border-2 border-[#2D2A26] shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <AvailabilityCalendar employeeIds={user ? [user.id] : []} />
            </div>
          </div>
        </>
      )}

      {/* 4. DELETE MODAL (No Tilt) */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg">
            <h2 className="text-3xl font-black mb-4 uppercase italic">
              Delete Board?
            </h2>
            <p className="font-bold text-xs mb-10 uppercase opacity-60 tracking-widest">
              This operation is irreversible.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-4 border-2 border-[#2D2A26] font-black uppercase text-xs"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-4 bg-red-600 text-white border-2 border-[#2D2A26] font-black uppercase text-xs shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PREMIUM MODAL */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <Zap size={28} className="text-[#ffbb00]" />
              <h2 className="text-3xl font-black uppercase italic">Premium</h2>
            </div>
            <p className="font-bold text-xs mb-8 uppercase opacity-60 tracking-widest">
              Unlock advanced team analytics and forecasting.
            </p>

            <PremiumPaymentFlow
              onPaymentSuccess={() => {
                setIsPremium(true);
                setShowPremiumModal(false);
              }}
              isPremium={isPremium}
            />

            <button
              onClick={() => setShowPremiumModal(false)}
              className="w-full mt-6 py-3 border-2 border-[#2D2A26] font-bold uppercase text-[10px] hover:bg-white/50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL - ALL IN ONE PLACE */}
      {detailsModalOpen && boardTasks[detailsModalOpen] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div
            className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg max-h-[90vh] overflow-y-auto scale-100 opacity-100 transition-all duration-300"
            style={{
              animation: "popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <style>{`
              @keyframes popIn {
                from {
                  transform: scale(0.7);
                  opacity: 0;
                }
                to {
                  transform: scale(1);
                  opacity: 1;
                }
              }
            `}</style>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase italic max-w-xs">
                {boardTasks[detailsModalOpen]?.title}
              </h2>
              <button
                onClick={() => setDetailsModalOpen(null)}
                className="p-2 hover:bg-white/50 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* PRIORITY SELECTOR */}
            <div className="mb-8 pb-8 border-b-2 border-[#2D2A26]">
              <p className="text-xs font-bold mb-3 uppercase opacity-60">
                Priority
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(["Critical", "High", "Medium", "Low"] as const).map(
                  (priority) => (
                    <button
                      key={priority}
                      onClick={() =>
                        updateTaskPriority(detailsModalOpen, priority)
                      }
                      className={`p-2 border-2 border-[#2D2A26] rounded font-black text-[9px] uppercase tracking-tight transition-all ${
                        boardTasks[detailsModalOpen]?.priority === priority
                          ? priority === "Critical"
                            ? "bg-red-600 text-white"
                            : priority === "High"
                              ? "bg-orange-500 text-white"
                              : "bg-[#ffbb00] text-gray-900"
                          : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      {priority}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* ESTIMATED HOURS */}
            <div className="mb-8 pb-8 border-b-2 border-[#2D2A26]">
              <p className="text-xs font-bold mb-3 uppercase opacity-60">
                Estimated Hours
              </p>
              <input
                type="number"
                min="0"
                value={boardTasks[detailsModalOpen]?.estimated_hours || 0}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setBoardTasks((prev) => ({
                    ...prev,
                    [detailsModalOpen]: {
                      ...prev[detailsModalOpen],
                      estimated_hours: parseInt(e.target.value) || 0,
                    },
                  }));
                }}
                className="w-full p-2 border-2 border-[#2D2A26] font-bold text-xs bg-white"
              />
            </div>

            {/* TEAM MANAGEMENT - SINGLE INTERFACE */}
            <p className="text-xs font-bold mb-4 uppercase opacity-60">Team</p>

            <div className="space-y-2 mb-6">
              {Object.entries(mockEmployees).map(([empId, employee]) => {
                const task = boardTasks[detailsModalOpen];
                const isPrimary = task?.assigned_to === empId;
                const isCollaborator = task?.collaborators?.includes(empId);

                return (
                  <div
                    key={empId}
                    className="p-3 border-2 border-[#2D2A26] rounded bg-white flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase">
                        {employee.full_name}
                      </p>
                      <p className="text-[9px] opacity-60">{employee.role}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          assignPrimaryPerson(detailsModalOpen, empId)
                        }
                        className={`px-2 py-1 border border-[#2D2A26] rounded font-black text-[8px] uppercase transition-all ${
                          isPrimary
                            ? "bg-[#2D2A26] text-white"
                            : "bg-white hover:bg-gray-100"
                        }`}
                        title="Set as task lead"
                      >
                        Lead
                      </button>

                      <button
                        onClick={() => {
                          if (!isPrimary) {
                            addCollaboratorToTask(detailsModalOpen, empId);
                          }
                        }}
                        disabled={isPrimary}
                        className={`px-2 py-1 border border-[#2D2A26] rounded font-black text-[8px] uppercase transition-all ${
                          isPrimary
                            ? "opacity-50 cursor-not-allowed"
                            : isCollaborator
                              ? "bg-[#86efac] text-gray-900"
                              : "bg-white hover:bg-[#ffbb00]"
                        }`}
                        title="Add to team"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setDetailsModalOpen(null)}
              className="w-full py-3 border-2 border-[#2D2A26] font-bold uppercase text-[10px] hover:bg-white/50 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 7. PRIORITY SELECTOR MODAL */}
      {priorityEditId && boardTasks[priorityEditId] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase italic">
                Set Priority
              </h2>
              <button
                onClick={() => setPriorityEditId(null)}
                className="p-2 hover:bg-white/50 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-xs font-bold mb-6 uppercase opacity-60">
              Select a priority level for {boardTasks[priorityEditId]?.title}:
            </p>

            <div className="space-y-3 mb-8">
              {(["Critical", "High", "Medium", "Low"] as const).map(
                (priority) => (
                  <button
                    key={priority}
                    onClick={() => updateTaskPriority(priorityEditId, priority)}
                    className={`w-full p-4 border-2 border-[#2D2A26] rounded font-black text-left text-xs uppercase tracking-tight transition-all ${
                      boardTasks[priorityEditId]?.priority === priority
                        ? priority === "Critical"
                          ? "bg-red-600 text-white"
                          : priority === "High"
                            ? "bg-orange-500 text-white"
                            : "bg-[#ffbb00] text-gray-900"
                        : "bg-white hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{priority}</span>
                      {boardTasks[priorityEditId]?.priority === priority && (
                        <span className="ml-auto text-sm">✓</span>
                      )}
                    </div>
                  </button>
                ),
              )}
            </div>

            <button
              onClick={() => setPriorityEditId(null)}
              className="w-full py-3 border-2 border-[#2D2A26] font-bold uppercase text-[10px] hover:bg-white/50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Loader />}>
      <DashboardContent />
    </Suspense>
  );
}

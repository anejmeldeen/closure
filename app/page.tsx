"use client";

import { useState, useEffect, MouseEvent, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import {
  Users, LayoutDashboard, MessageSquare, Calendar, X, Settings, Plus, 
  FileText, Trash2, Clock, SquarePen, Search, Check, Send, UserPlus, Star, Menu,
} from "lucide-react";
import { startOfWeek, format } from "date-fns";

import { PremiumPaymentFlow } from "./premium-payment";
import TeamHeatmap from "@/components/TeamHeatmap";
import AutoAssignButton from "@/components/AutoAssignButton";
import BulkAutoAssignButton from "@/components/BulkAutoAssignButton";
import Loader from "@/app/board/[id]/components/Loader";
import Image from "next/image";
import type { Profile } from "@/types/index";

interface ChatRoom { id: string; name: string; type: string; }
interface ChatMessage { id: string; room_id: string; sender_id: string; content: string; created_at: string; profiles?: { full_name: string; avatar_url: string }; }
interface DbTask { id: string; title: string; description: string; priority: "Low" | "Medium" | "High" | "Critical"; required_skills: string[]; assigned_to: string | null; collaborators: string[]; status: "not-started" | "in_progress" | "done"; estimated_hours: number; due_date: string | null; }
interface Drawing { id: string; user_id: string; name: string; completed: boolean; last_modified: string; created_at: string; priority?: "Low" | "Medium" | "High" | "Critical"; assigned_to?: string | null; collaborators?: string[]; estimated_hours?: number; description?: string; status?: "not-started" | "in_progress" | "done"; due_date?: string | null; required_skills?: string[]; }

type TabType = "staff" | "tasks" | "messaging";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Time & Status Logic
  const currentDate = new Date();
  const weekKey = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const currentDay = format(currentDate, "EEE");
  const currentHour = currentDate.getHours();

  // App State
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get("tab") as TabType) || "staff");
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false); 

  // Modals
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [taskHeatmapOpenId, setTaskHeatmapOpenId] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Base Data States
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomMembers, setRoomMembers] = useState<Profile[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Task States
  const [boardTasks, setBoardTasks] = useState<Record<string, DbTask>>({});
  const [detailsModalOpen, setDetailsModalOpen] = useState<string | null>(null);
  const [priorityEditId, setPriorityEditId] = useState<string | null>(null);
  const [newSkillInput, setNewSkillInput] = useState("");

  // UI / Modal States
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [editName, setEditName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [whiteboardSubTab, setWhiteboardSubTab] = useState<"todo" | "completed">("todo");

  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTabRef = useRef<TabType>(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => {
    const init = async () => {
      const premium = localStorage.getItem("closure_premium") === "true";
      setIsPremium(premium);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);

      // NEW: Included availability_slots in the profiles fetch so we can see who is busy!
      const [profRes, drawRes, memberRes] = await Promise.all([
        supabase.from("profiles").select("*, availability_slots(busy_slots, days_off, week_start_date)").order("full_name", { ascending: true }),
        supabase.from("drawings").select("*").order("last_modified", { ascending: false }),
        supabase.from("chat_room_members").select("chat_rooms(*)").eq("user_id", authUser.id),
      ]);

      if (profRes.data) {
        setProfiles(profRes.data as Profile[]);
        setUserProfile((profRes.data as Profile[]).find((p) => p.id === authUser.id) || null);
      }

      const fetchedDrawings = drawRes.data ? (drawRes.data as Drawing[]) : [];
      setDrawings(fetchedDrawings);

      if (memberRes.data) {
        const joinedRooms = memberRes.data.map((m) => m.chat_rooms).filter(Boolean) as ChatRoom[];
        setRooms(joinedRooms);
        if (joinedRooms.length > 0) setSelectedRoom(joinedRooms[0].id);
      }

      const tasksForBoards: Record<string, DbTask> = {};
      fetchedDrawings.forEach((board) => {
        tasksForBoards[board.id] = {
          id: board.id, title: board.name, description: board.description || "", priority: board.priority || "Low", required_skills: board.required_skills || [], assigned_to: board.assigned_to || null, collaborators: board.collaborators || [], status: board.status || (board.completed ? "done" : "not-started"), estimated_hours: board.estimated_hours || 0, due_date: board.due_date || null,
        };
      });

      setBoardTasks(tasksForBoards);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (!selectedRoom || !user) return;
    const fetchChannelData = async () => {
      const { data: msgs } = await supabase.from("chat_messages").select("*, profiles(full_name, avatar_url)").eq("room_id", selectedRoom).order("created_at", { ascending: true });
      if (msgs) {
        setMessages(msgs as any[]);
        if (activeTabRef.current === "messaging") localStorage.setItem(`closure_last_read_${user.id}`, new Date().toISOString());
      }
      const { data: members } = await supabase.from("chat_room_members").select("profiles(*)").eq("room_id", selectedRoom);
      if (members) setRoomMembers(members.map((m) => m.profiles) as unknown as Profile[]);
    };
    fetchChannelData();
    const interval = setInterval(fetchChannelData, 3000);
    return () => clearInterval(interval);
  }, [selectedRoom, user]);

  useEffect(() => {
    if (!user || rooms.length === 0) return;
    const checkUnread = async () => {
      if (activeTabRef.current === "messaging") {
        setHasUnread(false);
        localStorage.setItem(`closure_last_read_${user.id}`, new Date().toISOString());
        return;
      }
      const lastReadIso = localStorage.getItem(`closure_last_read_${user.id}`);
      if (!lastReadIso) {
        localStorage.setItem(`closure_last_read_${user.id}`, new Date().toISOString());
        return;
      }
      const roomIds = rooms.map((r) => r.id);
      const { data } = await supabase.from("chat_messages").select("id").in("room_id", roomIds).neq("sender_id", user.id).gt("created_at", lastReadIso).limit(1);
      if (data && data.length > 0) setHasUnread(true);
    };
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [user, rooms]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "messaging" && user) {
      setHasUnread(false);
      localStorage.setItem(`closure_last_read_${user.id}`, new Date().toISOString());
    }
    window.history.replaceState(null, "", `?tab=${tab}`);
    setMobileMenuOpen(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user) return;
    const content = newMessage.trim();
    setNewMessage("");
    const optimisticMsg: ChatMessage = { id: Math.random().toString(), room_id: selectedRoom, sender_id: user.id, content, created_at: new Date().toISOString(), profiles: { full_name: user.user_metadata?.full_name || "Personnel", avatar_url: "" } };
    setMessages((prev) => [...prev, optimisticMsg]);
    await supabase.from("chat_messages").insert({ room_id: selectedRoom, sender_id: user.id, content });
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    const { data } = await supabase.from("chat_rooms").insert({ name: newRoomName.trim(), type: "private" }).select().single();
    if (data) {
      await supabase.from("chat_room_members").insert({ room_id: data.id, user_id: user.id });
      setRooms((prev) => [...prev, data]);
      setSelectedRoom(data.id);
      setIsCreateRoomOpen(false);
      setNewRoomName("");
    }
  };

  const addUserToRoom = async (profileId: string) => {
    if (!selectedRoom) return;
    const { error } = await supabase.from("chat_room_members").insert({ room_id: selectedRoom, user_id: profileId });
    if (!error) {
      const addedProfile = profiles.find((p) => p.id === profileId);
      if (addedProfile) setRoomMembers((prev) => [...prev, addedProfile]);
    }
  };

  const createNewDrawing = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("drawings").insert({ user_id: user.id, name: "UNTITLED_PROJECT", priority: "Low", estimated_hours: 0, collaborators: [], completed: false, last_modified: new Date().toISOString() }).select().single();
    if (error) return alert("Error creating board: " + error.message);
    if (data) {
      setDrawings((prev) => [data as Drawing, ...prev]);
      setBoardTasks((prev) => ({ ...prev, [data.id]: { id: data.id, title: data.name, description: data.name, priority: "Low", required_skills: [], assigned_to: null, collaborators: [], status: "not-started", estimated_hours: 0, due_date: null } }));
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const original = [...drawings];
    setDrawings((prev) => prev.filter((d) => d.id !== deleteTargetId));
    setDeleteTargetId(null);
    const { error } = await supabase.from("drawings").delete().eq("id", deleteTargetId);
    if (error) { alert("Action denied"); setDrawings(original); }
  };

  const toggleStatus = async (e: MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    setDrawings(drawings.map((d) => (d.id === id ? { ...d, completed: newStatus } : d)));
    await supabase.from("drawings").update({ completed: newStatus }).eq("id", id);
  };

  const toggleCollaborator = async (boardId: string, employeeId: string) => {
    const task = boardTasks[boardId];
    const isCollab = task.collaborators?.includes(employeeId);
    const newCollabs = isCollab ? task.collaborators.filter((id) => id !== employeeId) : [...(task.collaborators || []), employeeId];
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...task, collaborators: newCollabs } }));
    await supabase.from("drawings").update({ collaborators: newCollabs }).eq("id", boardId);
  };

  const togglePrimaryPerson = async (boardId: string, employeeId: string) => {
    const newAssigned = boardTasks[boardId].assigned_to === employeeId ? null : employeeId;
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...prev[boardId], assigned_to: newAssigned } }));
    await supabase.from("drawings").update({ assigned_to: newAssigned }).eq("id", boardId);
  };

  const updateTaskPriority = async (boardId: string, newPriority: "Low" | "Medium" | "High" | "Critical") => {
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...prev[boardId], priority: newPriority } }));
    setPriorityEditId(null);
    await supabase.from("drawings").update({ priority: newPriority }).eq("id", boardId);
  };

  const updateTaskHours = async (boardId: string, hours: number) => {
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...prev[boardId], estimated_hours: hours } }));
    await supabase.from("drawings").update({ estimated_hours: hours }).eq("id", boardId);
  };

  const updateBoardName = async (boardId: string, newName: string) => {
    setDrawings(drawings.map((d) => (d.id === boardId ? { ...d, name: newName } : d)));
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...prev[boardId], title: newName } }));
    await supabase.from("drawings").update({ name: newName }).eq("id", boardId);
  };

  const updateTaskDescription = async (boardId: string, description: string) => {
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...prev[boardId], description } }));
    await supabase.from("drawings").update({ description }).eq("id", boardId);
  };

  const updateTaskDueDate = async (boardId: string, due_date: string | null) => {
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...prev[boardId], due_date } }));
    await supabase.from("drawings").update({ due_date }).eq("id", boardId);
  };

  const updateTaskSkills = async (boardId: string, required_skills: string[]) => {
    setBoardTasks((prev) => ({ ...prev, [boardId]: { ...prev[boardId], required_skills } }));
    await supabase.from("drawings").update({ required_skills }).eq("id", boardId);
  };

  const getDueDateBadge = (due_date: string | null, isCompleted: boolean) => {
    if (!due_date || isCompleted) return null;
    const diffDays = Math.ceil((new Date(due_date).getTime() - new Date().getTime()) / 86400000);
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "bg-red-600 text-white" };
    if (diffDays === 0) return { label: "Due today", color: "bg-orange-500 text-white" };
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: "bg-[#ffbb00] text-gray-900" };
    return { label: `${diffDays}d left`, color: "bg-white text-gray-700 border border-[#2D2A26]/30" };
  };

  const filteredDrawings = drawings.filter((d) => {
    const matches = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (whiteboardSubTab === "todo") return matches && !d.completed;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return matches && d.completed && new Date(d.last_modified) > sevenDaysAgo;
  });

  const incompleteDrawings = drawings.filter((d) => !d.completed);
  const addablePersonnel = profiles.filter((p) => !roomMembers.some((m) => m.id === p.id));

  const getTaskPersonnel = (boardId: string | null) => {
    if (!boardId) return [];
    const task = boardTasks[boardId];
    if (!task) return [];
    const personnelIds = new Set<string>();
    if (task.assigned_to) personnelIds.add(task.assigned_to);
    if (task.collaborators) task.collaborators.forEach((id) => personnelIds.add(id));
    return Array.from(personnelIds);
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen cork-texture flex flex-col font-sans text-[#2D2A26]">
      <nav className="paper-texture bg-[#f5f2e8] border-b-2 border-[#2D2A26] px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-[90] shadow-md">
        <div className="flex items-center gap-4 md:gap-12">
          <h1 className="text-2xl font-black uppercase tracking-tighter">Closure</h1>
          <div className="hidden md:flex gap-1">
            {(["staff", "tasks", "messaging"] as const).map((t) => (
              <button key={t} onClick={() => handleTabChange(t)} className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all ${activeTab === t ? "bg-[#2D2A26] text-white shadow-brutal -translate-y-0.5" : "text-gray-500 hover:bg-white/50"}`}>
                {t === "staff" && <Users size={16} />}
                {t === "tasks" && <LayoutDashboard size={16} />}
                {t === "messaging" && (
                  <div className="relative flex items-center justify-center">
                    <MessageSquare size={16} />
                    {hasUnread && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse border border-[#2D2A26]"></span>}
                  </div>
                )}
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/settings" className="hidden md:flex w-9 h-9 bg-gray-200 border-2 border-[#2D2A26] items-center justify-center text-[#2D2A26] shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            <Settings size={16} strokeWidth={3} />
          </Link>
          <Link href="/profile" className="w-9 h-9 bg-[#f5f2e8] border-2 border-[#2D2A26] flex items-center justify-center shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all overflow-hidden">
            {userProfile && <img src={userProfile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userProfile.id}`} alt="Profile" className="w-full h-full object-cover p-0.5" />}
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="hidden md:block font-bold text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
            Log Out
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex md:hidden w-9 h-9 border-2 border-[#2D2A26] items-center justify-center bg-white shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            {mobileMenuOpen ? <X size={18} strokeWidth={3} /> : <Menu size={18} strokeWidth={3} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed top-[65px] left-0 right-0 z-[9998] bg-[#f5f2e8] border-b-2 border-[#2D2A26] shadow-brutal md:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col">
            {(["staff", "tasks", "messaging"] as const).map((t) => (
              <button key={t} onClick={() => handleTabChange(t)} className={`flex items-center gap-3 px-6 py-4 font-bold text-[11px] uppercase tracking-wider border-b border-[#2D2A26]/10 transition-all ${activeTab === t ? "bg-[#2D2A26] text-white" : "text-gray-600 hover:bg-white"}`}>
                {t === "staff" && <Users size={16} />}
                {t === "tasks" && <LayoutDashboard size={16} />}
                {t === "messaging" && (
                  <div className="relative">
                    <MessageSquare size={16} />
                    {hasUnread && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse border border-[#2D2A26]"></span>}
                  </div>
                )}
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest opacity-60"><Settings size={14} /> Settings</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="font-bold text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Log Out</button>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-8 md:p-12 mx-auto w-full flex flex-col lg:flex-row gap-8 lg:gap-12 relative max-w-[1600px]">
        {activeTab !== "staff" && (
          <aside className="w-full lg:w-72 flex flex-col gap-10 shrink-0 z-10 animate-in slide-in-from-left-4 duration-300">
            {activeTab === "tasks" ? (
              <div className="space-y-6">
                <div className="relative paper-texture shadow-brutal-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="SEARCH PROJECTS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#f5f2e8] border-2 border-[#2D2A26] font-bold text-[10px] focus:outline-none placeholder:text-[#2D2A26] placeholder:opacity-50" />
                </div>
                <div className="paper-texture p-6 border-2 border-[#2D2A26] shadow-brutal">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-gray-400 tracking-widest flex items-center gap-2"><Clock size={14} /> Recent Boards</h3>
                  <ul className="space-y-4">
                    {drawings.slice(0, 3).map((d) => (
                      <li key={d.id} onClick={() => router.push(`/board/${d.id}?tab=tasks`)} className="text-[13px] font-bold hover:text-[#D97757] cursor-pointer flex items-center gap-2">
                        <FileText size={12} className="opacity-30 shrink-0" /> <span className="truncate">{d.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="paper-texture p-6 border-2 border-[#2D2A26] shadow-brutal">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-gray-400 tracking-widest flex items-center gap-2"><SquarePen size={14} /> Open Tasks</h3>
                  <ul className="space-y-4">
                    {incompleteDrawings.slice(0, 5).map((d) => (
                      <li key={d.id} onClick={() => router.push(`/board/${d.id}?tab=tasks`)} className="text-[13px] font-bold hover:text-[#D97757] cursor-pointer flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#ffbb00] shrink-0"></div> <span className="truncate">{d.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                <div className="paper-texture p-6 border-2 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal overflow-y-auto max-h-48 md:flex-1 md:max-h-none md:min-h-[300px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-[10px] uppercase text-gray-400">Channels</h3>
                    <button onClick={() => setIsCreateRoomOpen(true)} className="p-1 border-2 border-[#2D2A26] shadow-brutal-sm bg-white hover:translate-y-0.5 transition-all"><Plus size={12} /></button>
                  </div>
                  <ul className="space-y-2">
                    {rooms.map((room) => (
                      <li key={room.id} onClick={() => setSelectedRoom(room.id)} className={`p-3 border-2 border-[#2D2A26] font-bold text-xs uppercase cursor-pointer transition-all ${selectedRoom === room.id ? "bg-[#2D2A26] text-white shadow-none translate-x-1 translate-y-1" : "bg-white shadow-brutal-sm hover:bg-gray-50"}`}>
                        # {room.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="hidden md:block paper-texture p-6 border-2 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal h-1/3 overflow-y-auto">
                  <h3 className="font-black text-[10px] uppercase text-gray-400 mb-6 tracking-widest">In Room</h3>
                  <ul className="space-y-3">
                    {roomMembers.map((m) => (
                      <li key={m.id} className="flex items-center gap-3">
                        <Image src={m.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${m.id}`} alt="" width={24} height={24} unoptimized className="rounded-full border border-[#2D2A26] bg-white object-cover aspect-square" />
                        <span className="font-bold text-[11px] uppercase truncate">{m.full_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </aside>
        )}

        <section className="flex-1 min-w-0 z-10">
          {activeTab === "staff" && (
            <div className="animate-in fade-in duration-300 max-w-[1200px] mx-auto">
              <div className="flex justify-between items-end mb-10 border-b-4 border-[#2D2A26] pb-6">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">Personnel</h2>
                <button onClick={() => setIsCalendarOpen(true)} className="px-6 py-3 border-2 border-[#2D2A26] bg-[#f5f2e8] font-bold text-[10px] uppercase shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2">
                  <Calendar size={14} /> Schedules
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profiles.map((p) => {
                  // --- NEW: Calculate the employee's exact current status ---
                  const slotsRecord = (p as any).availability_slots?.find((s: any) => s.week_start_date === weekKey);
                  const daysOff = slotsRecord && slotsRecord.days_off !== null ? slotsRecord.days_off : ["Sat", "Sun"];
                  const busySlots = slotsRecord?.busy_slots || [];

                  const isOff = daysOff.includes(currentDay);
                  const isBusy = !isOff && busySlots.includes(`${currentDay}-${currentHour}`);

                  // Determine colors based on status hierarchy
                  let statusText = "Available";
                  let statusBg = "bg-[#86efac]";
                  
                  if (isOff) {
                    statusText = "Off";
                    statusBg = "bg-[#93c5fd]";
                  } else if (isBusy) {
                    statusText = "Busy";
                    statusBg = "bg-[#ffbb00]";
                  } else if (currentHour < 8 || currentHour > 18) {
                    statusText = "Offline";
                    statusBg = "bg-gray-200 text-gray-500 opacity-80";
                  }

                  return (
                    <Link key={p.id} href={`/employee/${p.id}`} className="paper-texture bg-[#f5f2e8] border-2 border-[#2D2A26] p-6 shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-6 group relative">
                      
                      {/* STATUS BADGE */}
                      <div className={`absolute top-4 right-4 px-2 py-0.5 border-2 border-[#2D2A26] text-[8px] font-black uppercase tracking-widest shadow-brutal-sm ${statusBg}`}>
                        {statusText}
                      </div>

                      <Image src={p.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.id}`} alt="" width={64} height={64} unoptimized className="bg-white border-2 border-[#2D2A26] shadow-brutal-sm rounded-sm object-cover aspect-square" />
                      <div className="flex-1 min-w-0 pr-12">
                        <p className="font-black text-xl uppercase truncate group-hover:text-[#D97757] transition-colors">{p.full_name}</p>
                        <p className="font-mono text-[10px] font-bold opacity-40 uppercase truncate mb-2">{p.role}</p>
                        {(p.skills?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.skills.slice(0, 3).map((skill) => (
                              <span key={skill} className="px-1.5 py-0.5 bg-[#2D2A26] text-white text-[8px] font-black uppercase border border-[#2D2A26]">{skill}</span>
                            ))}
                            {p.skills.length > 3 && <span className="px-1.5 py-0.5 text-[8px] font-black uppercase opacity-40">+{p.skills.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b-4 border-[#2D2A26] gap-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">Tasks</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <BulkAutoAssignButton tasks={Object.values(boardTasks)} profiles={profiles} onSuccess={(updates) => { setBoardTasks((prev) => { const next = { ...prev }; updates.forEach((u) => { if (next[u.id]) { next[u.id] = { ...next[u.id], assigned_to: u.assigned_to, collaborators: u.collaborators, description: u.description }; } }); return next; }); }} />
                  <div className="flex bg-[#2D2A26]/5 p-1 border-2 border-[#2D2A26]">
                    <button onClick={() => setWhiteboardSubTab("todo")} className={`px-4 py-1.5 font-black text-[10px] uppercase tracking-widest transition-all ${whiteboardSubTab === "todo" ? "bg-[#2D2A26] text-white shadow-brutal-sm" : "text-[#2D2A26] hover:bg-white/50"}`}>Active Tasks</button>
                    <button onClick={() => setWhiteboardSubTab("completed")} className={`px-4 py-1.5 font-black text-[10px] uppercase tracking-widest transition-all ${whiteboardSubTab === "completed" ? "bg-[#2D2A26] text-white shadow-brutal-sm" : "text-[#2D2A26] hover:bg-white/50"}`}>Archive (7d)</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                <button onClick={createNewDrawing} className="min-h-[24rem] border-2 border-dashed border-[#2D2A26]/30 bg-[#f5f2e8]/40 paper-texture flex flex-col items-center justify-center gap-4 hover:border-[#2D2A26] hover:bg-[#f5f2e8] transition-all group shadow-sm">
                  <Plus size={32} className="text-gray-300 group-hover:text-[#2D2A26] transition-colors" />
                  <span className="font-black text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100">New Board</span>
                </button>

                {filteredDrawings.map((draw) => {
                  const task = boardTasks[draw.id];
                  if (!task) return null;
                  const assignedPerson = profiles.find((p) => p.id === task.assigned_to);
                  const collaboratorsList = (task.collaborators || []).map((id) => profiles.find((p) => p.id === id)).filter(Boolean) as Profile[];
                  const isInvolved = !draw.completed && (task.assigned_to === user?.id || task.collaborators?.includes(user?.id));

                  return (
                    <div key={draw.id} onClick={() => editingId !== draw.id && router.push(`/board/${draw.id}?tab=tasks`)} className={`group paper-texture min-h-[24rem] border-2 border-[#2D2A26] p-8 hover:translate-x-1.5 hover:translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between relative animate-in zoom-in-95 fade-in duration-500 slide-in-from-top-2 shadow-brutal-lg hover:shadow-none ${draw.completed ? "bg-[#e5e7eb] opacity-80" : "bg-[#f5f2e8]"}`}>
                      <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-3 opacity-80 border border-[#2D2A26]/10 ${task.priority === "Critical" ? "bg-red-600" : task.priority === "High" ? "bg-orange-500" : "bg-[#ffbb00]"}`}></div>
                      {draw.completed && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
                          <div className="border-4 border-green-600 text-green-600 font-black text-2xl uppercase p-2 rotate-[-15deg] opacity-40 tracking-widest bg-white">COMPLETE</div>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                          <span className="bg-[#2D2A26] text-white px-2 py-0.5 font-mono text-[9px] font-bold tracking-tighter">{new Date(draw.last_modified).toLocaleDateString()}</span>
                          {(() => {
                            const badge = getDueDateBadge(task.due_date, draw.completed);
                            return badge ? <span className={`px-2 py-0.5 font-black text-[9px] uppercase tracking-tight ${badge.color}`}>{badge.label}</span> : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          {isInvolved && (
                            <div className="w-6 h-6 bg-[#ffbb00] border-2 border-[#2D2A26] shadow-brutal-sm flex items-center justify-center flex-shrink-0">
                              <Star size={11} className="fill-[#2D2A26] text-[#2D2A26]" strokeWidth={0} />
                            </div>
                          )}
                          <button onClick={(e) => toggleStatus(e, draw.id, draw.completed)} className={`w-6 h-6 border-2 border-[#2D2A26] flex items-center justify-center transition-all z-20 relative ${draw.completed ? "bg-[#86efac]" : "bg-white shadow-brutal-sm hover:translate-y-0.5"}`}>
                            {draw.completed && <Check size={16} strokeWidth={4} />}
                          </button>
                        </div>
                      </div>
                      <div className="mb-4">
                        <h3 className={`text-xl font-black leading-tight uppercase tracking-tighter mb-2 ${draw.completed ? "line-through opacity-40" : ""}`}>{draw.name}</h3>
                        {task.description && task.description !== draw.name && <p className="text-[11px] font-medium text-gray-600 leading-snug line-clamp-2">{task.description}</p>}
                      </div>
                      <div className="mb-4 p-3 bg-white/40 rounded border border-[#2D2A26]/20">
                        <p className="text-[8px] font-bold uppercase opacity-60 mb-1">Primary</p>
                        <p className="text-[11px] font-black text-gray-900">{assignedPerson?.full_name || "Unassigned"}</p>
                      </div>
                      <div className="flex-1 mb-4">
                        {collaboratorsList.length > 0 ? (
                          <>
                            <p className="text-[8px] font-bold uppercase opacity-60 mb-2">Collaborators</p>
                            <div className="flex flex-wrap gap-2">
                              {collaboratorsList.map((collab) => (
                                <span key={collab.id} className="text-[9px] font-bold bg-[#86efac] border border-[#2D2A26] text-gray-900 px-2 py-1">{collab.full_name}</span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">No collaborators</p>
                        )}
                      </div>
                      {(task.required_skills?.length ?? 0) > 0 && (
                        <div className="mb-4">
                          <p className="text-[8px] font-bold uppercase opacity-60 mb-1.5">Skills Needed</p>
                          <div className="flex flex-wrap gap-1.5">
                            {task.required_skills.map((skill) => (
                              <span key={skill} className="px-2 py-0.5 bg-[#bae6fd] border border-[#2D2A26]/40 text-[8px] font-black uppercase tracking-wide text-gray-800">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between transition-all pt-4 border-t-2 border-[#2D2A26]/10 relative z-20">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); setPriorityEditId(draw.id); }} className={`text-[9px] font-black uppercase px-2 py-1 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all ${task.priority === "Critical" ? "bg-red-600 text-white" : task.priority === "High" ? "bg-orange-500 text-white" : "bg-[#ffbb00] text-gray-900"}`}>
                            {task.priority}
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{task.estimated_hours}h est.</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setTaskHeatmapOpenId(draw.id); }} className="p-2 border-2 border-[#2D2A26] bg-white text-[#2D2A26] shadow-[2px_2px_0px_0px_rgba(45,42,38,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all" title="View Team Availability">
                            <Calendar size={14} strokeWidth={3} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDetailsModalOpen(draw.id); }} className="px-4 py-2 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black text-[9px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(45,42,38,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">
                            Manage
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(draw.id); }} className="text-[#2D2A26] hover:text-red-600 transition-colors">
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

          {activeTab === "messaging" && (
            <div className="h-[500px] sm:h-[650px] md:h-[750px] flex flex-col paper-texture border-4 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal-lg overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 border-b-2 border-[#2D2A26] bg-white flex justify-between items-center">
                <h3 className="text-xl font-black uppercase italic tracking-tight"># {rooms.find((r) => r.id === selectedRoom)?.name || "Personnel Link"}</h3>
                <button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-[#2D2A26] font-black text-[10px] uppercase shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 transition-all bg-[#86efac]">
                  <UserPlus size={14} /> Add User
                </button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-4 ${msg.sender_id === user?.id ? "flex-row-reverse" : ""}`}>
                    <Image src={msg.profiles?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.sender_id}`} alt="" width={40} height={40} unoptimized className="bg-white border-2 border-[#2D2A26] shadow-brutal-sm rounded-sm shrink-0 object-cover aspect-square" />
                    <div className={`max-w-[70%] p-4 border-2 border-[#2D2A26] shadow-brutal-sm ${msg.sender_id === user?.id ? "bg-[#ffbb00]" : "bg-white"}`}>
                      <p className="text-[9px] font-black uppercase opacity-40 mb-1">{msg.profiles?.full_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="font-bold text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-6 border-t-2 border-[#2D2A26] bg-white flex gap-4">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type Message..." className="flex-1 px-4 py-3 bg-[#f5f2e8] border-2 border-[#2D2A26] font-bold text-xs focus:outline-none" />
                <button type="submit" className="px-6 py-3 bg-[#2D2A26] text-white shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* --- DRAWERS & MODALS --- */}
      {isCalendarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity" onClick={() => setIsCalendarOpen(false)} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-4xl bg-[#f5f2e8] shadow-brutal-lg border-l-4 border-[#2D2A26] z-[10001] transform transition-transform duration-300 ease-in-out ${isCalendarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-full flex flex-col paper-texture">
          <div className="flex justify-between items-center p-4 sm:p-8 border-b-4 border-[#2D2A26] bg-white">
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3"><Calendar size={28} strokeWidth={3} /> Master Calendar</h2>
            <button onClick={() => setIsCalendarOpen(false)} className="w-10 h-10 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all bg-white flex items-center justify-center"><X size={20} strokeWidth={3} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-[#f5f2e8]">
            <TeamHeatmap />
          </div>
        </div>
      </div>

      {taskHeatmapOpenId && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity" onClick={() => setTaskHeatmapOpenId(null)} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-4xl bg-[#f5f2e8] shadow-brutal-lg border-l-4 border-[#2D2A26] z-[10001] transform transition-transform duration-300 ease-in-out ${taskHeatmapOpenId ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-full flex flex-col paper-texture">
          <div className="flex justify-between items-center p-8 border-b-4 border-[#2D2A26] bg-white">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-[#2D2A26]"><Calendar size={28} strokeWidth={3} /> Task Availability</h2>
              <p className="font-bold text-xs uppercase opacity-60 tracking-widest mt-2">Board: {boardTasks[taskHeatmapOpenId || ""]?.title}</p>
            </div>
            <button onClick={() => setTaskHeatmapOpenId(null)} className="w-10 h-10 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all bg-white flex items-center justify-center"><X size={20} strokeWidth={3} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#f5f2e8]">
            {taskHeatmapOpenId && <TeamHeatmap userIds={getTaskPersonnel(taskHeatmapOpenId)} title="Assigned Personnel Heatmap" subtitle="Showing schedules of users currently assigned to this task" />}
          </div>
        </div>
      </div>

      {isCreateRoomOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-10 max-w-md w-full shadow-brutal-lg">
            <h2 className="text-2xl font-black uppercase italic mb-6">Create Channel</h2>
            <input autoFocus value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full p-4 border-2 border-[#2D2A26] mb-8 font-bold" placeholder="CHANNEL_NAME" />
            <div className="flex gap-4">
              <button onClick={() => setIsCreateRoomOpen(false)} className="flex-1 py-4 border-2 border-[#2D2A26] font-black uppercase text-xs">Cancel</button>
              <button onClick={handleCreateRoom} className="flex-1 py-4 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black uppercase text-xs shadow-brutal hover:translate-y-1">Create</button>
            </div>
          </div>
        </div>
      )}

      {isAddUserOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-10 max-w-md w-full shadow-brutal-lg">
            <h2 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">Add Personnel</h2>
            <div className="max-h-[300px] overflow-y-auto mb-8 pr-2 border-2 border-[#2D2A26]/10 p-2 custom-scrollbar">
              <ul className="space-y-3">
                {addablePersonnel.map((p) => (
                  <li key={p.id} className="flex justify-between items-center p-3 border-2 border-[#2D2A26] bg-white shadow-brutal-sm">
                    <div className="flex items-center gap-3">
                      <Image src={p.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.id}`} alt="" width={32} height={32} unoptimized className="bg-white border-2 border-[#2D2A26] shadow-brutal-sm rounded-sm object-cover aspect-square" />
                      <span className="font-bold text-[11px] uppercase truncate max-w-[150px]">{p.full_name}</span>
                    </div>
                    <button onClick={() => addUserToRoom(p.id)} className="text-[9px] font-black uppercase bg-[#2D2A26] text-white px-3 py-1 shadow-brutal-sm hover:translate-y-0.5 transition-all">Add</button>
                  </li>
                ))}
                {addablePersonnel.length === 0 && <p className="text-[10px] font-black uppercase opacity-40 text-center py-4">All Personnel Active</p>}
              </ul>
            </div>
            <button onClick={() => setIsAddUserOpen(false)} className="w-full py-4 border-2 border-[#2D2A26] font-black uppercase text-xs hover:bg-[#2D2A26] hover:text-white transition-all">Close Registry</button>
          </div>
        </div>
      )}

      {detailsModalOpen && boardTasks[detailsModalOpen] && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-4 md:p-8 max-w-4xl w-full shadow-brutal-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-[#2D2A26]">
              <h2 className="text-2xl font-black uppercase italic max-w-lg leading-tight truncate">{boardTasks[detailsModalOpen]?.title}</h2>
              <button onClick={() => setDetailsModalOpen(null)} className="p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all bg-white shrink-0"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold mb-1.5 uppercase opacity-60">Board Name</p>
                    <input type="text" value={drawings.find((d) => d.id === detailsModalOpen)?.name || ""} onChange={(e) => updateBoardName(detailsModalOpen, e.target.value)} className="w-full p-3 border-2 border-[#2D2A26] font-black text-sm bg-white focus:outline-none" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold mb-1.5 uppercase opacity-60">Description</p>
                    <textarea rows={4} value={boardTasks[detailsModalOpen]?.description || ""} placeholder="Add a task description..." onChange={(e) => updateTaskDescription(detailsModalOpen, e.target.value)} className="w-full p-3 border-2 border-[#2D2A26] font-bold text-sm bg-white focus:outline-none resize-none leading-relaxed" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-bold mb-1.5 uppercase opacity-60">Priority</p>
                      <select value={boardTasks[detailsModalOpen]?.priority || "Low"} onChange={(e) => updateTaskPriority(detailsModalOpen, e.target.value as any)} className="w-full p-3 border-2 border-[#2D2A26] font-black text-[11px] uppercase bg-white focus:outline-none cursor-pointer">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold mb-1.5 uppercase opacity-60">Est. Hours</p>
                      <input type="number" min="0" value={boardTasks[detailsModalOpen]?.estimated_hours === 0 ? "" : boardTasks[detailsModalOpen]?.estimated_hours} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => { const val = e.target.value; updateTaskHours(detailsModalOpen, val === "" ? 0 : parseInt(val)); }} className="w-full p-3 border-2 border-[#2D2A26] font-black text-sm bg-white focus:outline-none" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold mb-1.5 uppercase opacity-60">Due Date</p>
                      <input type="date" value={boardTasks[detailsModalOpen]?.due_date || ""} onChange={(e) => updateTaskDueDate(detailsModalOpen, e.target.value || null)} className="w-full p-3 border-2 border-[#2D2A26] font-black text-sm bg-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold mb-1.5 uppercase opacity-60">Required Skills</p>
                    <div className="flex gap-2 mb-3">
                      <input type="text" value={newSkillInput} onChange={(e) => setNewSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newSkillInput.trim()) { const existing = boardTasks[detailsModalOpen]?.required_skills || []; if (!existing.includes(newSkillInput.trim())) updateTaskSkills(detailsModalOpen, [...existing, newSkillInput.trim()]); setNewSkillInput(""); } }} placeholder="Add skill, press Enter" className="flex-1 p-2 border-2 border-[#2D2A26] font-bold text-xs bg-white focus:outline-none" />
                      <button onClick={() => { if (!newSkillInput.trim()) return; const existing = boardTasks[detailsModalOpen]?.required_skills || []; if (!existing.includes(newSkillInput.trim())) updateTaskSkills(detailsModalOpen, [...existing, newSkillInput.trim()]); setNewSkillInput(""); }} className="px-4 py-2 bg-[#2D2A26] text-white font-black text-[10px] uppercase border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(boardTasks[detailsModalOpen]?.required_skills || []).map((skill) => (
                        <span key={skill} className="flex items-center gap-1 px-2.5 py-1 bg-[#bae6fd] border border-[#2D2A26] text-[9px] font-black uppercase shadow-sm">
                          {skill}
                          <button onClick={() => updateTaskSkills(detailsModalOpen, (boardTasks[detailsModalOpen]?.required_skills || []).filter((s) => s !== skill))} className="ml-1 hover:text-red-600 font-black text-[12px] leading-none">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t-4 border-[#2D2A26] pt-6 mt-2">
                <p className="text-[10px] font-bold mb-4 uppercase opacity-60 tracking-widest">Personnel Assignment</p>
                <AutoAssignButton boardId={detailsModalOpen} task={boardTasks[detailsModalOpen]} profiles={profiles} onSuccess={(primaryId, collabs, newDescription) => { setBoardTasks((prev) => ({ ...prev, [detailsModalOpen]: { ...prev[detailsModalOpen], assigned_to: primaryId, collaborators: collabs, description: newDescription } })); }} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profiles.map((employee) => {
                    const task = boardTasks[detailsModalOpen];
                    const isPrimary = task?.assigned_to === employee.id;
                    const isCollaborator = task?.collaborators?.includes(employee.id);
                    return (
                      <div key={employee.id} className={`p-3 border-2 border-[#2D2A26] flex flex-col justify-between shadow-brutal-sm ${isPrimary ? "bg-[#ffbb00]/20" : "bg-white"}`}>
                        <div className="flex items-center gap-3 min-w-0 mb-4">
                          <Image src={employee.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${employee.id}`} alt="" width={32} height={32} unoptimized className="border-2 border-[#2D2A26] bg-white shrink-0 object-cover aspect-square" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase truncate">{employee.full_name}</p>
                            <p className="text-[9px] font-bold opacity-60 uppercase truncate">{employee.role}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => togglePrimaryPerson(detailsModalOpen, employee.id)} className={`flex-1 py-1.5 border-2 border-[#2D2A26] font-black text-[9px] uppercase transition-all shadow-sm ${isPrimary ? "bg-[#2D2A26] text-white hover:bg-red-600 hover:border-red-600 hover:shadow-none translate-y-[1px]" : "bg-white hover:bg-[#ffbb00]"}`}>{isPrimary ? "Drop Lead" : "Lead"}</button>
                          <button onClick={() => !isPrimary && toggleCollaborator(detailsModalOpen, employee.id)} disabled={isPrimary} className={`flex-1 py-1.5 border-2 border-[#2D2A26] font-black text-[9px] uppercase transition-all shadow-sm ${isPrimary ? "opacity-30 cursor-not-allowed bg-gray-200" : isCollaborator ? "bg-[#86efac] text-gray-900 hover:bg-red-400 hover:shadow-none translate-y-[1px]" : "bg-white hover:bg-[#86efac]"}`}>{isCollaborator ? "Remove" : "Add"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pt-6 border-t-4 border-[#2D2A26] mt-4">
              <button onClick={() => setDetailsModalOpen(null)} className="w-full py-4 bg-[#2D2A26] text-white font-black uppercase text-sm tracking-widest shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shrink-0">Close & Save</button>
            </div>
          </div>
        </div>
      )}

      {priorityEditId && boardTasks[priorityEditId] && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase italic">Set Priority</h2>
              <button onClick={() => setPriorityEditId(null)} className="p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all bg-white"><X size={20} /></button>
            </div>
            <div className="space-y-3 mb-8">
              {(["Critical", "High", "Medium", "Low"] as const).map((priority) => (
                <button key={priority} onClick={() => updateTaskPriority(priorityEditId, priority)} className={`w-full p-4 border-2 border-[#2D2A26] font-black text-left text-xs uppercase tracking-tight transition-all shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 ${boardTasks[priorityEditId]?.priority === priority ? (priority === "Critical" ? "bg-red-600 text-white" : priority === "High" ? "bg-orange-500 text-white" : "bg-[#ffbb00] text-gray-900") : "bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <span>{priority} Level</span>
                    {boardTasks[priorityEditId]?.priority === priority && <Check size={16} strokeWidth={4} className="ml-auto" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg">
            <h2 className="text-3xl font-black mb-4 uppercase italic text-[#2D2A26]">Archive Board?</h2>
            <p className="font-bold text-xs mb-10 uppercase opacity-60 tracking-widest text-[#2D2A26]">Critical Action - Cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-4 border-2 border-[#2D2A26] font-black uppercase text-xs text-[#2D2A26]">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-4 bg-red-600 text-white border-2 border-[#2D2A26] font-black uppercase text-xs shadow-brutal hover:shadow-none hover:translate-x-1 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] shadow-brutal-lg max-w-2xl w-full relative pt-16">
            <button onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 w-10 h-10 border-2 border-[#2D2A26] bg-white flex items-center justify-center hover:bg-[#2D2A26] hover:text-white transition-all shadow-brutal-sm"><X size={20} strokeWidth={3} /></button>
            <div className="px-8 pb-8">
              <PremiumPaymentFlow onPaymentSuccess={() => { setIsPremium(true); localStorage.setItem("closure_premium", "true"); setShowPremiumModal(false); }} isPremium={isPremium} />
            </div>
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
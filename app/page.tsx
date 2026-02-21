"use client";

import { useState, useEffect, MouseEvent, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { 
  Users, LayoutDashboard, MessageSquare, Lock, Zap, LogOut, 
  Calendar, X, Settings, Plus, FileText, Trash2, Clock, SquarePen, Search, ExternalLink, Check, Send, UserPlus 
} from "lucide-react";

import { PremiumPaymentFlow } from "./premium-payment";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import Loader from "@/app/board/[id]/components/Loader";
import Image from "next/image";
import type { Profile } from "@/types/index";

// --- TYPES ---
interface Drawing { id: string; user_id: string; name: string; completed: boolean; last_modified: string; created_at: string; }
interface ChatRoom { id: string; name: string; type: string; }
interface ChatMessage { id: string; room_id: string; sender_id: string; content: string; created_at: string; profiles?: { full_name: string; avatar_url: string }; }

// Friend's Task Type (Now synced to Supabase)
interface DbTask {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  required_skills: string[];
  assigned_to: string;
  collaborators: string[];
  status: string;
  estimated_hours: number;
}

type TabType = "staff" | "whiteboard" | "messaging";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  // App State
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get("tab") as TabType) || "staff");
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
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

  // Friend's Task States
  const [boardTasks, setBoardTasks] = useState<Record<string, DbTask>>({});
  const [detailsModalOpen, setDetailsModalOpen] = useState<string | null>(null);
  const [priorityEditId, setPriorityEditId] = useState<string | null>(null);

  // UI / Modal States
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [editName, setEditName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const init = async () => {
      const premium = localStorage.getItem("capacity_premium") === "true";
      setIsPremium(premium);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }
      setUser(authUser);

      // PARALLEL FETCH: Profiles, Drawings, Chat Members, AND Tasks
      const [profRes, drawRes, memberRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name', { ascending: true }),
        supabase.from('drawings').select('*').eq('user_id', authUser.id).order('last_modified', { ascending: false }),
        supabase.from('chat_room_members').select('chat_rooms(*)').eq('user_id', authUser.id),
        supabase.from('tasks').select('*') // Assuming tasks table exists for friend's logic
      ]);
      
      if (profRes.data) setProfiles(profRes.data as Profile[]);
      
      const fetchedDrawings = drawRes.data ? (drawRes.data as Drawing[]) : [];
      setDrawings(fetchedDrawings);

      if (memberRes.data) {
        const joinedRooms = memberRes.data.map(m => m.chat_rooms).filter(Boolean) as ChatRoom[];
        setRooms(joinedRooms);
        if (joinedRooms.length > 0) setSelectedRoom(joinedRooms[0].id);
      }

      // INTEGRATE FRIEND'S TASK LOGIC WITH SUPABASE REPOSITORY
      const tasksForBoards: Record<string, DbTask> = {};
      const dbTasks = (tasksRes.data as DbTask[]) || [];

      // Map existing DB tasks
      dbTasks.forEach(t => tasksForBoards[t.id] = t);

      // Ensure every board has a task object
      fetchedDrawings.forEach((board) => {
        if (!tasksForBoards[board.id]) {
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

  // REAL-TIME CHAT LISTENER (Retained your logic)
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchChannelData = async () => {
      const { data: msgs } = await supabase.from('chat_messages').select('*, profiles(full_name, avatar_url)').eq('room_id', selectedRoom).order('created_at', { ascending: true });
      if (msgs) setMessages(msgs as any[]);

      const { data: members } = await supabase.from('chat_room_members').select('profiles(*)').eq('room_id', selectedRoom);
      if (members) setRoomMembers(members.map(m => m.profiles) as unknown as Profile[]);
    };
    fetchChannelData();

    const channel = supabase.channel(`room-${selectedRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selectedRoom}` }, async (payload) => {
        const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.sender_id).single();
        const msgWithProfile = { ...payload.new, profiles: prof } as ChatMessage;
        setMessages(prev => (prev.find(m => m.id === msgWithProfile.id) ? prev : [...prev, msgWithProfile]));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `?tab=${tab}`);
  };

  // CHAT HANDLERS
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user) return;
    const content = newMessage.trim();
    setNewMessage("");

    const optimisticMsg: ChatMessage = {
      id: Math.random().toString(),
      room_id: selectedRoom,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      profiles: { full_name: user.user_metadata?.full_name || 'Personnel', avatar_url: '' }
    };
    setMessages(prev => [...prev, optimisticMsg]);
    await supabase.from('chat_messages').insert({ room_id: selectedRoom, sender_id: user.id, content });
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    const { data } = await supabase.from('chat_rooms').insert({ name: newRoomName.trim(), type: 'private' }).select().single();
    if (data) {
      await supabase.from('chat_room_members').insert({ room_id: data.id, user_id: user.id });
      setRooms(prev => [...prev, data]);
      setSelectedRoom(data.id);
      setIsCreateRoomOpen(false);
      setNewRoomName("");
    }
  };

  const addUserToRoom = async (profileId: string) => {
    if (!selectedRoom) return;
    const { error } = await supabase.from('chat_room_members').insert({ room_id: selectedRoom, user_id: profileId });
    if (!error) {
      const addedProfile = profiles.find(p => p.id === profileId);
      if (addedProfile) setRoomMembers(prev => [...prev, addedProfile]);
    }
  };

  // WHITEBOARD & TASK HANDLERS
  const createNewDrawing = async () => {
    if (!user) return;
    const { data } = await supabase.from('drawings').insert({ user_id: user.id, name: 'UNTITLED_PROJECT' }).select().single();
    if (data) router.push(`/board/${data.id}?tab=whiteboard`);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const original = [...drawings];
    setDrawings(prev => prev.filter(d => d.id !== deleteTargetId));
    setDeleteTargetId(null);
    const { error } = await supabase.from('drawings').delete().eq('id', deleteTargetId);
    if (error) { alert("Action denied"); setDrawings(original); }
  };

  const saveRename = async () => {
    if (!editingId) return;
    const timestamp = new Date().toISOString();
    setDrawings(drawings.map(d => d.id === editingId ? { ...d, name: editName, last_modified: timestamp } : d));
    setEditingId(null);
    await supabase.from('drawings').update({ name: editName, last_modified: timestamp }).eq('id', editingId);
  };

  const toggleStatus = async (e: MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    setDrawings(drawings.map(d => d.id === id ? { ...d, completed: newStatus } : d));
    await supabase.from('drawings').update({ completed: newStatus }).eq('id', id);
  };

  // FRIEND'S TASK LOGIC (Updated to save to Supabase)
  const addCollaboratorToTask = async (boardId: string, employeeId: string) => {
    const task = boardTasks[boardId];
    const newCollabs = task.collaborators?.includes(employeeId) ? task.collaborators : [...(task.collaborators || []), employeeId];
    const updatedTask = { ...task, collaborators: newCollabs };
    setBoardTasks(prev => ({ ...prev, [boardId]: updatedTask }));
    await supabase.from('tasks').upsert(updatedTask);
  };

  const assignPrimaryPerson = async (boardId: string, employeeId: string) => {
    const updatedTask = { ...boardTasks[boardId], assigned_to: employeeId };
    setBoardTasks(prev => ({ ...prev, [boardId]: updatedTask }));
    await supabase.from('tasks').upsert(updatedTask);
  };

  const updateTaskPriority = async (boardId: string, newPriority: "Low" | "Medium" | "High" | "Critical") => {
    const updatedTask = { ...boardTasks[boardId], priority: newPriority };
    setBoardTasks(prev => ({ ...prev, [boardId]: updatedTask }));
    await supabase.from('tasks').upsert(updatedTask);
    setPriorityEditId(null);
  };

  const updateTaskHours = async (boardId: string, hours: number) => {
    const updatedTask = { ...boardTasks[boardId], estimated_hours: hours };
    setBoardTasks(prev => ({ ...prev, [boardId]: updatedTask }));
    await supabase.from('tasks').upsert(updatedTask);
  };

  const filteredDrawings = drawings.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const incompleteDrawings = drawings.filter(d => !d.completed);
  const addablePersonnel = profiles.filter(p => !roomMembers.some(m => m.id === p.id));

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen cork-texture flex flex-col font-sans text-[#2D2A26]">
      
      <nav className="paper-texture bg-[#f5f2e8] border-b-2 border-[#2D2A26] px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-12">
          <h1 className="text-2xl font-black uppercase tracking-tighter">Capacity</h1>
          <div className="flex gap-1">
            {(["staff", "whiteboard", "messaging"] as const).map((t) => (
              <button key={t} onClick={() => handleTabChange(t)} className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all ${activeTab === t ? "bg-[#2D2A26] text-white shadow-brutal -translate-y-0.5" : "text-gray-500 hover:bg-white/50"}`}>
                {t === "staff" && <Users size={16} />}
                {t === "whiteboard" && <LayoutDashboard size={16} />}
                {t === "messaging" && <MessageSquare size={16} />}
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setShowPremiumModal(true)} className={`px-6 py-2 border-2 border-[#2D2A26] font-bold text-[10px] uppercase shadow-brutal transition-all ${isPremium ? "bg-[#86efac]" : "bg-[#ffbb00]"}`}>{isPremium ? "Premium" : "Upgrade"}</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="font-bold text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100">Log Out</button>
        </div>
      </nav>

      <main className="flex-1 p-8 md:p-12 mx-auto w-full flex flex-col lg:flex-row gap-12 relative max-w-[1600px]">
        
        {activeTab !== "staff" && (
          <aside className="w-full lg:w-72 flex flex-col gap-10 shrink-0 z-10 animate-in slide-in-from-left-4 duration-300">
            {activeTab === "whiteboard" ? (
              <div className="space-y-6">
                <div className="relative paper-texture shadow-brutal-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="SEARCH PROJECTS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#f5f2e8] border-2 border-[#2D2A26] font-bold text-[10px] focus:outline-none placeholder:opacity-20" />
                </div>
                <div className="paper-texture p-6 border-2 border-[#2D2A26] shadow-brutal">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-gray-400 tracking-widest flex items-center gap-2"><Clock size={14}/> Recent Boards</h3>
                  <ul className="space-y-4">{drawings.slice(0, 3).map(d => (<li key={d.id} onClick={() => router.push(`/board/${d.id}?tab=whiteboard`)} className="text-[13px] font-bold hover:text-[#D97757] cursor-pointer truncate flex items-center gap-2"><FileText size={12} className="opacity-30" /> {d.name}</li>))}</ul>
                </div>
                <div className="paper-texture p-6 border-2 border-[#2D2A26] shadow-brutal">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-gray-400 tracking-widest flex items-center gap-2"><SquarePen size={14} /> Open Tasks</h3>
                  <ul className="space-y-4">{incompleteDrawings.slice(0, 5).map(d => (<li key={d.id} onClick={() => router.push(`/board/${d.id}?tab=whiteboard`)} className="text-[13px] font-bold hover:text-[#D97757] cursor-pointer truncate flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ffbb00]"></div> {d.name}</li>))}</ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                <div className="paper-texture p-6 border-2 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal flex-1 overflow-y-auto min-h-[300px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-[10px] uppercase text-gray-400">Channels</h3>
                    <button onClick={() => setIsCreateRoomOpen(true)} className="p-1 border-2 border-[#2D2A26] shadow-brutal-sm bg-white hover:translate-y-0.5 transition-all"><Plus size={12} /></button>
                  </div>
                  <ul className="space-y-2">
                    {rooms.map(room => (
                      <li key={room.id} onClick={() => setSelectedRoom(room.id)} className={`p-3 border-2 border-[#2D2A26] font-bold text-xs uppercase cursor-pointer transition-all ${selectedRoom === room.id ? 'bg-[#2D2A26] text-white shadow-none translate-x-1 translate-y-1' : 'bg-white shadow-brutal-sm hover:bg-gray-50'}`}># {room.name}</li>
                    ))}
                  </ul>
                </div>
                <div className="paper-texture p-6 border-2 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal h-1/3 overflow-y-auto">
                  <h3 className="font-black text-[10px] uppercase text-gray-400 mb-6 tracking-widest">In Room</h3>
                  <ul className="space-y-3">
                    {roomMembers.map(m => (
                      <li key={m.id} className="flex items-center gap-3">
                        <Image src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`} alt="" width={24} height={24} unoptimized className="rounded-full border border-[#2D2A26] bg-white" />
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
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">Personnel Registry</h2>
                <button onClick={() => setIsCalendarOpen(true)} className="px-6 py-3 border-2 border-[#2D2A26] bg-[#f5f2e8] font-bold text-[10px] uppercase shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"><Calendar size={14} /> Schedules</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profiles.map((p) => (
                  <Link key={p.id} href={`/employee/${p.id}`} className="paper-texture bg-[#f5f2e8] border-2 border-[#2D2A26] p-6 shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-6 group">
                    <Image src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} alt="" width={64} height={64} unoptimized className="bg-white border-2 border-[#2D2A26] shadow-brutal-sm rounded-sm" />
                    <div className="flex-1 min-w-0"><p className="font-black text-xl uppercase truncate group-hover:text-[#D97757] transition-colors">{p.full_name}</p><p className="font-mono text-[10px] font-bold opacity-40 uppercase truncate">{p.role}</p></div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeTab === "whiteboard" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-8">Mission Boards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                <button onClick={createNewDrawing} className="min-h-[24rem] border-2 border-dashed border-[#2D2A26]/30 bg-[#f5f2e8]/40 paper-texture flex flex-col items-center justify-center gap-4 hover:border-[#2D2A26] hover:bg-[#f5f2e8] transition-all group shadow-sm">
                  <Plus size={32} className="text-gray-300 group-hover:text-[#2D2A26] transition-colors" /><span className="font-black text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100">New Board</span>
                </button>
                
                {filteredDrawings.map((draw) => {
                  const task = boardTasks[draw.id];
                  if (!task) return null;
                  
                  // Map assigned and collabs strictly from Supabase Profiles
                  const assignedPerson = profiles.find(p => p.id === task.assigned_to);
                  const collaboratorsList = (task.collaborators || []).map((id) => profiles.find(p => p.id === id)).filter(Boolean) as Profile[];

                  return (
                    <div key={draw.id} onClick={() => editingId !== draw.id && router.push(`/board/${draw.id}?tab=whiteboard`)} className={`group paper-texture min-h-[24rem] border-2 border-[#2D2A26] p-8 shadow-brutal-lg hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between relative ${draw.completed ? 'bg-[#e5e7eb] opacity-80' : 'bg-[#f5f2e8]'}`}>
                      
                      {/* Priority Tape at the top */}
                      <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-3 opacity-80 border border-[#2D2A26]/10 ${task.priority === "Critical" ? "bg-red-600" : task.priority === "High" ? "bg-orange-500" : "bg-[#ffbb00]"}`}></div>
                      
                      {draw.completed && <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10"><div className="border-4 border-green-600 text-green-600 font-black text-2xl uppercase p-2 rotate-[-15deg] opacity-40 tracking-widest bg-white">COMPLETE</div></div>}
                      
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-[#2D2A26] text-white px-2 py-0.5 font-mono text-[9px] font-bold tracking-tighter">{new Date(draw.last_modified).toLocaleDateString()}</span>
                        <button onClick={(e) => toggleStatus(e, draw.id, draw.completed)} className={`w-6 h-6 border-2 border-[#2D2A26] flex items-center justify-center transition-all z-20 relative ${draw.completed ? 'bg-[#86efac]' : 'bg-white shadow-brutal-sm hover:translate-y-0.5'}`}>{draw.completed && <Check size={16} strokeWidth={4} />}</button>
                      </div>

                      {/* TITLE SECTION - Text beneath title removed! */}
                      <div className="mb-4">
                        {editingId === draw.id ? (
                          <input autoFocus className="bg-transparent border-b-4 border-[#2D2A26] text-xl font-black outline-none uppercase w-full tracking-tighter relative z-20" value={editName} onChange={(e) => setEditName(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Enter' && saveRename()} onBlur={saveRename} />
                        ) : (
                          <h3 className={`text-xl font-black leading-tight uppercase tracking-tighter mb-2 ${draw.completed ? 'line-through opacity-40' : ''}`}>{draw.name}</h3>
                        )}
                      </div>

                      {/* Assigned Person */}
                      <div className="mb-4 p-3 bg-white/40 rounded border border-[#2D2A26]/20">
                        <p className="text-[8px] font-bold uppercase opacity-60 mb-1">Primary</p>
                        <p className="text-[11px] font-black text-gray-900">{assignedPerson?.full_name || "Unassigned"}</p>
                      </div>

                      {/* Collaborators */}
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
                        ) : (<p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">No collaborators</p>)}
                      </div>

                      {/* Details Button */}
                      <button onClick={(e) => { e.stopPropagation(); setDetailsModalOpen(draw.id); }} className="w-full py-2 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black text-[9px] uppercase tracking-widest shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all mb-4 relative z-20">
                        Manage Tasks
                      </button>

                      {/* ALWAYS VISIBLE BOTTOM BAR */}
                      <div className="flex items-center justify-between transition-all pt-4 border-t-2 border-[#2D2A26]/10 relative z-20">
                         
                         {/* Priority & Est. Hours */}
                         <div className="flex items-center gap-3">
                           <button onClick={(e) => { e.stopPropagation(); setPriorityEditId(draw.id); }} className={`text-[9px] font-black uppercase px-2 py-1 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all ${task.priority === "Critical" ? "bg-red-600 text-white" : task.priority === "High" ? "bg-orange-500 text-white" : "bg-[#ffbb00] text-gray-900"}`}>
                             {task.priority}
                           </button>
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{task.estimated_hours}h est.</span>
                         </div>

                         {/* Hover-only Tools (Rename/Trash) */}
                         <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); setEditingId(draw.id); setEditName(draw.name); }} className="text-[10px] font-black uppercase underline decoration-2 underline-offset-2">Rename</button>
                           <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(draw.id); }} className="text-[#2D2A26] hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                         </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "messaging" && (
            <div className="h-[750px] flex flex-col paper-texture border-4 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal-lg overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 border-b-2 border-[#2D2A26] bg-white flex justify-between items-center">
                <h3 className="text-xl font-black uppercase italic tracking-tight"># {rooms.find(r => r.id === selectedRoom)?.name || 'Personnel Link'}</h3>
                <button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-[#2D2A26] font-black text-[10px] uppercase shadow-brutal-sm hover:shadow-none hover:translate-x-0.5 transition-all bg-[#86efac]"><UserPlus size={14} /> Add User</button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex items-start gap-4 ${msg.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                    <Image src={msg.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`} alt="" width={40} height={40} unoptimized className="bg-white border-2 border-[#2D2A26] shadow-brutal-sm rounded-sm shrink-0" />
                    <div className={`max-w-[70%] p-4 border-2 border-[#2D2A26] shadow-brutal-sm ${msg.sender_id === user?.id ? 'bg-[#ffbb00]' : 'bg-white'}`}>
                      <p className="text-[9px] font-black uppercase opacity-40 mb-1">{msg.profiles?.full_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="font-bold text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-6 border-t-2 border-[#2D2A26] bg-white flex gap-4">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="ENCRYPTED TRANSMISSION..." className="flex-1 px-4 py-3 bg-[#f5f2e8] border-2 border-[#2D2A26] font-bold text-xs focus:outline-none" />
                <button type="submit" className="px-6 py-3 bg-[#2D2A26] text-white shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"><Send size={16} /></button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* --- ALL MODALS --- */}
      {isCreateRoomOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-10 max-w-md w-full shadow-brutal-lg">
            <h2 className="text-2xl font-black uppercase italic mb-6">Create Channel</h2>
            <input autoFocus value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full p-4 border-2 border-[#2D2A26] mb-8 font-bold" placeholder="CHANNEL_NAME" />
            <div className="flex gap-4"><button onClick={() => setIsCreateRoomOpen(false)} className="flex-1 py-4 border-2 border-[#2D2A26] font-black uppercase text-xs">Cancel</button><button onClick={handleCreateRoom} className="flex-1 py-4 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black uppercase text-xs shadow-brutal hover:translate-y-1">Create</button></div>
          </div>
        </div>
      )}

      {isAddUserOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-10 max-w-md w-full shadow-brutal-lg">
            <h2 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">Add Personnel</h2>
            <div className="max-h-[300px] overflow-y-auto mb-8 pr-2 border-2 border-[#2D2A26]/10 p-2 custom-scrollbar">
              <ul className="space-y-3">
                {addablePersonnel.map(p => (
                  <li key={p.id} className="flex justify-between items-center p-3 border-2 border-[#2D2A26] bg-white shadow-brutal-sm">
                    <div className="flex items-center gap-3"><Image src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} alt="" width={32} height={32} unoptimized className="rounded-full border border-[#2D2A26] bg-white" /><span className="font-bold text-[11px] uppercase truncate max-w-[150px]">{p.full_name}</span></div>
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

      {/* FRIEND'S TASK DETAILS MODAL (Now uses profiles from Supabase) */}
      {detailsModalOpen && boardTasks[detailsModalOpen] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase italic max-w-xs">{boardTasks[detailsModalOpen]?.title}</h2>
              <button onClick={() => setDetailsModalOpen(null)} className="p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all bg-white"><X size={20} /></button>
            </div>

            <div className="mb-8 pb-8 border-b-2 border-[#2D2A26]">
              <p className="text-xs font-bold mb-3 uppercase opacity-60">Estimated Hours</p>
              <input 
                type="number" 
                min="0" 
                value={boardTasks[detailsModalOpen]?.estimated_hours === 0 ? '' : boardTasks[detailsModalOpen]?.estimated_hours} 
                placeholder="0"
                onFocus={(e) => e.target.select()} 
                onChange={(e) => {
                  const val = e.target.value;
                  const newHours = val === '' ? 0 : parseInt(val);
                  updateTaskHours(detailsModalOpen, newHours);
                }} 
                className="w-full p-3 border-2 border-[#2D2A26] font-black text-lg bg-white focus:outline-none" 
              />
            </div>

            <p className="text-xs font-bold mb-4 uppercase opacity-60">Task Roster</p>
            <div className="space-y-2 mb-6 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {profiles.map((employee) => {
                const task = boardTasks[detailsModalOpen];
                const isPrimary = task?.assigned_to === employee.id;
                const isCollaborator = task?.collaborators?.includes(employee.id);

                return (
                  <div key={employee.id} className="p-3 border-2 border-[#2D2A26] bg-white flex items-center justify-between shadow-brutal-sm">
                    <div className="flex items-center gap-3">
                      <Image src={employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.id}`} alt="" width={28} height={28} unoptimized className="border border-[#2D2A26] bg-white" />
                      <div>
                        <p className="text-[10px] font-black uppercase truncate max-w-[120px]">{employee.full_name}</p>
                        <p className="text-[8px] font-bold opacity-60 uppercase">{employee.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => assignPrimaryPerson(detailsModalOpen, employee.id)} className={`px-2 py-1 border-2 border-[#2D2A26] font-black text-[8px] uppercase transition-all ${isPrimary ? "bg-[#2D2A26] text-white" : "bg-white hover:bg-gray-100"}`}>Lead</button>
                      <button onClick={() => !isPrimary && addCollaboratorToTask(detailsModalOpen, employee.id)} disabled={isPrimary} className={`px-2 py-1 border-2 border-[#2D2A26] font-black text-[8px] uppercase transition-all ${isPrimary ? "opacity-50 cursor-not-allowed" : isCollaborator ? "bg-[#86efac] text-gray-900" : "bg-white hover:bg-[#ffbb00]"}`}>Add</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setDetailsModalOpen(null)} className="w-full py-4 bg-[#2D2A26] text-white font-black uppercase text-xs shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Save Config</button>
          </div>
        </div>
      )}

      {/* FRIEND'S PRIORITY SELECTOR MODAL */}
      {priorityEditId && boardTasks[priorityEditId] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="paper-texture bg-[#f5f2e8] border-4 border-[#2D2A26] p-12 max-w-md w-full shadow-brutal-lg">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase italic">Set Priority</h2>
              <button onClick={() => setPriorityEditId(null)} className="p-2 border-2 border-[#2D2A26] shadow-brutal-sm hover:translate-y-0.5 transition-all bg-white"><X size={20} /></button>
            </div>
            <div className="space-y-3 mb-8">
              {(["Critical", "High", "Medium", "Low"] as const).map((priority) => (
                <button key={priority} onClick={() => updateTaskPriority(priorityEditId, priority)} className={`w-full p-4 border-2 border-[#2D2A26] font-black text-left text-xs uppercase tracking-tight transition-all shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 ${boardTasks[priorityEditId]?.priority === priority ? (priority === "Critical" ? "bg-red-600 text-white" : priority === "High" ? "bg-orange-500 text-white" : "bg-[#ffbb00] text-gray-900") : "bg-white"}`}>
                  <div className="flex items-center gap-3"><span>{priority} Level</span>{boardTasks[priorityEditId]?.priority === priority && <Check size={16} strokeWidth={4} className="ml-auto" />}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
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

    </div>
  );
}

export default function Home() { return ( <Suspense fallback={<Loader />}><DashboardContent /></Suspense> ); }
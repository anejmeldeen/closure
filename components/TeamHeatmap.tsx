"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import { Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { startOfWeek, addWeeks, subWeeks, format, addDays } from "date-fns";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

interface TeamHeatmapProps {
  userIds?: string[]; // If provided, only shows heat for these specific users
  title?: string;
  subtitle?: string;
}

export default function TeamHeatmap({ userIds, title = "Team Heatmap", subtitle }: TeamHeatmapProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Week Tracking State ---
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekKey = format(currentWeek, "yyyy-MM-dd");
  const weekEnd = addDays(currentWeek, 6);

  useEffect(() => {
    const fetchTeamAvailability = async () => {
      setLoading(true);
      
      let query = supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          availability_slots (
            busy_slots,
            week_start_date
          )
        `);

      // Filter to specific users if prop is provided (Task Heatmap)
      if (userIds && userIds.length > 0) {
        query = query.in("id", userIds);
      }
        
      const { data, error } = await query;
        
      if (!error && data) {
        setProfiles(data);
      }
      setLoading(false);
    };
    
    // Only fetch if we aren't waiting on an empty userIds array for a filtered view
    if (!userIds || userIds.length > 0) {
      fetchTeamAvailability();
    } else {
      setProfiles([]);
      setLoading(false);
    }
  }, [userIds]); // Re-fetch if the filtered team changes

  const totalTeamMembers = profiles.length || 1; 

  const heatMapData = useMemo(() => {
    const slots: Record<string, { count: number; names: string[] }> = {};
    
    profiles.forEach(profile => {
      const availabilityRecords = profile.availability_slots || [];
      
      // Find the record that exactly matches our current selected week
      const currentWeekRecord = availabilityRecords.find((r: any) => r.week_start_date === weekKey);
      const busySlots = currentWeekRecord ? currentWeekRecord.busy_slots : [];
      
      busySlots.forEach((slot: string) => {
        if (!slots[slot]) {
          slots[slot] = { count: 0, names: [] };
        }
        slots[slot].count += 1;
        slots[slot].names.push(profile.full_name || "Unknown Operator");
      });
    });
    
    return slots;
  }, [profiles, weekKey]);

  const getHeatColor = (busyCount: number) => {
    if (busyCount === 0) return "bg-white";
    const ratio = busyCount / totalTeamMembers;
    if (ratio <= 0.25) return "bg-[#fef08a] border-[#2D2A26]"; 
    if (ratio <= 0.50) return "bg-[#ffbb00] border-[#2D2A26]"; 
    if (ratio <= 0.75) return "bg-[#f97316] text-white border-[#2D2A26]"; 
    return "bg-[#dc2626] text-white border-[#2D2A26]"; 
  };

  if (loading) {
    return (
      <div className="paper-texture bg-white border-2 border-[#2D2A26] p-8 shadow-brutal flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#2D2A26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="paper-texture bg-white border-2 border-[#2D2A26] p-8 shadow-brutal flex flex-col h-full min-h-[600px]">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 pb-4 border-b-2 border-[#2D2A26] gap-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
            <Users size={20} /> {title}
          </h3>
          <p className="text-[10px] font-bold opacity-50 uppercase mt-1">
            {subtitle || `Displaying ${profiles.length} users overlapping schedules`}
          </p>
        </div>

        {/* Week Switcher */}
        <div className="flex items-center border-2 border-[#2D2A26] bg-[#f5f2e8] shadow-brutal-sm">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 hover:bg-white border-r-2 border-[#2D2A26] transition-colors">
            <ChevronLeft size={16} strokeWidth={3} />
          </button>
          <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest min-w-[150px] text-center">
            {format(currentWeek, "MMM d")} - {format(weekEnd, "MMM d, yy")}
          </span>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 hover:bg-white border-l-2 border-[#2D2A26] transition-colors">
            <ChevronRight size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
      
      <div className="overflow-visible flex-1">
        <div className="min-w-[700px] border-l-2 border-t-2 border-[#2D2A26]">
          {/* Header Row */}
          <div className="grid grid-cols-8">
            <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2"></div>
            {Array.from({ length: 7 }).map((_, i) => {
              const date = addDays(currentWeek, i);
              return (
                <div key={i} className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-center flex flex-col items-center justify-center">
                  <span className="font-black text-[10px] uppercase">{format(date, "EEE")}</span>
                  <span className="font-bold text-lg leading-none mt-1">{format(date, "d")}</span>
                </div>
              );
            })}
          </div>

          {/* Grid Body */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8">
              <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-right font-black text-[9px] uppercase flex items-center justify-end">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
              </div>
              
              {Array.from({ length: 7 }).map((_, i) => {
                const date = addDays(currentWeek, i);
                const dayName = format(date, "EEE"); 
                const slotKey = `${dayName}-${hour}`;
                
                const cellData = heatMapData[slotKey] || { count: 0, names: [] };
                const colorClass = getHeatColor(cellData.count);
                const isBusy = cellData.count > 0;
                
                return (
                  <div key={slotKey} className={`border-r-2 border-b-2 border-[#2D2A26] h-10 flex items-center justify-center transition-colors relative group ${colorClass}`}>
                    {isBusy && (
                      <>
                        <span className="text-[10px] font-black opacity-40">{cellData.count}</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-[#2D2A26] text-white text-[9px] font-bold p-3 z-[200] w-40 shadow-brutal pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                          <span className="opacity-50 border-b border-gray-600 mb-2 pb-1 uppercase tracking-widest flex items-center gap-1">
                            <AlertCircle size={10} /> 
                            {dayName} • {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                          </span>
                          <ul className="space-y-1">
                            {cellData.names.map((name: string, idx: number) => (
                              <li key={idx} className="truncate uppercase tracking-tight text-white/90">• {name}</li>
                            ))}
                          </ul>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2D2A26]"></div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-between border-t-2 border-[#2D2A26] pt-4 shrink-0">
        <span className="text-[9px] font-black uppercase opacity-60">Key</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border-2 border-[#2D2A26]" /><span className="text-[9px] font-black uppercase">Clear (0)</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#fef08a] border-2 border-[#2D2A26]" /><span className="text-[9px] font-black uppercase">Light</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#ffbb00] border-2 border-[#2D2A26]" /><span className="text-[9px] font-black uppercase">Moderate</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#f97316] border-2 border-[#2D2A26]" /><span className="text-[9px] font-black uppercase">Heavy</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#dc2626] border-2 border-[#2D2A26]" /><span className="text-[9px] font-black uppercase">Full Team</span></div>
        </div>
      </div>
    </div>
  );
}
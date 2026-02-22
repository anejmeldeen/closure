"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import { Users, AlertCircle } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

export default function TeamHeatmap() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamAvailability = async () => {
      // 1. Relational join: Fetch profiles AND their availability slots
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          availability_slots (
            busy_slots,
            week_start_date
          )
        `);
        
      if (!error && data) {
        setProfiles(data);
      }
      setLoading(false);
    };
    fetchTeamAvailability();
  }, []);

  const totalTeamMembers = profiles.length || 1; 

  const heatMapData = useMemo(() => {
    const slots: Record<string, { count: number; names: string[] }> = {};
    
    profiles.forEach(profile => {
      const availabilityRecords = profile.availability_slots || [];
      
      // 2. Sort to find the most recent week's record for this user
      const latestRecord = availabilityRecords.sort((a: any, b: any) => 
        new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
      )[0];

      const busySlots = latestRecord ? latestRecord.busy_slots : [];
      
      // 3. Populate the heatmap
      busySlots.forEach((slot: string) => {
        if (!slots[slot]) {
          slots[slot] = { count: 0, names: [] };
        }
        slots[slot].count += 1;
        slots[slot].names.push(profile.full_name || "Unknown Operator");
      });
    });
    
    return slots;
  }, [profiles]);

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
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#2D2A26]">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
            <Users size={20} /> Team Capacity Heatmap
          </h3>
          <p className="text-[10px] font-bold opacity-50 uppercase mt-1">
            Visualizing {profiles.length} operators' overlapping schedules
          </p>
        </div>
      </div>
      
      <div className="overflow-visible flex-1">
        <div className="min-w-[500px] border-l-2 border-t-2 border-[#2D2A26]">
          <div className="grid grid-cols-8">
            <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2"></div>
            {DAYS.map(day => (
              <div key={day} className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-center font-black text-[10px] uppercase">
                {day}
              </div>
            ))}
          </div>

          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8">
              <div className="border-r-2 border-b-2 border-[#2D2A26] bg-[#f5f2e8] p-2 text-right font-black text-[9px] uppercase flex items-center justify-end">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
              </div>
              
              {DAYS.map(day => {
                const slotKey = `${day}-${hour}`;
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
                            {day} • {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
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
        <span className="text-[9px] font-black uppercase opacity-60">Availability Legend</span>
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
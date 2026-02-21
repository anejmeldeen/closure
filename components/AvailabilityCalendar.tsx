// components/AvailabilityCalendar.tsx
'use client';

import { useState, useEffect } from 'react';
import type { EmployeeAvailability } from '@/types/calendar';

export default function AvailabilityCalendar({ employeeIds }: { employeeIds: string[] }) {
  const [availability, setAvailability] = useState<EmployeeAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAvailability() {
      setLoading(true);
      // Let's look at today's schedule
      const start = new Date().toISOString();
      const end = new Date(new Date().setHours(23, 59, 59)).toISOString();
      
      try {
        const res = await fetch(`/api/availability?employees=${employeeIds.join(',')}&start=${start}&end=${end}`);
        const data = await res.json();
        setAvailability(data);
      } catch (error) {
        console.error("Failed to load availability", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailability();
  }, [employeeIds]);

  if (loading) return <div className="p-4 text-gray-500 text-sm">Loading team schedules...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold mb-4">Team Availability Calendar</h3>
      <div className="space-y-6">
        {availability.length === 0 ? (
          <p className="text-sm text-gray-500">No availability data found.</p>
        ) : (
          availability.map((employee) => (
            <div key={employee.employeeId} className="border-b pb-4 last:border-0 last:pb-0">
              <h4 className="font-medium text-gray-800">{employee.name}</h4>
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {employee.events.length === 0 ? (
                  <span className="text-sm text-gray-500">No events scheduled.</span>
                ) : (
                  employee.events.map((event) => (
                    <div 
                      key={event.id} 
                      className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                        event.status === 'busy' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
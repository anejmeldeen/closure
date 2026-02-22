import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DAYS_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function POST(request: Request) {
  try {
    const { profile_id, week_start, timeZone } = await request.json();

    if (!profile_id || !week_start) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Initialize Supabase Admin Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Fetch the Google Calendar Token
    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('access_token, calendar_email')
      .eq('profile_id', profile_id)
      .eq('provider', 'google')
      .single();

    if (!integration || !integration.access_token) {
      return NextResponse.json({ error: 'Google Calendar not linked' }, { status: 404 });
    }

    // 3. Define the Time Bounds (Monday to Sunday)
    const startDate = new Date(week_start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // Include the full week

    // 4. Query Google Calendar Free/Busy API
    const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: timeZone || 'America/New_York', // Fallback timezone if client fails
        items: [{ id: 'primary' }] 
      })
    });

    if (!response.ok) {
      // If the token is expired, this will fail. (A real app handles refresh_tokens here)
      throw new Error('Google API Error or Expired Token');
    }

    const data = await response.json();
    const busyBlocks = data.calendars.primary.busy || [];

    // 5. Translate Google Data into custom "Mon-9" Grid Format
    const newBusySlots = new Set<string>();

    busyBlocks.forEach((block: { start: string, end: string }) => {
      const start = new Date(block.start);
      const end = new Date(block.end);
      
      const dayName = DAYS_MAP[start.getDay()];
      
      const startHour = start.getHours();
      // If an event ends at 10:00 exactly, it shouldn't block the 10am slot, so we subtract 1 millisecond
      const endHour = new Date(end.getTime() - 1).getHours(); 

      // Loop through the hours this event covers
      for (let h = startHour; h <= endHour; h++) {
        // Only log hours that fall within your 8 AM to 6 PM UI Grid
        if (h >= 8 && h <= 18) {
          newBusySlots.add(`${dayName}-${h}`);
        }
      }
    });

    // 6. Fetch any existing manually-set slots for this week
    const { data: existingSlotsRow } = await supabase
      .from('availability_slots')
      .select('id, busy_slots')
      .eq('profile_id', profile_id)
      .eq('week_start_date', week_start)
      .maybeSingle();

    // 7. Merge the arrays (Google Slots + Manual Slots)
    const existingArray = existingSlotsRow?.busy_slots || [];
    const mergedSlots = Array.from(new Set([...existingArray, ...Array.from(newBusySlots)]));

    // 8. Upsert the merged data back to Supabase
    if (existingSlotsRow) {
      await supabase
        .from('availability_slots')
        .update({ busy_slots: mergedSlots })
        .eq('id', existingSlotsRow.id);
    } else {
      await supabase
        .from('availability_slots')
        .insert({
          profile_id,
          week_start_date: week_start,
          busy_slots: mergedSlots
        });
    }

    return NextResponse.json({ 
      success: true, 
      slotsAdded: newBusySlots.size,
      slots: mergedSlots 
    });

  } catch (error: any) {
    console.error('Calendar Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
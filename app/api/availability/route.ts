import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to normalize Google's response
function normalizeGoogleEvents(busyBlocks: any[], profileId: string) {
  return busyBlocks.map((block: any, index: number) => ({
    id: `gcal-${profileId}-${index}`,
    provider: 'google',
    title: 'Busy', // Google FreeBusy API intentionally hides titles for privacy
    startTime: block.start,
    endTime: block.end,
    status: 'busy',
    employeeId: profileId
  }));
}

// Helper to normalize Microsoft's response
function normalizeOutlookEvents(schedules: any[], profileId: string) {
  const events: any[] = [];
  schedules.forEach((schedule: any) => {
    schedule.scheduleItems.forEach((item: any, index: number) => {
      events.push({
        id: `msft-${profileId}-${index}`,
        provider: 'outlook',
        title: 'Busy',
        startTime: item.start.dateTime + 'Z', // Microsoft returns times without the trailing Z
        endTime: item.end.dateTime + 'Z',
        status: item.status, // Microsoft usually returns 'busy', 'tentative', or 'oof' (out of office)
        employeeId: profileId
      });
    });
  });
  return events;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileIds = searchParams.get('profiles')?.split(',') || [];
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end || profileIds.length === 0) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Fetch integrations for these specific profiles
    const { data: integrations, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .in('profile_id', profileIds)
      .eq('sync_status', 'active');

    if (error) throw error;

    let allEvents: any[] = [];

    // 2. Query the APIs in parallel for speed
    await Promise.all(integrations.map(async (integration) => {
      
      // -- GOOGLE CALENDAR LOGIC --
      if (integration.provider === 'google') {
        const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeMin: start,
            timeMax: end,
            items: [{ id: 'primary' }] // Queries their primary calendar
          })
        });

        if (response.ok) {
          const data = await response.json();
          const busyBlocks = data.calendars.primary.busy;
          allEvents = [...allEvents, ...normalizeGoogleEvents(busyBlocks, integration.profile_id)];
        } else {
          console.error(`Google API Error for ${integration.calendar_email}:`, await response.text());
          // NOTE: If response is 401, you need to use the refresh_token to get a new access_token
        }
      }

      // -- MICROSOFT OUTLOOK LOGIC --
      if (integration.provider === 'microsoft') {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'outlook.timezone="UTC"' 
          },
          body: JSON.stringify({
            Schedules: [integration.calendar_email],
            StartTime: { dateTime: start, timeZone: 'UTC' },
            EndTime: { dateTime: end, timeZone: 'UTC' }
          })
        });

        if (response.ok) {
          const data = await response.json();
          allEvents = [...allEvents, ...normalizeOutlookEvents(data.value, integration.profile_id)];
        } else {
          console.error(`Microsoft API Error for ${integration.calendar_email}:`, await response.text());
        }
      }
    }));

    // 3. Group the flat array of events back to their respective profile objects
    const availabilityData = profileIds.map(id => ({
      employeeId: id, // Keeping this key as employeeId for your frontend component compatibility
      name: `User ${id.substring(0,4)}`, // Ideally, join with your profiles table to get real names
      events: allEvents.filter(e => e.employeeId === id)
    }));

    return NextResponse.json(availabilityData);
    
  } catch (error) {
    console.error('Error fetching live calendar data:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
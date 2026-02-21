// app/api/availability/route.ts
import { NextResponse } from 'next/server';
import type { NormalizedEvent, EmployeeAvailability } from '@/types/calendar';

// Mock function representing your database call
async function getEmployeeTokens(employeeIds: string[]) {
  // In reality, fetch this from your DB
  return [
    { employeeId: 'emp_1', provider: 'google', accessToken: 'ya29...' },
    { employeeId: 'emp_2', provider: 'outlook', accessToken: 'EwBQA...' }
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeIds = searchParams.get('employees')?.split(',') || [];
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end || employeeIds.length === 0) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const tokens = await getEmployeeTokens(employeeIds);
    let allEvents: NormalizedEvent[] = [];

    // Ideally, these API calls should be executed in parallel using Promise.all
    for (const token of tokens) {
      if (token.provider === 'google') {
        // Fetch from Google Calendar API
        // const googleData = await fetchGoogleFreeBusy(token.accessToken, start, end);
        // allEvents = [...allEvents, ...normalizeGoogleEvents(googleData, token.employeeId)];
      } else if (token.provider === 'outlook') {
        // Fetch from Microsoft Graph API
        // const outlookData = await fetchOutlookSchedule(token.accessToken, start, end);
        // allEvents = [...allEvents, ...normalizeOutlookEvents(outlookData, token.employeeId)];
      }
      // Note: Apple (iCloud) uses CalDAV, which is notoriously difficult to implement.
      // You will likely need a dedicated CalDAV library for Node.js.
    }

    // Group events by employee for the frontend
    const availabilityData: EmployeeAvailability[] = employeeIds.map(id => ({
      employeeId: id,
      name: `Employee ${id}`, // Fetch real name from DB
      events: allEvents.filter(e => e.employeeId === id)
    }));

    return NextResponse.json(availabilityData);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
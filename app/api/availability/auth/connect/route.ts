// app/api/auth/connect/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  const profileId = searchParams.get('profileId'); // UPDATED: Now expecting profileId

  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

  if (provider === 'google') {
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID!);
    googleAuthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    googleAuthUrl.searchParams.append('response_type', 'code');
    
    // UPDATED: Added the userinfo.email scope so we can populate the calendar_email column
    googleAuthUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email');
    googleAuthUrl.searchParams.append('access_type', 'offline');
    googleAuthUrl.searchParams.append('prompt', 'consent');
    
    // UPDATED: Pass profileId in the state
    const stateData = JSON.stringify({ profileId, provider });
    googleAuthUrl.searchParams.append('state', Buffer.from(stateData).toString('base64'));

    return NextResponse.redirect(googleAuthUrl.toString());
  }

  return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
}
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  const profileId = searchParams.get('profileId');

  // Verify we have what we need
  if (provider !== 'google' || !profileId) {
    return NextResponse.json({ error: 'Missing provider or profileId' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/callback`;

  // We need calendar.readonly to see free/busy, and userinfo.email to log their calendar email
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email');
  
  // prompt=consent and access_type=offline forces Google to give us a Refresh Token
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${profileId}`;

  // Send the user to Google
  return NextResponse.redirect(googleAuthUrl);
}
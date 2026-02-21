// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const encodedState = searchParams.get('state');

  if (!code || !encodedState) {
    return NextResponse.redirect('/?error=MissingAuthData');
  }

  // 1. Decode the state parameter
  const stateString = Buffer.from(encodedState, 'base64').toString('utf-8');
  const { profileId, provider } = JSON.parse(stateString); // UPDATED: Destructure profileId

  try {
    // 2. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error_description);

    // 3. NEW STEP: Fetch the user's Google email using the new access token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoResponse.json();
    const calendarEmail = userInfo.email;

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // 4. Initialize Supabase Admin Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. UPDATED: The exact Supabase Query matching your new schema
    const { error: dbError } = await supabase
      .from('calendar_integrations')
      .upsert({
        profile_id: profileId,
        calendar_email: calendarEmail, // NEW
        provider: provider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, 
        expires_at: expiresAt,
        sync_status: 'active',         // NEW
        last_synced_at: new Date().toISOString(), // NEW
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'profile_id, provider' // Matches the new UNIQUE constraint
      });

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      throw new Error('Failed to save tokens to database');
    }

    return NextResponse.redirect(new URL(`/?success=${provider}Connected`, request.url));
    
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.redirect(new URL('/?error=AuthenticationFailed', request.url));
  }
}
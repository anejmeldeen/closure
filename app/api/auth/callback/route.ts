import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const profileId = searchParams.get('state'); // We passed profileId through the 'state' parameter

  if (!code || !profileId) {
    return NextResponse.redirect(new URL('/settings?error=missing_google_code', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/callback`;

  try {
    // 1. Trade the temporary code for permanent tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Failed to fetch tokens from Google');
    }

    // 2. Fetch the user's Google email address
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    // 3. Initialize Admin Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Required to bypass RLS policies on the backend
    );

    // 4. Upsert the tokens into your calendar_integrations table
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    
    await supabase.from('calendar_integrations').upsert({
      profile_id: profileId,
      calendar_email: userData.email,
      provider: 'google',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null, // Google only sends this on the very first login
      expires_at: expiresAt,
      sync_status: 'active',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,provider' });

    // 5. Success! Send them back to the settings page
    return NextResponse.redirect(new URL('/settings?success=google_linked', request.url));

  } catch (error) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url));
  }
}
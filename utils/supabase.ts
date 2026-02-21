import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This will now pull from .env.local on your machine, 
// and from the Vercel/GitHub secrets when you deploy.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
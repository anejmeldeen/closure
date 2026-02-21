import { createClient } from '@supabase/supabase-js'

// Next.js requires the NEXT_PUBLIC_ prefix to expose these to the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
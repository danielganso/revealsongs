import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Check if we have real Supabase credentials
const hasRealCredentials = supabaseUrl !== 'https://placeholder.supabase.co' && 
                          supabaseAnonKey !== 'placeholder-key' &&
                          !supabaseUrl.includes('your-project-id') &&
                          !supabaseAnonKey.includes('example')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Configurações para desabilitar confirmação de email no cliente
    flowType: 'pkce'
  }
})

// Server-side client with service role key
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => hasRealCredentials

// Helper function to create a server-side Supabase client for API routes
export const createServerSupabaseClient = () => {
  if (!hasRealCredentials) {
    console.warn('Supabase not configured with real credentials. Using placeholder client.')
  }
  return supabaseAdmin
}
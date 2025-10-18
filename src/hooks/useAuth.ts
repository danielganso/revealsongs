import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase is not configured with real credentials. Authentication will not work properly.')
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: undefined // Desabilita redirecionamento por email
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    try {
      // Primeiro, fazer logout no Supabase
      const { error } = await supabase.auth.signOut()
      
      // Limpar manualmente o localStorage e sessionStorage
      if (typeof window !== 'undefined') {
        // Limpar todas as chaves relacionadas ao Supabase
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Limpar sessionStorage também
        const sessionKeysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('sb-')) {
            sessionKeysToRemove.push(key)
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
        
        // Forçar atualização do estado
        setSession(null)
        setUser(null)
      }
      
      return { error }
    } catch (err) {
      console.error('Erro durante logout:', err)
      return { error: err }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error signing in with email:', error)
      throw error
    }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithEmail,
  }
}
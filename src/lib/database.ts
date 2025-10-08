import { supabase } from './supabase'
import type { 
  Database, 
  Subscription, 
  SubscriptionStatus
} from '../types/database'

// Subscription functions
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}

export async function createSubscription(data: {
  user_id: string
  plan_id: string
  plan_type?: string
  credits_remaining?: number
  current_period_end?: string
}) {
  const insertData: any = {
    user_id: data.user_id,
    plan_id: data.plan_id, // String como '5_songs_brl', não UUID
    status: 'active' // O trigger vai preencher songs_quantity, price_cents, currency, etc.
  }

  // Campos opcionais
  if (data.current_period_end) {
    insertData.current_period_end = data.current_period_end
  }

  // Se plan_type foi fornecido explicitamente, usar (senão o trigger vai definir baseado no plan_id)
  if (data.plan_type) {
    insertData.plan_type = data.plan_type
  }

  // Se credits_remaining foi fornecido explicitamente, usar (senão o trigger vai definir baseado na songs_quantity)
  if (data.credits_remaining !== undefined) {
    insertData.credits_remaining = data.credits_remaining
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error
  return subscription
}

export async function updateSubscription(subscriptionId: string, updates: {
  status?: SubscriptionStatus
  credits_remaining?: number
  current_period_end?: string
}) {
  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelSubscription(subscriptionId: string) {
  return updateSubscription(subscriptionId, { status: 'cancelled' })
}

export async function decrementCredits(subscriptionId: string) {
  const { data, error } = await (supabase as any)
    .rpc('decrement_credits', { subscription_id: subscriptionId })

  if (error) throw error
  return data
}

// Song functions
export async function createSong(data: {
  user_id: string
  baby_names: string[]
  babies_count: number
  story?: string | null
  style?: string | null
  voice: string
  language: string
}) {
  const { data: song, error } = await (supabase as any)
    .from('songs')
    .insert({
      user_id: data.user_id,
      baby_names: data.baby_names,
      babies_count: data.babies_count,
      story: data.story,
      style: data.style,
      voice: data.voice,
      language: data.language,
      status: 'draft'
    })
    .select()
    .single()

  if (error) throw error
  return song
}

// Utility functions
export async function getUserStats(userId: string) {
  const subscription = await getUserSubscription(userId)

  return {
    subscription,
    creditsRemaining: subscription?.credits_remaining || 0
  }
}
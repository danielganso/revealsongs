export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      commissions: {
        Row: {
          id: string
          profile_id: string
          partner_name: string
          coupon_code: string
          commission_amount: number
          sales_count: number
          request_date: string
          admin_payment_date: string | null
          status: 'pending' | 'paid'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          partner_name: string
          coupon_code: string
          commission_amount: number
          sales_count: number
          request_date?: string
          admin_payment_date?: string | null
          status?: 'pending' | 'paid'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          partner_name?: string
          coupon_code?: string
          commission_amount?: number
          sales_count?: number
          request_date?: string
          admin_payment_date?: string | null
          status?: 'pending' | 'paid'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gpt_logs: {
        Row: {
          id: string
          song_id: string | null
          user_id: string | null
          model: string
          prompt: string | null
          response: string | null
          created_at: string
        }
        Insert: {
          id?: string
          song_id?: string | null
          user_id?: string | null
          model: string
          prompt?: string | null
          response?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          song_id?: string | null
          user_id?: string | null
          model?: string
          prompt?: string | null
          response?: string | null
          created_at?: string
        }
      }
      lyrics_drafts: {
        Row: {
          id: string
          song_id: string
          draft_index: number
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          song_id: string
          draft_index: number
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          song_id?: string
          draft_index?: number
          text?: string
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          amount_cents: number
          currency: 'USD' | 'BRL'
          status: PaymentStatus
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id: string
          amount_cents: number
          currency: 'USD' | 'BRL'
          status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string
          amount_cents?: number
          currency?: 'USD' | 'BRL'
          status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      partner_sales: {
        Row: {
          id: string
          partner_id: string
          subscription_id: string
          coupon_code: string
          promotion_code_id: string | null
          amount_paid_cents: number
          commission_percentage: number
          commission_amount_cents: number
          currency: string
          sale_type: 'subscription' | 'credits'
          commission_paid: Database['public']['Enums']['commission_status']
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          subscription_id: string
          coupon_code: string
          promotion_code_id?: string | null
          amount_paid_cents: number
          commission_percentage: number
          commission_amount_cents: number
          currency: string
          sale_type: 'subscription' | 'credits'
          commission_paid?: Database['public']['Enums']['commission_status']
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          subscription_id?: string
          coupon_code?: string
          promotion_code_id?: string | null
          amount_paid_cents?: number
          commission_percentage?: number
          commission_amount_cents?: number
          currency?: string
          sale_type?: 'subscription' | 'credits'
          commission_paid?: Database['public']['Enums']['commission_status']
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          plan_code: string
          title: string
          quantity_songs: number
          price_cents: number
          currency: 'USD' | 'BRL'
          applicable_languages: MusicLanguage[]
          stripe_price_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_code: string
          title: string
          quantity_songs: number
          price_cents: number
          currency: 'USD' | 'BRL'
          applicable_languages: MusicLanguage[]
          stripe_price_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_code?: string
          title?: string
          quantity_songs?: number
          price_cents?: number
          currency?: 'USD' | 'BRL'
          applicable_languages?: MusicLanguage[]
          stripe_price_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          phone: string | null
          default_language: MusicLanguage
          country_code: string | null
          created_at: string
          updated_at: string
          user_id: string
          email: string
          role: 'ADMIN' | 'PARCEIRO' | 'USER'
          coupon_code: string | null
          commission_percentage: number | null
          promotion_code_id: string | null
        }
        Insert: {
          id: string
          name?: string | null
          phone?: string | null
          default_language?: MusicLanguage
          country_code?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          email: string
          role?: 'ADMIN' | 'PARCEIRO' | 'USER'
          coupon_code?: string | null
          commission_percentage?: number | null
          promotion_code_id?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          phone?: string | null
          default_language?: MusicLanguage
          country_code?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
          email?: string
          role?: 'ADMIN' | 'PARCEIRO' | 'USER'
          coupon_code?: string | null
          commission_percentage?: number | null
          promotion_code_id?: string | null
        }
      }
      song_versions: {
        Row: {
          id: string
          song_id: string
          version_index: 1 | 2
          audio_url: string | null
          waveform_url: string | null
          duration_seconds: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          song_id: string
          version_index: 1 | 2
          audio_url?: string | null
          waveform_url?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          song_id?: string
          version_index?: 1 | 2
          audio_url?: string | null
          waveform_url?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      songs: {
        Row: {
          id: string
          user_id: string
          baby_names: string[]
          babies_count: number
          story: string | null
          style: string | null
          voice: VoiceType
          language: MusicLanguage
          lyric: string | null
          lyric_attempts: number
          status: SongStatus
          approved_at: string | null
          suno_prompt: string | null
          suno_request_id: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          baby_names: string[]
          babies_count?: number
          story?: string | null
          style?: string | null
          voice: VoiceType
          language: MusicLanguage
          lyric?: string | null
          lyric_attempts?: number
          status?: SongStatus
          approved_at?: string | null
          suno_prompt?: string | null
          suno_request_id?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          baby_names?: string[]
          babies_count?: number
          story?: string | null
          style?: string | null
          voice?: VoiceType
          language?: MusicLanguage
          lyric?: string | null
          lyric_attempts?: number
          status?: SongStatus
          approved_at?: string | null
          suno_prompt?: string | null
          suno_request_id?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: SubscriptionStatus
          credits_remaining: number
          current_period_end: string | null
          stripe_subscription_id: string | null
          promotion_code_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: SubscriptionStatus
          credits_remaining?: number
          current_period_end?: string | null
          stripe_subscription_id?: string | null
          promotion_code_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: SubscriptionStatus
          credits_remaining?: number
          current_period_end?: string | null
          stripe_subscription_id?: string | null
          promotion_code_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      suno_logs: {
        Row: {
          id: string
          song_id: string | null
          user_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          song_id?: string | null
          user_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          song_id?: string | null
          user_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      commission_status: 'false' | 'pending' | 'paid'
      music_language: 'pt_br' | 'en_us' | 'es_es'
      payment_status: 'pending' | 'completed' | 'failed' | 'cancelled'
      song_status: 'draft' | 'lyric_approved' | 'generating' | 'completed' | 'failed'
      subscription_status: 'pending' | 'active' | 'cancelled' | 'expired'
      voice_type: 'male' | 'female'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type aliases for easier use
export type MusicLanguage = Database['public']['Enums']['music_language']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type SongStatus = Database['public']['Enums']['song_status']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
export type VoiceType = Database['public']['Enums']['voice_type']
export type CommissionStatus = Database['public']['Enums']['commission_status']

// Table types
export type Commission = Database['public']['Tables']['commissions']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Song = Database['public']['Tables']['songs']['Row']
export type SongVersion = Database['public']['Tables']['song_versions']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type PartnerSale = Database['public']['Tables']['partner_sales']['Row']
export type LyricsDraft = Database['public']['Tables']['lyrics_drafts']['Row']
export type GPTLog = Database['public']['Tables']['gpt_logs']['Row']
export type SunoLog = Database['public']['Tables']['suno_logs']['Row']
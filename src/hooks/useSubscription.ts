import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string | null;
  credits_remaining: number | null;
  songs_quantity: number | null;
  currency: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string | null;
}

interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  creditsRemaining: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useSubscription = (userId: string | undefined): UseSubscriptionReturn => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 [useSubscription] Buscando subscription para usuário:', userId);
      
      const { data: subscriptions, error: subscriptionError } = await (supabase as any)
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (subscriptionError) {
        console.error('❌ [useSubscription] Erro ao buscar subscription:', subscriptionError);
        setError('Erro ao buscar dados da subscription');
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('⚠️ [useSubscription] Nenhuma subscription encontrada');
        setSubscription(null);
        setCreditsRemaining(0);
        setError(null);
        return;
      }

      const latestSubscription = subscriptions[0];
      console.log('✅ [useSubscription] Subscription encontrada:', {
        id: latestSubscription.id,
        credits_remaining: latestSubscription.credits_remaining,
        status: latestSubscription.status
      });

      setSubscription(latestSubscription);
      setCreditsRemaining(latestSubscription.credits_remaining || 0);
      setError(null);

    } catch (err) {
      console.error('❌ [useSubscription] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setSubscription(null);
      setCreditsRemaining(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single() as { data: SubscriptionData | null; error: any };

        if (error) {
          if (error.code === 'PGRST116') {
            // Nenhuma subscription encontrada
            setSubscription(null);
            setCreditsRemaining(0);
          } else {
            console.error('Erro ao buscar subscription:', error);
          }
          return;
        }

        setSubscription(data);
        setCreditsRemaining(data?.credits_remaining || 0);
      } catch (error) {
        console.error('Erro ao buscar subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [userId]);

  const refetch = () => {
    setLoading(true);
    fetchSubscription();
  };

  return {
    subscription,
    creditsRemaining,
    loading,
    error,
    refetch
  };
};
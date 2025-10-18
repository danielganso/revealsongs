import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserLanguageData {
  language: 'pt' | 'en';
  currency: 'BRL' | 'USD';
  hasSubscription: boolean;
  loading: boolean;
  error: string | null;
}

export const useUserLanguage = (userId: string | undefined): UserLanguageData => {
  const [language, setLanguage] = useState<'pt' | 'en'>('en');
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('USD');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/get-user-currency', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.language) {
            setLanguage(data.language);
          }
          if (data.currency) {
            setCurrency(data.currency);
          }
          setHasSubscription(data.hasSubscription || false);
        } else if (response.status === 401) {
          // Token inválido ou expirado - não logar erro durante logout
          console.log('Sessão expirada durante logout - ignorando erro');
          setLoading(false);
          return;
        }
      } catch (error) {
        // Ignorar erros de rede durante logout
        if (error instanceof Error && error.message.includes('fetch')) {
          console.log('Erro de rede durante logout - ignorando');
        } else {
          console.error('Erro ao buscar idioma do usuário:', error);
          setError(error instanceof Error ? error.message : 'Erro desconhecido');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserLanguage();
  }, [userId]);

  return {
    language,
    currency,
    hasSubscription,
    loading,
    error
  };
};
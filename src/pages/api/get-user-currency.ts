import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🌍 [GET-USER-CURRENCY] API chamada recebida');
  console.log('🔧 [GET-USER-CURRENCY] Método:', req.method);
  
  if (req.method !== 'POST') {
    console.log('❌ [GET-USER-CURRENCY] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization
    console.log('🔧 [GET-USER-CURRENCY] Auth header presente:', !!authHeader);
    
    if (!authHeader) {
      console.log('❌ [GET-USER-CURRENCY] Sem header de autorização');
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      // Não logar como erro se for durante logout - apenas retornar 401 silenciosamente
      if (authError?.message?.includes('Auth session missing') || authError?.status === 400) {
        console.log('🔧 [GET-USER-CURRENCY] Sessão expirada (provavelmente durante logout) - retornando 401 silenciosamente');
        return res.status(401).json({ error: 'Session expired' })
      }
      console.log('❌ [GET-USER-CURRENCY] Token inválido:', authError);
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('✅ [GET-USER-CURRENCY] Usuário autenticado:', user.id);

    // Buscar a subscription mais recente do usuário para obter a currency
    console.log('🔍 [GET-USER-CURRENCY] Buscando subscription do usuário...');
    
    const { data: subscriptions, error: subscriptionError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .select('currency, plan_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (subscriptionError) {
      console.error('❌ [GET-USER-CURRENCY] Erro ao buscar subscription:', subscriptionError);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('🔍 [GET-USER-CURRENCY] Subscriptions encontradas:', subscriptions);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ [GET-USER-CURRENCY] Nenhuma subscription encontrada - usando USD como padrão');
      return res.status(200).json({ 
        currency: 'USD',
        language: 'en',
        hasSubscription: false 
      });
    }

    const subscription = subscriptions[0];
    const currency = subscription.currency || 'USD';
    
    // Determinar idioma baseado na currency
    const language = currency === 'BRL' ? 'pt' : 'en';
    
    console.log('✅ [GET-USER-CURRENCY] Currency encontrada:', currency);
    console.log('✅ [GET-USER-CURRENCY] Idioma determinado:', language);

    return res.status(200).json({
      currency,
      language,
      hasSubscription: true,
      planId: subscription.plan_id,
      status: subscription.status
    });

  } catch (error) {
    console.error('❌ [GET-USER-CURRENCY] Erro interno:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
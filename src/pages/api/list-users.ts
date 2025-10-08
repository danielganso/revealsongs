import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔧 [LIST-USERS] Iniciando listagem de usuários...');

    // Verificar se o usuário atual é ADMIN
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar o token e obter o usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [LIST-USERS] Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar se o usuário é ADMIN
    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      console.error('❌ [LIST-USERS] Usuário não é admin:', { profileError, profile });
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem listar usuários.' });
    }

    // Buscar todos os usuários (profiles)
    const { data: users, error: usersError } = await (supabaseAdmin as any)
      .from('profiles')
      .select(`
        id,
        user_id,
        name,
        email,
        role,
        coupon_code,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ [LIST-USERS] Erro ao buscar usuários:', usersError);
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }

    // Buscar todas as subscriptions
    const { data: subscriptions, error: subscriptionsError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        status,
        credits_remaining,
        songs_quantity,
        price_cents,
        currency,
        current_period_end,
        coupon_code,
        paid_amount_cents,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('❌ [LIST-USERS] Erro ao buscar subscriptions:', subscriptionsError);
      // Não retornar erro aqui, apenas log - subscriptions podem não existir
    }

    // Processar os dados para incluir informações da subscription mais recente
    const processedUsers = users?.map((user: any) => {
      // Encontrar a subscription mais recente para este usuário
      const userSubscriptions = subscriptions?.filter((sub: any) => sub.user_id === user.user_id) || [];
      const latestSubscription = userSubscriptions.length > 0 
        ? userSubscriptions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;

      return {
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        coupon_code: user.coupon_code,
        created_at: user.created_at,
        subscription: latestSubscription ? {
          id: latestSubscription.id,
          plan_id: latestSubscription.plan_id,
          status: latestSubscription.status,
          credits_remaining: latestSubscription.credits_remaining,
          songs_quantity: latestSubscription.songs_quantity,
          price_cents: latestSubscription.price_cents,
          currency: latestSubscription.currency,
          current_period_end: latestSubscription.current_period_end,
          coupon_code: latestSubscription.coupon_code,
          paid_amount_cents: latestSubscription.paid_amount_cents,
          created_at: latestSubscription.created_at
        } : null
      };
    }) || [];

    console.log('✅ [LIST-USERS] Usuários listados com sucesso:', processedUsers.length);

    return res.status(200).json({
      success: true,
      users: processedUsers
    });

  } catch (error) {
    console.error('❌ [LIST-USERS] Erro inesperado:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
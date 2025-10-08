import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId, planId, currency, credits, price } = req.body;
    
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação necessário' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar o token JWT do Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🔧 [UPDATE-SUBSCRIPTION] Atualizando subscription:', {
      subscriptionId,
      planId,
      currency,
      credits,
      price,
      userId: user.id
    });

    // Se subscriptionId não foi fornecido, buscar a subscription ativa do usuário
    let targetSubscriptionId = subscriptionId;
    
    if (!targetSubscriptionId) {
      console.log('🔍 [UPDATE-SUBSCRIPTION] subscriptionId não fornecido, buscando subscription ativa...');
      
      const { data: activeSubscription, error: findError } = await (supabase as any)
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !activeSubscription) {
        // Se não encontrou subscription ativa, buscar qualquer subscription do usuário
        console.log('🔍 [UPDATE-SUBSCRIPTION] Nenhuma subscription ativa encontrada, buscando qualquer subscription...');
        
        const { data: anySubscription, error: findAnyError } = await (supabase as any)
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (findAnyError || !anySubscription) {
          console.error('❌ [UPDATE-SUBSCRIPTION] Nenhuma subscription encontrada para o usuário');
          return res.status(404).json({ error: 'Nenhuma subscription encontrada para este usuário' });
        }
        
        targetSubscriptionId = anySubscription.id;
        console.log('✅ [UPDATE-SUBSCRIPTION] Usando subscription encontrada:', targetSubscriptionId);
      } else {
        targetSubscriptionId = activeSubscription.id;
        console.log('✅ [UPDATE-SUBSCRIPTION] Usando subscription ativa:', targetSubscriptionId);
      }
    }

    // Atualizar a subscription na tabela (usando as colunas corretas)
    const { data: updatedSubscription, error: updateError } = await (supabase as any)
      .from('subscriptions')
      .update({
        plan_id: planId,
        // O trigger auto_fill_subscription_plan_data vai preencher automaticamente:
        // - songs_quantity, price_cents, currency baseado no plan_id
        // - credits_remaining será definido igual a songs_quantity quando status for 'active'
        updated_at: new Date().toISOString()
      })
      .eq('id', targetSubscriptionId)
      .eq('user_id', user.id) // Garantir que só pode atualizar própria subscription
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar subscription:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar subscription' });
    }

    console.log('✅ [UPDATE-SUBSCRIPTION] Subscription atualizada:', updatedSubscription);

    return res.status(200).json({ 
      success: true, 
      subscription: updatedSubscription 
    });

  } catch (error) {
    console.error('Erro no update-subscription:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
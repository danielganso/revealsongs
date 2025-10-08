import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ [CANCEL-SUBSCRIPTION] Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Buscar a assinatura ativa do usuário
    const { data: subscription, error: subscriptionError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subscriptionError || !subscription) {
      console.error('❌ [CANCEL-SUBSCRIPTION] Assinatura não encontrada:', subscriptionError);
      return res.status(404).json({ error: 'Assinatura ativa não encontrada' });
    }

    // Verificar se existe stripe_subscription_id
    if (!subscription.stripe_subscription_id) {
      console.error('❌ [CANCEL-SUBSCRIPTION] stripe_subscription_id não encontrado');
      return res.status(400).json({ error: 'ID da assinatura Stripe não encontrado' });
    }

    console.log('🔧 [CANCEL-SUBSCRIPTION] Cancelando assinatura:', subscription.stripe_subscription_id);

    // Cancelar a assinatura no Stripe
    try {
      const canceledSubscription = await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      console.log('✅ [CANCEL-SUBSCRIPTION] Assinatura cancelada no Stripe:', canceledSubscription.id);
    } catch (stripeError: any) {
      console.error('❌ [CANCEL-SUBSCRIPTION] Erro ao cancelar no Stripe:', stripeError);
      return res.status(500).json({ 
        error: 'Erro ao cancelar assinatura no Stripe',
        details: stripeError.message 
      });
    }

    // Atualizar status na tabela subscriptions para 'cancelled'
    // Mantém os créditos e outras informações do usuário
    const { error: updateError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('❌ [CANCEL-SUBSCRIPTION] Erro ao atualizar status:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar status da assinatura' });
    }

    console.log('✅ [CANCEL-SUBSCRIPTION] Assinatura cancelada com sucesso para usuário:', user.id);

    return res.status(200).json({ 
      message: 'Assinatura cancelada com sucesso',
      subscription_id: subscription.stripe_subscription_id
    });

  } catch (error) {
    console.error('❌ [CANCEL-SUBSCRIPTION] Erro inesperado:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
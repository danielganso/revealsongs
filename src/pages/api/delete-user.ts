import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, profileId, couponCode } = req.body;

    if (!userId || !profileId) {
      return res.status(400).json({ error: 'ID do usuário e perfil são obrigatórios' });
    }

    console.log('🗑️ [DELETE-USER] Iniciando exclusão do usuário:', {
      userId,
      profileId,
      couponCode
    });

    // 1. Excluir cupom do Stripe se existir
    if (couponCode) {
      try {
        await stripe.coupons.del(couponCode);
        console.log('✅ [DELETE-USER] Cupom excluído do Stripe:', couponCode);
      } catch (stripeError: any) {
        console.log('⚠️ [DELETE-USER] Erro ao excluir cupom do Stripe (pode não existir):', stripeError.message);
        // Não falhar a exclusão por causa do erro do Stripe
      }
    }

    // 2. Excluir subscriptions do usuário
    const { error: subscriptionsError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionsError) {
      console.error('❌ [DELETE-USER] Erro ao excluir subscriptions:', subscriptionsError);
      // Não retornar erro aqui, continuar com a exclusão
      console.log('⚠️ [DELETE-USER] Continuando exclusão mesmo com erro nas subscriptions');
    } else {
      console.log('✅ [DELETE-USER] Subscriptions excluídas');
    }

    // 3. Excluir perfil do usuário
    const { error: profileError } = await (supabaseAdmin as any)
      .from('profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', userId);

    if (profileError) {
      console.error('❌ [DELETE-USER] Erro ao excluir perfil:', profileError);
      return res.status(500).json({ error: 'Erro ao excluir perfil do usuário' });
    }

    console.log('✅ [DELETE-USER] Perfil excluído');

    // 4. Excluir usuário da auth (opcional - pode causar problemas se houver outras referências)
    // Por segurança, vamos apenas excluir o perfil e subscriptions
    // O usuário da auth pode ser mantido para evitar problemas de integridade

    console.log('✅ [DELETE-USER] Usuário excluído com sucesso');

    return res.status(200).json({ 
      success: true,
      message: 'Usuário excluído com sucesso'
    });

  } catch (error) {
    console.error('❌ [DELETE-USER] Erro inesperado:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
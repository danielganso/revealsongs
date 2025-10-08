import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { supabase, supabaseAdmin } from '../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Mapeamento de planos para Price IDs do Stripe
const STRIPE_PRICE_IDS: { [key: string]: string } = {
  '2_songs_usd': process.env.STRIPE_PRICE_ID_2_SONGS_USD!,
  '5_songs_usd': process.env.STRIPE_PRICE_ID_5_SONGS_USD!,
  '8_songs_usd': process.env.STRIPE_PRICE_ID_8_SONGS_USD!,
  '2_songs_brl': process.env.STRIPE_PRICE_ID_2_SONGS_BRL!,
  '5_songs_brl': process.env.STRIPE_PRICE_ID_5_SONGS_BRL!,
  '8_songs_brl': process.env.STRIPE_PRICE_ID_8_SONGS_BRL!,
}

// Configuração dos planos
const PLANS = {
  '2_songs_usd': { name: '2 Songs', credits: 2, price: 999, currency: 'USD' },
  '5_songs_usd': { name: '5 Songs', credits: 5, price: 1999, currency: 'USD' },
  '8_songs_usd': { name: '8 Songs', credits: 8, price: 2999, currency: 'USD' },
  '2_songs_brl': { name: '2 Músicas', credits: 2, price: 999, currency: 'BRL' },
  '5_songs_brl': { name: '5 Músicas', credits: 5, price: 5999, currency: 'BRL' },
  '8_songs_brl': { name: '8 Músicas', credits: 8, price: 9999, currency: 'BRL' },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 [CREATE-CHECKOUT] API chamada recebida');
  console.log('🔧 [CREATE-CHECKOUT] Método:', req.method);
  console.log('🔧 [CREATE-CHECKOUT] Body:', req.body);
  
  if (req.method !== 'POST') {
    console.log('❌ [CREATE-CHECKOUT] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization
    console.log('🔧 [CREATE-CHECKOUT] Auth header presente:', !!authHeader);
    
    if (!authHeader) {
      console.log('❌ [CREATE-CHECKOUT] Sem header de autorização');
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.log('❌ [CREATE-CHECKOUT] Token inválido:', authError);
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('✅ [CREATE-CHECKOUT] Usuário autenticado:', user.id);

    const { planId, couponCode } = req.body
    console.log('🔧 [CREATE-CHECKOUT] Plan ID recebido:', planId);
    console.log('🔧 [CREATE-CHECKOUT] Cupom recebido:', couponCode);
    console.log('🔧 [CREATE-CHECKOUT] Price IDs disponíveis:', Object.keys(STRIPE_PRICE_IDS));

    if (!planId || !STRIPE_PRICE_IDS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' })
    }

    const plan = PLANS[planId as keyof typeof PLANS]
    const priceId = STRIPE_PRICE_IDS[planId]

    console.log('🔧 create-checkout-session - Criando sessão:', { 
      userId: user.id, 
      planId, 
      priceId,
      plan 
    })

    // Criar sessão do Stripe Checkout para assinatura
    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // Mudança para assinatura
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/dashboard`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        credits_quantity: plan.credits.toString(),
      },
      // Configurações específicas para assinatura
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          credits_quantity: plan.credits.toString(),
        },
      },
    };

    // Adicionar cupom se fornecido
    if (couponCode && couponCode.trim()) {
      try {
        // Verificar se é um promotion code (código que o usuário vê)
        const promotionCodes = await stripe.promotionCodes.list({
          code: couponCode.trim(),
          active: true,
          limit: 1
        });

        if (promotionCodes.data.length > 0) {
          const promotionCode = promotionCodes.data[0];
          console.log('🎫 [CREATE-CHECKOUT] Promotion Code encontrado:', promotionCode.code);
          
          sessionConfig.discounts = [{
            promotion_code: promotionCode.id
          }];
          console.log('🎫 [CREATE-CHECKOUT] Aplicando promotion code:', promotionCode.code);
        } else {
          // Tentar como coupon direto (fallback)
          const coupon = await stripe.coupons.retrieve(couponCode.trim());
          console.log('🎫 [CREATE-CHECKOUT] Cupom direto encontrado:', coupon.id);
          
          sessionConfig.discounts = [{
            coupon: couponCode.trim()
          }];
          console.log('🎫 [CREATE-CHECKOUT] Aplicando cupom direto:', couponCode.trim());
        }
      } catch (couponError: any) {
        console.error('❌ [CREATE-CHECKOUT] Erro ao verificar cupom/promotion code:', couponError.message);
        // Não aplicar o cupom se não for válido, mas continuar com o checkout
        console.log('⚠️ [CREATE-CHECKOUT] Continuando checkout sem cupom');
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('🔧 create-checkout-session - Sessão criada:', { 
      sessionId: session.id,
      url: session.url 
    })

    // Atualizar a subscription existente com o session_id do Stripe
    const { error: updateError } = await (supabase as any)
      .from('subscriptions')
      .update({ 
        stripe_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('🔧 create-checkout-session - Erro ao atualizar subscription:', updateError)
      // Não falhar aqui, pois a sessão já foi criada
    }

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    })

  } catch (error: any) {
    console.error('🔧 create-checkout-session - Erro:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}
import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Mapeamento de pacotes de créditos para Price IDs do Stripe
const STRIPE_CREDIT_PRICE_IDS: { [key: string]: string } = {
  '2_credits_usd': process.env.STRIPE_PRICE_ID_2_SONGS_USD_AVULSO!,
  '5_credits_usd': process.env.STRIPE_PRICE_ID_5_SONGS_USD_AVULSO!,
  '8_credits_usd': process.env.STRIPE_PRICE_ID_8_SONGS_USD_AVULSO!,
  '2_credits_brl': process.env.STRIPE_PRICE_ID_2_SONGS_BRL_AVULSO!,
  '5_credits_brl': process.env.STRIPE_PRICE_ID_5_SONGS_BRL_AVULSO!,
  '8_credits_brl': process.env.STRIPE_PRICE_ID_8_SONGS_BRL_AVULSO!,
}

// Configuração dos pacotes de créditos
const CREDIT_PACKS = {
  '2_credits_usd': { name: '2 Credits', credits: 2, price: 599, currency: 'USD' },
  '5_credits_usd': { name: '5 Credits', credits: 5, price: 1199, currency: 'USD' },
  '8_credits_usd': { name: '8 Credits', credits: 8, price: 1999, currency: 'USD' },
  '2_credits_brl': { name: '2 Créditos', credits: 2, price: 999, currency: 'BRL' },
  '5_credits_brl': { name: '5 Créditos', credits: 5, price: 1999, currency: 'BRL' },
  '8_credits_brl': { name: '8 Créditos', credits: 8, price: 2999, currency: 'BRL' },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { packId, couponCode } = req.body

    if (!packId) {
      return res.status(400).json({ error: 'Pack ID é obrigatório' })
    }

    // Verificar autenticação
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Erro de autenticação:', authError)
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    // Verificar se o pacote existe
    const pack = CREDIT_PACKS[packId as keyof typeof CREDIT_PACKS]
    const priceId = STRIPE_CREDIT_PRICE_IDS[packId]

    if (!pack || !priceId) {
      return res.status(400).json({ error: 'Pacote de créditos inválido' })
    }

    console.log('🔧 create-credits-checkout - Criando sessão:', { 
      userId: user.id, 
      packId, 
      priceId,
      pack,
      couponCode 
    })

    // Preparar configuração da sessão
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // Pagamento único para recarga de créditos
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}&type=credits`,
      cancel_url: `${req.headers.origin}/dashboard`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        pack_id: packId,
        credits_quantity: pack.credits.toString(),
        type: 'credit_topup',
      },
    }

    // Adicionar cupom se fornecido
    let promotionCode = null
    if (couponCode && couponCode.trim()) {
      // SEMPRE adicionar o coupon_code no metadata, independente da validação
      sessionConfig.metadata!.coupon_code = couponCode.trim()
      console.log('🎫 Cupom adicionado ao metadata:', couponCode.trim())
      
      try {
        // Verificar se o cupom existe no Stripe
        const promotionCodes = await stripe.promotionCodes.list({
          code: couponCode.trim(),
          active: true,
          limit: 1,
        })

        if (promotionCodes.data.length > 0) {
          promotionCode = promotionCodes.data[0]
          sessionConfig.discounts = [{
            promotion_code: promotionCode.id,
          }]
          console.log('🎫 Cupom aplicado com desconto:', couponCode)
        } else {
          console.log('⚠️ Cupom não encontrado ou inativo, mas mantido no metadata:', couponCode)
        }
      } catch (couponError) {
        console.error('Erro ao verificar cupom:', couponError)
        console.log('⚠️ Erro na validação, mas cupom mantido no metadata para tracking')
      }
    }

    // Se há um promotion code válido, incluir seu ID no metadata
    if (promotionCode) {
      sessionConfig.metadata = {
        ...sessionConfig.metadata,
        promotion_code_id: promotionCode.id
      };
    }

    // Criar sessão do Stripe Checkout para pagamento único
    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('🔧 create-credits-checkout - Sessão criada:', { 
      sessionId: session.id,
      url: session.url 
    })

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    })

  } catch (error) {
    console.error('Erro ao criar sessão de checkout para créditos:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
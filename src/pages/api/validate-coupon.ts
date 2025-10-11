import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../../types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { couponCode } = req.body

    if (!couponCode) {
      return res.status(400).json({ error: 'Coupon code is required' })
    }

    console.log('🔧 [VALIDATE-COUPON] Validando cupom:', couponCode)

    // Primeiro, tentar como promotion code (código que o usuário vê)
    try {
      console.log('🔍 [VALIDATE-COUPON] Buscando promotion codes para:', couponCode.trim())
      
      const promotionCodes = await stripe.promotionCodes.list({
        code: couponCode.trim(),
        active: true,
        limit: 1,
      })

      console.log('🔍 [VALIDATE-COUPON] Resposta da Stripe para promotion codes:', JSON.stringify(promotionCodes, null, 2))
      console.log('🔍 [VALIDATE-COUPON] Número de promotion codes encontrados:', promotionCodes.data.length)

      if (promotionCodes.data.length > 0) {
        const promotionCode = promotionCodes.data[0]
        console.log('🎫 [VALIDATE-COUPON] Promotion Code encontrado:', promotionCode.code)
        console.log('🎫 [VALIDATE-COUPON] Promotion Code coupon object:', JSON.stringify(promotionCode.coupon, null, 2))
        
        // O coupon pode ser um objeto ou string, vamos verificar
        const couponId = typeof promotionCode.coupon === 'string' ? promotionCode.coupon : promotionCode.coupon.id
        console.log('🎫 [VALIDATE-COUPON] Coupon ID extraído:', couponId)
        
        const coupon = await stripe.coupons.retrieve(couponId)
        console.log('🎫 [VALIDATE-COUPON] Cupom associado:', coupon.id, 'válido:', coupon.valid)
        
        return res.status(200).json({
          valid: true,
          type: 'promotion_code',
          data: {
            id: promotionCode.id,
            code: promotionCode.code,
            coupon: coupon,
          }
        })
      } else {
        console.log('⚠️ [VALIDATE-COUPON] Nenhum promotion code encontrado para:', couponCode)
        
        // Vamos também tentar buscar todos os promotion codes para debug
        console.log('🔍 [VALIDATE-COUPON] Buscando TODOS os promotion codes ativos para debug...')
        const allPromotionCodes = await stripe.promotionCodes.list({
          active: true,
          limit: 10,
        })
        console.log('🔍 [VALIDATE-COUPON] Todos os promotion codes ativos:', JSON.stringify(allPromotionCodes.data.map(pc => ({ id: pc.id, code: pc.code, active: pc.active })), null, 2))
      }
    } catch (error: any) {
      console.log('❌ [VALIDATE-COUPON] Erro completo da Stripe ao buscar promotion code:', JSON.stringify(error, null, 2))
      console.log('❌ [VALIDATE-COUPON] Mensagem de erro:', error.message)
      console.log('❌ [VALIDATE-COUPON] Código de erro:', error.code)
      console.log('❌ [VALIDATE-COUPON] Tipo de erro:', error.type)
    }

    // Se não encontrou como promotion code, tentar como cupom direto (fallback)
    try {
      const coupon = await stripe.coupons.retrieve(couponCode.trim())
      console.log('🔍 [VALIDATE-COUPON] Resposta da Stripe para cupom direto:', JSON.stringify(coupon, null, 2))
      console.log('🎫 [VALIDATE-COUPON] Cupom direto encontrado:', coupon.id, 'válido:', coupon.valid)
      
      if (coupon.valid) {
        return res.status(200).json({
          valid: true,
          type: 'coupon',
          data: coupon
        })
      } else {
        console.log('⚠️ [VALIDATE-COUPON] Cupom encontrado mas não é válido:', coupon.id)
      }
    } catch (error: any) {
      console.log('❌ [VALIDATE-COUPON] Erro completo da Stripe ao buscar cupom direto:', JSON.stringify(error, null, 2))
      console.log('❌ [VALIDATE-COUPON] Mensagem de erro:', error.message)
      console.log('❌ [VALIDATE-COUPON] Código de erro:', error.code)
      console.log('❌ [VALIDATE-COUPON] Tipo de erro:', error.type)
    }

    // Se chegou até aqui, o cupom não é válido
    return res.status(200).json({ valid: false })

  } catch (error) {
    console.error('Erro ao validar cupom:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔧 [UPDATE-USER] Iniciando atualização de usuário...');

    // Verificar se o usuário atual é ADMIN
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar o token e obter o usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [UPDATE-USER] Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar se o usuário é ADMIN
    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      console.error('❌ [UPDATE-USER] Usuário não é admin:', { profileError, profile });
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem atualizar usuários.' });
    }

    const { 
      userId, 
      profileId, 
      subscriptionId, 
      name, 
      email, 
      role,
      couponCode, 
      discountPercent,
      commission,
      planId, 
      creditsQuantity, 
      subscriptionStatus,
      region 
    } = req.body;

    if (!userId || !profileId) {
      return res.status(400).json({ error: 'ID do usuário e perfil são obrigatórios' });
    }

    console.log('🔧 [UPDATE-USER] Dados recebidos:', {
      userId,
      profileId,
      subscriptionId,
      name,
      email,
      role,
      couponCode,
      discountPercent,
      commission
    });

    // Obter dados atuais do usuário para comparar mudanças
    const { data: currentProfile, error: currentProfileError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('coupon_code, name')
      .eq('id', profileId)
      .single();

    if (currentProfileError) {
      console.error('❌ [UPDATE-USER] Erro ao obter perfil atual:', currentProfileError);
      return res.status(500).json({ error: 'Erro ao obter dados atuais do usuário' });
    }

    const couponCodeChanged = currentProfile?.coupon_code !== couponCode;

    // Atualizar perfil
    // Para usuários não-PARCEIRO, converter string vazia em NULL
    const finalCouponCode = (role !== 'PARCEIRO' && (!couponCode || couponCode.trim() === '')) 
      ? null 
      : couponCode;

    const { data: updatedProfile, error: profileUpdateError } = await (supabaseAdmin as any)
      .from('profiles')
      .update({
        name: name,
        email: email,
        role: role,
        coupon_code: finalCouponCode,
        commission_percentage: commission || 10
      })
      .eq('id', profileId)
      .select()
      .single();

    if (profileUpdateError) {
      console.error('❌ [UPDATE-USER] Erro ao atualizar perfil:', profileUpdateError);
      return res.status(500).json({ error: 'Erro ao atualizar perfil do usuário' });
    }

    console.log('✅ [UPDATE-USER] Perfil atualizado:', updatedProfile?.id);

    // Gerenciar cupons no Stripe se há cupom e desconto definidos
    if (role === 'PARCEIRO' && couponCode && discountPercent) {
      console.log('🔧 [UPDATE-USER] Gerenciando cupons no Stripe...', { couponCode, discountPercent, couponCodeChanged });
      
      // Gerenciar cupons no Stripe se for parceiro
      let stripeCoupon: any = null;
      
      try {
        // Deletar cupons antigos se existir e foi alterado
        if (couponCodeChanged && currentProfile?.coupon_code) {
          try {
            // Tentar deletar cupons antigos (formato antigo)
            await stripe.coupons.del(currentProfile.coupon_code);
            console.log('🗑️ [UPDATE-USER] Cupom antigo deletado do Stripe:', currentProfile.coupon_code);
          } catch (deleteError: any) {
            console.log('⚠️ [UPDATE-USER] Cupom antigo não encontrado no Stripe (pode já ter sido deletado):', deleteError.message);
          }
        }

        // Verificar se o promotion code já existe no Stripe
        if (couponCode) {
          try {
            const existingPromotionCodes = await stripe.promotionCodes.list({
              code: couponCode,
              limit: 1
            });
            
            if (existingPromotionCodes.data.length > 0) {
              console.error('❌ [UPDATE-USER] Promotion code já existe no Stripe:', couponCode);
              return res.status(400).json({ 
                error: 'Código promocional já existe no Stripe. Escolha outro código.' 
              });
            }
            console.log('✅ [UPDATE-USER] Promotion code não existe no Stripe, pode criar');
          } catch (listError: any) {
            console.error('❌ [UPDATE-USER] Erro ao verificar promotion code:', listError);
            throw listError;
          }
        }

        // Criar cupom único (duration: once, sem restrição de produtos)
        stripeCoupon = await stripe.coupons.create({
          name: `Cupom ${name}`,
          percent_off: discountPercent,
          duration: 'once', // Uso único
          // Sem applies_to - pode ser usado em qualquer produto
          metadata: {
            partner_name: name,
            partner_email: email,
            partner_id: profileId,
            updated_at: new Date().toISOString()
          }
        });

        console.log('✅ [UPDATE-USER] Cupom único criado no Stripe:', {
          id: stripeCoupon.id,
          name: stripeCoupon.name,
          percent_off: stripeCoupon.percent_off,
          duration: stripeCoupon.duration
        });

        // Criar promotion code único
        const stripePromotionCode = await stripe.promotionCodes.create({
          coupon: stripeCoupon.id,
          code: couponCode,
          active: true,
          metadata: {
            partner_name: name,
            partner_email: email,
            partner_id: profileId,
            updated_at: new Date().toISOString()
          }
        });

        console.log('✅ [UPDATE-USER] Promotion code único criado no Stripe:', {
          id: stripePromotionCode.id,
          code: stripePromotionCode.code,
          coupon_id: stripePromotionCode.coupon.id
        });

        // Salvar o promotion code único na tabela profiles
        const { error: promotionCodeUpdateError } = await (supabaseAdmin as any)
          .from('profiles')
          .update({
            promotion_code_id: stripePromotionCode.id
          })
          .eq('id', profileId);

        if (promotionCodeUpdateError) {
          console.error('❌ [UPDATE-USER] Erro ao salvar promotion code:', promotionCodeUpdateError);
        } else {
          console.log('✅ [UPDATE-USER] Promotion code salvo na tabela profiles');
        }

      } catch (stripeError: any) {
        console.error('❌ [UPDATE-USER] Erro ao gerenciar cupons no Stripe:', stripeError);
        
        // Tentar limpar cupom criado em caso de erro
        try {
          if (stripeCoupon?.id) {
            await stripe.coupons.del(stripeCoupon.id);
            console.log('🗑️ [UPDATE-USER] Cupom removido após erro');
          }
        } catch (cleanupError: any) {
          console.error('❌ [UPDATE-USER] Erro ao limpar cupom após falha:', cleanupError);
        }
        
        // Não falhar a atualização por causa do erro do Stripe, mas logar
        console.log('⚠️ [UPDATE-USER] Perfil atualizado, mas erro ao gerenciar cupons no Stripe');
      }
    }

    // Atualizar subscription se existir
    let updatedSubscription = null;
    if (subscriptionId) {
      const updateData: any = {};

      // Adicionar campos apenas se fornecidos
      if (planId) updateData.plan_id = planId;
      if (creditsQuantity !== undefined) {
        updateData.credits_remaining = creditsQuantity;
        updateData.songs_quantity = creditsQuantity;
      }
      if (region) updateData.currency = region === 'BR' ? 'BRL' : 'USD';
      if (couponCode) updateData.coupon_code = couponCode;
      if (subscriptionStatus) updateData.status = subscriptionStatus;

      console.log('🔧 [UPDATE-USER] Atualizando subscription com dados:', updateData);

      const { data: subscription, error: subscriptionUpdateError } = await (supabaseAdmin as any)
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (subscriptionUpdateError) {
        console.error('❌ [UPDATE-USER] Erro ao atualizar subscription:', subscriptionUpdateError);
        // Não retornar erro aqui, pois o perfil já foi atualizado
        console.log('⚠️ [UPDATE-USER] Perfil atualizado, mas erro na subscription');
      } else {
        updatedSubscription = subscription;
        console.log('✅ [UPDATE-USER] Subscription atualizada:', subscription?.id);
      }
    }

    // Resposta de sucesso
    const response = {
      success: true,
      user: {
        id: updatedProfile?.id,
        user_id: updatedProfile?.user_id,
        name: updatedProfile?.name,
        email: updatedProfile?.email,
        role: updatedProfile?.role,
        coupon_code: updatedProfile?.coupon_code,
        updated_at: updatedProfile?.updated_at
      },
      subscription: updatedSubscription ? {
        id: updatedSubscription.id,
        plan_id: updatedSubscription.plan_id,
        credits_remaining: updatedSubscription.credits_remaining,
        status: updatedSubscription.status,
        currency: updatedSubscription.currency
      } : null
    };

    console.log('✅ [UPDATE-USER] Usuário atualizado com sucesso:', response);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ [UPDATE-USER] Erro inesperado:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
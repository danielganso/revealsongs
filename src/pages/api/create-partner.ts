import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabase';
// Define the PartnerFormData type locally to avoid JSX import issues
interface PartnerFormData {
  name: string;
  email: string;
  password: string;
  couponCode: string;
  planId: string;
  creditsQuantity: number;
  discountPercent: number;
  region?: string;
  subscriptionStatus?: string;
}
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔧 [CREATE-PARTNER] Iniciando criação de parceiro...');

    // Verificar se o usuário atual é ADMIN
    const authHeader = req.headers.authorization;
    console.log('🔧 [CREATE-PARTNER] Authorization header:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔧 [CREATE-PARTNER] Token extraído:', token ? 'Presente' : 'Ausente');
    
    // Verificar o token e obter o usuário
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [CREATE-PARTNER] Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('🔧 [CREATE-PARTNER] Usuário autenticado:', {
      id: user.id,
      email: user.email
    });

    // Verificar se o usuário é ADMIN - usando supabaseAdmin para contornar RLS
    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('role, email, name')
      .eq('user_id', user.id)
      .single();

    console.log('🔧 [CREATE-PARTNER] Resultado da consulta de perfil:', {
      profile,
      profileError,
      userId: user.id,
      userEmail: user.email
    });

    if (profileError || !profile) {
      console.error('❌ [CREATE-PARTNER] Perfil não encontrado:', profileError);
      return res.status(403).json({ error: 'Perfil de usuário não encontrado.' });
    }

    if (profile.role !== 'ADMIN') {
      console.error('❌ [CREATE-PARTNER] Usuário não é admin. Role atual:', profile.role);
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar parceiros.' });
    }

    console.log('✅ [CREATE-PARTNER] Usuário admin verificado:', {
      name: profile.name,
      email: profile.email,
      role: profile.role
    });

    const partnerData: PartnerFormData = req.body;

    // Validar dados obrigatórios
    if (!partnerData.name || !partnerData.email || !partnerData.password || 
        !partnerData.couponCode || !partnerData.planId || !partnerData.discountPercent) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // Validar porcentagem de desconto
    if (partnerData.discountPercent < 1 || partnerData.discountPercent > 100) {
      return res.status(400).json({ error: 'Porcentagem de desconto deve estar entre 1% e 100%' });
    }

    console.log('🔧 [CREATE-PARTNER] Dados validados:', {
      name: partnerData.name,
      email: partnerData.email,
      couponCode: partnerData.couponCode,
      planId: partnerData.planId,
      creditsQuantity: partnerData.creditsQuantity,
      subscriptionStatus: partnerData.subscriptionStatus,
      discountPercent: partnerData.discountPercent
    });

    // Verificar se o email já existe
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', partnerData.email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Verificar se o cupom já existe
    const { data: existingCoupon, error: couponCheckError } = await supabaseAdmin
      .from('profiles')
      .select('coupon_code')
      .eq('coupon_code', partnerData.couponCode)
      .single();

    if (existingCoupon) {
      return res.status(400).json({ error: 'Código de cupom já está em uso' });
    }

    // Criar usuário no Supabase Auth
    console.log('🔧 [CREATE-PARTNER] Criando usuário no auth...');
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: partnerData.email,
      password: partnerData.password,
      user_metadata: {
        name: partnerData.name
      },
      email_confirm: true // Confirmar email automaticamente
    });

    if (createUserError || !newUser.user) {
      console.error('❌ [CREATE-PARTNER] Erro ao criar usuário:', createUserError);
      return res.status(500).json({ error: 'Erro ao criar usuário: ' + createUserError?.message });
    }

    console.log('✅ [CREATE-PARTNER] Usuário criado no auth:', newUser.user.id);

    // Verificar e limpar qualquer perfil existente com este email (por segurança)
    console.log('🔧 [CREATE-PARTNER] Verificando perfis existentes...');
    const { data: existingProfiles } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id, email, user_id')
      .eq('email', partnerData.email);

    if (existingProfiles && existingProfiles.length > 0) {
      console.log('🧹 [CREATE-PARTNER] Removendo perfis duplicados:', existingProfiles);
      for (const profile of existingProfiles) {
        await (supabaseAdmin as any).from('profiles').delete().eq('id', profile.id);
        console.log('🗑️ [CREATE-PARTNER] Perfil removido:', profile.id);
      }
    }

    // Criar perfil do parceiro
    console.log('🔧 [CREATE-PARTNER] Criando perfil do parceiro...');
    const { data: newProfile, error: profileCreateError } = await (supabaseAdmin as any)
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        name: partnerData.name,
        email: partnerData.email,
        role: 'PARCEIRO',
        coupon_code: partnerData.couponCode
      })
      .select()
      .single();

    if (profileCreateError) {
      console.error('❌ [CREATE-PARTNER] Erro ao criar perfil:', profileCreateError);
      // Tentar deletar o usuário criado se falhou ao criar o perfil
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({ error: 'Erro ao criar perfil do parceiro' });
    }

    console.log('✅ [CREATE-PARTNER] Perfil criado:', newProfile?.id);

    // Criar cupom no Stripe
    console.log('🔧 [CREATE-PARTNER] Criando cupom no Stripe...');
    try {
      // Verificar se o cupom já existe no Stripe
      try {
        const existingCoupon = await stripe.coupons.retrieve(partnerData.couponCode);
        if (existingCoupon) {
          console.error('❌ [CREATE-PARTNER] Cupom já existe no Stripe:', partnerData.couponCode);
          // Se falhar ao criar o cupom, deletar o usuário e perfil criados
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          return res.status(400).json({ 
            error: 'Código de cupom já existe no Stripe. Escolha outro código.' 
          });
        }
      } catch (retrieveError: any) {
        // Se o cupom não existe (erro 404), podemos continuar
        if (retrieveError.code !== 'resource_missing') {
          throw retrieveError; // Re-throw se for outro tipo de erro
        }
        console.log('✅ [CREATE-PARTNER] Cupom não existe no Stripe, pode criar');
      }

      const stripeCoupon = await stripe.coupons.create({
        id: partnerData.couponCode, // Usar o código do cupom como ID
        name: `Cupom ${partnerData.name}`, // Nome do cupom
        percent_off: partnerData.discountPercent, // Porcentagem de desconto
        duration: 'forever', // Uso ilimitado
        metadata: {
          partner_name: partnerData.name,
          partner_email: partnerData.email,
          partner_id: newProfile?.id
        }
      });

      console.log('✅ [CREATE-PARTNER] Cupom criado no Stripe:', {
        id: stripeCoupon.id,
        percent_off: stripeCoupon.percent_off,
        duration: stripeCoupon.duration
      });
    } catch (stripeError: any) {
      console.error('❌ [CREATE-PARTNER] Erro ao criar cupom no Stripe:', stripeError);
      // Se falhar ao criar o cupom, deletar o usuário e perfil criados
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({ 
        error: 'Erro ao criar cupom no Stripe: ' + stripeError.message 
      });
    }

    // Criar subscription inicial para o parceiro
    console.log('🔧 [CREATE-PARTNER] Criando subscription inicial...');
    const { data: newSubscription, error: subscriptionError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .insert({
        user_id: newUser.user.id,
        plan_id: partnerData.planId,
        status: partnerData.subscriptionStatus || 'active',
        credits_remaining: partnerData.creditsQuantity,
        songs_quantity: partnerData.creditsQuantity,
        price_cents: 0, // Grátis para parceiros
        currency: partnerData.region === 'BR' ? 'BRL' : 'USD',
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
        coupon_code: partnerData.couponCode,
        paid_amount_cents: 0
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('❌ [CREATE-PARTNER] Erro ao criar subscription:', subscriptionError);
      // Não deletar o usuário aqui, pois o perfil já foi criado
      return res.status(500).json({ error: 'Parceiro criado, mas erro ao criar subscription inicial' });
    }

    console.log('✅ [CREATE-PARTNER] Subscription criada:', newSubscription?.id);

    // Resposta de sucesso
    const response = {
      success: true,
      partner: {
        id: newProfile?.id,
        user_id: newUser.user.id,
        name: newProfile?.name,
        email: newProfile?.email,
        role: newProfile?.role,
        coupon_code: newProfile?.coupon_code,
        created_at: newProfile?.created_at
      },
      subscription: {
        id: newSubscription?.id,
        plan_id: newSubscription?.plan_id,
        credits_remaining: newSubscription?.credits_remaining,
        status: newSubscription?.status
      }
    };

    console.log('✅ [CREATE-PARTNER] Parceiro criado com sucesso:', response);

    return res.status(201).json(response);

  } catch (error) {
    console.error('❌ [CREATE-PARTNER] Erro inesperado:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
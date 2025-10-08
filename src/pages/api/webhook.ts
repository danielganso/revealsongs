import { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import Stripe from 'stripe'
import { supabase } from '../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔔 [WEBHOOK] Stripe webhook recebido');
  console.log('🔧 [WEBHOOK] Método da requisição:', req.method);
  console.log('🔧 [WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2));
  
  // Suporte temporário para GET (debug)
  if (req.method === 'GET') {
    console.log('ℹ️ [WEBHOOK] Requisição GET recebida - retornando status OK para debug');
    return res.status(200).json({ 
      message: 'Webhook endpoint está funcionando',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method !== 'POST') {
    console.log('❌ [WEBHOOK] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']!

  console.log('🔧 [WEBHOOK] Verificando assinatura do webhook...');

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
    console.log('✅ [WEBHOOK] Assinatura verificada com sucesso');
    console.log('🔧 [WEBHOOK] Tipo do evento:', event.type);
  } catch (err: any) {
    console.error('❌ [WEBHOOK] Falha na verificação da assinatura:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('🔧 [WEBHOOK] Processando checkout.session.completed...');
        const session = event.data.object as Stripe.Checkout.Session
        console.log('🔧 [WEBHOOK] Dados da sessão:', {
          id: session.id,
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email,
          mode: session.mode,
          subscription: session.subscription
        })
        await handleCheckoutCompleted(session)
        break

      case 'invoice.payment_succeeded':
        console.log('🔧 [WEBHOOK] Processando invoice.payment_succeeded...');
        const invoice = event.data.object as Stripe.Invoice
        console.log('🔧 [WEBHOOK] Dados da fatura:', {
          id: invoice.id,
          subscription: invoice.subscription,
          customer: invoice.customer,
          amount_paid: invoice.amount_paid
        })
        await handleInvoicePaymentSucceeded(invoice)
        break

      case 'customer.subscription.deleted':
        console.log('🔧 [WEBHOOK] Processando customer.subscription.deleted...');
        const subscription = event.data.object as Stripe.Subscription
        console.log('🔧 [WEBHOOK] Assinatura cancelada:', {
          id: subscription.id,
          customer: subscription.customer
        })
        await handleSubscriptionDeleted(subscription)
        break

      default:
        console.log('⚠️ [WEBHOOK] Evento não tratado:', event.type)
    }

    console.log('✅ [WEBHOOK] Webhook processado com sucesso');
    res.status(200).json({ received: true })
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🔧 [WEBHOOK] Iniciando handleCheckoutCompleted...');
  console.log('🔧 [WEBHOOK] Session completa recebida:', JSON.stringify({
    id: session.id,
    mode: session.mode,
    payment_status: session.payment_status,
    customer_email: session.customer_details?.email,
    subscription: session.subscription,
    metadata: session.metadata,
    amount_total: session.amount_total
  }, null, 2));
  
  try {
    console.log('🔧 [WEBHOOK] Processando checkout completed...');
    console.log('🔧 [WEBHOOK] Session mode:', session.mode);
    console.log('🔧 [WEBHOOK] Session metadata:', session.metadata);

    if (session.mode === 'subscription') {
      console.log('🔧 [WEBHOOK] Modo assinatura - processando primeiro pagamento');
      
      // Para assinaturas, processar o primeiro pagamento aqui
      // Renovações automáticas serão processadas no invoice.payment_succeeded
      
      console.log('🔧 [WEBHOOK] Buscando subscription com stripe_session_id:', session.id);
      
      // Buscar subscription pela stripe_session_id
      const { data: subscription, error: subscriptionError } = await (supabase as any)
        .from('subscriptions')
        .select('*')
        .eq('stripe_session_id', session.id)
        .single()
      
      console.log('🔧 [WEBHOOK] Resultado da busca subscription:', {
        found: !!subscription,
        error: subscriptionError,
        subscription_data: subscription ? {
          id: subscription.id,
          user_id: subscription.user_id,
          status: subscription.status,
          stripe_session_id: subscription.stripe_session_id
        } : null
      });
      
      if (subscriptionError || !subscription) {
        console.error('❌ [WEBHOOK] Subscription não encontrada para session:', session.id, subscriptionError)
        
        // Tentar buscar por outros critérios para debug
        console.log('🔧 [WEBHOOK] Tentando buscar subscription por customer_email...');
        const customerEmail = session.customer_details?.email;
        if (customerEmail) {
          const { data: userProfile } = await (supabase as any)
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .single();
            
          if (userProfile) {
            const { data: subscriptions } = await (supabase as any)
              .from('subscriptions')
              .select('*')
              .eq('user_id', userProfile.id)
              .order('created_at', { ascending: false });
              
            console.log('🔧 [WEBHOOK] Subscriptions encontradas para o usuário:', subscriptions);
          }
        }
        
        return
      }

      console.log('✅ [WEBHOOK] Subscription encontrada:', {
        id: subscription.id,
        user_id: subscription.user_id,
        status: subscription.status
      });

      // Obter quantidade de créditos do metadata da sessão
      const creditsQuantity = parseInt(session.metadata?.credits_quantity || '0')
      
      console.log('🔧 [WEBHOOK] Quantidade de créditos do metadata:', creditsQuantity);
      console.log('🔧 [WEBHOOK] Metadata completo:', session.metadata);
      console.log('🔧 [WEBHOOK] Session subscription ID:', session.subscription);
      console.log('🔧 [WEBHOOK] Session payment intent:', session.payment_intent);
      console.log('🔧 [WEBHOOK] Session amount total:', session.amount_total);
      
      if (creditsQuantity <= 0) {
        console.error('❌ [WEBHOOK] Quantidade inválida de créditos no metadata:', session.metadata)
        console.error('❌ [WEBHOOK] PARANDO AQUI - Metadata inválido impede atualização das outras colunas!')
        return
      }

      // Capturar dados do cupom e valor pago
      let couponCode: string | null = null;
      let paidAmountCents: number | null = null;

      // Verificar se há desconto aplicado na sessão
      console.log('🔧 [WEBHOOK] Verificando descontos na sessão...');
      console.log('🔧 [WEBHOOK] Session total_details:', JSON.stringify(session.total_details, null, 2));
      
      // Log completo da sessão para encontrar onde está o cupom
      console.log('🔧 [WEBHOOK] SESSÃO COMPLETA PARA DEBUG:');
      console.log('🔧 [WEBHOOK] Session ID:', session.id);
      console.log('🔧 [WEBHOOK] Session customer_details:', JSON.stringify(session.customer_details, null, 2));
      console.log('🔧 [WEBHOOK] Session line_items (se disponível):', JSON.stringify(session.line_items, null, 2));
      console.log('🔧 [WEBHOOK] Session metadata:', JSON.stringify(session.metadata, null, 2));
      
      // Tentar buscar line_items expandidos se não estiverem na sessão
      let expandedSession = null;
      if (!session.line_items) {
        try {
          console.log('🔧 [WEBHOOK] Buscando line_items expandidos...');
          expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items', 'line_items.data.discounts']
          });
          console.log('🔧 [WEBHOOK] Line items expandidos:', JSON.stringify(expandedSession.line_items, null, 2));
        } catch (error) {
          console.error('❌ [WEBHOOK] Erro ao buscar line_items:', error);
        }
      }
      
      // Procurar cupom nos line_items expandidos
      if (expandedSession?.line_items?.data && expandedSession.line_items.data.length > 0) {
        const lineItem = expandedSession.line_items.data[0];
        if (lineItem.discounts && lineItem.discounts.length > 0) {
          const discount = lineItem.discounts[0];
          if (discount.discount?.coupon?.id) {
            couponCode = discount.discount.coupon.id;
            console.log('🎫 [WEBHOOK] Cupom encontrado nos line_items:', couponCode);
          }
        }
      }
      
      if (session.total_details?.breakdown?.discounts && session.total_details.breakdown.discounts.length > 0) {
        console.log('🔧 [WEBHOOK] Descontos encontrados:', session.total_details.breakdown.discounts);
        const discount = session.total_details.breakdown.discounts[0];
        
        // Verificar estrutura do desconto
        console.log('🔧 [WEBHOOK] Estrutura do desconto:', JSON.stringify(discount, null, 2));
        
        // Tentar diferentes estruturas possíveis do Stripe
        if (discount.discount?.coupon) {
          // Estrutura: discount.discount.coupon
          if (discount.discount.promotion_code) {
            try {
              const promotionCode = await stripe.promotionCodes.retrieve(discount.discount.promotion_code as string);
              couponCode = promotionCode.code;
              console.log('🎫 [WEBHOOK] Cupom via promotion code:', couponCode);
            } catch (error) {
              console.error('❌ [WEBHOOK] Erro ao buscar promotion code:', error);
            }
          } else {
            couponCode = discount.discount.coupon.id;
            console.log('🎫 [WEBHOOK] Cupom direto (discount.discount.coupon):', couponCode);
          }
        } else {
          // Estrutura alternativa - verificar se existe propriedade coupon no discount
          const discountAny = discount as any;
          if (discountAny.coupon) {
            if (typeof discountAny.coupon === 'string') {
              couponCode = discountAny.coupon;
              console.log('🎫 [WEBHOOK] Cupom direto (discount.coupon string):', couponCode);
            } else if (discountAny.coupon?.id) {
              couponCode = discountAny.coupon.id;
              console.log('🎫 [WEBHOOK] Cupom direto (discount.coupon.id):', couponCode);
            }
          }
        }
      } else {
        console.log('🔧 [WEBHOOK] Nenhum desconto encontrado na sessão');
      }

      // Capturar valor efetivamente pago
      paidAmountCents = session.amount_total;
      console.log('💰 [WEBHOOK] Valor pago:', paidAmountCents, 'centavos');

      // Atualizar subscription para ativa e adicionar todos os dados
      console.log('🔧 [WEBHOOK] Ativando subscription com todos os dados...');
      
      const updateData: any = {
        status: 'active',
        credits_remaining: creditsQuantity,
        stripe_subscription_id: session.subscription as string,
        stripe_payment_intent: session.payment_intent as string,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        updated_at: new Date().toISOString()
      };

      // Adicionar dados do cupom e valor pago
      if (couponCode) {
        updateData.coupon_code = couponCode;
      }
      if (paidAmountCents !== null) {
        updateData.paid_amount_cents = paidAmountCents;
      }
      
      console.log('🔧 [WEBHOOK] Dados que serão atualizados:', updateData);
      
      const { error: updateError } = await (supabase as any)
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription.id)

      if (updateError) {
        console.error('❌ [WEBHOOK] Erro ao atualizar subscription:', updateError)
        console.error('❌ [WEBHOOK] ERRO CRÍTICO - Outras colunas não foram atualizadas!')
        throw updateError
      }

      console.log('✅ [WEBHOOK] Subscription ativada com sucesso:', {
        subscription_id: subscription.id,
        credits_added: creditsQuantity,
        user_id: subscription.user_id,
        status: 'active',
        credits_remaining: creditsQuantity,
        coupon_code: couponCode,
        paid_amount_cents: paidAmountCents
      });

      return;
    }

    // Verificar se é uma recarga de créditos
    if (session.metadata?.type === 'credit_topup') {
      console.log('🔧 [WEBHOOK] Processando recarga de créditos...');
      await handleCreditTopup(session);
      return;
    }

    // Código existente para pagamentos únicos (mode: 'payment')
    if (!session.id) {
      console.log('❌ [WEBHOOK] Session ID não encontrado');
      return
    }

    console.log('🔧 [WEBHOOK] Buscando subscription para session ID:', session.id);

    // Buscar subscription pela stripe_session_id
    const { data: subscription, error: subscriptionError } = await (supabase as any)
      .from('subscriptions')
      .select('*')
      .eq('stripe_session_id', session.id)
      .single()
    
    if (subscriptionError || !subscription) {
      console.error('❌ [WEBHOOK] Subscription não encontrada para session:', session.id, subscriptionError)
      return
    }

    console.log('✅ [WEBHOOK] Subscription encontrada:', {
      id: subscription.id,
      user_id: subscription.user_id,
      status: subscription.status,
      credits_remaining: subscription.credits_remaining
    });

    // Obter quantidade de créditos do metadata da sessão
    const creditsQuantity = parseInt(session.metadata?.credits_quantity || '0')
    
    console.log('🔧 [WEBHOOK] Quantidade de créditos do metadata:', creditsQuantity);
    
    if (creditsQuantity <= 0) {
      console.error('❌ [WEBHOOK] Quantidade inválida de créditos no metadata:', session.metadata)
      return
    }

    // Capturar dados do cupom e valor pago
    let couponCode: string | null = null;
    let paidAmountCents: number | null = null;

    // Verificar se há desconto aplicado na sessão
    if (session.total_details?.breakdown?.discounts && session.total_details.breakdown.discounts.length > 0) {
      const discount = session.total_details.breakdown.discounts[0];
      if (discount.discount?.coupon) {
        // Se há um promotion code, buscar o código original
        if (discount.discount.promotion_code) {
          try {
            const promotionCode = await stripe.promotionCodes.retrieve(discount.discount.promotion_code as string);
            couponCode = promotionCode.code;
            console.log('🎫 [WEBHOOK] Cupom aplicado:', couponCode);
          } catch (error) {
            console.error('❌ [WEBHOOK] Erro ao buscar promotion code:', error);
          }
        } else {
          // Usar o ID do cupom se não há promotion code
          couponCode = discount.discount.coupon.id;
          console.log('🎫 [WEBHOOK] Cupom direto aplicado:', couponCode);
        }
      }
    }

    // Capturar valor efetivamente pago
    paidAmountCents = session.amount_total;
    console.log('💰 [WEBHOOK] Valor pago:', paidAmountCents, 'centavos');

    // Atualizar subscription para ativa e adicionar créditos
    console.log('🔧 [WEBHOOK] Ativando subscription e adicionando créditos...');
    
    const updateData: any = {
      status: 'active',
      credits_remaining: creditsQuantity,
      stripe_payment_intent: session.payment_intent as string,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      updated_at: new Date().toISOString()
    };

    // Adicionar dados do cupom e valor pago apenas se o pagamento foi efetuado
    if (couponCode) {
      updateData.coupon_code = couponCode;
    }
    if (paidAmountCents !== null) {
      updateData.paid_amount_cents = paidAmountCents;
    }
    
    const { error: updateError } = await (supabase as any)
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscription.id)

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao atualizar subscription:', updateError)
      throw updateError
    }

    console.log('✅ [WEBHOOK] Subscription ativada com sucesso:', {
      subscription_id: subscription.id,
      credits_added: creditsQuantity,
      user_id: subscription.user_id,
      status: 'active',
      credits_remaining: creditsQuantity,
      coupon_code: couponCode,
      paid_amount_cents: paidAmountCents
    });

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar checkout completion:', error)
    throw error
  }
}

// Função para lidar com recarga de créditos
async function handleCreditTopup(session: Stripe.Checkout.Session) {
  try {
    console.log('🔧 [WEBHOOK] Processando recarga de créditos...');
    
    const userId = session.metadata?.user_id;
    const creditsQuantity = parseInt(session.metadata?.credits_quantity || '0');

    if (!userId || creditsQuantity <= 0) {
      console.error('❌ [WEBHOOK] Metadados inválidos para recarga de créditos:', session.metadata);
      return;
    }

    console.log('🔧 [WEBHOOK] Adicionando créditos para usuário:', userId, 'Quantidade:', creditsQuantity);

    // Buscar a subscription ativa do usuário
    const { data: subscription, error: fetchError } = await (supabase as any)
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !subscription) {
      console.error('❌ [WEBHOOK] Erro ao buscar subscription ativa:', fetchError);
      return;
    }

    // Adicionar créditos à subscription existente
    const newCreditsTotal = subscription.credits_remaining + creditsQuantity;

    const { error: updateError } = await (supabase as any)
      .from('subscriptions')
      .update({
        credits_remaining: newCreditsTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao atualizar créditos:', updateError);
    } else {
      console.log('✅ [WEBHOOK] Créditos adicionados com sucesso. Total:', newCreditsTotal);
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar recarga de créditos:', error);
  }
}

// Função para lidar com pagamentos de faturas (renovações de assinatura)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('🔧 [WEBHOOK] Processando pagamento de fatura...');
    
    if (!invoice.subscription) {
      console.log('⚠️ [WEBHOOK] Fatura não está associada a uma assinatura');
      return;
    }

    // Buscar a assinatura no Stripe para obter os metadados
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    
    const userId = subscription.metadata?.user_id;
    const planId = subscription.metadata?.plan_id;
    const creditsQuantity = parseInt(subscription.metadata?.credits_quantity || '0');

    if (!userId || !planId || creditsQuantity <= 0) {
      console.error('❌ [WEBHOOK] Metadados inválidos na assinatura:', subscription.metadata);
      return;
    }

    console.log('🔧 [WEBHOOK] Renovando créditos para usuário:', userId);

    // Capturar dados do cupom e valor pago
    let couponCode: string | null = null;
    let paidAmountCents: number | null = null;

    // Verificar se há desconto aplicado na fatura
    if (invoice.discount && invoice.discount.coupon) {
      // Se há um promotion code, buscar o código original
      if (invoice.discount.promotion_code) {
        try {
          const promotionCode = await stripe.promotionCodes.retrieve(invoice.discount.promotion_code as string);
          couponCode = promotionCode.code;
          console.log('🎫 [WEBHOOK] Cupom aplicado:', couponCode);
        } catch (error) {
          console.error('❌ [WEBHOOK] Erro ao buscar promotion code:', error);
        }
      } else {
        // Usar o ID do cupom se não há promotion code
        couponCode = invoice.discount.coupon.id;
        console.log('🎫 [WEBHOOK] Cupom direto aplicado:', couponCode);
      }
    }

    // Capturar valor efetivamente pago
    paidAmountCents = invoice.amount_paid;
    console.log('💰 [WEBHOOK] Valor pago:', paidAmountCents, 'centavos');

    // Atualizar ou criar subscription no banco
    const updateData: any = {
      user_id: userId,
      plan_id: planId,
      status: 'active',
      credits_remaining: creditsQuantity,
      stripe_subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    // Adicionar dados do cupom e valor pago apenas se o pagamento foi efetuado
    if (couponCode) {
      updateData.coupon_code = couponCode;
    }
    if (paidAmountCents !== null) {
      updateData.paid_amount_cents = paidAmountCents;
    }

    const { error: updateError } = await (supabase as any)
      .from('subscriptions')
      .upsert(updateData, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao renovar subscription:', updateError);
      return;
    }

    console.log('✅ [WEBHOOK] Créditos renovados com sucesso!', {
      user_id: userId,
      plan_id: planId,
      credits_remaining: creditsQuantity,
      subscription_id: subscription.id,
      coupon_code: couponCode,
      paid_amount_cents: paidAmountCents
    });
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar pagamento de fatura:', error);
  }
}

// Função para lidar com cancelamento de assinatura
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('🔧 [WEBHOOK] Processando cancelamento de assinatura...');
    
    const userId = subscription.metadata?.user_id;
    
    if (!userId) {
      console.error('❌ [WEBHOOK] user_id não encontrado nos metadados da assinatura');
      return;
    }

    // Atualizar status da subscription para cancelled
    const { error: updateError } = await (supabase as any)
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao cancelar subscription:', updateError);
      return;
    }

    console.log('✅ [WEBHOOK] Assinatura cancelada com sucesso!');
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar cancelamento:', error);
  }
}
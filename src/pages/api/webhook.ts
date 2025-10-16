import { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import Stripe from 'stripe'
import { supabaseAdmin } from '../../lib/supabase'

// Função para registrar venda de parceiro
async function recordPartnerSale(
  userId: string,
  subscriptionId: string,
  promotionCodeId: string,
  amountPaidCents: number,
  currency: string,
  saleType: 'subscription' | 'credits'
) {
  try {
    console.log('🎫 [WEBHOOK] ===== INICIANDO REGISTRO DE VENDA DE PARCEIRO =====');
    console.log('🎫 [WEBHOOK] Dados recebidos:', {
      userId,
      subscriptionId,
      promotionCodeId,
      amountPaidCents,
      currency,
      saleType
    });

    // Validar parâmetros obrigatórios
    if (!userId || !subscriptionId || !promotionCodeId || !amountPaidCents) {
      console.error('❌ [WEBHOOK] Parâmetros obrigatórios faltando:', {
        userId: !!userId,
        subscriptionId: !!subscriptionId,
        promotionCodeId: !!promotionCodeId,
        amountPaidCents: !!amountPaidCents
      });
      return;
    }

    console.log('🎫 [WEBHOOK] Buscando parceiro pelo promotion_code_id:', promotionCodeId);

    // Buscar o parceiro pelo promotion_code_id
    let { data: partner, error: partnerError } = await supabaseAdmin
      .from('profiles')
      .select('id, commission_percentage, coupon_code, promotion_code_id')
      .eq('promotion_code_id', promotionCodeId)
      .eq('role', 'PARCEIRO')
      .single();

    console.log('🎫 [WEBHOOK] Resultado da busca por promotion_code_id:', {
      partner: partner,
      error: partnerError
    });

    if (partnerError || !partner) {
      console.log('⚠️ [WEBHOOK] Parceiro não encontrado para o promotion code ID:', promotionCodeId);
      
      // Tentar buscar pelo código base (removendo sufixos -SUB ou -CRED se existirem)
      try {
        const stripePromotionCode = await stripe.promotionCodes.retrieve(promotionCodeId);
        const baseCode = stripePromotionCode.code.replace(/-SUB$|-CRED$/, '');
        
        console.log('🔧 [WEBHOOK] Tentando buscar parceiro pelo código base:', baseCode);
        
        const { data: partnerByCode, error: partnerByCodeError } = await supabaseAdmin
          .from('profiles')
          .select('id, commission_percentage, coupon_code, promotion_code_id')
          .eq('coupon_code', baseCode)
          .eq('role', 'PARCEIRO')
          .single();

        console.log('🎫 [WEBHOOK] Resultado da busca por coupon_code:', {
          partner: partnerByCode,
          error: partnerByCodeError
        });
          
        if (partnerByCodeError || !partnerByCode) {
          console.error('❌ [WEBHOOK] Parceiro não encontrado por nenhum método:', {
            promotionCodeError: partnerError,
            couponCodeError: partnerByCodeError
          });
          return;
        }
        
        // Usar o parceiro encontrado pelo código base
        partner = partnerByCode;
        console.log('✅ [WEBHOOK] Parceiro encontrado pelo código base:', baseCode);
      } catch (stripeError) {
        console.error('❌ [WEBHOOK] Erro ao buscar promotion code no Stripe:', stripeError);
        return;
      }
    }

    console.log('✅ [WEBHOOK] Parceiro encontrado:', {
      id: (partner as any).id,
      coupon_code: (partner as any).coupon_code,
      promotion_code_id: (partner as any).promotion_code_id,
      commission_percentage: (partner as any).commission_percentage
    });

    // Determinar qual tipo de cupom foi usado (agora é sempre o mesmo cupom único)
    console.log('🎫 [WEBHOOK] Cupom único identificado:', {
      promotionCodeId,
      saleType
    });

    // Calcular comissão
    const commissionPercentage = (partner as any).commission_percentage || 10;
    const commissionAmountCents = Math.round((amountPaidCents * commissionPercentage) / 100);

    console.log('🎫 [WEBHOOK] Calculando comissão:', {
      amountPaidCents,
      commissionPercentage,
      commissionAmountCents
    });

    // Preparar dados para inserção
    const saleData = {
      partner_id: (partner as any).id,
      subscription_id: subscriptionId,
      coupon_code: (partner as any).coupon_code,
      promotion_code_id: promotionCodeId,
      amount_paid_cents: amountPaidCents,
      commission_percentage: commissionPercentage,
      commission_amount_cents: commissionAmountCents,
      currency: currency.toUpperCase(),
      sale_type: saleType,
      created_at: new Date().toISOString()
    };

    console.log('🎫 [WEBHOOK] Dados preparados para inserção:', saleData);
    console.log('🎫 [WEBHOOK] Tentando inserir na tabela partner_sales...');

    // Inserir registro na tabela partner_sales
    const { data: insertedSale, error: insertError } = await supabaseAdmin
      .from('partner_sales')
      .insert(saleData as any)
      .select()
      .single();

    console.log('🎫 [WEBHOOK] Resultado da inserção:', {
      data: insertedSale,
      error: insertError
    });

    if (insertError) {
      console.error('❌ [WEBHOOK] ERRO DETALHADO ao inserir venda de parceiro:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        saleData: saleData
      });
    } else {
      console.log('✅ [WEBHOOK] ===== VENDA DE PARCEIRO REGISTRADA COM SUCESSO =====');
      console.log('✅ [WEBHOOK] Venda registrada:', insertedSale);
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] ERRO GERAL ao registrar venda de parceiro:', {
      error: error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'Stack não disponível'
    });
  }
}

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
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('stripe_session_id', session.id)
        .single()
      
      console.log('🔧 [WEBHOOK] Resultado da busca subscription:', {
        found: !!subscription,
        error: subscriptionError,
        subscription_data: subscription ? {
          id: (subscription as any).id,
          user_id: (subscription as any).user_id,
          status: (subscription as any).status,
          stripe_session_id: (subscription as any).stripe_session_id
        } : null
      });
      
      if (subscriptionError || !subscription) {
        console.error('❌ [WEBHOOK] Subscription não encontrada para session:', session.id, subscriptionError)
        
        // Tentar buscar por outros critérios para debug
        console.log('🔧 [WEBHOOK] Tentando buscar subscription por customer_email...');
        const customerEmail = session.customer_details?.email;
        if (customerEmail) {
          const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, name, email')
            .eq('id', (subscription as any).user_id)
            .single()
      
          if (userProfile) {
            const { data: subscriptions } = await supabaseAdmin
              .from('subscriptions')
              .select('*')
              .eq('user_id', (subscription as any).user_id)
              .eq('status', 'active')
              .order('created_at', { ascending: false });
              
            console.log('🔧 [WEBHOOK] Subscriptions encontradas para o usuário:', subscriptions);
          }
        }
        
        return
      }

      console.log('✅ [WEBHOOK] Subscription encontrada:', {
        id: (subscription as any).id,
        user_id: (subscription as any).user_id,
        status: (subscription as any).status
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
      let promotionCodeId: string | null = null;
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
          if (discount.discount?.promotion_code) {
            promotionCodeId = discount.discount.promotion_code as string;
            console.log('🎫 [WEBHOOK] Promotion Code ID encontrado nos line_items:', promotionCodeId);
          } else {
            console.log('🎫 [WEBHOOK] Cupom direto encontrado nos line_items, não é de parceiro');
          }
        }
      }
      
      // LOG COMPLETO DA SESSÃO PARA DEBUG
      console.log('🔍 [WEBHOOK] SESSÃO COMPLETA PARA DEBUG (ASSINATURA):');
      console.log('🔍 [WEBHOOK] Session JSON completo:', JSON.stringify(session, null, 2));
      
      // Verificar todas as possíveis localizações do promotion code
      console.log('🔍 [WEBHOOK] session.discounts:', (session as any).discounts);
      console.log('🔍 [WEBHOOK] session.total_details:', session.total_details);
      console.log('🔍 [WEBHOOK] session.line_items:', session.line_items);
      console.log('🔍 [WEBHOOK] session.metadata:', session.metadata);

      if ((session as any).discounts && (session as any).discounts.length > 0) {
        console.log('🎫 [WEBHOOK] Descontos encontrados em session.discounts:', (session as any).discounts);
        
        // O promotion_code é um objeto, precisamos do ID
        const promotionCode = (session as any).discounts[0].promotion_code;
        if (promotionCode) {
          // Se for string, usar diretamente; se for objeto, pegar o id
          promotionCodeId = typeof promotionCode === 'string' ? promotionCode : promotionCode.id;
          console.log('🎫 [WEBHOOK] Promotion Code encontrado:', promotionCode);
          console.log('🎫 [WEBHOOK] Promotion Code ID extraído:', promotionCodeId);
        } else {
          console.log('🎫 [WEBHOOK] Desconto encontrado mas sem promotion_code (cupom direto)');
        }
      } else {
        console.log('🎫 [WEBHOOK] Nenhum desconto encontrado em session.discounts');
      }

      // Verificar no metadata se foi salvo lá
      if (session.metadata?.promotion_code_id) {
        promotionCodeId = session.metadata.promotion_code_id;
        console.log('🎫 [WEBHOOK] Promotion Code ID encontrado no metadata:', promotionCodeId);
      }

      // Verificar no metadata se há coupon_code
      if (session.metadata?.coupon_code) {
        console.log('🎫 [WEBHOOK] Coupon Code encontrado no metadata:', session.metadata.coupon_code);
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
      
      const { error: updateError } = await (supabaseAdmin as any)
         .from('subscriptions')
         .update(updateData as any)
         .eq('id', (subscription as any).id)

      if (updateError) {
        console.error('❌ [WEBHOOK] Erro ao atualizar subscription:', updateError)
        console.error('❌ [WEBHOOK] ERRO CRÍTICO - Outras colunas não foram atualizadas!')
        throw updateError
      }

      console.log('✅ [WEBHOOK] Subscription ativada com sucesso:', {
        subscription_id: (subscription as any).id,
        credits_added: creditsQuantity,
        user_id: (subscription as any).user_id,
        status: 'active',
        credits_remaining: creditsQuantity,
        coupon_code: couponCode,
        paid_amount_cents: paidAmountCents
      });

      // Continuar para verificar se deve registrar venda de parceiro
      console.log('🎫 [WEBHOOK] Verificando se deve registrar venda de parceiro...');
      console.log('🎫 [WEBHOOK] promotionCodeId:', promotionCodeId, 'typeof:', typeof promotionCodeId);
      console.log('🎫 [WEBHOOK] paidAmountCents:', paidAmountCents, 'typeof:', typeof paidAmountCents);
      console.log('🎫 [WEBHOOK] Condição (promotionCodeId && paidAmountCents):', !!(promotionCodeId && paidAmountCents));
      
      if (promotionCodeId && paidAmountCents) {
        console.log('🎫 [WEBHOOK] ===== CHAMANDO recordPartnerSale =====');
        await recordPartnerSale((subscription as any).user_id, (subscription as any).id, promotionCodeId, paidAmountCents, (subscription as any).currency || 'BRL', 'subscription');
      } else {
        console.log('🎫 [WEBHOOK] ❌ NÃO chamando recordPartnerSale - condições não atendidas');
        if (!promotionCodeId) console.log('🎫 [WEBHOOK] ❌ promotionCodeId está vazio/null/undefined');
        if (!paidAmountCents) console.log('🎫 [WEBHOOK] ❌ paidAmountCents está vazio/null/undefined');
      }

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
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', session.subscription as string)
      .single()
    
    if (subscriptionError || !subscription) {
      console.error('❌ [WEBHOOK] Subscription não encontrada para session:', session.id, subscriptionError)
      return
    }

    console.log('✅ [WEBHOOK] Subscription encontrada:', {
      id: (subscription as any).id,
      user_id: (subscription as any).user_id,
      status: (subscription as any).status,
      credits_remaining: (subscription as any).credits_remaining
    });

    // Obter quantidade de créditos do metadata da sessão
    const creditsQuantity = parseInt(session.metadata?.credits_quantity || '0')
    
    console.log('🔧 [WEBHOOK] Quantidade de créditos do metadata:', creditsQuantity);
    
    if (creditsQuantity <= 0) {
      console.error('❌ [WEBHOOK] Quantidade inválida de créditos no metadata:', session.metadata)
      return
    }

    // Capturar dados do cupom e valor pago
    let promotionCodeId: string | null = null;
    let paidAmountCents: number | null = null;

    // LOG COMPLETO DA SESSÃO PARA DEBUG
    console.log('🔍 [WEBHOOK] SESSÃO COMPLETA PARA DEBUG:');
    console.log('🔍 [WEBHOOK] Session JSON completo:', JSON.stringify(session, null, 2));
    
    // Verificar todas as possíveis localizações do promotion code
    console.log('🔍 [WEBHOOK] session.discounts:', (session as any).discounts);
    console.log('🔍 [WEBHOOK] session.total_details:', session.total_details);
    console.log('🔍 [WEBHOOK] session.line_items:', session.line_items);
    console.log('🔍 [WEBHOOK] session.metadata:', session.metadata);

    // Verificar se há desconto aplicado na sessão (localização correta segundo Reddit)
    if ((session as any).discounts && (session as any).discounts.length > 0) {
      console.log('🎫 [WEBHOOK] Descontos encontrados em session.discounts:', (session as any).discounts);
      
      // O promotion_code é um objeto, precisamos do ID
      const promotionCode = (session as any).discounts[0].promotion_code;
      if (promotionCode) {
        // Se for string, usar diretamente; se for objeto, pegar o id
        promotionCodeId = typeof promotionCode === 'string' ? promotionCode : promotionCode.id;
        console.log('🎫 [WEBHOOK] Promotion Code encontrado:', promotionCode);
        console.log('🎫 [WEBHOOK] Promotion Code ID extraído:', promotionCodeId);
      } else {
        console.log('🎫 [WEBHOOK] Desconto encontrado mas sem promotion_code (cupom direto)');
      }
    } else {
      console.log('🎫 [WEBHOOK] Nenhum desconto encontrado em session.discounts');
    }

    // Verificar no metadata se foi salvo lá
    if (session.metadata?.promotion_code_id) {
      promotionCodeId = session.metadata.promotion_code_id;
      console.log('🎫 [WEBHOOK] Promotion Code ID encontrado no metadata:', promotionCodeId);
    }

    // Verificar no metadata se há coupon_code
    if (session.metadata?.coupon_code) {
      console.log('🎫 [WEBHOOK] Coupon Code encontrado no metadata:', session.metadata.coupon_code);
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
    if (promotionCodeId) {
      updateData.promotion_code_id = promotionCodeId;
    }
    if (paidAmountCents !== null) {
      updateData.paid_amount_cents = paidAmountCents;
    }
    
    const { error: updateError } = await (supabaseAdmin as any)
       .from('subscriptions')
       .update(updateData as any)
       .eq('id', (subscription as any).id)

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao atualizar subscription:', updateError)
      throw updateError
    }

    console.log('✅ [WEBHOOK] Subscription ativada com sucesso:', {
      subscription_id: (subscription as any).id,
      credits_added: creditsQuantity,
      user_id: (subscription as any).user_id,
      status: 'active',
      credits_remaining: creditsQuantity,
      promotion_code_id: promotionCodeId,
      paid_amount_cents: paidAmountCents
    });

    // Registrar venda de parceiro se houver promotion code
    console.log('🎫 [WEBHOOK] Verificando se deve registrar venda de parceiro...');
    console.log('🎫 [WEBHOOK] promotionCodeId:', promotionCodeId, 'typeof:', typeof promotionCodeId);
    console.log('🎫 [WEBHOOK] paidAmountCents:', paidAmountCents, 'typeof:', typeof paidAmountCents);
    console.log('🎫 [WEBHOOK] Condição (promotionCodeId && paidAmountCents):', !!(promotionCodeId && paidAmountCents));
    
    if (promotionCodeId && paidAmountCents) {
      console.log('🎫 [WEBHOOK] ===== CHAMANDO recordPartnerSale =====');
      await recordPartnerSale((subscription as any).user_id, (subscription as any).id, promotionCodeId, paidAmountCents, (subscription as any).currency || 'BRL', 'subscription');
    } else {
      console.log('🎫 [WEBHOOK] ❌ NÃO chamando recordPartnerSale - condições não atendidas');
      if (!promotionCodeId) console.log('🎫 [WEBHOOK] ❌ promotionCodeId está vazio/null/undefined');
      if (!paidAmountCents) console.log('🎫 [WEBHOOK] ❌ paidAmountCents está vazio/null/undefined');
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar checkout completion:', error)
    throw error
  }
}

// Função para lidar com recarga de créditos
async function handleCreditTopup(session: Stripe.Checkout.Session) {
  try {
    console.log('🔧 [WEBHOOK] Processando recarga de créditos...');
    
    // LOG COMPLETO DA SESSÃO PARA DEBUG
    console.log('🔍 [WEBHOOK] SESSÃO COMPLETA PARA DEBUG (CRÉDITOS):');
    console.log('🔍 [WEBHOOK] Session JSON completo:', JSON.stringify(session, null, 2));
    
    // Verificar todas as possíveis localizações do promotion code
    console.log('🔍 [WEBHOOK] session.discounts:', (session as any).discounts);
    console.log('🔍 [WEBHOOK] session.total_details:', (session as any).total_details);
    console.log('🔍 [WEBHOOK] session.line_items:', (session as any).line_items);
    console.log('🔍 [WEBHOOK] session.metadata:', session.metadata);

    let promotionCodeId = null;

    if ((session as any).discounts && (session as any).discounts.length > 0) {
      console.log('🎫 [WEBHOOK] Descontos encontrados em session.discounts:', (session as any).discounts);
      
      // O promotion_code é um objeto, precisamos do ID
      const promotionCode = (session as any).discounts[0].promotion_code;
      if (promotionCode) {
        // Se for string, usar diretamente; se for objeto, pegar o id
        promotionCodeId = typeof promotionCode === 'string' ? promotionCode : promotionCode.id;
        console.log('🎫 [WEBHOOK] Promotion Code encontrado:', promotionCode);
        console.log('🎫 [WEBHOOK] Promotion Code ID extraído:', promotionCodeId);
      } else {
        console.log('🎫 [WEBHOOK] Desconto encontrado mas sem promotion_code (cupom direto)');
      }
    } else {
      console.log('🎫 [WEBHOOK] Nenhum desconto encontrado em session.discounts');
    }

    // Verificar no metadata se foi salvo lá
    if (session.metadata?.promotion_code_id) {
      promotionCodeId = session.metadata.promotion_code_id;
      console.log('🎫 [WEBHOOK] Promotion Code ID encontrado no metadata:', promotionCodeId);
    }

    // Verificar no metadata se há coupon_code
    if (session.metadata?.coupon_code) {
      console.log('🎫 [WEBHOOK] Coupon Code encontrado no metadata:', session.metadata.coupon_code);
    }
    
    const userId = session.metadata?.user_id;
    const creditsQuantity = parseInt(session.metadata?.credits_quantity || '0');

    if (!userId || creditsQuantity <= 0) {
      console.error('❌ [WEBHOOK] Metadados inválidos para recarga de créditos:', session.metadata);
      return;
    }

    console.log('🔧 [WEBHOOK] Adicionando créditos para usuário:', userId, 'Quantidade:', creditsQuantity);

    // Buscar a subscription do usuário (qualquer status diferente de 'pending')
     const { data: subscription, error: fetchError } = await supabaseAdmin
       .from('subscriptions')
       .select('*')
       .eq('user_id', userId)
       .neq('status', 'pending')
       .single();

    if (fetchError || !subscription) {
      console.error('❌ [WEBHOOK] Erro ao buscar subscription (status diferente de pending):', fetchError);
      return;
    }

    // Adicionar créditos à subscription existente
    const newCreditsTotal = (subscription as any).credits_remaining + creditsQuantity;

    const { error: updateError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .update({
        credits_remaining: newCreditsTotal,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', (subscription as any).id);

    if (updateError) {
      console.error('❌ [WEBHOOK] Erro ao atualizar créditos:', updateError);
      return; // Adicionar return para não continuar se houver erro
    } 
    
    console.log('✅ [WEBHOOK] Créditos adicionados com sucesso. Total:', newCreditsTotal);
    
    // Registrar venda de parceiro se houver promotion code
    const paidAmountCents = session.amount_total;
    
    console.log('🎫 [WEBHOOK] Verificando venda de parceiro - promotionCodeId:', promotionCodeId, 'paidAmountCents:', paidAmountCents);
    
    if (promotionCodeId && paidAmountCents) {
      console.log('🎫 [WEBHOOK] Registrando venda de parceiro...');
      await recordPartnerSale(userId, (subscription as any).id, promotionCodeId, paidAmountCents, session.currency || 'brl', 'credits');
    } else {
      console.log('🎫 [WEBHOOK] Não há promotion code ou valor pago para registrar venda de parceiro');
      console.log('🎫 [WEBHOOK] Debug - promotionCodeId:', promotionCodeId, 'typeof:', typeof promotionCodeId);
      console.log('🎫 [WEBHOOK] Debug - paidAmountCents:', paidAmountCents, 'typeof:', typeof paidAmountCents);
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

    const { error: updateError } = await supabaseAdmin
       .from('subscriptions')
       .upsert(updateData, {
         onConflict: 'stripe_subscription_id'
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
    const { error: updateError } = await (supabaseAdmin as any)
       .from('subscriptions')
       .update({
         status: 'cancelled',
         cancelled_at: new Date().toISOString()
       } as any)
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
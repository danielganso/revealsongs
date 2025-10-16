import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabase';
import type { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type PartnerSale = Database['public']['Tables']['partner_sales']['Row'];
type Commission = Database['public']['Tables']['commissions']['Row'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 [COMMISSION-API] Iniciando endpoint generate-commission-payment');
  console.log('🎯 [COMMISSION-API] Method:', req.method);

  if (req.method !== 'POST') {
    console.log('❌ [COMMISSION-API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar se o token está presente no header
    const authHeader = req.headers.authorization;
    console.log('🔐 [COMMISSION-API] Auth header presente:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [COMMISSION-API] Token de autorização ausente');
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 [COMMISSION-API] Token extraído, verificando usuário...');

    // Verificar autenticação usando supabaseAdmin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.log('❌ [COMMISSION-API] Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.log('✅ [COMMISSION-API] Usuário autenticado:', user.id);

    // Buscar perfil do usuário para verificar se é parceiro
    console.log('👤 [COMMISSION-API] Buscando perfil do usuário...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, coupon_code, name, commission_percentage')
      .eq('user_id', user.id)
      .single() as { data: Profile | null, error: any };

    if (profileError || !profile) {
      console.log('❌ [COMMISSION-API] Erro ao buscar perfil:', profileError);
      return res.status(403).json({ error: 'Profile not found' });
    }

    console.log('👤 [COMMISSION-API] Perfil encontrado:', {
      id: profile.id,
      role: profile.role,
      coupon_code: profile.coupon_code,
      name: profile.name,
      commission_percentage: profile.commission_percentage
    });

    if (profile.role !== 'PARCEIRO') {
      console.log('❌ [COMMISSION-API] Usuário não é parceiro. Role:', profile.role);
      return res.status(403).json({ error: 'Access denied. Partner role required.' });
    }

    // Calcular data limite (15 dias atrás)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    console.log('📅 [COMMISSION-API] Data limite (15 dias atrás):', fifteenDaysAgo.toISOString());

    // Buscar vendas elegíveis (mais de 15 dias e não pagas)
    console.log('🔍 [COMMISSION-API] Buscando vendas elegíveis...');
    const { data: eligibleSales, error: salesError } = await supabaseAdmin
      .from('partner_sales')
      .select('*')
      .eq('partner_id', profile.id)
      .eq('commission_paid', 'false')
      .lt('created_at', fifteenDaysAgo.toISOString()) as { data: PartnerSale[] | null, error: any };

    if (salesError) {
      console.error('❌ [COMMISSION-API] Erro ao buscar vendas elegíveis:', salesError);
      return res.status(500).json({ error: 'Error fetching eligible sales' });
    }

    console.log('📊 [COMMISSION-API] Vendas encontradas:', {
      total: eligibleSales?.length || 0,
      vendas: eligibleSales?.map(sale => ({
        id: sale.id,
        created_at: sale.created_at,
        commission_amount_cents: sale.commission_amount_cents,
        commission_paid: sale.commission_paid
      })) || []
    });

    // Verificar se há vendas elegíveis
    if (!eligibleSales || eligibleSales.length === 0) {
      console.log('⚠️ [COMMISSION-API] Nenhuma venda elegível encontrada');
      
      // Buscar todas as vendas do parceiro para debug
      console.log('🔍 [COMMISSION-API] Buscando todas as vendas do parceiro para debug...');
      const { data: allSales, error: allSalesError } = await supabaseAdmin
        .from('partner_sales')
        .select('*')
        .eq('partner_id', profile.id) as { data: PartnerSale[] | null, error: any };
      
      console.log('🔍 [COMMISSION-API] Todas as vendas do parceiro:', {
        total: allSales?.length || 0,
        vendas: allSales?.map(sale => ({
          id: sale.id,
          created_at: sale.created_at,
          commission_paid: sale.commission_paid,
          dias_desde_criacao: Math.floor((new Date().getTime() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24))
        })) || []
      });

      return res.status(400).json({ 
        error: 'No eligible sales found',
        message: 'Não há vendas elegíveis para comissão. Vendas devem ter mais de 15 dias para serem processadas.'
      });
    }

    // Calcular comissões separadas por tipo
    const subscriptionSales = eligibleSales.filter(sale => sale.sale_type === 'subscription');
    const creditSales = eligibleSales.filter(sale => sale.sale_type === 'credits');
    
    const subscriptionCommissionCents = subscriptionSales.reduce((sum, sale) => {
      return sum + (sale.commission_amount_cents || 0);
    }, 0);
    
    const creditCommissionCents = creditSales.reduce((sum, sale) => {
      return sum + (sale.commission_amount_cents || 0);
    }, 0);
    
    const totalCommissionCents = subscriptionCommissionCents + creditCommissionCents;
    const totalCommissionAmount = totalCommissionCents / 100;
    const subscriptionCommissionAmount = subscriptionCommissionCents / 100;
    const creditCommissionAmount = creditCommissionCents / 100;
    const currency = eligibleSales[0]?.currency || 'BRL';

    console.log('💰 [COMMISSION-API] Calculando comissão:', {
      vendas_elegiveis: eligibleSales.length,
      subscription_vendas: subscriptionSales.length,
      creditos_vendas: creditSales.length,
      subscription_comissao: subscriptionCommissionAmount,
      creditos_comissao: creditCommissionAmount,
      total_comissao: totalCommissionAmount,
      moeda: currency
    });

    // Iniciar transação para atualizar vendas e criar registro de comissão
    console.log('💾 [COMMISSION-API] Criando registro de comissão...');
    const { data: commissionRecord, error: commissionError } = await (supabaseAdmin as any)
      .from('commissions')
      .insert({
        profile_id: profile.id,
        partner_name: profile.name || '',
        coupon_code: profile.coupon_code || '',
        commission_amount: totalCommissionAmount,
        sales_count: eligibleSales.length,
        status: 'pending',
        request_date: new Date().toISOString()
      })
      .select()
      .single();

    if (commissionError) {
      console.error('❌ [COMMISSION-API] Erro ao criar registro de comissão:', commissionError);
      return res.status(500).json({ error: 'Error creating commission record' });
    }

    if (!commissionRecord) {
      console.error('❌ [COMMISSION-API] Nenhum registro de comissão foi criado');
      return res.status(500).json({ error: 'No commission record created' });
    }

    console.log('✅ [COMMISSION-API] Registro de comissão criado:', commissionRecord);

    // Atualizar vendas como pagas
    const saleIds = eligibleSales.map(sale => sale.id);
    console.log('🔄 [COMMISSION-API] Atualizando vendas como pagas. IDs:', saleIds);
    
    const { error: updateError } = await (supabaseAdmin as any)
      .from('partner_sales')
      .update({
        commission_paid: 'pending',
        payment_date: new Date().toISOString()
      })
      .in('id', saleIds);

    if (updateError) {
      console.error('❌ [COMMISSION-API] Erro ao atualizar vendas:', updateError);
      // Reverter criação da comissão se falhar
      console.log('🔄 [COMMISSION-API] Revertendo criação da comissão...');
      await supabaseAdmin
        .from('commissions')
        .delete()
        .eq('id', commissionRecord.id);
      
      return res.status(500).json({ error: 'Error updating sales records' });
    }

    console.log('✅ [COMMISSION-API] Vendas atualizadas com sucesso');

    // Retornar dados detalhados da comissão criada
    const responseData = {
      success: true,
      commission: {
        id: commissionRecord.id,
        totalAmount: totalCommissionAmount,
        subscriptionAmount: subscriptionCommissionAmount,
        creditAmount: creditCommissionAmount,
        currency: currency,
        salesCount: eligibleSales.length,
        subscriptionSalesCount: subscriptionSales.length,
        creditSalesCount: creditSales.length,
        requestDate: commissionRecord.request_date
      }
    };

    console.log('🎉 [COMMISSION-API] Sucesso! Retornando dados:', responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('💥 [COMMISSION-API] Erro no endpoint de geração de pagamento:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
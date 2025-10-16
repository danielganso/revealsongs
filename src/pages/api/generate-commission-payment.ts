import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '../../types/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient<Database>({ req, res });

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Buscar perfil do usuário para verificar se é parceiro
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, coupon_code, name, commission_percentage')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'PARCEIRO') {
      return res.status(403).json({ error: 'Access denied. Partner role required.' });
    }

    // Calcular data limite (15 dias atrás)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // Buscar vendas elegíveis (mais de 15 dias e não pagas)
    const { data: eligibleSales, error: salesError } = await supabase
      .from('partner_sales')
      .select('*')
      .eq('partner_id', profile.id)
      .eq('commission_paid', false)
      .lt('created_at', fifteenDaysAgo.toISOString());

    if (salesError) {
      console.error('Erro ao buscar vendas elegíveis:', salesError);
      return res.status(500).json({ error: 'Error fetching eligible sales' });
    }

    // Verificar se há vendas elegíveis
    if (!eligibleSales || eligibleSales.length === 0) {
      return res.status(400).json({ 
        error: 'No eligible sales found',
        message: 'Não há vendas elegíveis para comissão. Vendas devem ter mais de 15 dias para serem processadas.'
      });
    }

    // Calcular total da comissão
    const totalCommissionCents = eligibleSales.reduce((sum, sale) => {
      return sum + (sale.commission_amount_cents || 0);
    }, 0);

    const totalCommissionAmount = totalCommissionCents / 100;
    const currency = eligibleSales[0]?.currency || 'BRL';

    // Iniciar transação para atualizar vendas e criar registro de comissão
    const { data: commissionRecord, error: commissionError } = await supabase
      .from('commissions')
      .insert({
        profile_id: profile.id,
        partner_name: profile.name,
        coupon_code: profile.coupon_code,
        commission_amount: totalCommissionAmount,
        sales_count: eligibleSales.length,
        status: 'pending'
      })
      .select()
      .single();

    if (commissionError) {
      console.error('Erro ao criar registro de comissão:', commissionError);
      return res.status(500).json({ error: 'Error creating commission record' });
    }

    // Atualizar vendas como pagas
    const saleIds = eligibleSales.map(sale => sale.id);
    const { error: updateError } = await supabase
      .from('partner_sales')
      .update({
        commission_paid: true,
        payment_date: new Date().toISOString()
      })
      .in('id', saleIds);

    if (updateError) {
      console.error('Erro ao atualizar vendas:', updateError);
      // Reverter criação da comissão se falhar
      await supabase
        .from('commissions')
        .delete()
        .eq('id', commissionRecord.id);
      
      return res.status(500).json({ error: 'Error updating sales records' });
    }

    // Retornar dados da comissão criada
    return res.status(200).json({
      success: true,
      commission: {
        id: commissionRecord.id,
        amount: totalCommissionAmount,
        currency: currency,
        salesCount: eligibleSales.length,
        requestDate: commissionRecord.request_date
      }
    });

  } catch (error) {
    console.error('Erro no endpoint de geração de pagamento:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
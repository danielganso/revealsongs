import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🌍 [ADMIN-COMMISSIONS] API chamada recebida');
  console.log('🔧 [ADMIN-COMMISSIONS] Método:', req.method);
  
  // Verificar se o token está presente no header
  const authHeader = req.headers.authorization;
  console.log('🔧 [ADMIN-COMMISSIONS] Auth header presente:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ [ADMIN-COMMISSIONS] Token de autorização ausente');
    return res.status(401).json({ error: 'Token de autorização necessário' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔧 [ADMIN-COMMISSIONS] Token extraído, verificando usuário...');

  // Usar supabaseAdmin para verificar o token
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError) {
    console.error('❌ [ADMIN-COMMISSIONS] Erro de autenticação:', authError);
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  if (!user) {
    console.error('❌ [ADMIN-COMMISSIONS] Usuário não encontrado');
    return res.status(401).json({ error: 'Token inválido' });
  }

  console.log('✅ [ADMIN-COMMISSIONS] Usuário autenticado:', user.id);

  console.log('🔍 [ADMIN-COMMISSIONS] Verificando role do usuário...');
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    console.error('❌ [ADMIN-COMMISSIONS] Erro ao buscar profile:', profileError);
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  if (!profile) {
    console.error('❌ [ADMIN-COMMISSIONS] Profile não encontrado');
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  console.log('🔍 [ADMIN-COMMISSIONS] Role do usuário:', profile.role);

  if (profile.role !== 'ADMIN') {
    console.error('❌ [ADMIN-COMMISSIONS] Usuário não é admin:', profile.role);
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  console.log('✅ [ADMIN-COMMISSIONS] Usuário é admin, prosseguindo...');

  if (req.method === 'GET') {
    try {
      const { status, search } = req.query;

      let query = supabaseAdmin
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtro de status
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Aplicar filtro de busca
      if (search) {
        query = query.or(`partner_name.ilike.%${search}%,coupon_code.ilike.%${search}%`);
      }

      const { data: commissions, error } = await query;

      if (error) {
        console.error('Erro ao buscar comissões:', error);
        return res.status(500).json({ error: 'Error fetching commissions' });
      }

      return res.status(200).json({ commissions });
    } catch (error) {
      console.error('Erro no endpoint de comissões:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { commissionId, action, notes } = req.body;

      if (!commissionId || !action) {
        return res.status(400).json({ error: 'Commission ID and action are required' });
      }

      if (action === 'mark_as_paid') {
        // Primeiro, buscar informações da comissão para obter o profile_id
        const { data: commission, error: fetchError } = await supabaseAdmin
          .from('commissions')
          .select('profile_id, request_date')
          .eq('id', commissionId)
          .single();

        if (fetchError || !commission) {
          console.error('Erro ao buscar comissão:', fetchError);
          return res.status(404).json({ error: 'Commission not found' });
        }

        // Atualizar a comissão como paga
        const { error: commissionUpdateError } = await supabaseAdmin
          .from('commissions')
          .update({
            status: 'paid',
            admin_payment_date: new Date().toISOString(),
            notes: notes || null
          })
          .eq('id', commissionId);

        if (commissionUpdateError) {
          console.error('Erro ao marcar comissão como paga:', commissionUpdateError);
          return res.status(500).json({ error: 'Error updating commission' });
        }

        // Atualizar todas as vendas relacionadas a esta comissão como 'paid'
        // Buscar vendas que estão 'pending' para este parceiro até a data da solicitação
        const { data: relatedSales, error: salesFetchError } = await supabaseAdmin
          .from('partner_sales')
          .select('id')
          .eq('partner_id', commission.profile_id)
          .eq('commission_paid', 'pending')
          .lte('payment_date', commission.request_date);

        if (salesFetchError) {
          console.error('Erro ao buscar vendas relacionadas:', salesFetchError);
          // Não falhar aqui, pois a comissão já foi atualizada
        } else if (relatedSales && relatedSales.length > 0) {
          const saleIds = relatedSales.map(sale => sale.id);
          
          const { error: salesUpdateError } = await supabaseAdmin
            .from('partner_sales')
            .update({
              commission_paid: 'paid'
            })
            .in('id', saleIds);

          if (salesUpdateError) {
            console.error('Erro ao atualizar vendas como pagas:', salesUpdateError);
            // Log o erro mas não falhar, pois a comissão já foi marcada como paga
          } else {
            console.log(`✅ Atualizadas ${saleIds.length} vendas como 'paid' para a comissão ${commissionId}`);
          }
        }

        return res.status(200).json({ success: true, message: 'Commission marked as paid' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Erro no endpoint de comissões:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
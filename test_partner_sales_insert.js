const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (você precisa definir as variáveis de ambiente)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('Por favor, defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPartnerSalesInsert() {
  try {
    console.log('🧪 Testando inserção na tabela partner_sales...');
    
    // Primeiro, vamos verificar se existe algum parceiro na tabela
    console.log('🔍 Verificando parceiros existentes...');
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .limit(1);
    
    if (partnersError) {
      console.error('❌ Erro ao buscar parceiros:', partnersError);
      return;
    }
    
    if (!partners || partners.length === 0) {
      console.log('⚠️ Nenhum parceiro encontrado na tabela partners');
      console.log('Criando um parceiro de teste...');
      
      // Criar um parceiro de teste
      const { data: newPartner, error: createPartnerError } = await supabase
        .from('partners')
        .insert({
          name: 'Parceiro Teste',
          email: 'teste@exemplo.com',
          coupon_code: 'TESTE123',
          promotion_code_id: 'promo_teste123',
          commission_percentage: 15,
          status: 'active'
        })
        .select()
        .single();
      
      if (createPartnerError) {
        console.error('❌ Erro ao criar parceiro de teste:', createPartnerError);
        return;
      }
      
      console.log('✅ Parceiro de teste criado:', newPartner);
      partners[0] = newPartner;
    }
    
    const partner = partners[0];
    console.log('✅ Usando parceiro:', {
      id: partner.id,
      name: partner.name,
      coupon_code: partner.coupon_code
    });
    
    // Agora vamos tentar inserir uma venda de teste
    console.log('🧪 Inserindo venda de teste...');
    
    const testSale = {
      partner_id: partner.id,
      subscription_id: 'sub_test_' + Date.now(),
      coupon_code: partner.coupon_code,
      promotion_code_id: partner.promotion_code_id,
      amount_paid_cents: 2990, // R$ 29,90
      commission_percentage: 15,
      commission_amount_cents: 449, // 15% de 2990
      currency: 'brl',
      sale_type: 'subscription',
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Dados da venda de teste:', testSale);
    
    const { data: insertedSale, error: insertError } = await supabase
      .from('partner_sales')
      .insert(testSale)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ ERRO ao inserir venda de teste:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Vamos verificar a estrutura da tabela
      console.log('🔍 Verificando estrutura da tabela partner_sales...');
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_columns', { table_name: 'partner_sales' });
      
      if (tableError) {
        console.log('⚠️ Não foi possível obter informações da tabela:', tableError);
      } else {
        console.log('📋 Colunas da tabela partner_sales:', tableInfo);
      }
      
    } else {
      console.log('✅ SUCESSO! Venda de teste inserida:', insertedSale);
      
      // Verificar se a venda foi realmente salva
      console.log('🔍 Verificando se a venda foi salva...');
      const { data: savedSale, error: selectError } = await supabase
        .from('partner_sales')
        .select('*')
        .eq('id', insertedSale.id)
        .single();
      
      if (selectError) {
        console.error('❌ Erro ao verificar venda salva:', selectError);
      } else {
        console.log('✅ Venda confirmada no banco:', savedSale);
      }
    }
    
    // Verificar quantas vendas existem na tabela
    console.log('🔍 Verificando total de vendas na tabela...');
    const { count, error: countError } = await supabase
      .from('partner_sales')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar vendas:', countError);
    } else {
      console.log('📊 Total de vendas na tabela partner_sales:', count);
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

// Executar o teste
testPartnerSalesInsert();
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPartnerSalesTable() {
  console.log('🔧 Verificando e corrigindo estrutura da tabela partner_sales...');

  try {
    // SQL para adicionar as colunas faltantes
    const sql = `
      -- Adicionar coluna para indicar se a comissão foi paga (se não existir)
      ALTER TABLE partner_sales 
      ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE;

      -- Adicionar coluna para data do pagamento da comissão (se não existir)
      ALTER TABLE partner_sales 
      ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

      -- Criar índices para melhorar performance nas consultas (se não existirem)
      CREATE INDEX IF NOT EXISTS idx_partner_sales_commission_paid ON partner_sales(commission_paid);
      CREATE INDEX IF NOT EXISTS idx_partner_sales_payment_date ON partner_sales(payment_date);
      CREATE INDEX IF NOT EXISTS idx_partner_sales_created_at ON partner_sales(created_at);
    `;

    // Executar o SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao executar SQL:', error);
      
      // Tentar executar cada comando separadamente
      console.log('🔄 Tentando executar comandos separadamente...');
      
      const commands = [
        'ALTER TABLE partner_sales ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE',
        'ALTER TABLE partner_sales ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE',
        'CREATE INDEX IF NOT EXISTS idx_partner_sales_commission_paid ON partner_sales(commission_paid)',
        'CREATE INDEX IF NOT EXISTS idx_partner_sales_payment_date ON partner_sales(payment_date)',
        'CREATE INDEX IF NOT EXISTS idx_partner_sales_created_at ON partner_sales(created_at)'
      ];

      for (const command of commands) {
        try {
          console.log(`🔧 Executando: ${command}`);
          const { error: cmdError } = await supabase.rpc('exec_sql', { sql_query: command });
          if (cmdError) {
            console.error(`❌ Erro no comando: ${command}`, cmdError);
          } else {
            console.log(`✅ Comando executado com sucesso: ${command}`);
          }
        } catch (err) {
          console.error(`❌ Erro ao executar comando: ${command}`, err);
        }
      }
    } else {
      console.log('✅ SQL executado com sucesso!');
    }

    // Verificar a estrutura atual da tabela
    console.log('🔍 Verificando estrutura atual da tabela partner_sales...');
    
    const { data: tableInfo, error: infoError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'partner_sales')
      .order('ordinal_position');

    if (infoError) {
      console.error('❌ Erro ao verificar estrutura da tabela:', infoError);
    } else {
      console.log('📋 Estrutura da tabela partner_sales:');
      tableInfo.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Verificar se há registros na tabela
    const { data: salesData, error: salesError, count } = await supabase
      .from('partner_sales')
      .select('*', { count: 'exact' })
      .limit(5);

    if (salesError) {
      console.error('❌ Erro ao verificar registros na tabela:', salesError);
    } else {
      console.log(`📊 Total de registros na tabela partner_sales: ${count}`);
      if (salesData && salesData.length > 0) {
        console.log('📋 Últimos registros:');
        salesData.forEach(sale => {
          console.log(`  - ID: ${sale.id}, Partner: ${sale.partner_id}, Amount: ${sale.amount_paid_cents}, Type: ${sale.sale_type}`);
        });
      } else {
        console.log('📋 Nenhum registro encontrado na tabela partner_sales');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
fixPartnerSalesTable()
  .then(() => {
    console.log('🎉 Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
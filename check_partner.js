const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPartner() {
  try {
    console.log('🔍 Verificando parceiros com promotion_code_id...');
    
    // Buscar todos os parceiros
    const { data: partners, error } = await supabase
      .from('profiles')
      .select('id, name, email, coupon_code, promotion_code_id, role')
      .eq('role', 'PARCEIRO');

    if (error) {
      console.error('❌ Erro ao buscar parceiros:', error);
      return;
    }

    console.log(`📊 Total de parceiros encontrados: ${partners.length}`);
    
    partners.forEach((partner, index) => {
      console.log(`\n👤 Parceiro ${index + 1}:`);
      console.log(`   ID: ${partner.id}`);
      console.log(`   Nome: ${partner.name}`);
      console.log(`   Email: ${partner.email}`);
      console.log(`   Coupon Code: ${partner.coupon_code}`);
      console.log(`   Promotion Code ID: ${partner.promotion_code_id}`);
    });

    // Verificar especificamente o promotion_code_id que está falhando
    const targetPromotionCodeId = 'promo_1SGtH5LdwkupxKFBNedm3LN0';
    console.log(`\n🎯 Buscando parceiro com promotion_code_id: ${targetPromotionCodeId}`);
    
    const { data: specificPartner, error: specificError } = await supabase
      .from('profiles')
      .select('id, name, email, coupon_code, promotion_code_id, role')
      .eq('promotion_code_id', targetPromotionCodeId)
      .eq('role', 'PARCEIRO')
      .single();

    if (specificError) {
      console.log('⚠️ Parceiro específico não encontrado:', specificError.message);
    } else {
      console.log('✅ Parceiro específico encontrado:', specificPartner);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkPartner();
-- Migração para separar promotion codes de assinaturas e créditos
-- Execute este SQL no seu banco de dados Supabase

-- 1. Renomear a coluna existente promotion_code_id para promotion_code_id_assinaturas
ALTER TABLE profiles 
RENAME COLUMN promotion_code_id TO promotion_code_id_assinaturas;

-- 2. Adicionar nova coluna para promotion code de créditos
ALTER TABLE profiles 
ADD COLUMN promotion_code_id_creditos TEXT;

-- 3. Adicionar comentários para documentação
COMMENT ON COLUMN profiles.promotion_code_id_assinaturas IS 'Stripe promotion code ID para cupons de assinaturas (duration: once)';
COMMENT ON COLUMN profiles.promotion_code_id_creditos IS 'Stripe promotion code ID para cupons de créditos (duration: forever)';

-- 4. Verificar a estrutura da tabela após a migração
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name LIKE '%promotion_code%'
-- ORDER BY column_name;
-- Script para reverter ao sistema de cupom único
-- Remove as colunas adicionadas e mantém apenas promotion_code_id

-- 1. Remover a coluna promotion_code_id_creditos da tabela profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS promotion_code_id_creditos;

-- 2. Renomear promotion_code_id_assinaturas de volta para promotion_code_id na tabela profiles
ALTER TABLE profiles RENAME COLUMN promotion_code_id_assinaturas TO promotion_code_id;

-- 3. Remover a coluna promotion_code_id_creditos da tabela partner_sales (se existir)
ALTER TABLE partner_sales DROP COLUMN IF EXISTS promotion_code_id_creditos;

-- 4. Renomear promotion_code_id_assinaturas de volta para promotion_code_id na tabela partner_sales (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'partner_sales' 
               AND column_name = 'promotion_code_id_assinaturas') THEN
        ALTER TABLE partner_sales RENAME COLUMN promotion_code_id_assinaturas TO promotion_code_id;
    END IF;
END $$;

-- 5. Verificar as estruturas das tabelas após as mudanças
SELECT 'profiles columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%promotion%'
ORDER BY column_name;

SELECT 'partner_sales columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partner_sales' 
AND column_name LIKE '%promotion%'
ORDER BY column_name;
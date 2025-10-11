-- Adicionar coluna promotion_code_id na tabela subscriptions
-- Esta coluna armazenará o ID do código promocional do Stripe usado na assinatura

ALTER TABLE subscriptions 
ADD COLUMN promotion_code_id TEXT;

-- Adicionar comentário explicativo na coluna
COMMENT ON COLUMN subscriptions.promotion_code_id IS 'ID do código promocional do Stripe usado na assinatura (ex: promo_1SGtH5LdwkupxKFBNedm3LN0)';

-- Opcional: Criar índice para melhorar performance nas consultas por promotion_code_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_promotion_code_id 
ON subscriptions(promotion_code_id) 
WHERE promotion_code_id IS NOT NULL;
-- Script para adicionar colunas de comissão na tabela partner_sales
-- Adiciona colunas para controlar se a comissão foi paga e quando

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

-- Comentários para documentação
COMMENT ON COLUMN partner_sales.commission_paid IS 'Indica se a comissão desta venda já foi paga ao parceiro';
COMMENT ON COLUMN partner_sales.payment_date IS 'Data e hora quando a comissão foi processada para pagamento';
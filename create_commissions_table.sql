-- Script para criar a tabela commissions
-- Esta tabela armazena as solicitações de pagamento de comissões dos parceiros

CREATE TABLE commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    coupon_code TEXT NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    sales_count INTEGER NOT NULL DEFAULT 0,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_payment_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar performance
CREATE INDEX idx_commissions_profile_id ON commissions(profile_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_request_date ON commissions(request_date);
CREATE INDEX idx_commissions_coupon_code ON commissions(coupon_code);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_commissions_updated_at 
    BEFORE UPDATE ON commissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE commissions IS 'Tabela para armazenar solicitações de pagamento de comissões dos parceiros';
COMMENT ON COLUMN commissions.profile_id IS 'ID do perfil do parceiro';
COMMENT ON COLUMN commissions.partner_name IS 'Nome do parceiro no momento da solicitação';
COMMENT ON COLUMN commissions.coupon_code IS 'Código do cupom do parceiro';
COMMENT ON COLUMN commissions.commission_amount IS 'Valor total da comissão a ser paga';
COMMENT ON COLUMN commissions.sales_count IS 'Número de vendas incluídas nesta comissão';
COMMENT ON COLUMN commissions.request_date IS 'Data quando o parceiro solicitou o pagamento';
COMMENT ON COLUMN commissions.admin_payment_date IS 'Data quando o admin processou o pagamento';
COMMENT ON COLUMN commissions.status IS 'Status da comissão: pending ou paid';
COMMENT ON COLUMN commissions.notes IS 'Observações do admin sobre o pagamento';
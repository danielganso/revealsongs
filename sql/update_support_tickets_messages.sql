-- SQL para alterar a tabela support_tickets para suportar histórico de mensagens em JSON
-- Este script altera o campo 'message' para 'messages' em formato JSON

-- 1. Primeiro, vamos adicionar a nova coluna 'messages' em formato JSON
ALTER TABLE support_tickets 
ADD COLUMN messages JSONB DEFAULT '[]'::jsonb;

-- 2. Migrar dados existentes do campo 'message' para o novo formato JSON
-- Cada mensagem existente será convertida para o formato:
-- [{"id": "uuid", "content": "mensagem", "sender": "user", "timestamp": "data_criacao"}]
UPDATE support_tickets 
SET messages = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'content', message,
    'sender', 'user',
    'timestamp', created_at
  )
)
WHERE message IS NOT NULL AND message != '';

-- 3. Remover a coluna antiga 'message' (opcional - descomente se quiser remover)
-- ALTER TABLE support_tickets DROP COLUMN message;

-- 4. Adicionar índice para melhor performance nas consultas JSON
CREATE INDEX IF NOT EXISTS idx_support_tickets_messages_gin ON support_tickets USING GIN (messages);

-- 5. Adicionar comentário na tabela para documentar a estrutura das mensagens
COMMENT ON COLUMN support_tickets.messages IS 'Array JSON de mensagens com estrutura: [{"id": "uuid", "content": "texto", "sender": "user|admin", "timestamp": "ISO_date"}]';

-- Exemplo de estrutura das mensagens:
-- [
--   {
--     "id": "550e8400-e29b-41d4-a716-446655440000",
--     "content": "Preciso de ajuda com minha conta",
--     "sender": "user",
--     "timestamp": "2024-01-15T10:30:00Z"
--   },
--   {
--     "id": "550e8400-e29b-41d4-a716-446655440001", 
--     "content": "Olá! Como posso ajudá-lo?",
--     "sender": "admin",
--     "timestamp": "2024-01-15T11:00:00Z"
--   }
-- ]
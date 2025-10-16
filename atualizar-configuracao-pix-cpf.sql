-- Script para adicionar CPF como tipo de chave PIX válido
-- Execute este script se a tabela configuracao_pix já existir

-- Remover constraint antiga
ALTER TABLE public.configuracao_pix 
DROP CONSTRAINT IF EXISTS configuracao_pix_tipo_chave_check;

-- Adicionar nova constraint com CPF incluído
ALTER TABLE public.configuracao_pix 
ADD CONSTRAINT configuracao_pix_tipo_chave_check 
CHECK (tipo_chave IN ('Email', 'Telefone', 'CPF', 'CNPJ', 'Chave Aleatória'));

-- Atualizar comentário da coluna
COMMENT ON COLUMN public.configuracao_pix.tipo_chave IS 'Tipo da chave PIX: Email, Telefone, CPF, CNPJ ou Chave Aleatória';

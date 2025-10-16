-- Criar tabela de configuração PIX se não existir
CREATE TABLE IF NOT EXISTS public.configuracao_pix (
  id INTEGER PRIMARY KEY DEFAULT 1,
  tipo_chave TEXT NOT NULL CHECK (tipo_chave IN ('Email', 'Telefone', 'CPF', 'CNPJ', 'Chave Aleatória')),
  chave_pix TEXT NOT NULL,
  nome_beneficiario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT configuracao_pix_id_check CHECK (id = 1)
);

-- Desabilitar RLS para esta tabela (apenas admins podem acessar via aplicação)
ALTER TABLE public.configuracao_pix DISABLE ROW LEVEL SECURITY;

-- Comentário na tabela
COMMENT ON TABLE public.configuracao_pix IS 'Configuração da chave PIX para recebimento de pagamentos';

-- Comentários nas colunas
COMMENT ON COLUMN public.configuracao_pix.tipo_chave IS 'Tipo da chave PIX: Email, Telefone, CPF, CNPJ ou Chave Aleatória';
COMMENT ON COLUMN public.configuracao_pix.chave_pix IS 'Chave PIX cadastrada';
COMMENT ON COLUMN public.configuracao_pix.nome_beneficiario IS 'Nome que aparecerá como beneficiário do PIX';

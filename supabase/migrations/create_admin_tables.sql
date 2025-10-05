-- Verificar e criar tabela dados_empresa
CREATE TABLE IF NOT EXISTS dados_empresa (
    id INTEGER PRIMARY KEY DEFAULT 1,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj VARCHAR(18),
    inscricao_estadual VARCHAR(20),
    endereco TEXT NOT NULL,
    telefone VARCHAR(20),
    email_contato TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verificar e criar tabela configuracao_pix
CREATE TABLE IF NOT EXISTS configuracao_pix (
    id INTEGER PRIMARY KEY DEFAULT 1,
    tipo_chave TEXT NOT NULL CHECK (tipo_chave IN ('CNPJ', 'Email', 'Telefone', 'Chave Aleatória')),
    chave_pix TEXT NOT NULL,
    nome_beneficiario TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verificar se a coluna funcao existe na tabela profiles, se não existir, adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'funcao'
    ) THEN
        ALTER TABLE profiles ADD COLUMN funcao TEXT DEFAULT 'usuario';
    END IF;
END $$;

-- Políticas RLS para dados_empresa
ALTER TABLE dados_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administradores e gerentes podem ver dados da empresa" ON dados_empresa;
CREATE POLICY "Administradores e gerentes podem ver dados da empresa"
ON dados_empresa FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.funcao IN ('administrador', 'gerente')
    )
);

DROP POLICY IF EXISTS "Administradores e gerentes podem atualizar dados da empresa" ON dados_empresa;
CREATE POLICY "Administradores e gerentes podem atualizar dados da empresa"
ON dados_empresa FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.funcao IN ('administrador', 'gerente')
    )
);

-- Políticas RLS para configuracao_pix
ALTER TABLE configuracao_pix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administradores e gerentes podem ver configuração PIX" ON configuracao_pix;
CREATE POLICY "Administradores e gerentes podem ver configuração PIX"
ON configuracao_pix FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.funcao IN ('administrador', 'gerente')
    )
);

DROP POLICY IF EXISTS "Administradores e gerentes podem atualizar configuração PIX" ON configuracao_pix;
CREATE POLICY "Administradores e gerentes podem atualizar configuração PIX"
ON configuracao_pix FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.funcao IN ('administrador', 'gerente')
    )
);

-- Política RLS atualizada para profiles (cadastro de usuários)
DROP POLICY IF EXISTS "Administradores e gerentes podem ver todos os usuários" ON profiles;
CREATE POLICY "Administradores e gerentes podem ver todos os usuários"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.funcao IN ('administrador', 'gerente')
    )
    OR profiles.id = auth.uid()
);

DROP POLICY IF EXISTS "Administradores e gerentes podem inserir novos usuários" ON profiles;
CREATE POLICY "Administradores e gerentes podem inserir novos usuários"
ON profiles FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.funcao IN ('administrador', 'gerente')
    )
);

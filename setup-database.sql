-- Criar tabelas principais
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(role, module)
);

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions DISABLE ROW LEVEL SECURITY;

-- Inserir permissões para o papel de administrador
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES 
  ('administrador', 'usuarios', true, true, true, true),
  ('administrador', 'reports', true, true, true, true),
  ('administrador', 'produtos', true, true, true, true),
  ('administrador', 'estoque', true, true, true, true),
  ('administrador', 'pdv', true, true, true, true),
  ('administrador', 'clientes', true, true, true, true),
  ('administrador', 'fornecedores', true, true, true, true),
  ('administrador', 'settings', true, true, true, true),
  ('administrador', 'dashboard', true, true, true, true),
  ('administrador', 'system', true, true, true, true),
  ('administrador', 'pagamentos', true, true, true, true)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- Inserir permissões para o papel de usuário comum
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES 
  ('user', 'usuarios', true, false, false, false),
  ('user', 'reports', true, false, false, false),
  ('user', 'produtos', true, false, false, false),
  ('user', 'estoque', true, false, false, false),
  ('user', 'pdv', true, true, false, false),
  ('user', 'clientes', true, false, false, false),
  ('user', 'fornecedores', true, false, false, false),
  ('user', 'settings', true, false, false, false),
  ('user', 'dashboard', true, false, false, false),
  ('user', 'system', true, false, false, false),
  ('user', 'pagamentos', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- Inserir permissões para o papel de gerente
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES 
  ('gerente', 'usuarios', true, true, true, false),
  ('gerente', 'reports', true, true, true, false),
  ('gerente', 'produtos', true, true, true, true),
  ('gerente', 'estoque', true, true, true, true),
  ('gerente', 'pdv', true, true, true, true),
  ('gerente', 'clientes', true, true, true, true),
  ('gerente', 'fornecedores', true, true, true, true),
  ('gerente', 'settings', true, true, true, false),
  ('gerente', 'dashboard', true, true, true, false),
  ('gerente', 'system', true, false, false, false),
  ('gerente', 'pagamentos', true, true, true, true)
ON CONFLICT (role, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- Criar tabelas para pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER,
  valor DECIMAL(10,2) NOT NULL,
  metodo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  usuario_id UUID REFERENCES auth.users,
  detalhes JSONB
);
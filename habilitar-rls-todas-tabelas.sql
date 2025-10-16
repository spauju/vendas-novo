-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS PÚBLICAS
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query

-- 1. TABELAS COM POLÍTICAS JÁ CRIADAS (só precisa habilitar RLS)
-- ----------------------------------------------------------------

-- Configuração PIX
ALTER TABLE public.configuracao_pix ENABLE ROW LEVEL SECURITY;

-- Perfis de usuários
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permissões de papéis
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Vendas
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;


-- 2. TABELAS SEM POLÍTICAS (precisa habilitar RLS + criar políticas)
-- --------------------------------------------------------------------

-- Pagamentos (CRÍTICO - dados sensíveis)
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas para pagamentos
CREATE POLICY "Admins e gerentes podem ver todos os pagamentos"
  ON public.pagamentos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins e gerentes podem inserir pagamentos"
  ON public.pagamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins e gerentes podem atualizar pagamentos"
  ON public.pagamentos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Apenas admins podem deletar pagamentos"
  ON public.pagamentos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- Fornecedores
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gerentes podem ver fornecedores"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar fornecedores"
  ON public.suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );


-- 3. TABELAS DE BACKUP (restringir acesso apenas a admins)
-- ---------------------------------------------------------

-- Sales Backup
ALTER TABLE public.sales_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem acessar sales_backup"
  ON public.sales_backup
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Products Backup
ALTER TABLE public.products_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem acessar products_backup"
  ON public.products_backup
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Sale Items Backup
ALTER TABLE public.sale_items_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem acessar sale_items_backup"
  ON public.sale_items_backup
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Execute esta query para verificar se RLS está habilitado

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'configuracao_pix',
    'profiles',
    'role_permissions',
    'sales',
    'pagamentos',
    'suppliers',
    'sales_backup',
    'products_backup',
    'sale_items_backup'
  )
ORDER BY tablename;

-- Resultado esperado: rls_enabled = true para todas as tabelas

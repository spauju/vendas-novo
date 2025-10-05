-- Script para criar a tabela 'sales' e estruturas relacionadas
-- Execute este script no Supabase SQL Editor

-- 1. Criar a tabela de vendas (sales)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar a tabela de itens da venda (sale_items)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(payment_status);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- 4. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela sales
DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para a tabela sales
-- Política para SELECT (visualizar vendas)
CREATE POLICY "Authenticated users can view sales" ON public.sales
  FOR SELECT TO authenticated USING (true);

-- Política para INSERT (criar vendas)
CREATE POLICY "Authenticated users can insert sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (true);

-- Política para UPDATE (atualizar vendas)
CREATE POLICY "Authenticated users can update sales" ON public.sales
  FOR UPDATE TO authenticated USING (true);

-- Política para DELETE (excluir vendas - apenas administradores)
CREATE POLICY "Administrators can delete sales" ON public.sales
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('administrador', 'gerente')
    )
  );

-- 7. Criar políticas RLS para a tabela sale_items
-- Política para SELECT (visualizar itens de venda)
CREATE POLICY "Authenticated users can view sale items" ON public.sale_items
  FOR SELECT TO authenticated USING (true);

-- Política para INSERT (criar itens de venda)
CREATE POLICY "Authenticated users can insert sale items" ON public.sale_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Política para UPDATE (atualizar itens de venda)
CREATE POLICY "Authenticated users can update sale items" ON public.sale_items
  FOR UPDATE TO authenticated USING (true);

-- Política para DELETE (excluir itens de venda)
CREATE POLICY "Authenticated users can delete sale items" ON public.sale_items
  FOR DELETE TO authenticated USING (true);

-- 8. Inserir dados de exemplo (opcional)
INSERT INTO public.sales (
  user_id, 
  total_amount, 
  discount_amount, 
  final_amount, 
  status, 
  payment_method, 
  payment_status, 
  notes
) VALUES (
  (SELECT id FROM public.profiles WHERE email = 'admin@vendas.com' LIMIT 1),
  100.00,
  10.00,
  90.00,
  'completed',
  'Dinheiro',
  'paid',
  'Venda de exemplo'
) ON CONFLICT DO NOTHING;

-- 9. Verificar se as tabelas foram criadas corretamente
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales', 'sale_items')
ORDER BY table_name;

-- 10. Verificar se as políticas RLS foram criadas
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('sales', 'sale_items')
ORDER BY tablename, policyname;
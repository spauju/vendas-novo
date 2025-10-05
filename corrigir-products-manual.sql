-- Script para corrigir a tabela products no Supabase Dashboard
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- 1. Primeiro, vamos fazer backup dos dados existentes
CREATE TABLE IF NOT EXISTS products_backup AS SELECT * FROM public.products;

-- 2. Remover a tabela atual
DROP TABLE IF EXISTS public.products CASCADE;

-- 3. Criar a nova tabela com a estrutura correta
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  brand TEXT,
  supplier TEXT,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit_margin DECIMAL(5,2),
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  unit_of_measure TEXT DEFAULT 'un',
  weight DECIMAL(8,3),
  dimensions TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_products_active ON public.products(active);

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para usuários autenticados
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete products" ON public.products
  FOR DELETE TO authenticated USING (true);

-- 7. Restaurar dados do backup (se existir) - versão segura
DO $$
DECLARE
  backup_exists BOOLEAN := FALSE;
  has_sku BOOLEAN := FALSE;
  has_sale_price BOOLEAN := FALSE;
  has_unit_price BOOLEAN := FALSE;
  has_price BOOLEAN := FALSE;
  has_min_stock BOOLEAN := FALSE;
  has_min_stock_level BOOLEAN := FALSE;
  has_barcode BOOLEAN := FALSE;
  has_image_url BOOLEAN := FALSE;
  has_weight BOOLEAN := FALSE;
  has_dimensions BOOLEAN := FALSE;
  has_max_stock_level BOOLEAN := FALSE;
BEGIN
  -- Verificar se a tabela de backup existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'products_backup' AND table_schema = 'public'
  ) INTO backup_exists;
  
  IF backup_exists THEN
    -- Verificar quais colunas existem na tabela de backup
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'sku') INTO has_sku;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'sale_price') INTO has_sale_price;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'unit_price') INTO has_unit_price;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'price') INTO has_price;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'min_stock') INTO has_min_stock;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'min_stock_level') INTO has_min_stock_level;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'barcode') INTO has_barcode;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'image_url') INTO has_image_url;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'weight') INTO has_weight;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'dimensions') INTO has_dimensions;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products_backup' AND column_name = 'max_stock_level') INTO has_max_stock_level;
    
    -- Inserir dados usando apenas as colunas que existem
    EXECUTE format('
      INSERT INTO public.products (
        code, name, description, category, brand, supplier,
        cost_price, sale_price, stock_quantity, min_stock, 
        unit_of_measure, active%s%s%s%s%s
      )
      SELECT 
        COALESCE(%s, ''PROD'' || EXTRACT(EPOCH FROM NOW())::TEXT || FLOOR(RANDOM() * 1000)::TEXT) as code,
        name,
        description,
        category,
        brand,
        supplier,
        COALESCE(cost_price, 0) as cost_price,
        COALESCE(%s, 0) as sale_price,
        COALESCE(stock_quantity, 0) as stock_quantity,
        COALESCE(%s, 0) as min_stock,
        COALESCE(unit_of_measure, ''un'') as unit_of_measure,
        COALESCE(active, true) as active%s%s%s%s%s
      FROM products_backup',
      CASE WHEN has_barcode THEN ', barcode' ELSE '' END,
      CASE WHEN has_image_url THEN ', image_url' ELSE '' END,
      CASE WHEN has_weight THEN ', weight' ELSE '' END,
      CASE WHEN has_dimensions THEN ', dimensions' ELSE '' END,
      CASE WHEN has_max_stock_level THEN ', max_stock_level' ELSE '' END,
      CASE WHEN has_sku THEN 'sku' ELSE 'NULL' END,
      CASE 
        WHEN has_sale_price THEN 'sale_price'
        WHEN has_unit_price THEN 'unit_price'
        WHEN has_price THEN 'price'
        ELSE '0'
      END,
      CASE 
        WHEN has_min_stock THEN 'min_stock'
        WHEN has_min_stock_level THEN 'min_stock_level'
        ELSE '0'
      END,
      CASE WHEN has_barcode THEN ', barcode' ELSE '' END,
      CASE WHEN has_image_url THEN ', image_url' ELSE '' END,
      CASE WHEN has_weight THEN ', weight' ELSE '' END,
      CASE WHEN has_dimensions THEN ', dimensions' ELSE '' END,
      CASE WHEN has_max_stock_level THEN ', max_stock_level' ELSE '' END
    );
    
    RAISE NOTICE 'Dados restaurados da tabela de backup';
  ELSE
    RAISE NOTICE 'Nenhuma tabela de backup encontrada - tabela criada vazia';
  END IF;
END $$;

-- 8. Verificar se tudo funcionou
SELECT 
  'Tabela products criada com sucesso!' as status,
  COUNT(*) as total_produtos
FROM public.products;

-- 9. Mostrar estrutura da nova tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. Limpar backup (opcional - descomente se quiser remover)
-- DROP TABLE IF EXISTS products_backup;
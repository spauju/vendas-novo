-- Script para corrigir a tabela 'sale_items' 
-- Execute este script no Supabase SQL Editor (Dashboard)

-- 1. Fazer backup dos dados existentes
CREATE TABLE IF NOT EXISTS public.sale_items_backup AS 
SELECT * FROM public.sale_items;

-- 2. Verificar a estrutura atual da tabela sale_items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sale_items'
ORDER BY ordinal_position;

-- 3. Remover a constraint NOT NULL da coluna total_price se existir
DO $$
BEGIN
    -- Verificar se a coluna total_price existe e não é gerada
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'total_price'
        AND is_generated = 'NEVER'
    ) THEN
        -- Remover a coluna total_price existente
        ALTER TABLE public.sale_items DROP COLUMN IF EXISTS total_price;
        RAISE NOTICE 'Coluna total_price removida!';
    END IF;
END $$;

-- 4. Adicionar a coluna total_price como campo calculado
ALTER TABLE public.sale_items 
ADD COLUMN total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;

-- 5. Verificar se a coluna updated_at existe, se não, adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_items' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.sale_items 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at adicionada!';
    END IF;
END $$;

-- 6. Criar ou recriar o trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela sale_items (remover se existir e recriar)
DROP TRIGGER IF EXISTS update_sale_items_updated_at ON public.sale_items;
CREATE TRIGGER update_sale_items_updated_at
  BEFORE UPDATE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Habilitar RLS se não estiver habilitado
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas RLS se não existirem
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sale_items' 
        AND policyname = 'Authenticated users can view sale items'
    ) THEN
        CREATE POLICY "Authenticated users can view sale items" ON public.sale_items
        FOR SELECT TO authenticated USING (true);
    END IF;

    -- Política para INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sale_items' 
        AND policyname = 'Authenticated users can insert sale items'
    ) THEN
        CREATE POLICY "Authenticated users can insert sale items" ON public.sale_items
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    -- Política para UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sale_items' 
        AND policyname = 'Authenticated users can update sale items'
    ) THEN
        CREATE POLICY "Authenticated users can update sale items" ON public.sale_items
        FOR UPDATE TO authenticated USING (true);
    END IF;

    -- Política para DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sale_items' 
        AND policyname = 'Authenticated users can delete sale items'
    ) THEN
        CREATE POLICY "Authenticated users can delete sale items" ON public.sale_items
        FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- 9. Verificar a estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sale_items'
ORDER BY ordinal_position;

-- 10. Testar inserção sem total_price (deve ser calculado automaticamente)
INSERT INTO public.sale_items (
    sale_id,
    product_id,
    quantity,
    unit_price
) VALUES (
    (SELECT id FROM public.sales LIMIT 1),
    (SELECT id FROM public.products LIMIT 1),
    2,
    10.50
) ON CONFLICT DO NOTHING;

-- 11. Verificar se o teste funcionou (total_price deve ser 21.00)
SELECT 
    id,
    quantity,
    unit_price,
    total_price,
    created_at
FROM public.sale_items 
WHERE quantity = 2 AND unit_price = 10.50
LIMIT 1;

-- 12. Limpar dados de teste (opcional)
-- DELETE FROM public.sale_items WHERE quantity = 2 AND unit_price = 10.50;

-- 13. Remover backup se tudo estiver funcionando (opcional)
-- DROP TABLE IF EXISTS public.sale_items_backup;

-- 14. Mensagem final de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Correção da tabela sale_items concluída com sucesso!';
    RAISE NOTICE 'A coluna total_price agora é calculada automaticamente como (quantity * unit_price)';
END $$;
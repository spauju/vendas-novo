-- Script para corrigir a tabela 'sales' adicionando a coluna 'payment_status'
-- Execute este script no Supabase SQL Editor (Dashboard)

-- 1. Fazer backup dos dados existentes
CREATE TABLE IF NOT EXISTS public.sales_backup AS 
SELECT * FROM public.sales;

-- 2. Verificar se a coluna payment_status já existe
DO $$
BEGIN
    -- Tentar adicionar a coluna payment_status se ela não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'payment_status'
    ) THEN
        -- Adicionar a coluna payment_status
        ALTER TABLE public.sales 
        ADD COLUMN payment_status TEXT 
        CHECK (payment_status IN ('pending', 'paid', 'refunded')) 
        DEFAULT 'pending';
        
        RAISE NOTICE 'Coluna payment_status adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna payment_status já existe!';
    END IF;
END $$;

-- 3. Atualizar registros existentes que não têm payment_status
UPDATE public.sales 
SET payment_status = CASE 
    WHEN status = 'completed' THEN 'paid'
    WHEN status = 'cancelled' THEN 'refunded'
    ELSE 'pending'
END
WHERE payment_status IS NULL;

-- 4. Criar índice para a nova coluna (se não existir)
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(payment_status);

-- 5. Verificar se outras colunas necessárias existem e adicionar se necessário
DO $$
BEGIN
    -- Verificar e adicionar coluna discount_amount se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE public.sales 
        ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Coluna discount_amount adicionada!';
    END IF;

    -- Verificar e adicionar coluna final_amount se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'final_amount'
    ) THEN
        ALTER TABLE public.sales 
        ADD COLUMN final_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Coluna final_amount adicionada!';
    END IF;

    -- Verificar e adicionar coluna notes se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.sales 
        ADD COLUMN notes TEXT;
        RAISE NOTICE 'Coluna notes adicionada!';
    END IF;
END $$;

-- 6. Atualizar final_amount para registros que não têm valor
UPDATE public.sales 
SET final_amount = COALESCE(total_amount - COALESCE(discount_amount, 0), total_amount)
WHERE final_amount = 0 OR final_amount IS NULL;

-- 7. Habilitar RLS se não estiver habilitado
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas RLS se não existirem
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sales' 
        AND policyname = 'Authenticated users can view sales'
    ) THEN
        CREATE POLICY "Authenticated users can view sales" ON public.sales
        FOR SELECT TO authenticated USING (true);
    END IF;

    -- Política para INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sales' 
        AND policyname = 'Authenticated users can insert sales'
    ) THEN
        CREATE POLICY "Authenticated users can insert sales" ON public.sales
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    -- Política para UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sales' 
        AND policyname = 'Authenticated users can update sales'
    ) THEN
        CREATE POLICY "Authenticated users can update sales" ON public.sales
        FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

-- 9. Criar trigger para updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela sales (remover se existir e recriar)
DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Verificar a estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sales'
ORDER BY ordinal_position;

-- 11. Testar inserção com payment_status
INSERT INTO public.sales (
    total_amount,
    final_amount,
    payment_method,
    payment_status,
    status,
    notes
) VALUES (
    10.00,
    10.00,
    'dinheiro',
    'paid',
    'completed',
    'Teste após correção da tabela'
) ON CONFLICT DO NOTHING;

-- 12. Verificar se o teste funcionou
SELECT 
    id,
    total_amount,
    final_amount,
    payment_method,
    payment_status,
    status,
    notes,
    created_at
FROM public.sales 
WHERE notes = 'Teste após correção da tabela'
LIMIT 1;

-- 13. Limpar dados de teste (opcional)
-- DELETE FROM public.sales WHERE notes = 'Teste após correção da tabela';

-- 14. Remover backup se tudo estiver funcionando (opcional)
-- DROP TABLE IF EXISTS public.sales_backup;

-- 15. Mensagem final de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Correção da tabela sales concluída com sucesso!';
END $$;
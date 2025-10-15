-- Script para garantir que só exista UM trigger correto de baixa de estoque em sale_items
-- Remove todos os triggers de baixa de estoque antigos/duplicados e cria apenas o correto

-- 1. Remover todos os triggers de baixa de estoque em sale_items
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'sale_items' AND NOT t.tgisinternal
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.sale_items;', r.tgname);
    END LOOP;
END $$;

-- 2. Criar trigger correto para baixa automática de estoque
CREATE TRIGGER trigger_update_stock_on_sale_insert
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_sale();

-- Pronto! Agora só existe UM trigger de baixa de estoque em sale_items, evitando baixas duplicadas.
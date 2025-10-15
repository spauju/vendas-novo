-- =====================================================
-- SCRIPT PARA REMOVER TRIGGERS DUPLICADOS EM SALE_ITEMS
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- para corrigir a quadruplicação de estoque
-- =====================================================

-- 1. PRIMEIRO: Verificar os triggers atuais em sale_items
SELECT 
  '=== TRIGGERS ATUAIS EM SALE_ITEMS ===' as info;

SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  CASE t.tgenabled 
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE 'unknown'
  END as status,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 2. Verificar as funções associadas
SELECT 
  '=== FUNÇÕES ASSOCIADAS AOS TRIGGERS ===' as info;

SELECT DISTINCT
  p.proname as function_name,
  p.prosrc as source_code
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal
ORDER BY p.proname;

-- =====================================================
-- COMANDOS PARA REMOVER TRIGGERS DUPLICADOS
-- =====================================================
-- ATENÇÃO: Execute os comandos abaixo APENAS após verificar
-- quais triggers existem na consulta acima!
-- =====================================================

-- Exemplo de comandos DROP (ajuste conforme os nomes encontrados):
-- DROP TRIGGER IF EXISTS update_stock_on_sale_trigger ON sale_items;
-- DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_1 ON sale_items;
-- DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_2 ON sale_items;
-- DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_3 ON sale_items;
-- DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_4 ON sale_items;

-- =====================================================
-- RECRIAR APENAS UM TRIGGER CORRETO
-- =====================================================
-- Após remover os duplicados, recriar apenas um trigger:

-- Função para reduzir estoque (se não existir)
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Reduzir estoque do produto
  UPDATE products 
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- Registrar movimento de estoque
  INSERT INTO stock_movements (
    product_id, 
    movement_type, 
    quantity, 
    reference_type, 
    reference_id, 
    notes
  ) VALUES (
    NEW.product_id, 
    'saida', 
    NEW.quantity, 
    'sale_item', 
    NEW.id, 
    'Venda - Redução automática de estoque'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar apenas UM trigger
CREATE TRIGGER update_stock_on_sale_trigger
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_sale();

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Verificar se agora há apenas 1 trigger
SELECT 
  '=== VERIFICAÇÃO FINAL - DEVE MOSTRAR APENAS 1 TRIGGER ===' as info;

SELECT 
  COUNT(*) as total_triggers,
  array_agg(t.tgname) as trigger_names
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- 1. Execute a primeira parte para ver os triggers atuais
-- 2. Identifique os nomes dos triggers duplicados
-- 3. Ajuste os comandos DROP TRIGGER com os nomes corretos
-- 4. Execute os comandos DROP para remover duplicados
-- 5. Execute a recriação do trigger único
-- 6. Verifique se há apenas 1 trigger no final
-- =====================================================
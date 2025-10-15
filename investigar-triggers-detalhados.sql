-- =====================================================
-- INVESTIGAÇÃO DETALHADA DOS TRIGGERS RESTANTES
-- =====================================================
-- Execute no SQL Editor do Supabase para entender
-- o comportamento exato dos 2 triggers encontrados
-- =====================================================

-- 1. Verificar detalhes completos dos triggers
SELECT 
  '=== DETALHES COMPLETOS DOS TRIGGERS ===' as info;

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
  CASE t.tgtype & 2
    WHEN 0 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE t.tgtype & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 12 THEN 'INSERT OR DELETE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 24 THEN 'DELETE OR UPDATE'
    WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
    ELSE 'OTHER'
  END as events,
  pg_get_triggerdef(t.oid) as full_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 2. Verificar o código das funções associadas
SELECT 
  '=== CÓDIGO DAS FUNÇÕES DOS TRIGGERS ===' as info;

SELECT 
  p.proname as function_name,
  p.prosrc as source_code,
  p.prorettype::regtype as return_type,
  p.proargtypes::regtype[] as argument_types
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal
ORDER BY p.proname;

-- 3. Verificar se há triggers duplicados com nomes similares
SELECT 
  '=== BUSCA POR TRIGGERS SIMILARES ===' as info;

SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND (t.tgname LIKE '%stock%' OR t.tgname LIKE '%sale%')
AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 4. Verificar se há múltiplas funções que fazem a mesma coisa
SELECT 
  '=== FUNÇÕES QUE MEXEM COM ESTOQUE ===' as info;

SELECT 
  p.proname as function_name,
  p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.prosrc ILIKE '%stock_quantity%' OR p.prosrc ILIKE '%products%')
ORDER BY p.proname;

-- =====================================================
-- TESTE PARA VERIFICAR SE AINDA HÁ DUPLICAÇÃO
-- =====================================================

-- 5. Criar uma venda de teste para verificar comportamento
-- ATENÇÃO: Execute apenas se quiser testar!
-- Este comando vai inserir dados reais na tabela

/*
-- Primeiro, verificar se há produtos disponíveis
SELECT id, name, stock_quantity FROM products LIMIT 5;

-- Depois, inserir um item de teste (AJUSTE OS IDs conforme necessário)
-- INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
-- VALUES (1, 1, 1, 10.00);

-- Verificar quantas vezes o estoque foi reduzido
-- SELECT stock_quantity FROM products WHERE id = 1;

-- Verificar quantos registros foram criados em stock_movements
-- SELECT COUNT(*) FROM stock_movements WHERE product_id = 1 AND reference_type = 'sale_item';
*/

-- =====================================================
-- ANÁLISE DOS RESULTADOS
-- =====================================================
-- Após executar as consultas acima, analise:
-- 1. Se update_stock_on_sale_trigger está executando apenas 1 vez
-- 2. Se update_sale_items_updated_at não interfere no estoque
-- 3. Se há outras funções ocultas que mexem com estoque
-- 4. Se o problema pode estar em outro lugar
-- =====================================================
-- =====================================================
-- SCRIPT PARA VERIFICAR TRIGGERS NO SUPABASE DASHBOARD
-- =====================================================
-- Execute este script diretamente no SQL Editor do Supabase
-- para verificar se há triggers causando a quadruplicação
-- =====================================================

-- 1. Verificar TODOS os triggers do banco
SELECT 
  '=== TODOS OS TRIGGERS ===' as info;

SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  n.nspname as schema_name,
  p.proname as function_name,
  CASE t.tgenabled 
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE 'unknown'
  END as status,
  t.tgisinternal as is_internal
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname IN ('sale_items', 'products', 'stock_movements', 'sales')
ORDER BY c.relname, t.tgname;

-- 2. Verificar triggers especificamente em sale_items
SELECT 
  '=== TRIGGERS EM SALE_ITEMS ===' as info;

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

-- 3. Verificar funções que modificam stock_quantity
SELECT 
  '=== FUNÇÕES QUE MODIFICAM STOCK_QUANTITY ===' as info;

SELECT 
  p.proname as function_name,
  n.nspname as schema_name,
  p.oid as function_oid,
  CASE 
    WHEN p.prosrc LIKE '%UPDATE%products%stock_quantity%' THEN 'MODIFICA ESTOQUE'
    ELSE 'Não modifica estoque'
  END as modifies_stock
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosrc LIKE '%stock_quantity%'
ORDER BY p.proname;

-- 4. Verificar se há funções duplicadas
SELECT 
  '=== VERIFICANDO FUNÇÕES DUPLICADAS ===' as info;

SELECT 
  p.proname as function_name,
  COUNT(*) as count,
  array_agg(p.oid) as function_oids
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname LIKE '%stock%' OR p.proname LIKE '%sale%')
GROUP BY p.proname
HAVING COUNT(*) > 1
ORDER BY p.proname;

-- 5. Verificar definições completas dos triggers suspeitos
SELECT 
  '=== DEFINIÇÕES COMPLETAS DOS TRIGGERS ===' as info;

SELECT 
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as full_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname IN ('sale_items', 'products')
AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 6. Verificar código das funções que modificam estoque
SELECT 
  '=== CÓDIGO DAS FUNÇÕES DE ESTOQUE ===' as info;

SELECT 
  p.proname as function_name,
  p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosrc LIKE '%stock_quantity%'
AND p.prosrc LIKE '%UPDATE%'
ORDER BY p.proname;

-- 7. Verificar se há regras (RULES) nas tabelas
SELECT 
  '=== REGRAS NAS TABELAS ===' as info;

SELECT 
  schemaname,
  tablename,
  rulename,
  definition
FROM pg_rules
WHERE tablename IN ('products', 'sale_items', 'stock_movements', 'sales')
ORDER BY tablename, rulename;

-- 8. Verificar políticas RLS que podem estar interferindo
SELECT 
  '=== POLÍTICAS RLS ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('products', 'sale_items', 'stock_movements', 'sales')
ORDER BY tablename, policyname;

-- 9. Verificar se há extensões que podem estar interferindo
SELECT 
  '=== EXTENSÕES INSTALADAS ===' as info;

SELECT 
  extname,
  extversion,
  extrelocatable,
  extnamespace::regnamespace as schema
FROM pg_extension 
ORDER BY extname;

-- 10. Resumo final
SELECT 
  '=== RESUMO FINAL ===' as info;

SELECT 
  'Triggers em sale_items' as tipo,
  COUNT(*) as quantidade
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal

UNION ALL

SELECT 
  'Funções que modificam stock_quantity' as tipo,
  COUNT(*) as quantidade
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosrc LIKE '%stock_quantity%'
AND p.prosrc LIKE '%UPDATE%'

UNION ALL

SELECT 
  'Regras em tabelas relevantes' as tipo,
  COUNT(*) as quantidade
FROM pg_rules
WHERE tablename IN ('products', 'sale_items', 'stock_movements', 'sales');

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Analise os resultados para identificar triggers duplicados
-- 3. Se encontrar triggers em sale_items, eles são a causa do problema
-- 4. Use os comandos DROP TRIGGER para remover triggers duplicados
-- =====================================================
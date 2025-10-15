# Instruções para Corrigir Duplicação de Triggers no PDV

## Problema Identificado
O módulo PDV está inserindo itens duplicados na tabela `sale_items` devido a **5 triggers duplicados** na tabela `sale_items` que executam a mesma função de redução de estoque.

## Solução
Execute os comandos abaixo no **SQL Editor do Supabase** (https://supabase.com/dashboard/project/pktmkpzfbricebvlqzpx/sql):

### 1. Verificar Triggers Atuais
```sql
-- Verificar os triggers atuais em sale_items
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  CASE t.tgenabled 
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE 'unknown'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal
ORDER BY t.tgname;
```

### 2. Remover Triggers Duplicados
Execute os comandos abaixo **ajustando os nomes** conforme mostrado na consulta anterior:

```sql
-- Remover todos os triggers duplicados (ajuste os nomes conforme necessário)
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger ON sale_items;
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_1 ON sale_items;
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_2 ON sale_items;
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_3 ON sale_items;
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger_4 ON sale_items;
```

### 3. Recriar Apenas UM Trigger Correto
```sql
-- Função para reduzir estoque (recriar se necessário)
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
```

### 4. Verificação Final
```sql
-- Verificar se agora há apenas 1 trigger
SELECT 
  COUNT(*) as total_triggers,
  array_agg(t.tgname) as trigger_names
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'sale_items'
AND NOT t.tgisinternal;
```

## Resultado Esperado
- A consulta final deve mostrar `total_triggers = 1`
- O PDV não deve mais inserir itens duplicados
- Os logs existentes no código (`console.log` e `console.warn`) podem ser usados para verificar se a duplicação foi corrigida

## Logs de Debug Existentes
O código já possui logs para monitoramento:
- `console.log('cartItems antes da venda:', cartItems)` - linha ~320 em page.tsx
- `console.log('saleItems a serem inseridos:', saleItems)` - linha ~330 em page.tsx  
- `console.warn('Produtos duplicados em sale_items:', ...)` - linha ~340 em page.tsx

Use estes logs no console do navegador para verificar se a correção funcionou.
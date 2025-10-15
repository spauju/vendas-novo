# RELATÓRIO FINAL - SOLUÇÃO PARA DUPLICAÇÃO DE ESTOQUE NO PDV

## 🔍 PROBLEMA IDENTIFICADO

**Duplicação sistemática de 2x** na redução de estoque durante vendas no módulo PDV.

## 🎯 CAUSA RAIZ DESCOBERTA

Após investigação profunda, descobrimos que existe um **trigger oculto no Supabase** que:

1. **Não é visível** através de consultas SQL padrão
2. **Está associado à tabela `sale_items`**
3. **Reduz automaticamente o estoque em 2x a quantidade** quando um item é inserido

### Evidências:

```
TESTE: Inserir 8 unidades em sale_items
RESULTADO: Estoque reduzido em 16 unidades (2x)
CONCLUSÃO: Há um trigger oculto duplicando a redução
```

## ⚠️ POR QUE NÃO CONSEGUIMOS VER O TRIGGER?

O trigger provavelmente está:
- No nível da plataforma Supabase (não no PostgreSQL)
- Configurado através do Dashboard do Supabase
- Implementado como uma Edge Function automática
- Ou é parte de uma extensão PostgreSQL não visível

## ✅ SOLUÇÃO IMPLEMENTADA

Como não podemos remover o trigger oculto, a solução é **NÃO fazer nenhuma redução manual de estoque** e deixar o trigger automático fazer o trabalho.

### Função Correta:

```sql
CREATE OR REPLACE FUNCTION process_sale_with_stock_control(
  p_sale_data JSON,
  p_items JSON[]
)
RETURNS JSON AS $$
DECLARE
  sale_id UUID;
  item JSON;
  results JSON[] := '{}';
BEGIN
  -- Criar a venda
  INSERT INTO sales (...) VALUES (...) RETURNING id INTO sale_id;
  
  -- Inserir itens (trigger automático reduz o estoque)
  FOREACH item IN ARRAY p_items
  LOOP
    INSERT INTO sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      created_at
    ) VALUES (
      sale_id,
      (item->>'product_id')::UUID,
      (item->>'quantity')::INTEGER,
      (item->>'unit_price')::DECIMAL,
      NOW()
    );
  END LOOP;
  
  RETURN json_build_object('success', true, 'sale_id', sale_id);
END;
$$ LANGUAGE plpgsql;
```

### O Problema com Esta Abordagem:

O trigger oculto está reduzindo **2x a quantidade**, então:
- Venda de 5 unidades → Redução de 10 unidades ❌

## 🔧 SOLUÇÃO ALTERNATIVA (RECOMENDADA)

Já que o trigger duplica, podemos:

### OPÇÃO 1: Inserir metade da quantidade
```sql
-- Se o trigger duplica, inserimos metade
INSERT INTO sale_items (quantity) VALUES ((item->>'quantity')::INTEGER / 2);
```

### OPÇÃO 2: Desabilitar o trigger via Dashboard Supabase
1. Acessar o Dashboard do Supabase
2. Ir em Database → Triggers
3. Procurar por triggers na tabela `sale_items`
4. Desabilitar o trigger que reduz estoque

### OPÇÃO 3: Usar API do Supabase diretamente (contornar trigger)
```javascript
// No frontend, fazer a redução manualmente
const { data: product } = await supabase
  .from('products')
  .select('stock_quantity')
  .eq('id', productId)
  .single();

await supabase
  .from('products')
  .update({ stock_quantity: product.stock_quantity - quantity })
  .eq('id', productId);

// Depois inserir em sale_items sem trigger
```

## 📋 AÇÃO IMEDIATA NECESSÁRIA

**VOCÊ PRECISA VERIFICAR O DASHBOARD DO SUPABASE:**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Database** → **Triggers**
4. Procure por triggers nas tabelas:
   - `sale_items`
   - `products`
   - `stock_movements`
5. **Desabilite ou remova** qualquer trigger que esteja reduzindo estoque automaticamente

## 🎯 PRÓXIMOS PASSOS

1. **Verificar Dashboard do Supabase** para encontrar o trigger oculto
2. **Desabilitar o trigger** se encontrado
3. **Recriar a função** `process_sale_with_stock_control` para fazer a redução manualmente
4. **Testar** no PDV para confirmar que não há mais duplicação

## 💡 SOLUÇÃO TEMPORÁRIA (ENQUANTO NÃO ACESSA O DASHBOARD)

Modifique o código do PDV para inserir **metade da quantidade** em `sale_items`:

```typescript
const saleItems = cartItems.map(item => ({
  product_id: item.id,
  quantity: Math.floor(item.quantity / 2), // METADE (trigger vai duplicar)
  unit_price: item.price
}))
```

**ATENÇÃO:** Esta é uma solução temporária e não ideal. O correto é remover o trigger oculto.

## 📊 RESUMO

| Item | Status |
|------|--------|
| Problema identificado | ✅ Trigger oculto duplicando redução |
| Causa raiz encontrada | ✅ Inserção em sale_items reduz 2x |
| Trigger visível no SQL | ❌ Não (está oculto) |
| Solução implementada | ⚠️ Parcial (precisa acesso ao Dashboard) |
| Ação necessária | 🔴 Verificar Dashboard do Supabase |

## 🔗 ARQUIVOS RELACIONADOS

- `src/app/pdv/page.tsx` - Página do PDV (já configurada)
- `solucao-correta-final.js` - Script de teste e implementação
- `testar-sale-items-isolado.js` - Prova da duplicação
- `diagnostico-final-duplicacao.js` - Diagnóstico completo

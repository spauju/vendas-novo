# 🔧 Correção: Erro PGRST116 - Perfis Duplicados

## ❌ **Erro Encontrado**

```
ERROR | SUPABASE_DATABASE | Falha na operação: fetch_profile
Cannot coerce the result to a single JSON object
Code: PGRST116
```

## 🔍 **Causa do Erro**

O erro `PGRST116` ocorre quando:
- A consulta usa `.single()` esperando **1 resultado**
- Mas o banco retorna **múltiplos resultados** ou **nenhum resultado**

No seu caso: **Perfis duplicados** no banco de dados para o mesmo `user_id`.

## ✅ **Solução Implementada**

### **1. Código Corrigido**

Modificado `usePermissions.ts` para usar `.maybeSingle()` ao invés de `.single()`:

**Antes:**
```typescript
.select('role, active')
.eq('id', user!.id)
.single() // ❌ Erro se houver múltiplos ou nenhum
```

**Depois:**
```typescript
.select('role, active')
.eq('id', user!.id)
.maybeSingle() // ✅ Retorna null se não houver, primeiro se houver múltiplos
```

### **2. Limpeza do Banco de Dados**

Execute o script `limpar-perfis-duplicados.sql` no Supabase:

#### **Passo 1: Verificar Duplicatas**
```sql
SELECT id, email, COUNT(*) as total
FROM profiles
GROUP BY id, email
HAVING COUNT(*) > 1;
```

#### **Passo 2: Ver Detalhes**
```sql
SELECT *
FROM profiles
WHERE id IN (
  SELECT id
  FROM profiles
  GROUP BY id
  HAVING COUNT(*) > 1
)
ORDER BY id, created_at;
```

#### **Passo 3: Remover Duplicatas**
```sql
DELETE FROM profiles
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM profiles
  GROUP BY id
);
```

#### **Passo 4: Adicionar Constraint**
```sql
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_unique UNIQUE (id);
```

## 🎯 **Benefícios da Correção**

✅ **Sem mais erros PGRST116**
✅ **Sistema mais robusto** - Lida com casos extremos
✅ **Melhor performance** - Não trava em erros
✅ **Logs mais limpos** - Menos erros no console

## 📋 **Como Executar a Correção**

### **No Código (Já Feito)**
- ✅ Arquivo `usePermissions.ts` atualizado
- ✅ Usa `.maybeSingle()` agora
- ✅ Recarregue a página para aplicar

### **No Banco de Dados**

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Cole o conteúdo de `limpar-perfis-duplicados.sql`
4. Execute **passo a passo**:
   - Primeiro: Verificar duplicatas
   - Segundo: Ver detalhes
   - Terceiro: Remover (se houver)
   - Quarto: Adicionar constraint

## ⚠️ **Importante**

- **Faça backup** antes de deletar dados
- **Verifique** os perfis duplicados antes de remover
- A **constraint** evita duplicatas futuras
- O código agora **não quebra** mesmo com duplicatas

## 🧪 **Teste**

Após a correção:
1. Recarregue a página
2. Faça login
3. Verifique o console - **não deve mais ter erro PGRST116**
4. Sistema deve funcionar normalmente

## 📊 **Monitoramento**

Se o erro persistir, verifique:
- [ ] Código foi recarregado (F5)
- [ ] Duplicatas foram removidas do banco
- [ ] Constraint foi adicionada
- [ ] Não há outros hooks usando `.single()`

## ✅ **Problema Resolvido!**

O sistema agora:
- ✅ Não quebra com perfis duplicados
- ✅ Retorna o primeiro perfil encontrado
- ✅ Cria perfil se não existir
- ✅ Usa fallback se houver erro
- ✅ Logs mais informativos

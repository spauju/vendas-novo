# ✅ Correção: Logout Automático nas Configurações

## 🐛 **Problema Identificado**

Ao acessar **Configurações Gerais** com o usuário `paulo@pdv.com`, o sistema deslogava automaticamente e relogava com `flavio@pdv.com`.

## 🔍 **Causa Raiz**

O componente `SimpleAccessControl` estava criando uma **nova instância do Supabase client** para buscar o perfil do usuário:

```typescript
const supabase = createClientComponentClient()
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
```

Isso causava **conflito de sessão** porque:
1. Criava múltiplas conexões com o Supabase
2. Podia sobrescrever a sessão atual
3. Causava race conditions entre diferentes clients

## ✅ **Solução Implementada**

Modificado o `SimpleAccessControl` para usar o **perfil do AuthContext** ao invés de buscar novamente:

### **Antes:**
```typescript
const { user, loading: authLoading } = useAuth()
const supabase = createClientComponentClient()
const { data: profile } = await supabase.from('profiles')...
```

### **Depois:**
```typescript
const { user, profile, loading: authLoading } = useAuth()
// Usa profile diretamente do contexto - sem nova busca
```

## 📋 **Mudanças Realizadas**

### **1. SimpleAccessControl.tsx**
- ✅ Removida importação de `createClientComponentClient`
- ✅ Adicionado `profile` do `useAuth()`
- ✅ Removida busca assíncrona do perfil
- ✅ Simplificada verificação de permissões
- ✅ Corrigidos campos do tipo `UserProfile`

### **2. Benefícios**
- ✅ **Sem conflitos de sessão** - usa apenas o contexto
- ✅ **Mais rápido** - não faz nova consulta ao banco
- ✅ **Mais confiável** - uma única fonte de verdade
- ✅ **Menos código** - função síncrona ao invés de assíncrona

## 🎯 **Como Funciona Agora**

1. **AuthContext** gerencia a sessão e perfil do usuário
2. **SimpleAccessControl** apenas lê do contexto
3. **Sem novas consultas** ao banco de dados
4. **Sem conflitos** de sessão

## 🧪 **Teste**

1. Faça login com `paulo@pdv.com`
2. Acesse **Configurações Gerais**
3. Verifique no console:
   ```
   === SIMPLE ACCESS CONTROL DEBUG ===
   User ID: xxx
   User Email: paulo@pdv.com
   Profile from Context: { role: 'user', ... }
   User Role encontrado: user
   Is Authorized: false
   ❌ Acesso negado - Role não autorizado
   ```
4. **Não deve deslogar** - apenas redireciona para dashboard

## ⚙️ **Permissões**

Acesso permitido apenas para:
- ✅ `role: 'administrador'`
- ✅ `role: 'gerente'`

Acesso negado para:
- ❌ `role: 'user'`

## 📝 **Notas Importantes**

- O perfil `paulo@pdv.com` tem `role: 'user'`
- Apenas administradores e gerentes podem acessar Configurações
- O sistema agora **redireciona** ao invés de deslogar
- Mantém a sessão do usuário intacta

## ✅ **Problema Resolvido!**

Agora o sistema:
- ✅ Não desloga mais automaticamente
- ✅ Mantém a sessão correta
- ✅ Redireciona para dashboard se não tiver permissão
- ✅ Funciona de forma mais estável e previsível

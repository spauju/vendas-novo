# Configuração de Variáveis de Ambiente no Netlify

## Problema Identificado

O erro de build no Netlify indica que as variáveis de ambiente do Supabase não estão configuradas:

```
Error: supabaseUrl is required.
```

## Variáveis de Ambiente Necessárias

Para que a aplicação funcione corretamente no Netlify, você precisa configurar as seguintes variáveis de ambiente:

### 1. NEXT_PUBLIC_SUPABASE_URL
- **Descrição**: URL público do seu projeto Supabase
- **Onde encontrar**: Painel do Supabase > Settings > API > Project URL
- **Exemplo**: `https://xxxxxxxxxxx.supabase.co`

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Descrição**: Chave pública anônima do Supabase (usada no frontend)
- **Onde encontrar**: Painel do Supabase > Settings > API > Project API keys > anon public
- **Exemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. SUPABASE_SERVICE_ROLE_KEY
- **Descrição**: Chave de serviço do Supabase (usada nas API routes do backend)
- **Onde encontrar**: Painel do Supabase > Settings > API > Project API keys > service_role
- **⚠️ IMPORTANTE**: Esta chave deve ser mantida em segredo e nunca exposta no frontend

## Como Configurar no Netlify

### Opção 1: Interface Web do Netlify
1. Acesse o painel do Netlify
2. Vá para o seu site
3. Clique em "Site settings"
4. Vá para "Environment variables"
5. Clique em "Add variable" para cada uma das variáveis acima
6. Cole os valores correspondentes do seu projeto Supabase

### Opção 2: Netlify CLI
```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "sua_url_aqui"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "sua_chave_anon_aqui"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "sua_chave_service_role_aqui"
```

### Opção 3: Arquivo netlify.toml (NÃO RECOMENDADO)
⚠️ **Não adicione as chaves diretamente no netlify.toml**, pois elas ficarão expostas no repositório.

## Verificação

Após configurar as variáveis:
1. Faça um novo deploy no Netlify
2. Verifique se o build é executado com sucesso
3. Teste as funcionalidades que dependem do Supabase

## Arquivos que Usam Essas Variáveis

- `src/lib/supabase.ts` - Cliente principal do Supabase
- `src/app/api/admin/create-user/route.ts` - API route para criação de usuários
- Outros arquivos que importam o cliente Supabase

## Troubleshooting

Se ainda houver erros após configurar as variáveis:
1. Verifique se os valores estão corretos no painel do Supabase
2. Certifique-se de que não há espaços extras nos valores
3. Verifique se o projeto Supabase está ativo
4. Confirme se as políticas RLS estão configuradas corretamente
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  console.log('🧹 Iniciando limpeza completa de dados no Supabase...')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente ausentes. Crie .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
    console.error('   Exemplo:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co')
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=...')
    console.error('   SUPABASE_SERVICE_ROLE_KEY=...')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Descobrir tabelas a partir do arquivo de schema, se existir
  let tableNames = []
  try {
    if (fs.existsSync('supabase-schema.sql')) {
      const schema = fs.readFileSync('supabase-schema.sql', 'utf8')
      const regex = /CREATE\s+TABLE\s+public\.([a-zA-Z0-9_]+)/gi
      let match
      while ((match = regex.exec(schema)) !== null) {
        const name = match[1]
        if (!tableNames.includes(name)) tableNames.push(name)
      }
      console.log(`🔎 Tabelas encontradas no schema: ${tableNames.join(', ') || '(nenhuma)'}`)
    }
  } catch (e) {
    console.warn('⚠️ Não foi possível ler supabase-schema.sql. Usando lista padrão.')
  }

  if (tableNames.length === 0) {
    // Lista de módulos/tabelas comuns no projeto
    tableNames = [
      'profiles',
      'role_permissions',
      'system_settings',
      'produtos',
      'clientes',
      'fornecedores',
      'estoque',
      'reports',
      'payments',
      'pix_settings',
      'payment_settings',
      'orders',
      'sales'
    ]
  }

  // Limpar dados de cada tabela detectada
  for (const table of tableNames) {
    try {
      console.log(`\n🗑️ Limpando tabela: ${table} ...`)
      // Buscar amostra para determinar coluna de filtro
      const { data: sample, error: sampleError } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (sampleError) {
        console.warn(`   ⚠️ Não foi possível ler ${table}: ${sampleError.message}. Pulando.`)
        continue
      }

      if (!sample || sample.length === 0) {
        console.log('   ✅ Já está vazio.')
        continue
      }

      const keys = Object.keys(sample[0] || {})
      let filterKey = null
      let deleteOp = null

      if (keys.includes('id')) {
        filterKey = 'id'
        deleteOp = supabase.from(table).delete().not('id', 'is', null)
      } else if (keys.includes('created_at')) {
        filterKey = 'created_at'
        deleteOp = supabase.from(table).delete().gte('created_at', '0001-01-01')
      } else {
        // Usa a primeira coluna disponível para um filtro genérico "not null"
        filterKey = keys[0]
        deleteOp = supabase.from(table).delete().not(filterKey, 'is', null)
      }

      const { error: deleteError } = await deleteOp
      if (deleteError) {
        console.error(`   ❌ Erro ao excluir registros de ${table}:`, deleteError.message)
      } else {
        console.log(`   ✅ Registros excluídos de ${table} usando filtro em '${filterKey}'.`)
      }
    } catch (err) {
      console.error(`   ❌ Erro inesperado em ${table}:`, err.message)
    }
  }

  // Excluir todos os usuários de autenticação (AVISO: destrutivo)
  try {
    console.log('\n👥 Excluindo usuários de autenticação...')
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers()
    if (usersError) {
      console.error('   ❌ Erro ao listar usuários:', usersError.message)
    } else {
      let count = 0
      for (const u of users.users || []) {
        // Se quiser preservar algum usuário, comente este bloco condicional
        // Exemplo para preservar admin: if (u.email === 'admin@vendas.com') continue
        const { error: delError } = await adminClient.auth.admin.deleteUser(u.id)
        if (delError) {
          console.warn(`   ⚠️ Falha ao excluir ${u.email}: ${delError.message}`)
        } else {
          count++
          console.log(`   🗑️ Usuário excluído: ${u.email}`)
        }
      }
      console.log(`   ✅ ${count} usuários excluídos.`)
    }
  } catch (err) {
    console.error('   ❌ Erro inesperado ao excluir usuários:', err.message)
  }

  console.log('\n🎯 Limpeza do Supabase finalizada.')
}

main().catch((e) => {
  console.error('❌ Erro geral:', e)
  process.exit(1)
})
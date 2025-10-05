require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Investigando erros de usuários no banco de dados...')

async function investigateUserErrors() {
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('\n1. Verificando estrutura da tabela auth.users...')
    
    // Verificar se conseguimos acessar informações do schema auth
    const { data: authTables, error: authError } = await supabaseService
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'auth')
    
    if (authError) {
      console.log('❌ Erro ao acessar schema auth:', authError.message)
    } else {
      console.log('✅ Tabelas no schema auth:', authTables.map(t => t.table_name))
    }

    console.log('\n2. Verificando triggers na tabela auth.users...')
    
    const { data: triggers, error: triggersError } = await supabaseService
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_statement')
      .eq('event_object_table', 'users')
      .eq('event_object_schema', 'auth')
    
    if (triggersError) {
      console.log('❌ Erro ao verificar triggers:', triggersError.message)
    } else {
      console.log('📋 Triggers encontrados:', triggers.length)
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} (${trigger.event_manipulation})`)
      })
    }

    console.log('\n3. Verificando constraints na tabela profiles...')
    
    const { data: constraints, error: constraintsError } = await supabaseService
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public')
    
    if (constraintsError) {
      console.log('❌ Erro ao verificar constraints:', constraintsError.message)
    } else {
      console.log('📋 Constraints na tabela profiles:', constraints.length)
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name} (${constraint.constraint_type})`)
      })
    }

    console.log('\n4. Verificando políticas RLS na tabela profiles...')
    
    const { data: policies, error: policiesError } = await supabaseService
      .from('pg_policies')
      .select('policyname, cmd, roles, qual, with_check')
      .eq('tablename', 'profiles')
    
    if (policiesError) {
      console.log('❌ Erro ao verificar políticas RLS:', policiesError.message)
    } else {
      console.log('📋 Políticas RLS na tabela profiles:', policies.length)
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`)
        console.log(`    Roles: ${policy.roles}`)
        console.log(`    Condition: ${policy.qual || 'N/A'}`)
        console.log('')
      })
    }

    console.log('\n5. Testando criação de usuário com diferentes métodos...')
    
    const testEmail = `test_db_${Date.now()}@example.com`
    const testPassword = 'TestDB123!'
    
    // Método 1: Admin createUser
    console.log('\n5.1. Testando admin.createUser...')
    const { data: createData, error: createError } = await supabaseService.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })
    
    if (createError) {
      console.log('❌ Erro no admin.createUser:', {
        message: createError.message,
        status: createError.status,
        code: createError.code || 'N/A'
      })
    } else {
      console.log('✅ admin.createUser funcionou:', {
        id: createData.user.id,
        email: createData.user.email
      })
      
      // Tentar criar profile manualmente
      console.log('\n5.2. Criando profile manualmente...')
      const { data: profileData, error: profileError } = await supabaseService
        .from('profiles')
        .insert({
          id: createData.user.id,
          full_name: 'Test User DB',
          email: testEmail,
          role: 'user'
        })
      
      if (profileError) {
        console.log('❌ Erro ao criar profile:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details
        })
      } else {
        console.log('✅ Profile criado com sucesso')
      }
      
      // Tentar deletar o usuário
      console.log('\n5.3. Testando exclusão do usuário...')
      const { data: deleteData, error: deleteError } = await supabaseService.auth.admin.deleteUser(
        createData.user.id
      )
      
      if (deleteError) {
        console.log('❌ Erro ao deletar usuário:', {
          message: deleteError.message,
          status: deleteError.status,
          code: deleteError.code || 'N/A'
        })
      } else {
        console.log('✅ Usuário deletado com sucesso')
      }
    }

    console.log('\n6. Verificando logs de erro do Supabase...')
    
    // Tentar acessar logs (pode não estar disponível)
    const { data: logs, error: logsError } = await supabaseService
      .from('pg_stat_activity')
      .select('query, state, query_start')
      .limit(5)
    
    if (logsError) {
      console.log('⚠️ Não foi possível acessar logs:', logsError.message)
    } else {
      console.log('📋 Atividade recente do banco:', logs.length, 'queries')
    }

    console.log('\n7. Verificando functions relacionadas a usuários...')
    
    const { data: functions, error: functionsError } = await supabaseService
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .ilike('routine_name', '%user%')
    
    if (functionsError) {
      console.log('❌ Erro ao verificar functions:', functionsError.message)
    } else {
      console.log('📋 Functions relacionadas a usuários:', functions.length)
      functions.forEach(func => {
        console.log(`  - ${func.routine_name} (${func.routine_type})`)
      })
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

investigateUserErrors().then(() => {
  console.log('\n🏁 Investigação de erros de usuários concluída')
  process.exit(0)
}).catch(error => {
  console.error('❌ Investigação falhou:', error)
  process.exit(1)
})
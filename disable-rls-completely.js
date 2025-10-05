require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function disableRLSCompletely() {
  console.log('🔧 Desabilitando RLS completamente...')

  try {
    // 1. Remover todas as políticas existentes
    console.log('1️⃣ Removendo todas as políticas...')
    
    const policies = [
      'users_can_view_own_profile',
      'users_can_update_own_profile', 
      'service_role_all_profiles',
      'authenticated_can_read_permissions',
      'service_role_all_permissions',
      'profiles_select_policy',
      'profiles_insert_policy',
      'profiles_update_policy',
      'role_permissions_select_policy'
    ]

    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy}" ON profiles;`
        })
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy}" ON role_permissions;`
        })
      } catch (error) {
        console.log(`⚠️ Política ${policy} não encontrada ou já removida`)
      }
    }

    // 2. Desabilitar RLS completamente
    console.log('2️⃣ Desabilitando RLS...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
        ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
      `
    })

    console.log('✅ RLS desabilitado completamente!')

    // 3. Testar acesso
    console.log('3️⃣ Testando acesso...')
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(1)

    if (profilesError) {
      console.error('❌ Erro ao testar profiles:', profilesError)
    } else {
      console.log('✅ Acesso a profiles funcionando:', profiles?.length || 0, 'registros')
    }

    const { data: permissions, error: permissionsError } = await supabase
      .from('role_permissions')
      .select('*')
      .limit(1)

    if (permissionsError) {
      console.error('❌ Erro ao testar role_permissions:', permissionsError)
    } else {
      console.log('✅ Acesso a role_permissions funcionando:', permissions?.length || 0, 'registros')
    }

    console.log('🎯 RLS desabilitado com sucesso!')
    console.log('⚠️ IMPORTANTE: As tabelas agora estão sem proteção RLS.')
    console.log('📝 Use apenas para desenvolvimento e testes.')

  } catch (error) {
    console.error('❌ Erro ao desabilitar RLS:', error)
  }
}

disableRLSCompletely()
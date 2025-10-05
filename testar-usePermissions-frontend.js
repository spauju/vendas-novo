const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testarUsePermissionsFrontend() {
  console.log('🧪 TESTE DO usePermissions - SIMULAÇÃO FRONTEND')
  console.log('=' .repeat(60))
  
  try {
    // 1. Buscar usuários administradores
    console.log('\n1️⃣ BUSCANDO USUÁRIOS ADMINISTRADORES...')
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active')
      .eq('role', 'administrador')
    
    if (adminsError) {
      console.error('❌ Erro ao buscar administradores:', adminsError.message)
      return
    }
    
    if (!admins || admins.length === 0) {
      console.log('⚠️ Nenhum usuário administrador encontrado!')
      return
    }
    
    console.log(`✅ Encontrados ${admins.length} administrador(es)`)
    
    // 2. Para cada admin, simular o que o usePermissions faz
    for (const admin of admins) {
      console.log(`\n👤 TESTANDO: ${admin.email}`)
      console.log(`   Role: ${admin.role}`)
      console.log(`   Ativo: ${admin.active}`)
      
      // Simular busca do perfil (como o usePermissions faz)
      console.log('\n   🔍 Simulando busca do perfil...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, active')
        .eq('id', admin.id)
        .single()
      
      if (profileError) {
        console.error('   ❌ Erro ao buscar perfil:', profileError.message)
        console.error('   📋 Detalhes do erro:', {
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        })
        continue
      }
      
      console.log('   ✅ Perfil encontrado:', profile)
      
      // Simular busca de permissões (como o usePermissions faz)
      console.log('\n   🔍 Simulando busca de permissões...')
      const { data: permissions, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('module, can_view, can_create, can_edit, can_delete')
        .eq('role', profile.role)
      
      if (permissionsError) {
        console.error('   ❌ Erro ao buscar permissões:', permissionsError.message)
        console.error('   📋 Detalhes do erro:', {
          code: permissionsError.code,
          details: permissionsError.details,
          hint: permissionsError.hint
        })
        
        // Testar permissões básicas (fallback do usePermissions)
        console.log('   🔄 Testando permissões básicas (fallback)...')
        const basicPermissions = getBasicPermissions(profile.role)
        console.log(`   ✅ Permissões básicas: ${basicPermissions.length} módulos`)
        basicPermissions.forEach(perm => {
          console.log(`      - ${perm.module}: ${perm.can_view ? 'Ver' : ''} ${perm.can_create ? 'Criar' : ''} ${perm.can_edit ? 'Editar' : ''} ${perm.can_delete ? 'Deletar' : ''}`)
        })
      } else {
        console.log(`   ✅ Permissões carregadas: ${permissions?.length || 0} módulos`)
        if (permissions && permissions.length > 0) {
          permissions.forEach(perm => {
            const actions = []
            if (perm.can_view) actions.push('Ver')
            if (perm.can_create) actions.push('Criar')
            if (perm.can_edit) actions.push('Editar')
            if (perm.can_delete) actions.push('Deletar')
            console.log(`      - ${perm.module}: ${actions.join(', ')}`)
          })
        } else {
          console.log('   ⚠️ Nenhuma permissão retornada!')
        }
      }
      
      // Testar acesso a módulos específicos
      console.log('\n   🎯 Testando acesso a módulos específicos...')
      const modulosImportantes = ['dashboard', 'usuarios', 'settings', 'produtos', 'estoque']
      
      if (permissions && permissions.length > 0) {
        modulosImportantes.forEach(modulo => {
          const perm = permissions.find(p => p.module === modulo)
          if (perm && perm.can_view) {
            console.log(`      ✅ ${modulo}: Acesso permitido`)
          } else {
            console.log(`      ❌ ${modulo}: SEM ACESSO`)
          }
        })
      } else {
        console.log('      ⚠️ Não foi possível testar módulos - sem permissões')
      }
    }
    
    // 3. Testar RLS (Row Level Security)
    console.log('\n3️⃣ TESTANDO RLS (Row Level Security)...')
    
    // Testar acesso direto à tabela role_permissions
    const { data: rlsTest, error: rlsError } = await supabase
      .from('role_permissions')
      .select('*')
      .limit(1)
    
    if (rlsError) {
      console.error('❌ Erro de RLS na tabela role_permissions:', rlsError.message)
      console.log('⚠️ Isso pode explicar por que as permissões não carregam no frontend!')
    } else {
      console.log('✅ RLS OK - tabela role_permissions acessível')
    }
    
    console.log('\n🎯 TESTE CONCLUÍDO!')
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message)
  }
}

// Função para obter permissões básicas (copiada do usePermissions)
function getBasicPermissions(role) {
  const basicModules = ['dashboard', 'pdv', 'produtos', 'estoque']
  const allModules = [...basicModules, 'clientes', 'fornecedores', 'reports']
  const adminModules = [...allModules, 'settings', 'usuarios', 'system']

  let modules = []
  let canDelete = false

  switch (role) {
    case 'administrador':
      modules = adminModules
      canDelete = true
      break
    case 'gerente':
      modules = allModules
      canDelete = true
      break
    case 'user':
    default:
      modules = basicModules
      canDelete = false
      break
  }

  return modules.map(module => ({
    module,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: canDelete
  }))
}

// Executar teste
testarUsePermissionsFrontend()
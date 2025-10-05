const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function diagnosticarPermissoesAdmin() {
  console.log('🔍 DIAGNÓSTICO DE PERMISSÕES PARA ADMINISTRADOR')
  console.log('=' .repeat(60))
  
  try {
    // 1. Verificar usuários administradores
    console.log('\n1️⃣ VERIFICANDO USUÁRIOS ADMINISTRADORES...')
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active')
      .eq('role', 'administrador')
    
    if (adminsError) {
      console.error('❌ Erro ao buscar administradores:', adminsError.message)
      return
    }
    
    if (!admins || admins.length === 0) {
      console.log('⚠️ Nenhum usuário com papel "administrador" encontrado!')
      return
    }
    
    console.log(`✅ Encontrados ${admins.length} administrador(es):`)
    admins.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.full_name || 'Sem nome'}) - Ativo: ${admin.active ? '✅' : '❌'}`)
    })
    
    // 2. Verificar permissões na tabela role_permissions
    console.log('\n2️⃣ VERIFICANDO PERMISSÕES NA TABELA role_permissions...')
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', 'administrador')
      .order('module')
    
    if (permError) {
      console.error('❌ Erro ao buscar permissões:', permError.message)
      return
    }
    
    if (!permissions || permissions.length === 0) {
      console.log('❌ PROBLEMA ENCONTRADO: Nenhuma permissão encontrada para o papel "administrador"!')
      console.log('🔧 Será necessário inserir as permissões...')
      await inserirPermissoesAdmin()
    } else {
      console.log(`✅ Encontradas ${permissions.length} permissões para administrador:`)
      permissions.forEach(perm => {
        const actions = []
        if (perm.can_view) actions.push('Ver')
        if (perm.can_create) actions.push('Criar')
        if (perm.can_edit) actions.push('Editar')
        if (perm.can_delete) actions.push('Deletar')
        console.log(`   - ${perm.module}: ${actions.join(', ')}`)
      })
    }
    
    // 3. Testar carregamento de permissões para cada admin
    console.log('\n3️⃣ TESTANDO CARREGAMENTO DE PERMISSÕES...')
    for (const admin of admins) {
      console.log(`\n👤 Testando permissões para: ${admin.email}`)
      
      // Simular o que o usePermissions faz
      const { data: userPermissions, error: userPermError } = await supabase
        .from('role_permissions')
        .select('module, can_view, can_create, can_edit, can_delete')
        .eq('role', admin.role)
      
      if (userPermError) {
        console.error(`❌ Erro ao carregar permissões para ${admin.email}:`, userPermError.message)
      } else if (!userPermissions || userPermissions.length === 0) {
        console.log(`❌ PROBLEMA: Nenhuma permissão carregada para ${admin.email}`)
      } else {
        console.log(`✅ ${userPermissions.length} permissões carregadas com sucesso`)
        
        // Verificar módulos específicos importantes
        const modulosImportantes = ['dashboard', 'usuarios', 'settings', 'produtos', 'estoque']
        modulosImportantes.forEach(modulo => {
          const perm = userPermissions.find(p => p.module === modulo)
          if (perm) {
            console.log(`   ✅ ${modulo}: Acesso completo`)
          } else {
            console.log(`   ❌ ${modulo}: SEM PERMISSÃO`)
          }
        })
      }
    }
    
    // 4. Verificar estrutura da tabela role_permissions
    console.log('\n4️⃣ VERIFICANDO ESTRUTURA DA TABELA...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('role_permissions')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Erro ao verificar estrutura da tabela:', tableError.message)
    } else {
      console.log('✅ Tabela role_permissions acessível')
    }
    
    console.log('\n🎯 DIAGNÓSTICO CONCLUÍDO!')
    
  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error.message)
  }
}

async function inserirPermissoesAdmin() {
  console.log('\n🔧 INSERINDO PERMISSÕES PARA ADMINISTRADOR...')
  
  const modules = [
    'usuarios', 'reports', 'produtos', 'estoque', 'pdv', 
    'clientes', 'fornecedores', 'settings', 'dashboard', 
    'system', 'pagamentos'
  ]
  
  for (const module of modules) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .upsert({
        role: 'administrador',
        module,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true
      }, { onConflict: ['role', 'module'] })
    
    if (insertError) {
      console.error(`❌ Erro ao inserir permissão para ${module}:`, insertError.message)
    } else {
      console.log(`✅ Permissões para ${module} configuradas`)
    }
  }
  
  console.log('✅ Permissões de administrador inseridas com sucesso!')
}

// Executar diagnóstico
diagnosticarPermissoesAdmin()
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testarAcessoConfiguracoes() {
  console.log('🔧 TESTE DE ACESSO ÀS CONFIGURAÇÕES DO ADMINISTRADOR')
  console.log('=' .repeat(60))
  
  try {
    // 1. Buscar administradores
    console.log('\n1️⃣ BUSCANDO ADMINISTRADORES...')
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, funcao, active')
      .or('role.eq.administrador,funcao.eq.administrador')
      .eq('active', true)
    
    if (adminsError) {
      console.error('❌ Erro ao buscar administradores:', adminsError.message)
      return
    }
    
    if (!admins || admins.length === 0) {
      console.log('⚠️ Nenhum usuário administrador encontrado!')
      return
    }
    
    console.log(`✅ Encontrados ${admins.length} administrador(es) ativo(s)`)
    
    // 2. Para cada admin, testar acesso às tabelas de configuração
    for (const admin of admins) {
      console.log(`\n👤 TESTANDO ADMIN: ${admin.email}`)
      console.log(`   Nome: ${admin.full_name}`)
      console.log(`   Role: ${admin.role || admin.funcao}`)
      
      // Simular autenticação (usando service key para teste)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      // Testar acesso às tabelas de configuração
      const tabelasConfig = ['dados_empresa', 'configuracao_pix', 'profiles']
      
      for (const tabela of tabelasConfig) {
        try {
          const { data, error } = await supabaseAdmin
            .from(tabela)
            .select('*')
            .limit(1)
          
          if (error) {
            console.log(`   ❌ Erro ao acessar ${tabela}: ${error.message}`)
          } else {
            console.log(`   ✅ Pode acessar ${tabela}`)
          }
        } catch (err) {
          console.log(`   ❌ Erro inesperado ao acessar ${tabela}:`, err.message)
        }
      }
      
      // Testar se o perfil tem as colunas corretas
      console.log('\n   🔍 VERIFICANDO ESTRUTURA DO PERFIL...')
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', admin.id)
        .single()
      
      if (profileError) {
        console.log(`   ❌ Erro ao buscar perfil completo: ${profileError.message}`)
      } else {
        console.log('   📋 Colunas do perfil:', Object.keys(profileData))
        console.log('   🎭 Função/Role encontrada:', profileData.funcao || profileData.role || 'Não definida')
      }
    }
    
    // 3. Verificar se as tabelas de configuração existem
    console.log('\n3️⃣ VERIFICANDO EXISTÊNCIA DAS TABELAS DE CONFIGURAÇÃO...')
    const tabelasParaVerificar = ['dados_empresa', 'configuracao_pix']
    
    for (const tabela of tabelasParaVerificar) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('count')
          .limit(1)
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`   ❌ Tabela ${tabela} não existe`)
          } else {
            console.log(`   ⚠️ Erro ao acessar ${tabela}: ${error.message}`)
          }
        } else {
          console.log(`   ✅ Tabela ${tabela} existe e é acessível`)
        }
      } catch (err) {
        console.log(`   ❌ Erro inesperado com ${tabela}:`, err.message)
      }
    }
    
    console.log('\n🎯 TESTE CONCLUÍDO!')
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message)
  }
}

testarAcessoConfiguracoes()
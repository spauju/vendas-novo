// Script para corrigir inconsistência de papéis no sistema
// Substitui: admin → administrador, manager → gerente, cashier → user

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  console.log('SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('SUPABASE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔍 INICIANDO CORREÇÃO DE PAPÉIS NO SISTEMA')
console.log('==========================================')

async function verificarEstruturaBanco() {
  console.log('\n📋 1. VERIFICANDO ESTRUTURA DO BANCO...')
  
  try {
    // Verificar se a tabela profiles existe
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro ao acessar tabela profiles:', error.message)
      return false
    }
    
    console.log('✅ Tabela profiles acessível')
    return true
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message)
    return false
  }
}

async function buscarPapeisInconsistentes() {
  console.log('\n🔍 2. BUSCANDO PAPÉIS INCONSISTENTES...')
  
  try {
    // Buscar todos os profiles com papéis antigos
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .in('role', ['admin', 'manager', 'cashier'])
    
    if (error) {
      console.error('❌ Erro ao buscar profiles:', error.message)
      return []
    }
    
    console.log(`📊 Encontrados ${profiles?.length || 0} registros com papéis inconsistentes:`)
    
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        console.log(`   - ${profile.email}: ${profile.role}`)
      })
    }
    
    return profiles || []
  } catch (error) {
    console.error('❌ Erro na busca:', error.message)
    return []
  }
}

async function corrigirPapeis(profiles) {
  console.log('\n🔧 3. CORRIGINDO PAPÉIS NO BANCO...')
  
  if (profiles.length === 0) {
    console.log('✅ Nenhum papel inconsistente encontrado!')
    return true
  }
  
  const mapeamentoPapeis = {
    'admin': 'administrador',
    'manager': 'gerente', 
    'cashier': 'user'
  }
  
  let sucessos = 0
  let erros = 0
  
  for (const profile of profiles) {
    const novoRole = mapeamentoPapeis[profile.role]
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: novoRole })
        .eq('id', profile.id)
      
      if (error) {
        console.error(`❌ Erro ao atualizar ${profile.email}:`, error.message)
        erros++
      } else {
        console.log(`✅ ${profile.email}: ${profile.role} → ${novoRole}`)
        sucessos++
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${profile.email}:`, error.message)
      erros++
    }
  }
  
  console.log(`\n📊 RESULTADO DA CORREÇÃO:`)
  console.log(`   ✅ Sucessos: ${sucessos}`)
  console.log(`   ❌ Erros: ${erros}`)
  
  return erros === 0
}

async function verificarCorrecao() {
  console.log('\n✅ 4. VERIFICANDO CORREÇÃO...')
  
  try {
    // Verificar se ainda existem papéis antigos
    const { data: papeisAntigos, error: errorAntigos } = await supabase
      .from('profiles')
      .select('id, email, role')
      .in('role', ['admin', 'manager', 'cashier'])
    
    if (errorAntigos) {
      console.error('❌ Erro na verificação:', errorAntigos.message)
      return false
    }
    
    if (papeisAntigos && papeisAntigos.length > 0) {
      console.log(`❌ Ainda existem ${papeisAntigos.length} papéis inconsistentes:`)
      papeisAntigos.forEach(profile => {
        console.log(`   - ${profile.email}: ${profile.role}`)
      })
      return false
    }
    
    // Verificar distribuição atual dos papéis
    const { data: distribuicao, error: errorDist } = await supabase
      .from('profiles')
      .select('role')
    
    if (errorDist) {
      console.error('❌ Erro ao verificar distribuição:', errorDist.message)
      return false
    }
    
    const contagem = {}
    distribuicao?.forEach(profile => {
      contagem[profile.role] = (contagem[profile.role] || 0) + 1
    })
    
    console.log('📊 DISTRIBUIÇÃO ATUAL DOS PAPÉIS:')
    Object.entries(contagem).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} usuário(s)`)
    })
    
    console.log('✅ Correção concluída com sucesso!')
    return true
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message)
    return false
  }
}

async function testarPermissoes() {
  console.log('\n🧪 5. TESTANDO SISTEMA DE PERMISSÕES...')
  
  try {
    // Buscar um usuário de cada tipo para teste
    const { data: usuarios, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .in('role', ['administrador', 'gerente', 'user'])
    
    if (error) {
      console.error('❌ Erro ao buscar usuários para teste:', error.message)
      return false
    }
    
    console.log('👥 USUÁRIOS PARA TESTE DE PERMISSÕES:')
    const tiposEncontrados = new Set()
    
    usuarios?.forEach(usuario => {
      if (!tiposEncontrados.has(usuario.role)) {
        console.log(`   - ${usuario.role}: ${usuario.email}`)
        tiposEncontrados.add(usuario.role)
      }
    })
    
    const tiposEsperados = ['administrador', 'gerente', 'user']
    const tiposFaltando = tiposEsperados.filter(tipo => !tiposEncontrados.has(tipo))
    
    if (tiposFaltando.length > 0) {
      console.log(`⚠️  Tipos de usuário não encontrados: ${tiposFaltando.join(', ')}`)
    }
    
    console.log('✅ Sistema pronto para testes de permissão!')
    return true
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return false
  }
}

// Função principal
async function main() {
  try {
    console.log('🚀 Iniciando correção de papéis...\n')
    
    // 1. Verificar estrutura
    const estruturaOk = await verificarEstruturaBanco()
    if (!estruturaOk) {
      console.log('❌ Falha na verificação da estrutura')
      return
    }
    
    // 2. Buscar papéis inconsistentes
    const profiles = await buscarPapeisInconsistentes()
    
    // 3. Corrigir papéis
    const correcaoOk = await corrigirPapeis(profiles)
    if (!correcaoOk) {
      console.log('❌ Falha na correção dos papéis')
      return
    }
    
    // 4. Verificar correção
    const verificacaoOk = await verificarCorrecao()
    if (!verificacaoOk) {
      console.log('❌ Falha na verificação da correção')
      return
    }
    
    // 5. Testar permissões
    await testarPermissoes()
    
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!')
    console.log('==========================================')
    console.log('📋 PRÓXIMOS PASSOS:')
    console.log('1. ✅ Banco de dados corrigido')
    console.log('2. 🔄 Atualizar tipos TypeScript em supabase.ts')
    console.log('3. 🧪 Testar login e permissões no sistema')
    console.log('4. 🔍 Verificar se Header.tsx precisa de ajustes')
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

// Executar
main()
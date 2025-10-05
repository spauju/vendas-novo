const fs = require('fs')
const path = require('path')

// Lista de arquivos que precisam ser corrigidos
const arquivosParaCorrigir = [
  'src/components/settings/UserForm.tsx',
  'src/app/settings/users/page.tsx',
  'src/components/settings/UserManagement.tsx',
  'src/components/settings/UserList.tsx'
]

function corrigirSupabaseKeyError() {
  console.log('🔧 CORRIGINDO ERRO supabaseKey is required')
  console.log('=' .repeat(50))
  
  arquivosParaCorrigir.forEach(arquivo => {
    const caminhoCompleto = path.join('c:\\vendas', arquivo)
    
    if (!fs.existsSync(caminhoCompleto)) {
      console.log(`⚠️ Arquivo não encontrado: ${arquivo}`)
      return
    }
    
    console.log(`\n📝 Processando: ${arquivo}`)
    
    let conteudo = fs.readFileSync(caminhoCompleto, 'utf8')
    let modificado = false
    
    // Verificar se já tem verificação de variáveis de ambiente
    if (!conteudo.includes('if (!supabaseUrl || !supabaseServiceKey)')) {
      // Encontrar a linha onde o supabase é criado
      const linhaSupabase = conteudo.match(/const supabase = createClient\(supabaseUrl, supabaseServiceKey\)/)
      
      if (linhaSupabase) {
        // Substituir a criação do cliente Supabase com verificação
        const novaConfiguracao = `// Configuração do Supabase com verificação
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  console.error('Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local')
}

const supabase = createClient(
  supabaseUrl || '', 
  supabaseServiceKey || ''
)`
        
        // Substituir a configuração antiga
        conteudo = conteudo.replace(
          /\/\/ Configuração do Supabase\nconst supabaseUrl = process\.env\.NEXT_PUBLIC_SUPABASE_URL!\nconst supabaseServiceKey = process\.env\.SUPABASE_SERVICE_ROLE_KEY!\nconst supabase = createClient\(supabaseUrl, supabaseServiceKey\)/,
          novaConfiguracao
        )
        
        modificado = true
      }
    }
    
    // Adicionar verificação de erro na inicialização se não existir
    if (!conteudo.includes('useEffect(() => {') && !conteudo.includes('checkSupabaseConnection')) {
      // Adicionar função de verificação de conexão
      const verificacaoConexao = `
  // Verificar conexão com Supabase na inicialização
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Configuração do Supabase incompleta')
        return
      }
      
      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1)
        if (error) {
          console.error('❌ Erro de conexão com Supabase:', error.message)
        } else {
          console.log('✅ Conexão com Supabase OK')
        }
      } catch (err) {
        console.error('❌ Erro ao verificar conexão:', err)
      }
    }
    
    checkSupabaseConnection()
  }, [])
`
      
      // Encontrar onde inserir a verificação (após as interfaces)
      const posicaoInsercao = conteudo.indexOf('export default function')
      if (posicaoInsercao > -1) {
        conteudo = conteudo.slice(0, posicaoInsercao) + verificacaoConexao + '\n' + conteudo.slice(posicaoInsercao)
        modificado = true
      }
    }
    
    if (modificado) {
      fs.writeFileSync(caminhoCompleto, conteudo, 'utf8')
      console.log(`✅ Arquivo corrigido: ${arquivo}`)
    } else {
      console.log(`ℹ️ Nenhuma correção necessária: ${arquivo}`)
    }
  })
  
  console.log('\n🎉 CORREÇÃO DE supabaseKey CONCLUÍDA!')
}

// Executar correções
corrigirSupabaseKeyError()
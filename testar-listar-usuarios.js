const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testarListarUsuarios() {
  console.log('🧪 TESTANDO FUNÇÃO LISTAR USUÁRIOS...')
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, funcao, created_at')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Erro:', error.message)
      console.error('Código do erro:', error.code)
      return
    }
    
    console.log(`✅ Função funcionou! Usuários encontrados: ${data.length}`)
    
    if (data.length > 0) {
      console.log('\n📋 LISTA DE USUÁRIOS:')
      data.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name || 'Nome não informado'} (${user.email}) - ${user.funcao}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Criado em: ${new Date(user.created_at).toLocaleDateString('pt-BR')}`)
        console.log('')
      })
    } else {
      console.log('⚠️ Nenhum usuário encontrado')
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

testarListarUsuarios()
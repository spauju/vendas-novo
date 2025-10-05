const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function corrigirAdmins() {
  console.log('🔧 CORRIGINDO DADOS DOS ADMINISTRADORES...')
  
  try {
    // Buscar usuários que deveriam ser admins
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .in('email', ['admin@vendas.com', 'paulo@pdv.com'])
    
    if (error) {
      console.error('❌ Erro ao buscar usuários:', error.message)
      return
    }
    
    console.log(`📋 Usuários encontrados: ${users.length}`)
    
    for (const user of users) {
      console.log(`\n👤 Usuário: ${user.email}`)
      console.log(`   Role atual: ${user.role}`)
      console.log(`   Funcao atual: ${user.funcao}`)
      
      // Atualizar para administrador
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'administrador',
          funcao: 'administrador'
        })
        .eq('id', user.id)
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar ${user.email}:`, updateError.message)
      } else {
        console.log(`✅ ${user.email} atualizado para administrador`)
      }
    }
    
    // Verificar se a atualização funcionou
    console.log('\n🔍 VERIFICANDO ATUALIZAÇÕES...')
    const { data: updatedUsers, error: verifyError } = await supabase
      .from('profiles')
      .select('email, role, funcao')
      .in('email', ['admin@vendas.com', 'paulo@pdv.com'])
    
    if (verifyError) {
      console.error('❌ Erro ao verificar:', verifyError.message)
    } else {
      updatedUsers.forEach(user => {
        console.log(`✅ ${user.email}: role=${user.role}, funcao=${user.funcao}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

corrigirAdmins()
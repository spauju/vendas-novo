require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔍 Verificando estrutura da tabela profiles...');
    
    // Buscar dados da tabela profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Erro ao buscar dados: ${error.message}`);
    } else {
      console.log('✅ Estrutura da tabela profiles:');
      if (data && data.length > 0) {
        console.log(JSON.stringify(data[0], null, 2));
      } else {
        console.log('Nenhum registro encontrado');
      }
    }
    
    console.log('\n🔍 Verificando usuários e seus roles...');
    
    // Buscar todos os usuários
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*');
    
    if (usersError) {
      console.error(`❌ Erro ao buscar usuários: ${usersError.message}`);
    } else {
      console.log(`✅ Encontrados ${users.length} usuários:`);
      users.forEach(user => {
        console.log(`- ${user.email}: role = ${user.role}`);
      });
    }
    
    console.log('\n🎉 Verificação concluída!');
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
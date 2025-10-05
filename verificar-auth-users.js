require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔍 Verificando tabela auth.users...');
    
    // Executar SQL para verificar a estrutura da tabela auth.users
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
      `
    });
    
    if (error) {
      console.log('⚠️ Não foi possível verificar a estrutura via RPC, verificando diretamente...');
      
      // Buscar todos os usuários
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error(`❌ Erro ao buscar usuários: ${usersError.message}`);
        return;
      }
      
      console.log(`✅ Encontrados ${users.users.length} usuários`);
      
      // Verificar cada usuário
      for (const user of users.users) {
        console.log(`\n👤 Usuário: ${user.email}`);
        console.log(`ID: ${user.id}`);
        console.log(`Role: ${user.role}`);
        console.log(`Raw User: ${JSON.stringify(user, null, 2)}`);
      }
    } else {
      console.log('✅ Estrutura da tabela auth.users:');
      console.log(data);
    }
    
    console.log('\n🎉 Verificação concluída!');
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
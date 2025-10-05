require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔄 Iniciando correção dos metadados de usuários...');
    
    // Buscar todos os usuários
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Erro ao buscar usuários: ${authError.message}`);
    }
    
    console.log(`📋 Encontrados ${authUsers.users.length} usuários no auth.users`);
    
    // Processar cada usuário
    for (const user of authUsers.users) {
      console.log(`\n👤 Processando usuário: ${user.email}`);
      
      // Verificar metadados
      if (user.user_metadata) {
        console.log(`Metadados atuais: ${JSON.stringify(user.user_metadata, null, 2)}`);
        
        // Verificar se há campo button nos metadados
        if (user.user_metadata.button) {
          console.log(`⚠️ Campo button encontrado nos metadados: ${user.user_metadata.button}`);
          
          // Criar novos metadados sem o campo button
          const newMetadata = { ...user.user_metadata };
          delete newMetadata.button;
          
          // Garantir que o campo role esteja correto
          if (newMetadata.role === 'cashier') {
            newMetadata.role = 'user';
            console.log(`🔄 Alterando role de 'cashier' para 'user'`);
          }
          
          // Atualizar metadados
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { user_metadata: newMetadata }
          );
          
          if (updateError) {
            console.error(`❌ Erro ao atualizar metadados: ${updateError.message}`);
          } else {
            console.log(`✅ Metadados atualizados com sucesso`);
          }
        } else if (user.user_metadata.role === 'cashier') {
          // Se não tem button mas tem role cashier
          const newMetadata = { ...user.user_metadata, role: 'user' };
          
          // Atualizar metadados
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { user_metadata: newMetadata }
          );
          
          if (updateError) {
            console.error(`❌ Erro ao atualizar metadados: ${updateError.message}`);
          } else {
            console.log(`✅ Role alterado de 'cashier' para 'user' nos metadados`);
          }
        } else {
          console.log(`✅ Nenhum problema encontrado nos metadados`);
        }
      } else {
        console.log(`ℹ️ Usuário sem metadados`);
      }
      
      // Verificar e atualizar o perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profile) {
        if (profile.role === 'cashier') {
          // Atualizar o perfil
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', user.id);
          
          if (updateProfileError) {
            console.error(`❌ Erro ao atualizar perfil: ${updateProfileError.message}`);
          } else {
            console.log(`✅ Role alterado de 'cashier' para 'user' no perfil`);
          }
        }
      }
    }
    
    console.log('\n🎉 Correção dos metadados concluída!');
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
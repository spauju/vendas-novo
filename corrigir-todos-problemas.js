require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔄 Iniciando correção completa do banco de dados...');
    
    // 1. Corrigir auth.users diretamente
    console.log('\n1️⃣ Tentando corrigir auth.users diretamente...');
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: `
          UPDATE auth.users 
          SET raw_user_meta_data = raw_user_meta_data - 'button'
          WHERE raw_user_meta_data->>'button' = 'cashier';
          
          UPDATE auth.users 
          SET raw_user_meta_data = jsonb_set(
            raw_user_meta_data, 
            '{role}', 
            '"user"'::jsonb
          )
          WHERE raw_user_meta_data->>'role' = 'cashier';
        `
      });
      
      if (error) {
        console.log(`⚠️ Não foi possível executar SQL direto: ${error.message}`);
      } else {
        console.log('✅ SQL executado com sucesso');
      }
    } catch (e) {
      console.log(`⚠️ Erro ao tentar executar SQL: ${e.message}`);
    }
    
    // 2. Atualizar metadados via API
    console.log('\n2️⃣ Atualizando metadados via API...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error(`❌ Erro ao buscar usuários: ${usersError.message}`);
    } else {
      console.log(`📋 Encontrados ${users.users.length} usuários`);
      
      for (const user of users.users) {
        console.log(`\n👤 Processando usuário: ${user.email}`);
        
        if (user.user_metadata) {
          let needsUpdate = false;
          const newMetadata = { ...user.user_metadata };
          
          // Remover campo button
          if (newMetadata.button) {
            delete newMetadata.button;
            console.log('🔄 Removendo campo button dos metadados');
            needsUpdate = true;
          }
          
          // Corrigir role se for cashier
          if (newMetadata.role === 'cashier') {
            newMetadata.role = 'user';
            console.log('🔄 Alterando role de cashier para user');
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              user.id,
              { user_metadata: newMetadata }
            );
            
            if (updateError) {
              console.error(`❌ Erro ao atualizar metadados: ${updateError.message}`);
            } else {
              console.log('✅ Metadados atualizados com sucesso');
            }
          } else {
            console.log('✅ Nenhuma alteração necessária nos metadados');
          }
        }
      }
    }
    
    // 3. Verificar e corrigir perfis
    console.log('\n3️⃣ Verificando e corrigindo perfis...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error(`❌ Erro ao buscar perfis: ${profilesError.message}`);
    } else {
      console.log(`📋 Encontrados ${profiles.length} perfis`);
      
      for (const profile of profiles) {
        console.log(`\n👤 Processando perfil: ${profile.email || profile.id}`);
        
        let needsUpdate = false;
        const updates = {};
        
        // Verificar se há campo button
        if (profile.button) {
          console.log(`🔄 Encontrado campo button: ${profile.button}`);
          updates.button = null;
          needsUpdate = true;
        }
        
        // Corrigir role se for cashier
        if (profile.role === 'cashier') {
          console.log('🔄 Alterando role de cashier para user');
          updates.role = 'user';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id);
          
          if (updateError) {
            console.error(`❌ Erro ao atualizar perfil: ${updateError.message}`);
          } else {
            console.log('✅ Perfil atualizado com sucesso');
          }
        } else {
          console.log('✅ Nenhuma alteração necessária no perfil');
        }
      }
    }
    
    // 4. Tentar alterar o tipo da coluna button se existir
    console.log('\n4️⃣ Tentando alterar o tipo da coluna button...');
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: `
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'button'
            ) THEN
              ALTER TABLE public.profiles 
              ALTER COLUMN button TYPE text;
              
              RAISE NOTICE 'Coluna button alterada para tipo text';
            ELSE
              RAISE NOTICE 'Coluna button não encontrada';
            END IF;
          END $$;
        `
      });
      
      if (error) {
        console.log(`⚠️ Não foi possível alterar o tipo da coluna: ${error.message}`);
      } else {
        console.log('✅ Verificação de tipo de coluna concluída');
      }
    } catch (e) {
      console.log(`⚠️ Erro ao tentar alterar tipo da coluna: ${e.message}`);
    }
    
    console.log('\n🎉 Correção completa do banco de dados concluída!');
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
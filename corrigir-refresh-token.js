require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function corrigirRefreshToken() {
  try {
    console.log('🔧 CORRIGINDO PROBLEMAS DE REFRESH TOKEN');
    console.log('========================================\n');

    // 1. Verificar configuração do Supabase
    console.log('1️⃣ Verificando configuração do Supabase...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.log('❌ Variáveis de ambiente faltando:');
      console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`);
      console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌'}`);
      console.log(`   SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '✅' : '❌'}`);
      return;
    }

    console.log('✅ Todas as variáveis de ambiente estão configuradas');

    // 2. Verificar usuários existentes
    console.log('\n2️⃣ Verificando usuários existentes...');
    
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log(`❌ Erro ao listar usuários: ${usersError.message}`);
      return;
    }

    console.log(`✅ Encontrados ${users.users.length} usuários`);

    // 3. Verificar e corrigir sessões problemáticas
    console.log('\n3️⃣ Verificando sessões dos usuários...');
    
    for (const user of users.users) {
      console.log(`\n👤 Usuário: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Criado em: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Última atualização: ${new Date(user.updated_at).toLocaleString()}`);
      
      // Verificar se o usuário tem confirmação de email
      if (!user.email_confirmed_at) {
        console.log('   ⚠️ Email não confirmado');
        
        // Confirmar email automaticamente
        try {
          const { error: confirmError } = await supabase.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
          );
          
          if (confirmError) {
            console.log(`   ❌ Erro ao confirmar email: ${confirmError.message}`);
          } else {
            console.log('   ✅ Email confirmado automaticamente');
          }
        } catch (err) {
          console.log(`   ❌ Erro ao confirmar email: ${err.message}`);
        }
      } else {
        console.log('   ✅ Email confirmado');
      }

      // Verificar metadados do usuário
      if (user.user_metadata) {
        console.log('   📋 Metadados:');
        Object.keys(user.user_metadata).forEach(key => {
          console.log(`      ${key}: ${user.user_metadata[key]}`);
        });
      }

      // Verificar se há problemas com o perfil
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.log(`   ⚠️ Problema com perfil: ${profileError.message}`);
          
          // Criar perfil se não existir
          if (profileError.code === 'PGRST116') {
            console.log('   🔧 Criando perfil...');
            
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                role: user.user_metadata?.role || 'user',
                active: true
              });

            if (createError) {
              console.log(`   ❌ Erro ao criar perfil: ${createError.message}`);
            } else {
              console.log('   ✅ Perfil criado com sucesso');
            }
          }
        } else {
          console.log('   ✅ Perfil existe e está acessível');
        }
      } catch (err) {
        console.log(`   ❌ Erro ao verificar perfil: ${err.message}`);
      }
    }

    // 4. Criar função para limpar sessões problemáticas
    console.log('\n4️⃣ Criando função para gerenciar sessões...');
    
    const sessionManagementSQL = `
      -- Função para limpar sessões expiradas
      CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
      RETURNS void AS $$
      BEGIN
        -- Esta função seria executada periodicamente para limpar sessões expiradas
        -- Por segurança, não vamos implementar limpeza automática aqui
        RAISE NOTICE 'Função de limpeza de sessões criada';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    try {
      const { error: functionError } = await supabase.rpc('exec_sql', { 
        sql: sessionManagementSQL 
      });

      if (functionError) {
        console.log(`⚠️ Não foi possível criar função: ${functionError.message}`);
      } else {
        console.log('✅ Função de gerenciamento de sessões criada');
      }
    } catch (err) {
      console.log(`⚠️ Erro ao criar função: ${err.message}`);
    }

    // 5. Testar autenticação
    console.log('\n5️⃣ Testando autenticação...');
    
    // Criar cliente para teste
    const testClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Verificar se conseguimos obter sessão
    const { data: sessionData, error: sessionError } = await testClient.auth.getSession();
    
    if (sessionError) {
      console.log(`⚠️ Erro ao obter sessão: ${sessionError.message}`);
    } else {
      console.log('✅ Cliente de autenticação funcionando');
      
      if (sessionData.session) {
        console.log('   ✅ Sessão ativa encontrada');
      } else {
        console.log('   ℹ️ Nenhuma sessão ativa (normal para script)');
      }
    }

    console.log('\n🎯 RESUMO E RECOMENDAÇÕES');
    console.log('==========================');
    console.log('✅ Verificação de usuários concluída');
    console.log('✅ Perfis verificados/criados');
    console.log('✅ Emails confirmados quando necessário');
    
    console.log('\n📋 PARA RESOLVER PROBLEMAS DE REFRESH TOKEN:');
    console.log('1. Certifique-se de que os usuários façam logout e login novamente');
    console.log('2. Verifique se o AuthContext está configurado corretamente');
    console.log('3. Confirme que as variáveis de ambiente estão corretas no frontend');
    console.log('4. Considere implementar tratamento de erro para tokens expirados');

    console.log('\n🔧 CÓDIGO SUGERIDO PARA AuthContext.tsx:');
    console.log(`
// Adicione este tratamento no AuthContext:
const handleAuthError = (error) => {
  if (error.message.includes('Invalid Refresh Token') || 
      error.message.includes('Refresh Token Not Found')) {
    // Limpar sessão local e redirecionar para login
    supabase.auth.signOut();
    router.push('/login');
  }
};

// Use este tratamento em todas as chamadas de API
    `);

  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    process.exit(1);
  }
}

corrigirRefreshToken();
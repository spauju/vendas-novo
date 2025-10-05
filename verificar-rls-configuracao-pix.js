require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Cliente com chave anônima (como no frontend)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cliente com service role (para verificações administrativas)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarRLSConfiguracaoPix() {
  console.log('🔍 Verificando políticas RLS para configuracao_pix...\n');

  try {
    // 1. Fazer login como admin
    console.log('🔐 Fazendo login como administrador...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendas.com',
      password: 'admin123'
    });

    if (loginError) {
      console.error('❌ Erro ao fazer login:', loginError);
      return;
    }

    console.log('✅ Login realizado com sucesso');
    console.log('👤 Usuário logado:', loginData.user.email);
    console.log('🆔 ID do usuário:', loginData.user.id);

    // 2. Verificar perfil do usuário
    console.log('\n📋 Verificando perfil do usuário...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', loginData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError);
    } else {
      console.log('✅ Perfil encontrado:');
      console.log('  - Email:', profile.email);
      console.log('  - Função:', profile.funcao);
      console.log('  - Nome:', profile.full_name);
    }

    // 3. Verificar se consegue ler configuracao_pix
    console.log('\n📖 Testando leitura da tabela configuracao_pix...');
    const { data: configRead, error: readError } = await supabase
      .from('configuracao_pix')
      .select('*');

    if (readError) {
      console.error('❌ Erro ao ler configuracao_pix:', readError);
    } else {
      console.log('✅ Leitura bem-sucedida. Registros encontrados:', configRead?.length || 0);
      if (configRead && configRead.length > 0) {
        console.log('📄 Dados atuais:', configRead[0]);
      }
    }

    // 4. Testar inserção/atualização
    console.log('\n💾 Testando salvamento na tabela configuracao_pix...');
    const dadosTeste = {
      id: 1,
      tipo_chave: 'Email',
      chave_pix: 'teste@exemplo.com',
      nome_beneficiario: 'Teste RLS',
      updated_at: new Date().toISOString()
    };

    const { data: configSave, error: saveError } = await supabase
      .from('configuracao_pix')
      .upsert(dadosTeste);

    if (saveError) {
      console.error('❌ Erro ao salvar configuracao_pix:', saveError);
      console.error('  - Código:', saveError.code);
      console.error('  - Mensagem:', saveError.message);
      console.error('  - Detalhes:', saveError.details);
      console.error('  - Hint:', saveError.hint);
    } else {
      console.log('✅ Salvamento bem-sucedido!');
    }

    // 5. Verificar políticas RLS usando service role
    console.log('\n🔒 Verificando políticas RLS (usando service role)...');
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'configuracao_pix');

    if (policiesError) {
      console.error('❌ Erro ao buscar políticas:', policiesError);
    } else {
      console.log('📜 Políticas RLS encontradas:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} - ${policy.qual}`);
      });
    }

    // 6. Verificar se o usuário tem a função correta
    console.log('\n🎭 Verificando função do usuário na query RLS...');
    const { data: funcaoCheck, error: funcaoError } = await supabase.rpc('check_user_function');

    if (funcaoError) {
      console.log('⚠️ Função check_user_function não existe, criando consulta manual...');
      
      // Consulta manual para verificar a função
      const { data: manualCheck, error: manualError } = await supabase
        .from('profiles')
        .select('funcao')
        .eq('id', loginData.user.id)
        .single();

      if (manualError) {
        console.error('❌ Erro na verificação manual:', manualError);
      } else {
        console.log('✅ Função do usuário:', manualCheck.funcao);
        console.log('✅ Usuário tem permissão?', ['administrador', 'gerente'].includes(manualCheck.funcao));
      }
    } else {
      console.log('✅ Resultado da função:', funcaoCheck);
    }

    // Fazer logout
    await supabase.auth.signOut();
    console.log('\n🚪 Logout realizado');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarRLSConfiguracaoPix();
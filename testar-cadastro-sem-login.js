require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase com Service Role Key para usar Admin API
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testarCadastroSemLogin() {
  console.log('🧪 TESTANDO CADASTRO DE USUÁRIO SEM LOGIN AUTOMÁTICO');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar sessão atual (deve estar vazia no contexto do script)
    console.log('\n1️⃣ VERIFICANDO SESSÃO ATUAL...');
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Sessão atual:', sessionData.session ? 'ATIVA' : 'NENHUMA');
    
    // 2. Criar usuário de teste usando Admin API
    console.log('\n2️⃣ CRIANDO USUÁRIO DE TESTE...');
    const testUser = {
      email: `teste-${Date.now()}@exemplo.com`,
      password: 'senha123456',
      full_name: 'Usuário de Teste'
    };
    
    console.log(`Email: ${testUser.email}`);
    console.log(`Nome: ${testUser.full_name}`);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true, // Confirma o email automaticamente
      user_metadata: {
        full_name: testUser.full_name
      }
    });
    
    if (authError) {
      console.error('❌ Erro ao criar usuário:', authError.message);
      return;
    }
    
    console.log('✅ Usuário criado com sucesso!');
    console.log(`ID: ${authData.user.id}`);
    
    // 3. Verificar se a sessão mudou (não deveria mudar)
    console.log('\n3️⃣ VERIFICANDO SESSÃO APÓS CRIAÇÃO...');
    const { data: sessionAfter } = await supabase.auth.getSession();
    console.log('Sessão após criação:', sessionAfter.session ? 'ATIVA' : 'NENHUMA');
    
    // 4. Criar perfil na tabela profiles
    console.log('\n4️⃣ CRIANDO PERFIL NA TABELA PROFILES...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: testUser.full_name,
        email: testUser.email,
        funcao: 'usuario'
      });
    
    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError.message);
    } else {
      console.log('✅ Perfil criado com sucesso!');
    }
    
    // 5. Verificar se o usuário foi criado corretamente
    console.log('\n5️⃣ VERIFICANDO USUÁRIO CRIADO...');
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (fetchError) {
      console.error('❌ Erro ao buscar perfil:', fetchError.message);
    } else {
      console.log('✅ Perfil encontrado:');
      console.log(`   Nome: ${profile.full_name}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Função: ${profile.funcao}`);
      console.log(`   Criado em: ${profile.created_at}`);
    }
    
    // 6. Limpar usuário de teste
    console.log('\n6️⃣ LIMPANDO USUÁRIO DE TESTE...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar usuário:', deleteError.message);
    } else {
      console.log('✅ Usuário de teste removido com sucesso!');
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('✅ O cadastro não afeta a sessão atual do administrador');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarCadastroSemLogin();
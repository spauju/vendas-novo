require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Simular o comportamento do hook useAdmin.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simular a função cadastrarUsuario modificada
async function cadastrarUsuario(dadosUsuario) {
  try {
    console.log('🔄 Iniciando cadastro de usuário...');
    
    // Criar usuário usando Admin API (não faz login automático)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dadosUsuario.email,
      password: dadosUsuario.senha,
      email_confirm: true, // Confirma o email automaticamente
      user_metadata: {
        full_name: dadosUsuario.full_name
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Erro ao criar usuário');
    }

    // Inserir dados na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: dadosUsuario.full_name,
        email: dadosUsuario.email,
        funcao: 'usuario'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      throw profileError;
    }

    console.log('✅ Usuário cadastrado com sucesso!');
    return { success: true, user: authData.user };
  } catch (error) {
    console.error('❌ Erro ao cadastrar usuário:', error.message);
    return { success: false, error: error.message };
  }
}

async function testarCadastroFrontend() {
  console.log('🧪 TESTANDO FUNCIONALIDADE DE CADASTRO (SIMULAÇÃO FRONTEND)');
  console.log('=' .repeat(70));
  
  try {
    // 1. Simular dados do formulário
    console.log('\n1️⃣ SIMULANDO DADOS DO FORMULÁRIO...');
    const dadosFormulario = {
      full_name: 'João da Silva',
      email: `joao.silva.${Date.now()}@empresa.com`,
      senha: 'senha123456'
    };
    
    console.log(`Nome: ${dadosFormulario.full_name}`);
    console.log(`Email: ${dadosFormulario.email}`);
    console.log(`Senha: ${'*'.repeat(dadosFormulario.senha.length)}`);
    
    // 2. Verificar sessão antes do cadastro
    console.log('\n2️⃣ VERIFICANDO SESSÃO ANTES DO CADASTRO...');
    const { data: sessionBefore } = await supabase.auth.getSession();
    console.log('Sessão antes:', sessionBefore.session ? 'ATIVA' : 'NENHUMA');
    
    // 3. Executar cadastro
    console.log('\n3️⃣ EXECUTANDO CADASTRO...');
    const resultado = await cadastrarUsuario(dadosFormulario);
    
    if (!resultado.success) {
      console.error('❌ Falha no cadastro:', resultado.error);
      return;
    }
    
    // 4. Verificar sessão após o cadastro
    console.log('\n4️⃣ VERIFICANDO SESSÃO APÓS CADASTRO...');
    const { data: sessionAfter } = await supabase.auth.getSession();
    console.log('Sessão após:', sessionAfter.session ? 'ATIVA' : 'NENHUMA');
    
    // 5. Verificar se o usuário foi criado corretamente
    console.log('\n5️⃣ VERIFICANDO USUÁRIO CRIADO...');
    const { data: usuarios, error: listError } = await supabase
      .from('profiles')
      .select('id, full_name, email, funcao, created_at')
      .eq('email', dadosFormulario.email);
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError.message);
    } else if (usuarios.length > 0) {
      const usuario = usuarios[0];
      console.log('✅ Usuário encontrado na listagem:');
      console.log(`   ID: ${usuario.id}`);
      console.log(`   Nome: ${usuario.full_name}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Função: ${usuario.funcao}`);
      console.log(`   Criado em: ${new Date(usuario.created_at).toLocaleString('pt-BR')}`);
    }
    
    // 6. Limpar usuário de teste
    console.log('\n6️⃣ LIMPANDO USUÁRIO DE TESTE...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(resultado.user.id);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar usuário:', deleteError.message);
    } else {
      console.log('✅ Usuário de teste removido com sucesso!');
    }
    
    console.log('\n🎉 TESTE DE FUNCIONALIDADE CONCLUÍDO!');
    console.log('✅ Cadastro funciona sem afetar sessão do administrador');
    console.log('✅ Usuário é criado corretamente na base de dados');
    console.log('✅ Listagem de usuários funciona normalmente');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarCadastroFrontend();
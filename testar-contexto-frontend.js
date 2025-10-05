require('dotenv').config({ path: '.env.local' });

// Simular o ambiente Next.js
global.window = {
  location: { origin: 'http://localhost:3002' }
};

// Simular cookies do Next.js
const mockCookies = new Map();
global.document = {
  cookie: '',
  get cookie() {
    return Array.from(mockCookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  },
  set cookie(value) {
    const [keyValue] = value.split(';');
    const [key, val] = keyValue.split('=');
    mockCookies.set(key.trim(), val?.trim() || '');
  }
};

const { createClient } = require('@supabase/supabase-js');

// Simular createClientComponentClient
function createClientComponentClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        storage: {
          getItem: (key) => {
            return mockCookies.get(key) || null;
          },
          setItem: (key, value) => {
            mockCookies.set(key, value);
          },
          removeItem: (key) => {
            mockCookies.delete(key);
          }
        }
      }
    }
  );
}

// Simular exatamente como no useAdmin.ts
async function salvarConfiguracaoPix(dados) {
  const supabase = createClientComponentClient();
  
  try {
    console.log('📤 Tentando salvar configuração PIX (contexto frontend):', dados);

    const { error } = await supabase
      .from('configuracao_pix')
      .upsert({
        id: 1,
        ...dados,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    console.log('✅ Configuração PIX salva com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao salvar configuração PIX:', error?.message || 'Erro desconhecido');
    console.error('Detalhes do erro:', {
      message: error?.message || 'Erro desconhecido',
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });
    if (error) {
      console.error('Objeto error completo:', error);
    }
    return false;
  }
}

async function testarContextoFrontend() {
  console.log('🌐 Testando contexto do frontend...\n');

  try {
    const supabase = createClientComponentClient();

    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendas.com',
      password: 'admin123'
    });

    if (loginError) {
      console.error('❌ Erro ao fazer login:', loginError);
      return;
    }

    console.log('✅ Login realizado com sucesso');
    console.log('👤 Usuário:', loginData.user.email);

    // 2. Verificar sessão
    console.log('\n🔍 Verificando sessão...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError);
    } else if (session) {
      console.log('✅ Sessão ativa:', session.user.email);
      console.log('🔑 Access token presente:', !!session.access_token);
    } else {
      console.log('⚠️ Nenhuma sessão encontrada');
    }

    // 3. Verificar perfil
    console.log('\n📋 Verificando perfil...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', loginData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError);
    } else {
      console.log('✅ Perfil encontrado:');
      console.log('  - Função:', profile.funcao);
      console.log('  - Email:', profile.email);
    }

    // 4. Testar salvamento
    console.log('\n💾 Testando salvamento...');
    const dadosTeste = {
      tipo_chave: 'Email',
      chave_pix: 'teste-frontend@exemplo.com',
      nome_beneficiario: 'Teste Frontend Context'
    };

    const resultado = await salvarConfiguracaoPix(dadosTeste);
    console.log(`📊 Resultado: ${resultado ? '✅ Sucesso' : '❌ Falha'}`);

    // 5. Verificar headers da requisição
    console.log('\n🔍 Verificando headers de autenticação...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Erro ao obter usuário:', userError);
    } else if (user) {
      console.log('✅ Usuário autenticado:', user.email);
      console.log('🆔 ID do usuário:', user.id);
    }

    // Fazer logout
    await supabase.auth.signOut();
    console.log('\n🚪 Logout realizado');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarContextoFrontend();
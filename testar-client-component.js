require('dotenv').config({ path: '.env.local' });

// Simular ambiente do Next.js
global.window = {
  location: { origin: 'http://localhost:3000' },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

global.document = {
  cookie: ''
};

// Mock do createClientComponentClient
const { createClient } = require('@supabase/supabase-js');

// Simular createClientComponentClient
function createClientComponentClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
}

async function testarClientComponent() {
  console.log('🧪 TESTANDO createClientComponentClient...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Criar cliente como no frontend
    console.log('\n1️⃣ CRIANDO CLIENTE COMPONENT...');
    const supabase = createClientComponentClient();
    
    // 2. Fazer login
    console.log('\n2️⃣ FAZENDO LOGIN...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendas.com',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    console.log(`👤 Usuário: ${loginData.user.email}`);
    
    // 3. Verificar sessão e headers
    console.log('\n3️⃣ VERIFICANDO SESSÃO E HEADERS...');
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData.session) {
      console.log('✅ Sessão ativa');
      console.log(`🔑 Access token presente: ${!!sessionData.session.access_token}`);
      console.log(`👤 User ID: ${sessionData.session.user.id}`);
      
      // Verificar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single();
        
      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError.message);
      } else {
        console.log('✅ Perfil encontrado:');
        console.log(`  - Função: ${profile.funcao || profile.role}`);
        console.log(`  - Email: ${profile.email}`);
      }
    }
    
    // 4. Testar salvamento PIX
    console.log('\n4️⃣ TESTANDO SALVAMENTO PIX...');
    
    const configPix = {
      tipo_chave: 'Email',
      chave_pix: 'teste-component@exemplo.com',
      nome_beneficiario: 'Teste Component Client'
    };
    
    console.log('📤 Tentando salvar configuração PIX:', configPix);
    
    const { data: pixData, error: pixError } = await supabase
      .from('configuracao_pix')
      .upsert(configPix)
      .select()
      .single();
    
    if (pixError) {
      console.error('❌ ERRO PIX:', pixError.message);
      console.error('📋 Código do erro:', pixError.code);
      console.error('📋 Detalhes:', pixError.details);
      console.error('📋 Hint:', pixError.hint);
      console.error('📋 Objeto completo:', JSON.stringify(pixError, null, 2));
    } else {
      console.log('✅ Configuração PIX salva com sucesso!');
      console.log('📊 Dados salvos:', pixData);
    }
    
    // 5. Logout
    console.log('\n5️⃣ FAZENDO LOGOUT...');
    await supabase.auth.signOut();
    console.log('🚪 Logout realizado');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

testarClientComponent();
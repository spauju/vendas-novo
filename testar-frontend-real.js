require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Simular ambiente Next.js mais realista
global.window = {
  location: { origin: 'http://localhost:3000' },
  localStorage: {
    store: {},
    getItem: function(key) { return this.store[key] || null; },
    setItem: function(key, value) { this.store[key] = value; },
    removeItem: function(key) { delete this.store[key]; }
  }
};

global.document = {
  cookie: '',
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Mock do createClientComponentClient
const { createClientComponentClient } = {
  createClientComponentClient: () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
};

async function testarFrontendReal() {
  console.log('🧪 TESTANDO AMBIENTE FRONTEND REAL...');
  console.log('============================================================\n');

  // 1. Simular AuthContext
  console.log('1️⃣ SIMULANDO AUTHCONTEXT...');
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: 'admin@vendas.com',
    password: 'admin123'
  });

  if (authError) {
    console.error('❌ Erro no login AuthContext:', authError);
    return;
  }

  console.log('✅ AuthContext login realizado');
  console.log('Sessão AuthContext:', {
    user_id: authData.user?.id,
    email: authData.user?.email,
    role: authData.user?.role
  });

  // 2. Simular useAdmin
  console.log('\n2️⃣ SIMULANDO USEADMIN...');
  const adminClient = createClientComponentClient();

  const { data: adminData, error: adminError } = await adminClient.auth.signInWithPassword({
    email: 'admin@vendas.com',
    password: 'admin123'
  });

  if (adminError) {
    console.error('❌ Erro no login useAdmin:', adminError);
    return;
  }

  console.log('✅ useAdmin login realizado');
  console.log('Sessão useAdmin:', {
    user_id: adminData.user?.id,
    email: adminData.user?.email,
    role: adminData.user?.role
  });

  // 3. Verificar sessões ativas
  console.log('\n3️⃣ VERIFICANDO SESSÕES ATIVAS...');
  
  const authSession = await authClient.auth.getSession();
  const adminSession = await adminClient.auth.getSession();

  console.log('Sessão AuthContext ativa:', !!authSession.data.session);
  console.log('Sessão useAdmin ativa:', !!adminSession.data.session);

  // 4. Verificar perfis
  console.log('\n4️⃣ VERIFICANDO PERFIS...');
  
  const { data: authProfile } = await authClient
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', adminData.user.id)
    .single();

  console.log('Perfil AuthContext:', {
    id: authProfile?.id,
    email: authProfile?.email,
    role: authProfile?.role,
    is_admin: authProfile?.is_admin
  });

  console.log('Perfil useAdmin:', {
    id: adminProfile?.id,
    email: adminProfile?.email,
    role: adminProfile?.role,
    is_admin: adminProfile?.is_admin
  });

  // 5. Testar salvamento PIX com logs detalhados
  console.log('\n5️⃣ TESTANDO SALVAMENTO PIX COM LOGS DETALHADOS...');
  
  const dadosPix = {
    tipo_chave: 'Email',
    chave_pix: 'admin@vendas.com',
    nome_beneficiario: 'Admin Vendas'
  };

  console.log('Dados a serem salvos:', dadosPix);
  console.log('Cliente usado:', 'createClientComponentClient (useAdmin)');

  try {
    // Verificar sessão antes de salvar
    const sessionCheck = await adminClient.auth.getSession();
    console.log('Sessão antes do salvamento:', {
      ativa: !!sessionCheck.data.session,
      user_id: sessionCheck.data.session?.user?.id,
      expires_at: sessionCheck.data.session?.expires_at
    });

    // Verificar headers/contexto
    console.log('Headers do cliente:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
    });

    const { data, error } = await adminClient
      .from('configuracao_pix')
      .upsert({
        id: 1,
        ...dadosPix,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ ERRO RLS DETECTADO!');
      console.error('Erro completo:', JSON.stringify(error, null, 2));
      console.error('Tipo do erro:', typeof error);
      console.error('Propriedades do erro:', Object.keys(error));
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      
      // Tentar com AuthContext client
      console.log('\n🔄 TENTANDO COM AUTHCONTEXT CLIENT...');
      const { data: authData, error: authError } = await authClient
        .from('configuracao_pix')
        .upsert({
          id: 1,
          ...dadosPix,
          updated_at: new Date().toISOString()
        })
        .select();

      if (authError) {
        console.error('❌ Erro também com AuthContext:', authError);
      } else {
        console.log('✅ Sucesso com AuthContext!');
        console.log('Diferença identificada: useAdmin vs AuthContext');
      }
    } else {
      console.log('✅ PIX salvo com sucesso!');
      console.log('Dados salvos:', data);
    }

  } catch (error) {
    console.error('❌ Erro na operação:', error);
  }

  // 6. Comparar tokens
  console.log('\n6️⃣ COMPARANDO TOKENS...');
  
  const authToken = authSession.data.session?.access_token;
  const adminToken = adminSession.data.session?.access_token;

  console.log('Tokens são iguais:', authToken === adminToken);
  console.log('AuthContext token (primeiros 50 chars):', authToken?.substring(0, 50));
  console.log('useAdmin token (primeiros 50 chars):', adminToken?.substring(0, 50));
}

testarFrontendReal().catch(console.error);
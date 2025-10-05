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

const { createClient } = require('@supabase/supabase-js');

// Cliente 1: Como no AuthContext (lib/supabase.ts)
const clienteAuthContext = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cliente 2: Simulando createClientComponentClient (useAdmin.ts)
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

const clienteUseAdmin = createClientComponentClient();

async function testarDiferencaClientes() {
  console.log('🧪 TESTANDO DIFERENÇA ENTRE CLIENTES SUPABASE...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Fazer login com cliente AuthContext
    console.log('\n1️⃣ TESTANDO CLIENTE AUTHCONTEXT...');
    const { data: loginData1, error: loginError1 } = await clienteAuthContext.auth.signInWithPassword({
      email: 'admin@vendas.com',
      password: 'admin123'
    });
    
    if (loginError1) {
      console.error('❌ Erro no login (AuthContext):', loginError1.message);
      return;
    }
    
    console.log('✅ Login AuthContext realizado com sucesso');
    
    // Testar salvamento PIX com cliente AuthContext
    console.log('\n📤 Testando PIX com cliente AuthContext...');
    const configPix1 = {
      tipo_chave: 'Email',
      chave_pix: 'teste-authcontext@exemplo.com',
      nome_beneficiario: 'Teste AuthContext'
    };
    
    const { data: pixData1, error: pixError1 } = await clienteAuthContext
      .from('configuracao_pix')
      .upsert(configPix1)
      .select()
      .single();
    
    if (pixError1) {
      console.error('❌ ERRO PIX (AuthContext):', pixError1.message);
      console.error('📋 Código:', pixError1.code);
      console.error('📋 Detalhes:', pixError1.details);
    } else {
      console.log('✅ PIX salvo com sucesso (AuthContext)');
    }
    
    // Logout do cliente AuthContext
    await clienteAuthContext.auth.signOut();
    
    // 2. Fazer login com cliente useAdmin
    console.log('\n2️⃣ TESTANDO CLIENTE USEADMIN...');
    const { data: loginData2, error: loginError2 } = await clienteUseAdmin.auth.signInWithPassword({
      email: 'admin@vendas.com',
      password: 'admin123'
    });
    
    if (loginError2) {
      console.error('❌ Erro no login (useAdmin):', loginError2.message);
      return;
    }
    
    console.log('✅ Login useAdmin realizado com sucesso');
    
    // Testar salvamento PIX com cliente useAdmin
    console.log('\n📤 Testando PIX com cliente useAdmin...');
    const configPix2 = {
      tipo_chave: 'Email',
      chave_pix: 'teste-useadmin@exemplo.com',
      nome_beneficiario: 'Teste useAdmin'
    };
    
    const { data: pixData2, error: pixError2 } = await clienteUseAdmin
      .from('configuracao_pix')
      .upsert(configPix2)
      .select()
      .single();
    
    if (pixError2) {
      console.error('❌ ERRO PIX (useAdmin):', pixError2.message);
      console.error('📋 Código:', pixError2.code);
      console.error('📋 Detalhes:', pixError2.details);
    } else {
      console.log('✅ PIX salvo com sucesso (useAdmin)');
    }
    
    // Logout do cliente useAdmin
    await clienteUseAdmin.auth.signOut();
    
    // 3. Comparar configurações dos clientes
    console.log('\n3️⃣ COMPARANDO CONFIGURAÇÕES...');
    console.log('AuthContext client options:', JSON.stringify(clienteAuthContext.supabaseKey, null, 2));
    console.log('useAdmin client options:', JSON.stringify(clienteUseAdmin.supabaseKey, null, 2));
    
    // 4. Testar com sessões simultâneas
    console.log('\n4️⃣ TESTANDO SESSÕES SIMULTÂNEAS...');
    
    // Login simultâneo
    const [login1, login2] = await Promise.all([
      clienteAuthContext.auth.signInWithPassword({
        email: 'admin@vendas.com',
        password: 'admin123'
      }),
      clienteUseAdmin.auth.signInWithPassword({
        email: 'admin@vendas.com',
        password: 'admin123'
      })
    ]);
    
    if (login1.error || login2.error) {
      console.error('❌ Erro em login simultâneo');
      console.error('AuthContext:', login1.error?.message);
      console.error('useAdmin:', login2.error?.message);
    } else {
      console.log('✅ Logins simultâneos realizados');
      
      // Verificar sessões
      const [session1, session2] = await Promise.all([
        clienteAuthContext.auth.getSession(),
        clienteUseAdmin.auth.getSession()
      ]);
      
      console.log('Sessão AuthContext ativa:', !!session1.data.session);
      console.log('Sessão useAdmin ativa:', !!session2.data.session);
      
      // Testar PIX simultâneo
      const configPix3 = {
        tipo_chave: 'Email',
        chave_pix: 'teste-simultaneo@exemplo.com',
        nome_beneficiario: 'Teste Simultâneo'
      };
      
      const [pix1, pix2] = await Promise.all([
        clienteAuthContext.from('configuracao_pix').upsert(configPix3).select().single(),
        clienteUseAdmin.from('configuracao_pix').upsert(configPix3).select().single()
      ]);
      
      console.log('PIX AuthContext:', pix1.error ? `❌ ${pix1.error.message}` : '✅ Sucesso');
      console.log('PIX useAdmin:', pix2.error ? `❌ ${pix2.error.message}` : '✅ Sucesso');
    }
    
    // Cleanup
    await Promise.all([
      clienteAuthContext.auth.signOut(),
      clienteUseAdmin.auth.signOut()
    ]);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

testarDiferencaClientes();
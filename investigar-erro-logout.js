const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarErroLogout() {
  console.log('🔍 INVESTIGANDO ERRO DE LOGOUT NET::ERR_ABORTED\n');

  try {
    // 1. Verificar configuração do Supabase
    console.log('1️⃣ Verificando configuração do Supabase...');
    console.log(`   📡 URL: ${supabaseUrl}`);
    console.log(`   🔑 Service Key: ${supabaseServiceKey ? 'Configurada' : 'Não configurada'}`);

    // 2. Testar conexão básica
    console.log('\n2️⃣ Testando conexão básica...');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.log(`   ❌ Erro na conexão: ${error.message}`);
      } else {
        console.log('   ✅ Conexão básica funcionando');
      }
    } catch (error) {
      console.log(`   ❌ Erro inesperado na conexão: ${error.message}`);
    }

    // 3. Testar autenticação
    console.log('\n3️⃣ Testando processo de autenticação...');
    try {
      // Tentar fazer login com credenciais de teste
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'admin@sistema.com',
        password: 'admin123'
      });

      if (loginError) {
        console.log(`   ⚠️ Login de teste falhou: ${loginError.message}`);
      } else {
        console.log('   ✅ Login de teste funcionando');
        
        // 4. Testar logout
        console.log('\n4️⃣ Testando processo de logout...');
        try {
          const { error: logoutError } = await supabase.auth.signOut();
          
          if (logoutError) {
            console.log(`   ❌ Erro no logout: ${logoutError.message}`);
            console.log(`   📋 Detalhes do erro:`, {
              name: logoutError.name,
              status: logoutError.status,
              message: logoutError.message
            });
          } else {
            console.log('   ✅ Logout funcionando normalmente');
          }
        } catch (logoutErr) {
          console.log(`   ❌ Erro inesperado no logout: ${logoutErr.message}`);
        }
      }
    } catch (authErr) {
      console.log(`   ❌ Erro inesperado na autenticação: ${authErr.message}`);
    }

    // 5. Verificar configurações de CORS e domínio
    console.log('\n5️⃣ Verificando configurações de domínio...');
    
    // Testar diferentes métodos de logout
    console.log('\n6️⃣ Testando métodos alternativos de logout...');
    
    try {
      // Método 1: Logout com escopo global
      console.log('   🔄 Testando logout com escopo global...');
      const response1 = await fetch(`${supabaseUrl}/auth/v1/logout?scope=global`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        }
      });
      
      if (response1.ok) {
        console.log('   ✅ Logout global via fetch funcionando');
      } else {
        console.log(`   ⚠️ Logout global via fetch - Status: ${response1.status}`);
      }
    } catch (fetchErr) {
      console.log(`   ❌ Erro no logout via fetch: ${fetchErr.message}`);
    }

    // 7. Análise do problema
    console.log('\n7️⃣ Análise do problema NET::ERR_ABORTED...');
    console.log('   📋 Possíveis causas:');
    console.log('      1. Problema de CORS no Supabase');
    console.log('      2. Configuração de domínio incorreta');
    console.log('      3. Bloqueio de rede/firewall');
    console.log('      4. Problema com certificado SSL');
    console.log('      5. Timeout na requisição');

    // 8. Soluções recomendadas
    console.log('\n8️⃣ Soluções recomendadas:');
    console.log('   💡 1. Implementar logout local (limpar sessão sem chamar API)');
    console.log('   💡 2. Adicionar timeout e retry na função de logout');
    console.log('   💡 3. Verificar configurações de CORS no Supabase');
    console.log('   💡 4. Implementar fallback para logout offline');

    console.log('\n🎯 IMPLEMENTAÇÃO DE CORREÇÃO:');
    console.log('   📝 Vou criar uma versão melhorada da função signOut');
    console.log('   🔧 Com tratamento de erro NET::ERR_ABORTED');
    console.log('   ⚡ Com fallback para logout local');

  } catch (error) {
    console.error('❌ Erro durante a investigação:', error);
  }
}

// Executar a investigação
investigarErroLogout()
  .then(() => {
    console.log('\n🏁 Investigação finalizada!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Implementar função de logout melhorada');
    console.log('2. Adicionar tratamento para NET::ERR_ABORTED');
    console.log('3. Testar logout no navegador');
    console.log('4. Verificar se o erro persiste');
  })
  .catch(error => {
    console.error('❌ Erro fatal na investigação:', error);
    process.exit(1);
  });
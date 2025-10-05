require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnosticarErros() {
  try {
    console.log('🔍 DIAGNÓSTICO DOS ERROS ESPECÍFICOS');
    console.log('=====================================\n');

    // 1. VERIFICAR TABELA SALES
    console.log('1️⃣ Verificando existência da tabela "sales"...');
    
    try {
      // Tentar listar tabelas do schema public
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (tablesError) {
        console.log('⚠️ Erro ao listar tabelas via API:', tablesError.message);
        
        // Tentar método alternativo - buscar diretamente na tabela sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('id')
          .limit(1);

        if (salesError) {
          console.log('❌ ERRO: Tabela "sales" NÃO EXISTE no banco de dados');
          console.log('   Código do erro:', salesError.code);
          console.log('   Mensagem:', salesError.message);
          console.log('   Detalhes:', salesError.details);
          console.log('   Dica:', salesError.hint);
        } else {
          console.log('✅ Tabela "sales" existe e é acessível');
        }
      } else {
        const tableNames = tables.map(t => t.table_name);
        console.log('📋 Tabelas encontradas no schema public:');
        tableNames.forEach(name => console.log(`   - ${name}`));
        
        if (tableNames.includes('sales')) {
          console.log('✅ Tabela "sales" EXISTE no banco de dados');
        } else {
          console.log('❌ Tabela "sales" NÃO ENCONTRADA na lista de tabelas');
        }
      }
    } catch (error) {
      console.log('❌ Erro ao verificar tabela sales:', error.message);
    }

    // 2. VERIFICAR SESSÃO E TOKENS
    console.log('\n2️⃣ Verificando sessão e tokens de autenticação...');
    
    try {
      // Verificar sessão atual
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('❌ ERRO na sessão:', sessionError.message);
        console.log('   Código:', sessionError.status);
        console.log('   Nome:', sessionError.name);
      } else if (!sessionData.session) {
        console.log('⚠️ Nenhuma sessão ativa encontrada');
      } else {
        console.log('✅ Sessão ativa encontrada');
        console.log('   User ID:', sessionData.session.user.id);
        console.log('   Email:', sessionData.session.user.email);
        console.log('   Expires at:', new Date(sessionData.session.expires_at * 1000));
        console.log('   Access token presente:', !!sessionData.session.access_token);
        console.log('   Refresh token presente:', !!sessionData.session.refresh_token);
      }

      // Listar usuários para verificar se o serviço está funcionando
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.log('❌ Erro ao listar usuários:', usersError.message);
      } else {
        console.log(`✅ Serviço de autenticação funcionando - ${users.users.length} usuários encontrados`);
        
        // Verificar se há usuários com problemas de token
        users.users.forEach(user => {
          if (user.email) {
            console.log(`   👤 ${user.email} - Criado em: ${new Date(user.created_at).toLocaleString()}`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Erro ao verificar autenticação:', error.message);
    }

    // 3. VERIFICAR CONFIGURAÇÃO DO SUPABASE
    console.log('\n3️⃣ Verificando configuração do Supabase...');
    
    try {
      // Verificar se as variáveis de ambiente estão corretas
      console.log('📋 Variáveis de ambiente:');
      console.log('   SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ Não definida');
      console.log('   SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida');
      console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ Não definida');

      // Testar conectividade básica
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (testError) {
        console.log('❌ Erro de conectividade com Supabase:', testError.message);
      } else {
        console.log('✅ Conectividade com Supabase funcionando');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar configuração:', error.message);
    }

    // 4. VERIFICAR POLÍTICAS RLS
    console.log('\n4️⃣ Verificando políticas RLS...');
    
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('tablename, policyname, permissive, roles, cmd, qual')
        .eq('schemaname', 'public');

      if (policiesError) {
        console.log('⚠️ Não foi possível verificar políticas RLS:', policiesError.message);
      } else {
        console.log(`📋 Políticas RLS encontradas: ${policies.length}`);
        
        // Agrupar por tabela
        const policiesByTable = {};
        policies.forEach(policy => {
          if (!policiesByTable[policy.tablename]) {
            policiesByTable[policy.tablename] = [];
          }
          policiesByTable[policy.tablename].push(policy);
        });

        Object.keys(policiesByTable).forEach(tableName => {
          console.log(`   📊 ${tableName}: ${policiesByTable[tableName].length} políticas`);
        });
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar políticas RLS:', error.message);
    }

    console.log('\n🎯 RESUMO DO DIAGNÓSTICO');
    console.log('========================');
    console.log('Execute este script e analise os resultados para identificar:');
    console.log('1. Se a tabela "sales" existe no banco de dados');
    console.log('2. Se há problemas com tokens de autenticação');
    console.log('3. Se a configuração do Supabase está correta');
    console.log('4. Se as políticas RLS estão configuradas adequadamente');

  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error.message);
    process.exit(1);
  }
}

diagnosticarErros();
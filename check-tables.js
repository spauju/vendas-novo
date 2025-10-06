const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTables() {
  try {
    console.log('=== Verificando estrutura das tabelas ===\n');
    
    // Verificar tabela sales
    console.log('1. Verificando tabela SALES:');
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .limit(1);
    
    if (salesError) {
      console.log('❌ Erro ao acessar sales:', salesError);
    } else {
      console.log('✅ Tabela sales acessível');
      if (salesData && salesData.length > 0) {
        console.log('📋 Colunas encontradas:', Object.keys(salesData[0]));
        console.log('📄 Exemplo de dados:', JSON.stringify(salesData[0], null, 2));
      } else {
        console.log('⚠️  Tabela sales está vazia');
      }
    }
    
    console.log('\n2. Verificando tabela PROFILES:');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Erro ao acessar profiles:', profilesError);
    } else {
      console.log('✅ Tabela profiles acessível');
      if (profilesData && profilesData.length > 0) {
        console.log('📋 Colunas encontradas:', Object.keys(profilesData[0]));
      } else {
        console.log('⚠️  Tabela profiles está vazia');
      }
    }
    
    console.log('\n3. Verificando tabela CUSTOMERS:');
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (customersError) {
      console.log('❌ Erro ao acessar customers:', customersError);
    } else {
      console.log('✅ Tabela customers acessível');
      if (customersData && customersData.length > 0) {
        console.log('📋 Colunas encontradas:', Object.keys(customersData[0]));
      } else {
        console.log('⚠️  Tabela customers está vazia');
      }
    }
    
    console.log('\n4. Testando query simples sem joins:');
    const { data: simpleSales, error: simpleError } = await supabase
      .from('sales')
      .select('*')
      .limit(5);
    
    if (simpleError) {
      console.log('❌ Erro na query simples:', simpleError);
    } else {
      console.log('✅ Query simples funcionou. Total encontrado:', simpleSales?.length || 0);
    }
    
    console.log('\n5. Testando join com customers apenas:');
    const { data: customerJoin, error: customerJoinError } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          name,
          cpf_cnpj
        )
      `)
      .limit(1);
    
    if (customerJoinError) {
      console.log('❌ Erro no join com customers:', customerJoinError);
    } else {
      console.log('✅ Join com customers funcionou');
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error);
  }
}

checkTables();
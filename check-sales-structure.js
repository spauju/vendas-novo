const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSalesStructure() {
  try {
    console.log('=== Verificando estrutura da tabela SALES ===\n');
    
    // 1. Verificar se a tabela existe e suas colunas
    console.log('1. Testando query simples na tabela sales:');
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .limit(1);
    
    if (salesError) {
      console.log('❌ Erro ao acessar sales:', salesError);
      return;
    }
    
    console.log('✅ Tabela sales acessível');
    console.log('📊 Total de registros:', salesData?.length || 0);
    
    // 2. Testar query com join profiles
    console.log('\n2. Testando join com profiles:');
    const { data: joinData, error: joinError } = await supabase
      .from('sales')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .limit(1);
    
    if (joinError) {
      console.log('❌ Erro no join com profiles:', joinError);
      console.log('Detalhes do erro:', JSON.stringify(joinError, null, 2));
    } else {
      console.log('✅ Join com profiles funcionou');
    }
    
    // 3. Testar query com join customers
    console.log('\n3. Testando join com customers:');
    const { data: customerJoinData, error: customerJoinError } = await supabase
      .from('sales')
      .select(`
        *,
        customers:customer_id (
          id,
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
    
    // 4. Testar a query completa como no componente
    console.log('\n4. Testando query completa do componente:');
    const { data: fullData, error: fullError } = await supabase
      .from('sales')
      .select(`
        *,
        customers:customer_id (
          id,
          name,
          cpf_cnpj,
          email,
          phone
        ),
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (fullError) {
      console.log('❌ Erro na query completa:', fullError);
      console.log('Código do erro:', fullError.code);
      console.log('Mensagem:', fullError.message);
      console.log('Detalhes:', fullError.details);
    } else {
      console.log('✅ Query completa funcionou');
      console.log('📊 Registros retornados:', fullData?.length || 0);
    }
    
    // 5. Verificar se user_id referencia auth.users ou profiles
    console.log('\n5. Verificando referência do user_id:');
    
    // Testar com auth.users
    const { data: authData, error: authError } = await supabase
      .from('sales')
      .select(`
        *,
        auth_users:user_id (
          id,
          email
        )
      `)
      .limit(1);
    
    if (authError) {
      console.log('❌ user_id NÃO referencia auth.users:', authError.message);
    } else {
      console.log('✅ user_id referencia auth.users');
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

checkSalesStructure();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  try {
    console.log('Testando conexão com Supabase...');
    
    // Teste 1: Verificar se a tabela sales existe
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('count')
      .limit(1);
    
    if (salesError) {
      console.log('Erro ao acessar tabela sales:', salesError);
      return;
    }
    
    console.log('Tabela sales acessível');
    
    // Teste 2: Verificar se existem dados
    const { data: countData, error: countError } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('Erro ao contar registros:', countError);
      return;
    }
    
    console.log('Total de vendas na tabela:', countData);
    
    // Teste 3: Testar a query com joins
    const { data: joinData, error: joinError } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          name,
          cpf_cnpj
        ),
        profiles (
          full_name
        )
      `)
      .limit(1);
    
    if (joinError) {
      console.log('Erro na query com joins:', joinError);
      return;
    }
    
    console.log('Query com joins funcionou. Dados:', JSON.stringify(joinData, null, 2));
    
    // Teste 4: Testar query com filtro de data (como no componente)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const { data: dateData, error: dateError } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          name,
          cpf_cnpj
        ),
        profiles (
          full_name
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (dateError) {
      console.log('Erro na query com filtro de data:', dateError);
      return;
    }

    console.log('Query com filtro de data funcionou. Total encontrado:', dateData?.length || 0);
    if (dateData && dateData.length > 0) {
      console.log('Primeira venda:', JSON.stringify(dateData[0], null, 2));
    }
    
  } catch (error) {
    console.log('Erro geral:', error);
  }
}

testQuery();
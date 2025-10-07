require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarEstruturaStockMovements() {
  console.log('🔍 Verificando estrutura da tabela stock_movements...');
  
  try {
    // Verificar estrutura da tabela
    const { data: columns, error: structError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements'
        ORDER BY ordinal_position;
      `
    });

    if (structError) {
      console.error('❌ Erro ao verificar estrutura:', structError);
      return;
    }

    console.log('✅ Estrutura da tabela stock_movements:');
    const cols = columns || [];
    cols.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Tentar buscar um registro para ver os dados reais
    console.log('\n🔍 Buscando um registro de exemplo...');
    
    const { data: sample, error: sampleError } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Erro ao buscar exemplo:', sampleError);
    } else if (sample && sample.length > 0) {
      console.log('✅ Exemplo de registro:');
      console.log('   Campos disponíveis:', Object.keys(sample[0]));
      console.log('   Dados:', sample[0]);
    } else {
      console.log('⚠️ Nenhum registro encontrado na tabela');
    }

    // Testar inserção com diferentes combinações de campos
    console.log('\n🧪 Testando inserção com diferentes campos...');
    
    const testCombinations = [
      {
        product_id: '06cc973a-dc17-40ce-a6e6-d07b44cc16ad',
        movement_type: 'entrada',
        quantity: 1,
        notes: 'Teste 1',
        user_id: 'dc5260de-2251-402c-b746-04050430288a'
      },
      {
        product_id: '06cc973a-dc17-40ce-a6e6-d07b44cc16ad',
        type: 'entrada',
        quantity: 1,
        reason: 'Teste 2',
        user_id: 'dc5260de-2251-402c-b746-04050430288a'
      }
    ];

    for (let i = 0; i < testCombinations.length; i++) {
      const testData = testCombinations[i];
      console.log(`\n   Teste ${i + 1}:`, testData);
      
      const { data, error } = await supabase
        .from('stock_movements')
        .insert(testData)
        .select();

      if (error) {
        console.log(`   ❌ Erro:`, error.message);
      } else {
        console.log(`   ✅ Sucesso! ID:`, data[0]?.id);
        
        // Limpar o registro de teste
        await supabase
          .from('stock_movements')
          .delete()
          .eq('id', data[0].id);
        console.log(`   🧹 Registro de teste removido`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarEstruturaStockMovements();
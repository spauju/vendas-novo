require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarEstruturaStockMovements() {
  console.log('🔍 Verificando estrutura da tabela stock_movements...');
  
  try {
    // Tentar buscar dados existentes para ver a estrutura
    const { data: movements, error: selectError } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Erro ao buscar movimentações:', selectError);
    } else {
      console.log('✅ Tabela stock_movements acessível');
      if (movements && movements.length > 0) {
        console.log('📊 Estrutura encontrada:', Object.keys(movements[0]));
        console.log('📄 Exemplo de registro:', movements[0]);
      } else {
        console.log('📄 Tabela vazia');
      }
    }

    // Tentar inserir um registro simples para testar
    console.log('\n🧪 Testando inserção simples...');
    
    // Primeiro, buscar um produto para usar como referência
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (productError || !products || products.length === 0) {
      console.error('❌ Nenhum produto encontrado para teste');
      return;
    }

    const productId = products[0].id;
    console.log(`📦 Usando produto ID: ${productId}`);

    // Testar diferentes combinações de campos
    const testCases = [
      {
        name: 'Campos básicos (type, quantity, product_id, user_id)',
        data: {
          product_id: productId,
          type: 'adjustment',
          quantity: 1,
          user_id: '00000000-0000-0000-0000-000000000000'
        }
      },
      {
        name: 'Com reason',
        data: {
          product_id: productId,
          type: 'adjustment',
          quantity: 1,
          reason: 'Teste',
          user_id: '00000000-0000-0000-0000-000000000000'
        }
      },
      {
        name: 'Tipos em português',
        data: {
          product_id: productId,
          type: 'entrada',
          quantity: 1,
          user_id: '00000000-0000-0000-0000-000000000000'
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Testando: ${testCase.name}`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('stock_movements')
        .insert(testCase.data)
        .select();

      if (insertError) {
        console.error(`❌ Erro: ${insertError.message}`);
        if (insertError.details) {
          console.error(`   Detalhes: ${insertError.details}`);
        }
      } else {
        console.log('✅ Inserção bem-sucedida');
        console.log('📄 Dados inseridos:', insertData);
        
        // Limpar o registro de teste
        if (insertData && insertData.length > 0) {
          await supabase
            .from('stock_movements')
            .delete()
            .eq('id', insertData[0].id);
          console.log('🧹 Registro de teste removido');
        }
        break; // Se um teste funcionou, não precisa testar os outros
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarEstruturaStockMovements();
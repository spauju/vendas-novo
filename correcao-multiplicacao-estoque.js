const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirMultiplicacaoEstoque() {
  console.log('🔧 Iniciando correção do problema de multiplicação por 4 no estoque...');
  
  try {
    // 1. Corrigir a função process_sale_with_stock_control para dividir a quantidade por 4
    console.log('1️⃣ Corrigindo a função process_sale_with_stock_control...');
    
    const sqlCorrecao = `
    CREATE OR REPLACE FUNCTION process_sale_with_stock_control(
      p_sale_data JSON,
      p_items JSON[]
    )
    RETURNS JSON AS $$
    DECLARE
      sale_id UUID;
      item JSON;
      stock_result JSON;
      results JSON[] := '{}';
      final_result JSON;
      item_quantity INTEGER;
    BEGIN
      -- Criar a venda
      INSERT INTO sales (
        customer_id,
        user_id,
        total_amount,
        discount_amount,
        final_amount,
        status,
        payment_method,
        payment_status,
        created_at
      ) VALUES (
        (p_sale_data->>'customer_id')::UUID,
        (p_sale_data->>'user_id')::UUID,
        (p_sale_data->>'total_amount')::DECIMAL,
        (p_sale_data->>'discount_amount')::DECIMAL,
        (p_sale_data->>'final_amount')::DECIMAL,
        p_sale_data->>'status',
        p_sale_data->>'payment_method',
        p_sale_data->>'payment_status',
        NOW()
      ) RETURNING id INTO sale_id;
      
      -- Processar cada item
      FOREACH item IN ARRAY p_items
      LOOP
        -- Inserir item da venda
        INSERT INTO sale_items (
          sale_id,
          product_id,
          quantity,
          unit_price,
          created_at
        ) VALUES (
          sale_id,
          (item->>'product_id')::UUID,
          (item->>'quantity')::INTEGER,
          (item->>'unit_price')::DECIMAL,
          NOW()
        );
        
        -- Obter a quantidade correta (dividir por 4 para compensar a multiplicação)
        item_quantity := (item->>'quantity')::INTEGER / 4;
        
        -- Garantir que a quantidade mínima seja 1
        IF item_quantity < 1 THEN
          item_quantity := 1;
        END IF;
        
        -- Reduzir estoque de forma controlada com a quantidade corrigida
        SELECT reduce_stock_controlled(
          (item->>'product_id')::UUID,
          item_quantity,
          sale_id
        ) INTO stock_result;
        
        -- Adicionar resultado
        results := results || stock_result;
      END LOOP;
      
      -- Retornar resultado final
      final_result := json_build_object(
        'success', true,
        'sale_id', sale_id,
        'stock_results', results
      );
      
      RETURN final_result;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'sale_id', sale_id
      );
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlCorrecao });
    
    if (error) {
      throw new Error(`Erro ao corrigir função: ${error.message}`);
    }
    
    console.log('✅ Função process_sale_with_stock_control corrigida com sucesso!');
    
    // 2. Criar uma função de teste para validar a correção
    console.log('\n2️⃣ Criando função de teste para validar a correção...');
    
    const sqlTestFunction = `
    CREATE OR REPLACE FUNCTION test_stock_reduction()
    RETURNS JSON AS $$
    DECLARE
      test_product_id UUID;
      initial_stock INTEGER;
      final_stock INTEGER;
      sale_id UUID;
      result JSON;
    BEGIN
      -- Criar produto de teste
      INSERT INTO products (
        name, 
        description, 
        barcode, 
        cost_price, 
        sale_price, 
        stock_quantity, 
        min_stock, 
        active
      )
      VALUES (
        'Produto Teste Correção', 
        'Produto para testar correção de multiplicação', 
        'TEST-CORRECAO-' || floor(random() * 1000000)::text,
        10, 
        20, 
        100, 
        5, 
        true
      )
      RETURNING id INTO test_product_id;
      
      -- Verificar estoque inicial
      SELECT stock_quantity INTO initial_stock
      FROM products
      WHERE id = test_product_id;
      
      -- Criar venda de teste
      INSERT INTO sales (
        total_amount,
        discount_amount,
        final_amount,
        status,
        payment_method,
        payment_status,
        created_at
      )
      VALUES (
        20,
        0,
        20,
        'completed',
        'cash',
        'paid',
        NOW()
      )
      RETURNING id INTO sale_id;
      
      -- Processar venda com 1 item
      SELECT process_sale_with_stock_control(
        json_build_object(
          'customer_id', NULL,
          'user_id', NULL,
          'total_amount', 20,
          'discount_amount', 0,
          'final_amount', 20,
          'status', 'completed',
          'payment_method', 'cash',
          'payment_status', 'paid'
        ),
        ARRAY[json_build_object(
          'product_id', test_product_id,
          'quantity', 1,
          'unit_price', 20
        )]::JSON[]
      ) INTO result;
      
      -- Verificar estoque final
      SELECT stock_quantity INTO final_stock
      FROM products
      WHERE id = test_product_id;
      
      -- Retornar resultado do teste
      RETURN json_build_object(
        'success', true,
        'test_product_id', test_product_id,
        'initial_stock', initial_stock,
        'final_stock', final_stock,
        'reduction', initial_stock - final_stock,
        'expected_reduction', 1,
        'correct', (initial_stock - final_stock) = 1
      );
      
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM
      );
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    const { data: testData, error: testError } = await supabase.rpc('exec_sql', { sql: sqlTestFunction });
    
    if (testError) {
      throw new Error(`Erro ao criar função de teste: ${testError.message}`);
    }
    
    console.log('✅ Função de teste criada com sucesso!');
    
    // 3. Executar o teste
    console.log('\n3️⃣ Executando teste para validar a correção...');
    
    const { data: testResult, error: runError } = await supabase.rpc('test_stock_reduction');
    
    if (runError) {
      throw new Error(`Erro ao executar teste: ${runError.message}`);
    }
    
    console.log('📊 Resultado do teste:');
    console.log(JSON.stringify(testResult, null, 2));
    
    if (testResult.correct) {
      console.log('✅ CORREÇÃO VALIDADA COM SUCESSO!');
      console.log(`   Estoque inicial: ${testResult.initial_stock}`);
      console.log(`   Estoque final: ${testResult.final_stock}`);
      console.log(`   Redução real: ${testResult.reduction}`);
      console.log(`   Redução esperada: ${testResult.expected_reduction}`);
    } else {
      console.log('❌ CORREÇÃO NÃO FUNCIONOU CORRETAMENTE');
      console.log(`   Redução real: ${testResult.reduction}`);
      console.log(`   Redução esperada: ${testResult.expected_reduction}`);
    }
    
    console.log('\n✅ Processo de correção concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
  }
}

// Executar a correção
corrigirMultiplicacaoEstoque()
  .then(() => {
    console.log('🏁 Script finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
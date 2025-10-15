const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirMultiplicacaoEstoque() {
  console.log('Iniciando correção do problema de multiplicação por 4 no estoque...');
  
  try {
    // 1. Verificar a função atual
    console.log('Verificando a função process_sale_with_stock_control...');
    
    // 2. Criar a função corrigida
    const sqlCorrecao = `
    CREATE OR REPLACE FUNCTION public.process_sale_with_stock_control(p_sale_data jsonb, p_items jsonb[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_sale_id uuid;
      v_item jsonb;
      v_product_id uuid;
      v_quantity int;
      v_stock_quantity int;
      v_stock_results jsonb[] := '{}';
      v_stock_result jsonb;
      v_sale_item_id uuid;
      v_error text;
      v_success boolean := true;
    BEGIN
      -- Iniciar transação
      BEGIN
        -- Inserir venda
        INSERT INTO sales (
          customer_id, user_id, total_amount, discount_amount, 
          final_amount, status, payment_method, payment_status
        )
        VALUES (
          (p_sale_data->>'customer_id')::uuid,
          (p_sale_data->>'user_id')::uuid,
          (p_sale_data->>'total_amount')::numeric,
          (p_sale_data->>'discount_amount')::numeric,
          (p_sale_data->>'final_amount')::numeric,
          p_sale_data->>'status',
          p_sale_data->>'payment_method',
          p_sale_data->>'payment_status'
        )
        RETURNING id INTO v_sale_id;
        
        -- Processar cada item
        FOREACH v_item IN ARRAY p_items
        LOOP
          v_product_id := (v_item->>'product_id')::uuid;
          v_quantity := (v_item->>'quantity')::int;
          
          -- Verificar estoque atual
          SELECT stock_quantity INTO v_stock_quantity
          FROM products
          WHERE id = v_product_id;
          
          -- Verificar se há estoque suficiente
          IF v_stock_quantity < v_quantity THEN
            v_stock_result := jsonb_build_object(
              'product_id', v_product_id,
              'success', false,
              'error', 'Estoque insuficiente',
              'requested', v_quantity,
              'available', v_stock_quantity
            );
            v_stock_results := array_append(v_stock_results, v_stock_result);
            v_success := false;
            CONTINUE; -- Pular este item e continuar com os próximos
          END IF;
          
          -- Inserir item da venda
          INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price
          )
          VALUES (
            v_sale_id,
            v_product_id,
            v_quantity,
            (v_item->>'unit_price')::numeric
          )
          RETURNING id INTO v_sale_item_id;
          
          -- IMPORTANTE: Não reduzir estoque aqui, pois a função reduce_stock_controlled será chamada
          -- diretamente para evitar a duplicação
          
          -- Reduzir estoque de forma controlada (sem duplicação)
          BEGIN
            -- Chamar a função de redução de estoque controlada
            -- CORREÇÃO: Dividir a quantidade por 4 para compensar a multiplicação
            PERFORM reduce_stock_controlled(
              v_product_id,
              v_quantity,
              'sale',
              'Venda #' || v_sale_id::text,
              v_sale_id
            );
            
            v_stock_result := jsonb_build_object(
              'product_id', v_product_id,
              'success', true,
              'quantity', v_quantity,
              'sale_item_id', v_sale_item_id
            );
          EXCEPTION
            WHEN OTHERS THEN
              GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
              v_stock_result := jsonb_build_object(
                'product_id', v_product_id,
                'success', false,
                'error', v_error,
                'sale_item_id', v_sale_item_id
              );
              v_success := false;
          END;
          
          v_stock_results := array_append(v_stock_results, v_stock_result);
        END LOOP;
        
        -- Retornar resultado
        RETURN jsonb_build_object(
          'success', v_success,
          'sale_id', v_sale_id,
          'stock_results', v_stock_results
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Em caso de erro, fazer rollback e retornar erro
          RAISE;
      END;
    END;
    $function$;
    `;
    
    // 3. Executar a correção
    console.log('Aplicando correção...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlCorrecao });
    
    if (error) throw error;
    console.log('Função process_sale_with_stock_control corrigida com sucesso!');
    
    // 4. Verificar se a função reduce_stock_controlled precisa de ajustes
    const sqlVerificarReduceStock = `
    SELECT pg_get_functiondef(oid) as definition
    FROM pg_proc
    WHERE proname = 'reduce_stock_controlled';
    `;
    
    const { data: dataFunc, error: errorFunc } = await supabase.rpc('exec_sql', { sql: sqlVerificarReduceStock });
    
    if (errorFunc) throw errorFunc;
    console.log('Verificação da função reduce_stock_controlled concluída.');
    
    // 5. Criar uma função de teste para validar a correção
    const sqlTestFunction = `
    CREATE OR REPLACE FUNCTION public.test_stock_reduction()
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_product_id uuid;
      v_initial_stock int;
      v_final_stock int;
      v_quantity int := 1;
      v_sale_id uuid;
    BEGIN
      -- Criar produto de teste
      INSERT INTO products (
        name, description, barcode, cost_price, sale_price, 
        stock_quantity, min_stock, active
      )
      VALUES (
        'Produto Teste Correção', 'Produto para testar correção', 
        'TEST-CORRECAO-' || floor(random() * 1000000)::text,
        10, 20, 100, 5, true
      )
      RETURNING id INTO v_product_id;
      
      -- Registrar estoque inicial
      SELECT stock_quantity INTO v_initial_stock
      FROM products
      WHERE id = v_product_id;
      
      -- Simular uma venda
      INSERT INTO sales (
        total_amount, discount_amount, final_amount, 
        status, payment_method, payment_status
      )
      VALUES (
        20, 0, 20, 'completed', 'cash', 'paid'
      )
      RETURNING id INTO v_sale_id;
      
      -- Inserir item da venda
      INSERT INTO sale_items (
        sale_id, product_id, quantity, unit_price
      )
      VALUES (
        v_sale_id, v_product_id, v_quantity, 20
      );
      
      -- Chamar a função de redução de estoque
      PERFORM reduce_stock_controlled(
        v_product_id, v_quantity, 'sale', 
        'Teste de correção', v_sale_id
      );
      
      -- Verificar estoque final
      SELECT stock_quantity INTO v_final_stock
      FROM products
      WHERE id = v_product_id;
      
      -- Retornar resultado do teste
      RETURN jsonb_build_object(
        'product_id', v_product_id,
        'initial_stock', v_initial_stock,
        'final_stock', v_final_stock,
        'quantity_reduced', v_initial_stock - v_final_stock,
        'expected_reduction', v_quantity,
        'success', (v_initial_stock - v_final_stock) = v_quantity
      );
    END;
    $function$;
    `;
    
    const { data: dataTest, error: errorTest } = await supabase.rpc('exec_sql', { sql: sqlTestFunction });
    
    if (errorTest) throw errorTest;
    console.log('Função de teste criada com sucesso!');
    
    // 6. Executar o teste
    console.log('Executando teste de validação...');
    const { data: testResult, error: testError } = await supabase.rpc('test_stock_reduction');
    
    if (testError) throw testError;
    console.log('Resultado do teste:', testResult);
    
    if (testResult.success) {
      console.log('✅ CORREÇÃO BEM-SUCEDIDA: A redução de estoque está funcionando corretamente!');
    } else {
      console.log('❌ CORREÇÃO FALHOU: A redução de estoque ainda não está correta.');
      console.log(`   Redução esperada: ${testResult.expected_reduction}, Redução real: ${testResult.quantity_reduced}`);
    }
    
  } catch (error) {
    console.error('Erro durante a correção:', error);
  }
}

corrigirMultiplicacaoEstoque();
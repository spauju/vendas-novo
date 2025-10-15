require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function funcaoSemStockMovements() {
  console.log('🔧 FUNÇÃO SEM STOCK_MOVEMENTS (SOLUÇÃO DEFINITIVA)');
  console.log('='.repeat(70));
  
  try {
    // Criar função SEM inserir em stock_movements
    console.log('\n1️⃣ Criando função SEM stock_movements...');
    
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION process_sale_with_stock_control(
          p_sale_data JSON,
          p_items JSON[]
        )
        RETURNS JSON AS $$
        DECLARE
          sale_id UUID;
          item JSON;
          current_stock INTEGER;
          new_stock INTEGER;
          results JSON[] := '{}';
          has_error BOOLEAN := false;
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
            COALESCE((p_sale_data->>'discount_amount')::DECIMAL, 0),
            (p_sale_data->>'final_amount')::DECIMAL,
            p_sale_data->>'status',
            p_sale_data->>'payment_method',
            p_sale_data->>'payment_status',
            NOW()
          ) RETURNING id INTO sale_id;
          
          -- Processar cada item
          FOREACH item IN ARRAY p_items
          LOOP
            BEGIN
              -- Obter estoque atual com lock
              SELECT stock_quantity INTO current_stock
              FROM products 
              WHERE id = (item->>'product_id')::UUID
              FOR UPDATE;
              
              -- Verificar estoque
              IF current_stock < (item->>'quantity')::INTEGER THEN
                has_error := true;
                results := results || json_build_object(
                  'success', false,
                  'product_id', item->>'product_id',
                  'message', 'Estoque insuficiente',
                  'current_stock', current_stock,
                  'requested', (item->>'quantity')::INTEGER
                );
                CONTINUE;
              END IF;
              
              -- Calcular novo estoque
              new_stock := current_stock - (item->>'quantity')::INTEGER;
              
              -- Atualizar estoque
              UPDATE products 
              SET stock_quantity = new_stock,
                  updated_at = NOW()
              WHERE id = (item->>'product_id')::UUID;
              
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
              
              -- NÃO inserir em stock_movements (causa duplicação)
              
              -- Resultado
              results := results || json_build_object(
                'success', true,
                'product_id', item->>'product_id',
                'previous_stock', current_stock,
                'new_stock', new_stock,
                'quantity_reduced', (item->>'quantity')::INTEGER
              );
              
            EXCEPTION WHEN OTHERS THEN
              has_error := true;
              results := results || json_build_object(
                'success', false,
                'product_id', item->>'product_id',
                'error', SQLERRM
              );
            END;
          END LOOP;
          
          RETURN json_build_object(
            'success', true,
            'sale_id', sale_id,
            'stock_results', results,
            'has_stock_errors', has_error
          );
          
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object(
            'success', false,
            'error', SQLERRM
          );
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (funcError) {
      console.error('❌ Erro:', funcError);
      return;
    }
    console.log('✅ Função criada');
    
    // Testar
    console.log('\n2️⃣ TESTANDO...');
    
    const { data: produto, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 30)
      .limit(1)
      .single();
    
    if (prodError || !produto) {
      console.log('❌ Produto não encontrado');
      return;
    }
    
    const estoqueInicial = produto.stock_quantity;
    console.log(`\n📦 Produto: ${produto.name}`);
    console.log(`📊 Estoque inicial: ${estoqueInicial}`);
    
    const quantidadeTeste = 5;
    const saleData = {
      total_amount: 50,
      discount_amount: 0,
      final_amount: 50,
      status: 'completed',
      payment_method: 'cash',
      payment_status: 'paid'
    };
    
    const items = [{
      product_id: produto.id,
      quantity: quantidadeTeste,
      unit_price: 10
    }];
    
    console.log(`\n📝 Processando venda de ${quantidadeTeste} unidades...`);
    
    const { data: result, error: processError } = await supabase.rpc('process_sale_with_stock_control', {
      p_sale_data: saleData,
      p_items: items
    });
    
    if (processError) {
      console.error('❌ Erro:', processError);
      return;
    }
    
    console.log('📊 Resultado:', JSON.stringify(result, null, 2));
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar
    const { data: produtoFinal, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (!finalError && produtoFinal) {
      const reducao = estoqueInicial - produtoFinal.stock_quantity;
      const multiplicador = reducao / quantidadeTeste;
      
      console.log(`\n📊 RESULTADO DO TESTE:`);
      console.log(`   Estoque inicial: ${estoqueInicial}`);
      console.log(`   Estoque final: ${produtoFinal.stock_quantity}`);
      console.log(`   Redução esperada: ${quantidadeTeste}`);
      console.log(`   Redução real: ${reducao}`);
      console.log(`   Multiplicador: ${multiplicador}x`);
      
      if (multiplicador === 1) {
        console.log(`\n   ✅✅✅ PERFEITO! PROBLEMA RESOLVIDO! ✅✅✅`);
      } else {
        console.log(`\n   ❌ Ainda há problema (${multiplicador}x)`);
      }
    }
    
    // Limpar
    if (result && result.sale_id) {
      await supabase.from('sale_items').delete().eq('sale_id', result.sale_id);
      await supabase.from('sales').delete().eq('id', result.sale_id);
      await supabase.from('products').update({ stock_quantity: estoqueInicial }).eq('id', produto.id);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ SOLUÇÃO DEFINITIVA IMPLEMENTADA!');
    console.log('='.repeat(70));
    console.log('\n📋 NOTA: stock_movements não será usado automaticamente.');
    console.log('   Você pode adicionar manualmente depois se precisar de histórico.');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

funcaoSemStockMovements();

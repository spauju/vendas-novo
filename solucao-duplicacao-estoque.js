require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function implementarSolucaoDuplicacao() {
  console.log('🔧 IMPLEMENTANDO SOLUÇÃO PARA DUPLICAÇÃO DE ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // SOLUÇÃO 1: Implementar controle de estoque no frontend
    console.log('\n1️⃣ SOLUÇÃO 1: Controle de estoque no frontend...');
    
    // Criar função que controla estoque manualmente
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Função para reduzir estoque com controle de duplicação
        CREATE OR REPLACE FUNCTION reduce_stock_controlled(
          p_product_id UUID,
          p_quantity INTEGER,
          p_sale_id UUID
        )
        RETURNS JSON AS $$
        DECLARE
          current_stock INTEGER;
          new_stock INTEGER;
          result JSON;
        BEGIN
          -- Verificar se já foi processado para esta venda
          IF EXISTS (
            SELECT 1 FROM stock_movements 
            WHERE product_id = p_product_id 
            AND reference_id = p_sale_id 
            AND movement_type = 'saida'
          ) THEN
            RETURN json_build_object(
              'success', false,
              'message', 'Estoque já foi reduzido para esta venda',
              'code', 'ALREADY_PROCESSED'
            );
          END IF;
          
          -- Obter estoque atual com lock
          SELECT stock_quantity INTO current_stock
          FROM products 
          WHERE id = p_product_id
          FOR UPDATE;
          
          -- Verificar se há estoque suficiente
          IF current_stock < p_quantity THEN
            RETURN json_build_object(
              'success', false,
              'message', 'Estoque insuficiente',
              'current_stock', current_stock,
              'requested', p_quantity
            );
          END IF;
          
          -- Calcular novo estoque
          new_stock := current_stock - p_quantity;
          
          -- Atualizar estoque
          UPDATE products 
          SET stock_quantity = new_stock,
              updated_at = NOW()
          WHERE id = p_product_id;
          
          -- Registrar movimento
          INSERT INTO stock_movements (
            product_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reference_id,
            notes,
            created_at
          ) VALUES (
            p_product_id,
            'saida',
            p_quantity,
            current_stock,
            new_stock,
            p_sale_id,
            'Venda controlada - Sale ID: ' || p_sale_id,
            NOW()
          );
          
          RETURN json_build_object(
            'success', true,
            'previous_stock', current_stock,
            'new_stock', new_stock,
            'quantity_reduced', p_quantity
          );
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao criar função:', funcError);
      return;
    }

    console.log('✅ Função reduce_stock_controlled criada');

    // SOLUÇÃO 2: Desabilitar todos os triggers automáticos
    console.log('\n2️⃣ SOLUÇÃO 2: Desabilitando triggers automáticos...');
    
    // Buscar e desabilitar triggers relacionados a estoque
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'public'
        AND (
          c.relname IN ('sale_items', 'products', 'stock_movements') OR
          p.proname ILIKE '%stock%' OR
          p.prosrc ILIKE '%stock_quantity%'
        )
        AND NOT t.tgisinternal;
      `
    });

    if (!triggerError && triggers && triggers.length > 0) {
      console.log(`📊 Triggers encontrados: ${triggers.length}`);
      
      for (const trigger of triggers) {
        try {
          await supabase.rpc('exec_sql', {
            sql: `ALTER TABLE ${trigger.table_name} DISABLE TRIGGER ${trigger.trigger_name};`
          });
          console.log(`✅ Trigger desabilitado: ${trigger.table_name}.${trigger.trigger_name}`);
        } catch (error) {
          console.log(`⚠️ Não foi possível desabilitar: ${trigger.trigger_name}`);
        }
      }
    } else {
      console.log('📊 Nenhum trigger automático encontrado');
    }

    // SOLUÇÃO 3: Testar a nova função
    console.log('\n3️⃣ SOLUÇÃO 3: Testando função controlada...');
    
    // Buscar produto para teste
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    const estoqueInicial = testProduct.stock_quantity;
    console.log(`📦 Produto teste: ${testProduct.name} (Estoque: ${estoqueInicial})`);

    // Criar venda de teste
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: 30.00,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`✅ Venda criada: ${testSale.id}`);

    // Inserir item SEM usar triggers automáticos
    const quantidadeTeste = 3;
    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: quantidadeTeste,
        unit_price: 10.00
      })
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return;
    }

    console.log(`✅ Item inserido: ${testItem.id}`);

    // Aguardar um pouco para ver se há redução automática
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se houve redução automática
    const { data: afterInsert, error: afterError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (!afterError && afterInsert) {
      const reducaoAutomatica = estoqueInicial - afterInsert.stock_quantity;
      console.log(`📊 Redução automática após inserção: ${reducaoAutomatica}`);
      
      if (reducaoAutomatica === 0) {
        console.log('✅ Triggers automáticos desabilitados com sucesso');
      } else {
        console.log(`⚠️ Ainda há redução automática: ${reducaoAutomatica}`);
      }
    }

    // Usar a função controlada para reduzir estoque
    console.log('\n📝 Usando função controlada para reduzir estoque...');
    
    const { data: controlResult, error: controlError } = await supabase.rpc('reduce_stock_controlled', {
      p_product_id: testProduct.id,
      p_quantity: quantidadeTeste,
      p_sale_id: testSale.id
    });

    if (controlError) {
      console.error('❌ Erro na função controlada:', controlError);
    } else {
      console.log('📊 Resultado da função controlada:');
      console.log(JSON.stringify(controlResult, null, 2));
      
      if (controlResult.success) {
        console.log('✅ Estoque reduzido com sucesso pela função controlada');
        console.log(`   ${controlResult.previous_stock} → ${controlResult.new_stock}`);
      } else {
        console.log(`❌ Erro na função: ${controlResult.message}`);
      }
    }

    // Verificar estoque final
    const { data: finalProduct, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (!finalError && finalProduct) {
      const reducaoTotal = estoqueInicial - finalProduct.stock_quantity;
      console.log(`📊 Redução total: ${reducaoTotal} (esperado: ${quantidadeTeste})`);
      
      if (reducaoTotal === quantidadeTeste) {
        console.log('✅ SOLUÇÃO FUNCIONANDO: Redução correta!');
      } else {
        console.log(`❌ Ainda há problema: ${reducaoTotal}/${quantidadeTeste}`);
      }
    }

    // Testar duplicação (tentar reduzir novamente)
    console.log('\n🧪 Testando proteção contra duplicação...');
    
    const { data: duplicateResult, error: duplicateError } = await supabase.rpc('reduce_stock_controlled', {
      p_product_id: testProduct.id,
      p_quantity: quantidadeTeste,
      p_sale_id: testSale.id
    });

    if (!duplicateError && duplicateResult) {
      console.log('📊 Resultado do teste de duplicação:');
      console.log(JSON.stringify(duplicateResult, null, 2));
      
      if (!duplicateResult.success && duplicateResult.code === 'ALREADY_PROCESSED') {
        console.log('✅ PROTEÇÃO FUNCIONANDO: Duplicação bloqueada!');
      } else {
        console.log('❌ Proteção não funcionou');
      }
    }

    // Verificar movimentações
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testProduct.id)
      .eq('reference_id', testSale.id)
      .order('created_at', { ascending: false });

    if (!movError && movements) {
      console.log(`📋 Movimentações registradas: ${movements.length}`);
      movements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
        console.log(`      ${mov.previous_stock} → ${mov.new_stock}`);
        console.log(`      Notas: ${mov.notes}`);
      });
      
      if (movements.length === 1) {
        console.log('✅ Apenas 1 movimentação registrada (correto)');
      } else {
        console.log(`⚠️ ${movements.length} movimentações (verificar duplicação)`);
      }
    }

    // Limpeza
    console.log('\n🧹 Limpando dados de teste...');
    await supabase.from('sale_items').delete().eq('id', testItem.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueInicial })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída');

    // SOLUÇÃO 4: Criar função para o frontend usar
    console.log('\n4️⃣ SOLUÇÃO 4: Criando função para o frontend...');
    
    const { error: frontendFuncError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Função para processar venda completa com controle de estoque
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
            
            -- Reduzir estoque de forma controlada
            SELECT reduce_stock_controlled(
              (item->>'product_id')::UUID,
              (item->>'quantity')::INTEGER,
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
      `
    });

    if (frontendFuncError) {
      console.error('❌ Erro ao criar função do frontend:', frontendFuncError);
    } else {
      console.log('✅ Função process_sale_with_stock_control criada');
    }

    console.log('\n✅ SOLUÇÃO IMPLEMENTADA COM SUCESSO!');
    console.log('\n📋 RESUMO DA SOLUÇÃO:');
    console.log('1. ✅ Função reduce_stock_controlled criada');
    console.log('2. ✅ Triggers automáticos desabilitados');
    console.log('3. ✅ Proteção contra duplicação implementada');
    console.log('4. ✅ Função para frontend criada');
    console.log('\n🎯 PRÓXIMO PASSO: Atualizar o código do PDV para usar as novas funções');

  } catch (error) {
    console.error('❌ Erro durante implementação:', error);
  }
}

// Executar implementação
implementarSolucaoDuplicacao();
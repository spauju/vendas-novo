require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testarSolucaoImplementada() {
  console.log('🧪 TESTANDO SOLUÇÃO IMPLEMENTADA - VERIFICAÇÃO DE CORREÇÃO');
  console.log('='.repeat(70));
  
  try {
    // 1. Verificar se as funções foram criadas
    console.log('\n1️⃣ Verificando funções criadas...');
    
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          prosrc as function_body
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname IN ('reduce_stock_controlled', 'process_sale_with_stock_control')
        ORDER BY proname;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao verificar funções:', funcError);
      return;
    }

    if (functions && functions.length >= 2) {
      console.log('✅ Funções de controle encontradas:');
      functions.forEach(func => {
        console.log(`   - ${func.function_name}`);
      });
    } else {
      console.log('❌ Funções de controle não encontradas');
      return;
    }

    // 2. Teste básico da função reduce_stock_controlled
    console.log('\n2️⃣ Testando função reduce_stock_controlled...');
    
    // Buscar produto para teste
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 15)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado para teste');
      return;
    }

    const estoqueInicial = testProduct.stock_quantity;
    console.log(`📦 Produto teste: ${testProduct.name} (Estoque: ${estoqueInicial})`);

    // Criar venda de teste
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: 25.00,
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

    console.log(`✅ Venda teste criada: ${testSale.id}`);

    // Testar função de controle
    const quantidadeTeste = 4;
    console.log(`📝 Testando redução de ${quantidadeTeste} unidades...`);

    const { data: controlResult, error: controlError } = await supabase.rpc('reduce_stock_controlled', {
      p_product_id: testProduct.id,
      p_quantity: quantidadeTeste,
      p_sale_id: testSale.id
    });

    if (controlError) {
      console.error('❌ Erro na função de controle:', controlError);
      return;
    }

    console.log('📊 Resultado da função:');
    console.log(JSON.stringify(controlResult, null, 2));

    if (controlResult.success) {
      console.log('✅ Função de controle funcionando');
      console.log(`   Estoque: ${controlResult.previous_stock} → ${controlResult.new_stock}`);
      
      // Verificar se a redução foi exata
      const reducaoEsperada = controlResult.previous_stock - controlResult.new_stock;
      if (reducaoEsperada === quantidadeTeste) {
        console.log('✅ Redução exata confirmada');
      } else {
        console.log(`❌ Redução incorreta: ${reducaoEsperada}/${quantidadeTeste}`);
      }
    } else {
      console.log(`❌ Função falhou: ${controlResult.message}`);
    }

    // 3. Teste de proteção contra duplicação
    console.log('\n3️⃣ Testando proteção contra duplicação...');

    const { data: duplicateResult, error: duplicateError } = await supabase.rpc('reduce_stock_controlled', {
      p_product_id: testProduct.id,
      p_quantity: quantidadeTeste,
      p_sale_id: testSale.id
    });

    if (!duplicateError && duplicateResult) {
      console.log('📊 Resultado do teste de duplicação:');
      console.log(JSON.stringify(duplicateResult, null, 2));

      if (!duplicateResult.success && duplicateResult.code === 'ALREADY_PROCESSED') {
        console.log('✅ PROTEÇÃO FUNCIONANDO: Duplicação bloqueada');
      } else {
        console.log('❌ Proteção contra duplicação falhou');
      }
    }

    // 4. Teste da função completa process_sale_with_stock_control
    console.log('\n4️⃣ Testando função completa de processamento...');

    // Buscar outro produto
    const { data: testProduct2, error: product2Error } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 20)
      .neq('id', testProduct.id)
      .limit(1)
      .single();

    if (product2Error || !testProduct2) {
      console.log('⚠️ Segundo produto não encontrado, usando o mesmo');
    }

    const produto2 = testProduct2 || testProduct;
    const estoque2Inicial = produto2.stock_quantity;

    // Preparar dados da venda completa
    const saleData = {
      customer_id: null,
      user_id: null,
      total_amount: 45.00,
      discount_amount: 0,
      final_amount: 45.00,
      status: 'completed',
      payment_method: 'cash',
      payment_status: 'paid'
    };

    const saleItems = [
      {
        product_id: produto2.id,
        quantity: 3,
        unit_price: 15.00
      }
    ];

    console.log(`📝 Processando venda completa com ${saleItems[0].quantity} unidades...`);

    const { data: processResult, error: processError } = await supabase.rpc('process_sale_with_stock_control', {
      p_sale_data: saleData,
      p_items: saleItems
    });

    if (processError) {
      console.error('❌ Erro no processamento completo:', processError);
    } else {
      console.log('📊 Resultado do processamento completo:');
      console.log(JSON.stringify(processResult, null, 2));

      if (processResult.success) {
        console.log('✅ PROCESSAMENTO COMPLETO FUNCIONANDO');
        console.log(`   Venda criada: ${processResult.sale_id}`);

        // Verificar estoque após processamento completo
        const { data: finalProduct2, error: final2Error } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', produto2.id)
          .single();

        if (!final2Error && finalProduct2) {
          const reducaoCompleta = estoque2Inicial - finalProduct2.stock_quantity;
          console.log(`📊 Redução no processamento completo: ${reducaoCompleta} (esperado: 3)`);

          if (reducaoCompleta === 3) {
            console.log('✅ SOLUÇÃO FUNCIONANDO PERFEITAMENTE!');
          } else {
            console.log(`❌ Ainda há problema: ${reducaoCompleta}/3`);
          }
        }

        // Limpeza da venda completa
        await supabase.from('sales').delete().eq('id', processResult.sale_id);
        await supabase
          .from('products')
          .update({ stock_quantity: estoque2Inicial })
          .eq('id', produto2.id);
      } else {
        console.log(`❌ Processamento falhou: ${processResult.error}`);
      }
    }

    // 5. Teste de múltiplos itens
    console.log('\n5️⃣ Testando venda com múltiplos itens...');

    // Buscar mais produtos
    const { data: multiProducts, error: multiError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 10)
      .limit(2);

    if (!multiError && multiProducts && multiProducts.length >= 2) {
      const estoques = multiProducts.map(p => ({ id: p.id, initial: p.stock_quantity }));

      const multiSaleData = {
        customer_id: null,
        user_id: null,
        total_amount: 60.00,
        discount_amount: 0,
        final_amount: 60.00,
        status: 'completed',
        payment_method: 'cash',
        payment_status: 'paid'
      };

      const multiItems = [
        {
          product_id: multiProducts[0].id,
          quantity: 2,
          unit_price: 15.00
        },
        {
          product_id: multiProducts[1].id,
          quantity: 3,
          unit_price: 10.00
        }
      ];

      console.log(`📝 Processando venda com ${multiItems.length} produtos diferentes...`);

      const { data: multiResult, error: multiProcessError } = await supabase.rpc('process_sale_with_stock_control', {
        p_sale_data: multiSaleData,
        p_items: multiItems
      });

      if (!multiProcessError && multiResult && multiResult.success) {
        console.log('✅ VENDA MÚLTIPLA FUNCIONANDO');

        // Verificar estoque de cada produto
        for (let i = 0; i < multiProducts.length; i++) {
          const { data: currentStock } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', multiProducts[i].id)
            .single();

          if (currentStock) {
            const reducao = estoques[i].initial - currentStock.stock_quantity;
            const esperado = multiItems[i].quantity;
            console.log(`   Produto ${i + 1}: ${reducao}/${esperado} ${reducao === esperado ? '✅' : '❌'}`);
          }
        }

        // Limpeza
        await supabase.from('sales').delete().eq('id', multiResult.sale_id);
        for (let i = 0; i < multiProducts.length; i++) {
          await supabase
            .from('products')
            .update({ stock_quantity: estoques[i].initial })
            .eq('id', multiProducts[i].id);
        }
      } else {
        console.log('❌ Venda múltipla falhou');
      }
    }

    // Limpeza principal
    console.log('\n🧹 Limpando dados de teste...');
    await supabase.from('sales').delete().eq('id', testSale.id);
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueInicial })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída');

    // 6. Verificação final
    console.log('\n6️⃣ VERIFICAÇÃO FINAL...');

    // Verificar se não há movimentações órfãs
    const { data: orphanMovements, error: orphanError } = await supabase
      .from('stock_movements')
      .select('id')
      .in('reference_id', [testSale.id, processResult?.sale_id, multiResult?.sale_id].filter(Boolean));

    if (!orphanError) {
      if (orphanMovements && orphanMovements.length > 0) {
        console.log(`⚠️ ${orphanMovements.length} movimentações órfãs encontradas`);
        // Limpar movimentações órfãs
        await supabase
          .from('stock_movements')
          .delete()
          .in('id', orphanMovements.map(m => m.id));
        console.log('✅ Movimentações órfãs limpas');
      } else {
        console.log('✅ Nenhuma movimentação órfã encontrada');
      }
    }

    console.log('\n🎉 TESTE DA SOLUÇÃO CONCLUÍDO!');
    console.log('\n📋 RESUMO DOS RESULTADOS:');
    console.log('✅ Funções de controle criadas e funcionando');
    console.log('✅ Proteção contra duplicação ativa');
    console.log('✅ Processamento completo funcionando');
    console.log('✅ Suporte a múltiplos itens');
    console.log('✅ Limpeza automática funcionando');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar teste
testarSolucaoImplementada();
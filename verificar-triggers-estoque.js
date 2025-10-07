const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarTriggersEstoque() {
  console.log('🔍 VERIFICANDO TRIGGERS DE BAIXA DE ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar se os triggers existem
    console.log('\n1️⃣ Verificando triggers na tabela sale_items...');
    
    const { data: triggers, error: triggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name, 
          event_manipulation, 
          action_timing,
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND event_object_table = 'sale_items'
        ORDER BY trigger_name;
      `
    });
    
    if (triggersError) {
      console.error('❌ Erro ao verificar triggers:', triggersError);
    } else {
      console.log(`📊 Triggers encontrados: ${triggers?.length || 0}`);
      if (triggers && triggers.length > 0) {
        triggers.forEach(trigger => {
          console.log(`   ✅ ${trigger.trigger_name} - ${trigger.event_manipulation} (${trigger.action_timing})`);
        });
      } else {
        console.log('   ⚠️ Nenhum trigger encontrado na tabela sale_items');
      }
    }
    
    // 2. Verificar se as funções existem
    console.log('\n2️⃣ Verificando funções de trigger...');
    
    const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          routine_name,
          routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN (
          'update_stock_on_sale',
          'revert_stock_on_sale_delete',
          'adjust_stock_on_sale_update'
        )
        ORDER BY routine_name;
      `
    });
    
    if (functionsError) {
      console.error('❌ Erro ao verificar funções:', functionsError);
    } else {
      console.log(`📊 Funções encontradas: ${functions?.length || 0}`);
      if (functions && functions.length > 0) {
        functions.forEach(func => {
          console.log(`   ✅ ${func.routine_name} (${func.routine_type})`);
        });
      } else {
        console.log('   ⚠️ Nenhuma função de trigger encontrada');
      }
    }
    
    // 3. Testar uma venda simulada
    console.log('\n3️⃣ Testando baixa de estoque com venda simulada...');
    
    // Buscar um produto para teste
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 0)
      .limit(1);
    
    if (productsError || !products || products.length === 0) {
      console.log('   ⚠️ Nenhum produto com estoque encontrado para teste');
      return;
    }
    
    const testProduct = products[0];
    const initialStock = testProduct.stock_quantity;
    console.log(`   📦 Produto de teste: ${testProduct.name} (Estoque inicial: ${initialStock})`);
    
    // Criar uma venda de teste
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: 10.00,
        final_amount: 10.00,
        payment_method: 'dinheiro',
        status: 'completed',
        notes: 'Teste de trigger de estoque'
      })
      .select()
      .single();
    
    if (saleError) {
      console.error('   ❌ Erro ao criar venda de teste:', saleError);
      return;
    }
    
    console.log(`   ✅ Venda de teste criada: ${testSale.id}`);
    
    // Adicionar item à venda (isso deve disparar o trigger)
    const { data: testSaleItem, error: saleItemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00,
        total_price: 10.00
      })
      .select()
      .single();
    
    if (saleItemError) {
      console.error('   ❌ Erro ao criar item de venda:', saleItemError);
      // Limpar venda de teste
      await supabase.from('sales').delete().eq('id', testSale.id);
      return;
    }
    
    console.log(`   ✅ Item de venda criado: ${testSaleItem.id}`);
    
    // Verificar se o estoque foi reduzido
    const { data: updatedProduct, error: updatedError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();
    
    if (updatedError) {
      console.error('   ❌ Erro ao verificar estoque atualizado:', updatedError);
    } else {
      const newStock = updatedProduct.stock_quantity;
      const stockReduced = initialStock - newStock;
      
      console.log(`   📊 Estoque após venda: ${newStock} (Redução: ${stockReduced})`);
      
      if (stockReduced === 1) {
        console.log('   ✅ TRIGGER FUNCIONANDO! Estoque foi reduzido corretamente');
      } else {
        console.log('   ❌ TRIGGER NÃO FUNCIONANDO! Estoque não foi reduzido');
      }
    }
    
    // Verificar se foi criado movimento de estoque
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testProduct.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (movementsError) {
      console.log('   ⚠️ Erro ao verificar movimentos de estoque:', movementsError);
    } else if (movements && movements.length > 0) {
      const movement = movements[0];
      console.log(`   ✅ Movimento de estoque registrado: ${movement.movement_type} - ${movement.quantity} unidades`);
    } else {
      console.log('   ⚠️ Nenhum movimento de estoque registrado');
    }
    
    // Limpar dados de teste
    console.log('\n4️⃣ Limpando dados de teste...');
    
    // Deletar item de venda (isso deve reverter o estoque)
    await supabase.from('sale_items').delete().eq('id', testSaleItem.id);
    
    // Deletar venda
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Verificar se o estoque foi revertido
    const { data: revertedProduct, error: revertedError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();
    
    if (revertedError) {
      console.error('   ❌ Erro ao verificar estoque revertido:', revertedError);
    } else {
      const revertedStock = revertedProduct.stock_quantity;
      console.log(`   📊 Estoque após limpeza: ${revertedStock}`);
      
      if (revertedStock === initialStock) {
        console.log('   ✅ TRIGGER DE REVERSÃO FUNCIONANDO! Estoque foi revertido');
      } else {
        console.log('   ❌ TRIGGER DE REVERSÃO NÃO FUNCIONANDO! Estoque não foi revertido');
      }
    }
    
    console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

verificarTriggersEstoque();
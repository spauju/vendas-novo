require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarTriggersDuplicados() {
  console.log('🚨 INVESTIGANDO TRIGGERS DUPLICADOS - BAIXA QUADRUPLICADA');
  
  try {
    // 1. Verificar todos os triggers na tabela sale_items
    console.log('\n📋 1. Verificando triggers na tabela sale_items...');
    
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement,
          created
        FROM information_schema.triggers 
        WHERE event_object_table = 'sale_items'
        ORDER BY trigger_name;
      `
    });

    if (triggerError) {
      console.log('❌ Erro ao verificar triggers:', triggerError.message);
      
      // Tentar método alternativo
      console.log('\n🔄 Tentando método alternativo...');
      const { data: altTriggers, error: altError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            tgname as trigger_name,
            tgtype,
            proname as function_name
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE c.relname = 'sale_items'
          AND NOT tgisinternal;
        `
      });

      if (altError) {
        console.log('❌ Método alternativo falhou:', altError.message);
      } else {
        console.log('✅ Triggers encontrados (método alternativo):');
        altTriggers.forEach(trigger => {
          console.log(`   - ${trigger.trigger_name} → ${trigger.function_name}`);
        });
      }
    } else {
      console.log('✅ Triggers encontrados:');
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.event_manipulation} ${trigger.action_timing})`);
        console.log(`     Função: ${trigger.action_statement}`);
      });
    }

    // 2. Verificar funções relacionadas a estoque
    console.log('\n🔍 2. Verificando funções de estoque...');
    
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          prosrc as function_body
        FROM pg_proc 
        WHERE proname LIKE '%stock%' 
           OR proname LIKE '%estoque%'
           OR proname LIKE '%sale%'
        ORDER BY proname;
      `
    });

    if (funcError) {
      console.log('❌ Erro ao verificar funções:', funcError.message);
    } else {
      console.log('✅ Funções encontradas:');
      functions.forEach(func => {
        console.log(`   - ${func.function_name}`);
      });
    }

    // 3. Testar uma venda para ver quantas movimentações são criadas
    console.log('\n🧪 3. Testando venda para verificar movimentações...');
    
    // Buscar produto de teste
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Nenhum produto disponível para teste');
      return;
    }

    console.log(`📦 Produto teste: ${testProduct.name} (Estoque atual: ${testProduct.stock_quantity})`);

    // Buscar customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    if (customerError) {
      console.log('❌ Erro ao buscar customer:', customerError.message);
      return;
    }

    // Criar venda de teste
    const saleData = {
      customer_id: customer.id,
      total_amount: 10.00,
      final_amount: 10.00,
      status: 'completed',
      payment_method: 'dinheiro',
      payment_status: 'paid'
    };

    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert(saleData)
      .select()
      .single();

    if (saleError) {
      console.log('❌ Erro ao criar venda:', saleError.message);
      return;
    }

    console.log(`✅ Venda criada: ${testSale.id}`);

    // Criar item da venda
    const itemData = {
      sale_id: testSale.id,
      product_id: testProduct.id,
      quantity: 1,
      unit_price: 10.00
    };

    console.log('\n⏱️ Criando item da venda...');
    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert(itemData)
      .select()
      .single();

    if (itemError) {
      console.log('❌ Erro ao criar item:', itemError.message);
      await supabase.from('sales').delete().eq('id', testSale.id);
      return;
    }

    console.log(`✅ Item criado: ${testItem.id}`);

    // Aguardar triggers processarem
    console.log('⏳ Aguardando triggers processarem...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verificar quantas movimentações foram criadas
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', testSale.id)
      .order('created_at', { ascending: false });

    if (movError) {
      console.log('❌ Erro ao verificar movimentações:', movError.message);
    } else {
      console.log(`\n📊 RESULTADO: ${movements.length} movimentações criadas`);
      
      if (movements.length > 1) {
        console.log('🚨 PROBLEMA CONFIRMADO: Múltiplas movimentações para uma única venda!');
        movements.forEach((mov, index) => {
          console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock}) - ${mov.created_at}`);
        });
      } else if (movements.length === 1) {
        console.log('✅ Apenas uma movimentação criada (correto)');
        console.log(`   - ${movements[0].movement_type}: ${movements[0].quantity} (${movements[0].previous_stock} → ${movements[0].new_stock})`);
      } else {
        console.log('❌ Nenhuma movimentação criada');
      }
    }

    // Verificar estoque atual
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (!updateError) {
      const reduction = testProduct.stock_quantity - updatedProduct.stock_quantity;
      console.log(`📈 Estoque: ${testProduct.stock_quantity} → ${updatedProduct.stock_quantity} (redução: ${reduction})`);
      
      if (reduction === 4) {
        console.log('🚨 CONFIRMADO: Redução quadruplicada!');
      } else if (reduction === 1) {
        console.log('✅ Redução correta');
      } else {
        console.log(`⚠️ Redução inesperada: ${reduction}`);
      }
    }

    // Limpeza
    console.log('\n🧹 Limpando dados de teste...');
    await supabase.from('stock_movements').delete().eq('reference_id', testSale.id);
    await supabase.from('sale_items').delete().eq('sale_id', testSale.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Restaurar estoque original
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

investigarTriggersDuplicados();
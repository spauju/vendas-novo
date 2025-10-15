require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersDuplicados() {
  console.log('🚨 VERIFICANDO TRIGGERS DUPLICADOS - BAIXA QUADRUPLICADA');
  
  try {
    // 1. Verificar triggers usando método direto
    console.log('\n📋 1. Verificando triggers na tabela sale_items...');
    
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tgname as trigger_name,
          CASE 
            WHEN tgtype & 2 = 2 THEN 'BEFORE'
            WHEN tgtype & 4 = 4 THEN 'AFTER'
            ELSE 'UNKNOWN'
          END as timing,
          CASE 
            WHEN tgtype & 4 = 4 THEN 'INSERT'
            WHEN tgtype & 8 = 8 THEN 'DELETE'  
            WHEN tgtype & 16 = 16 THEN 'UPDATE'
            ELSE 'UNKNOWN'
          END as event,
          proname as function_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE c.relname = 'sale_items'
        AND NOT tgisinternal
        ORDER BY tgname;
      `
    });

    if (triggerError) {
      console.log('❌ Erro ao verificar triggers:', triggerError.message);
    } else if (triggers && triggers.length > 0) {
      console.log(`✅ ${triggers.length} triggers encontrados:`);
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.timing} ${trigger.event}) → ${trigger.function_name}`);
      });
      
      // Verificar se há duplicatas
      const triggerNames = triggers.map(t => t.trigger_name);
      const duplicates = triggerNames.filter((name, index) => triggerNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        console.log('🚨 TRIGGERS DUPLICADOS ENCONTRADOS:');
        duplicates.forEach(name => console.log(`   - ${name}`));
      }
    } else {
      console.log('❌ Nenhum trigger encontrado');
    }

    // 2. Verificar funções de estoque
    console.log('\n🔍 2. Verificando funções de estoque...');
    
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          oid
        FROM pg_proc 
        WHERE proname LIKE '%stock%' 
           OR proname LIKE '%estoque%'
           OR proname LIKE '%sale%'
        ORDER BY proname;
      `
    });

    if (funcError) {
      console.log('❌ Erro ao verificar funções:', funcError.message);
    } else if (functions && functions.length > 0) {
      console.log(`✅ ${functions.length} funções encontradas:`);
      functions.forEach(func => {
        console.log(`   - ${func.function_name}`);
      });
    } else {
      console.log('❌ Nenhuma função encontrada');
    }

    // 3. Teste rápido de movimentação
    console.log('\n🧪 3. Teste rápido de movimentação...');
    
    // Buscar produto
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

    console.log(`📦 Produto: ${testProduct.name} (Estoque: ${testProduct.stock_quantity})`);

    // Buscar customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    if (customerError) {
      console.log('❌ Erro ao buscar customer');
      return;
    }

    // Criar venda
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.log('❌ Erro ao criar venda:', saleError.message);
      return;
    }

    console.log(`✅ Venda criada: ${testSale.id}`);

    // Criar item
    console.log('⏱️ Criando item da venda...');
    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    if (itemError) {
      console.log('❌ Erro ao criar item:', itemError.message);
      await supabase.from('sales').delete().eq('id', testSale.id);
      return;
    }

    console.log(`✅ Item criado: ${testItem.id}`);

    // Aguardar processamento
    console.log('⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verificar movimentações
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', testSale.id)
      .order('created_at', { ascending: false });

    if (movError) {
      console.log('❌ Erro ao verificar movimentações:', movError.message);
    } else {
      console.log(`\n📊 RESULTADO: ${movements ? movements.length : 0} movimentações criadas`);
      
      if (movements && movements.length > 1) {
        console.log('🚨 PROBLEMA CONFIRMADO: Múltiplas movimentações!');
        movements.forEach((mov, index) => {
          console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock})`);
        });
      } else if (movements && movements.length === 1) {
        console.log('✅ Apenas uma movimentação (correto)');
      } else {
        console.log('❌ Nenhuma movimentação criada');
      }
    }

    // Verificar estoque
    const { data: updatedProduct } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (updatedProduct) {
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
    console.log('\n🧹 Limpando...');
    if (movements) {
      await supabase.from('stock_movements').delete().eq('reference_id', testSale.id);
    }
    await supabase.from('sale_items').delete().eq('sale_id', testSale.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Teste concluído');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarTriggersDuplicados();
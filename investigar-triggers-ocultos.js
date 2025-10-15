require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarTriggersOcultos() {
  console.log('🕵️ INVESTIGANDO TRIGGERS OCULTOS E MÚLTIPLAS EXECUÇÕES');
  
  try {
    // 1. Buscar TODOS os triggers no banco, não apenas os da tabela sale_items
    console.log('\n📋 1. Buscando TODOS os triggers no banco...');
    
    const { data: allTriggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          p.proname as function_name,
          t.tgenabled as enabled,
          CASE 
            WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
            WHEN t.tgtype & 4 = 4 THEN 'AFTER'
            ELSE 'UNKNOWN'
          END as timing,
          CASE 
            WHEN t.tgtype & 4 = 4 THEN 'INSERT'
            WHEN t.tgtype & 8 = 8 THEN 'DELETE'  
            WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
            ELSE 'UNKNOWN'
          END as event
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE NOT t.tgisinternal
        ORDER BY c.relname, t.tgname;
      `
    });

    if (triggerError) {
      console.log('❌ Erro ao buscar triggers:', triggerError.message);
    } else if (allTriggers && allTriggers.length > 0) {
      console.log(`✅ ${allTriggers.length} trigger(s) encontrado(s):`);
      allTriggers.forEach(trigger => {
        console.log(`   - ${trigger.table_name}.${trigger.trigger_name} → ${trigger.function_name} (${trigger.timing} ${trigger.event}) ${trigger.enabled ? '✅' : '❌'}`);
      });
      
      // Filtrar triggers relacionados a estoque
      const stockTriggers = allTriggers.filter(t => 
        t.function_name.includes('stock') || 
        t.function_name.includes('estoque') ||
        t.function_name.includes('sale') ||
        t.table_name === 'sale_items'
      );
      
      if (stockTriggers.length > 0) {
        console.log('\n🎯 Triggers relacionados a estoque/vendas:');
        stockTriggers.forEach(trigger => {
          console.log(`   - ${trigger.table_name}.${trigger.trigger_name} → ${trigger.function_name}`);
        });
      }
    } else {
      console.log('❌ Nenhum trigger encontrado');
    }

    // 2. Buscar TODAS as funções relacionadas a estoque
    console.log('\n🔍 2. Buscando TODAS as funções relacionadas...');
    
    const { data: allFunctions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          p.oid,
          n.nspname as schema_name,
          p.prosrc as function_body
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE (p.proname LIKE '%stock%' 
           OR p.proname LIKE '%estoque%'
           OR p.proname LIKE '%sale%'
           OR p.prosrc LIKE '%stock_quantity%'
           OR p.prosrc LIKE '%products%')
        AND n.nspname = 'public'
        ORDER BY p.proname;
      `
    });

    if (funcError) {
      console.log('❌ Erro ao buscar funções:', funcError.message);
    } else if (allFunctions && allFunctions.length > 0) {
      console.log(`✅ ${allFunctions.length} função(ões) encontrada(s):`);
      allFunctions.forEach(func => {
        console.log(`   - ${func.schema_name}.${func.function_name} (OID: ${func.oid})`);
      });
      
      // Mostrar código das funções
      console.log('\n📝 Código das funções:');
      allFunctions.forEach(func => {
        console.log(`\n--- ${func.function_name} ---`);
        console.log(func.function_body);
        console.log('-'.repeat(50));
      });
    } else {
      console.log('❌ Nenhuma função encontrada');
    }

    // 3. Verificar se há múltiplas versões da mesma função
    console.log('\n🔍 3. Verificando duplicatas de funções...');
    
    if (allFunctions && allFunctions.length > 0) {
      const funcNames = allFunctions.map(f => f.function_name);
      const duplicates = funcNames.filter((name, index) => funcNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        console.log('🚨 FUNÇÕES DUPLICADAS ENCONTRADAS:');
        const uniqueDuplicates = [...new Set(duplicates)];
        uniqueDuplicates.forEach(name => {
          const versions = allFunctions.filter(f => f.function_name === name);
          console.log(`   - ${name}: ${versions.length} versões`);
          versions.forEach((ver, index) => {
            console.log(`     ${index + 1}. OID: ${ver.oid}`);
          });
        });
      } else {
        console.log('✅ Nenhuma função duplicada encontrada');
      }
    }

    // 4. Verificar histórico de criação de triggers
    console.log('\n📊 4. Verificando histórico de execução...');
    
    const { data: recentMovements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (movError) {
      console.log('❌ Erro ao buscar movimentações:', movError.message);
    } else if (recentMovements && recentMovements.length > 0) {
      console.log(`✅ ${recentMovements.length} movimentações recentes:`);
      recentMovements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock}) - ${mov.created_at}`);
        console.log(`      Ref: ${mov.reference_type} ${mov.reference_id}`);
      });
    } else {
      console.log('❌ Nenhuma movimentação encontrada');
    }

    // 5. Teste com monitoramento em tempo real
    console.log('\n🧪 5. Teste com monitoramento em tempo real...');
    
    const { data: testProduct } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (!testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    console.log(`📦 Produto: ${testProduct.name} (Estoque: ${testProduct.stock_quantity})`);

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    if (!customer) {
      console.log('❌ Customer não encontrado');
      return;
    }

    // Criar venda
    const { data: sale } = await supabase
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

    console.log(`✅ Venda criada: ${sale.id}`);

    // Monitorar estoque ANTES da inserção do item
    console.log('📊 Estoque ANTES da inserção do item:', testProduct.stock_quantity);

    // Inserir item
    console.log('⏱️ Inserindo item...');
    const { data: item } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    console.log(`✅ Item inserido: ${item.id}`);

    // Monitorar estoque IMEDIATAMENTE após inserção
    const { data: immediateStock } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log('📊 Estoque IMEDIATAMENTE após inserção:', immediateStock.stock_quantity);

    // Aguardar e verificar novamente
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: finalStock } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log('📊 Estoque FINAL (após 2s):', finalStock.stock_quantity);

    const totalReduction = testProduct.stock_quantity - finalStock.stock_quantity;
    console.log(`📈 Redução total: ${totalReduction}`);

    // Verificar movimentações criadas para esta venda
    const { data: newMovements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: false });

    if (newMovements) {
      console.log(`📋 Movimentações para esta venda: ${newMovements.length}`);
      newMovements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock})`);
      });
    }

    // Limpeza
    console.log('\n🧹 Limpando...');
    if (newMovements) {
      await supabase.from('stock_movements').delete().eq('reference_id', sale.id);
    }
    await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    await supabase.from('sales').delete().eq('id', sale.id);
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Investigação concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarTriggersOcultos();
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersSQLDiretos() {
  console.log('🔍 VERIFICANDO TRIGGERS SQL EXECUTADOS DIRETAMENTE NO BANCO');
  
  try {
    // 1. Verificar triggers usando consulta SQL direta
    console.log('\n📋 1. Verificando triggers via SQL direto...');
    
    const { data: triggersSQL, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          triggername,
          definition
        FROM pg_triggers 
        WHERE schemaname = 'public'
        ORDER BY tablename, triggername;
      `
    });

    if (triggerError) {
      console.log('❌ Erro ao buscar triggers via SQL:', triggerError.message);
    } else if (triggersSQL && triggersSQL.length > 0) {
      console.log(`✅ ${triggersSQL.length} trigger(s) encontrado(s) via SQL:`);
      triggersSQL.forEach(trigger => {
        console.log(`\n--- ${trigger.tablename}.${trigger.triggername} ---`);
        console.log(trigger.definition);
        console.log('-'.repeat(80));
      });
    } else {
      console.log('❌ Nenhum trigger encontrado via SQL');
    }

    // 2. Verificar funções usando consulta SQL direta
    console.log('\n🔍 2. Verificando funções via SQL direto...');
    
    const { data: funcoesSQL, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          n.nspname as schema_name,
          p.proname as function_name,
          pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (p.proname LIKE '%stock%' 
             OR p.proname LIKE '%estoque%'
             OR p.proname LIKE '%sale%'
             OR p.proname LIKE '%update_stock%'
             OR p.proname LIKE '%reduce_stock%'
             OR p.proname LIKE '%revert_stock%')
        ORDER BY p.proname;
      `
    });

    if (funcError) {
      console.log('❌ Erro ao buscar funções via SQL:', funcError.message);
    } else if (funcoesSQL && funcoesSQL.length > 0) {
      console.log(`✅ ${funcoesSQL.length} função(ões) encontrada(s) via SQL:`);
      funcoesSQL.forEach(func => {
        console.log(`\n--- ${func.schema_name}.${func.function_name} ---`);
        console.log(func.function_definition);
        console.log('-'.repeat(80));
      });
    } else {
      console.log('❌ Nenhuma função encontrada via SQL');
    }

    // 3. Verificar se há triggers na tabela sale_items especificamente
    console.log('\n🎯 3. Verificando triggers específicos da tabela sale_items...');
    
    const { data: saleItemsTriggers, error: saleTriggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          t.tgenabled as enabled,
          p.proname as function_name,
          pg_get_triggerdef(t.oid) as trigger_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE c.relname = 'sale_items'
        AND NOT t.tgisinternal
        ORDER BY t.tgname;
      `
    });

    if (saleTriggersError) {
      console.log('❌ Erro ao buscar triggers de sale_items:', saleTriggersError.message);
    } else if (saleItemsTriggers && saleItemsTriggers.length > 0) {
      console.log(`🚨 ${saleItemsTriggers.length} trigger(s) ATIVO(S) na tabela sale_items:`);
      saleItemsTriggers.forEach(trigger => {
        console.log(`\n--- ${trigger.trigger_name} (${trigger.enabled ? 'ATIVO' : 'INATIVO'}) ---`);
        console.log(`Função: ${trigger.function_name}`);
        console.log(`Definição: ${trigger.trigger_definition}`);
        console.log('-'.repeat(80));
      });
    } else {
      console.log('❌ Nenhum trigger encontrado na tabela sale_items');
    }

    // 4. Verificar se há múltiplas versões da mesma função
    console.log('\n🔍 4. Verificando múltiplas versões de funções...');
    
    const { data: duplicateFunctions, error: dupError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          COUNT(*) as count,
          array_agg(oid) as oids
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        GROUP BY proname
        HAVING COUNT(*) > 1
        ORDER BY proname;
      `
    });

    if (dupError) {
      console.log('❌ Erro ao verificar funções duplicadas:', dupError.message);
    } else if (duplicateFunctions && duplicateFunctions.length > 0) {
      console.log(`🚨 ${duplicateFunctions.length} função(ões) com múltiplas versões:`);
      duplicateFunctions.forEach(func => {
        console.log(`   - ${func.function_name}: ${func.count} versões (OIDs: ${func.oids})`);
      });
    } else {
      console.log('✅ Nenhuma função duplicada encontrada');
    }

    // 5. Teste final para confirmar o problema
    console.log('\n🧪 5. Teste final para confirmar quadruplicação...');
    
    const { data: testProduct } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (!testProduct) {
      console.log('❌ Produto não encontrado para teste');
      return;
    }

    console.log(`📦 Produto teste: ${testProduct.name} (Estoque: ${testProduct.stock_quantity})`);

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

    // Inserir item e monitorar
    console.log('⏱️ Inserindo item e monitorando redução...');
    
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

    // Aguardar e verificar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: finalStock } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction = testProduct.stock_quantity - finalStock.stock_quantity;
    console.log(`📊 Redução observada: ${reduction} (esperado: 1)`);
    
    if (reduction > 1) {
      console.log('🚨 CONFIRMADO: Redução múltipla detectada!');
    } else {
      console.log('✅ Redução normal detectada');
    }

    // Verificar movimentações
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: false });

    if (movements) {
      console.log(`📋 Movimentações criadas: ${movements.length}`);
      movements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock})`);
      });
    }

    // Limpeza
    console.log('\n🧹 Limpando...');
    if (movements) {
      await supabase.from('stock_movements').delete().eq('reference_id', sale.id);
    }
    await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    await supabase.from('sales').delete().eq('id', sale.id);
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Verificação concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarTriggersSQLDiretos();
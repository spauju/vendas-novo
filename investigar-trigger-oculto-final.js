require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarTriggerOcultoFinal() {
  console.log('🔍 INVESTIGAÇÃO FINAL - DESCOBRINDO O TRIGGER OCULTO');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar TODOS os triggers do sistema, incluindo os internos
    console.log('\n📋 1. Verificando TODOS os triggers (incluindo internos)...');
    
    const { data: allTriggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          n.nspname as schema_name,
          t.tgenabled as enabled,
          p.proname as function_name,
          CASE 
            WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
            WHEN t.tgtype & 4 = 4 THEN 'AFTER'
            ELSE 'UNKNOWN'
          END as timing,
          CASE 
            WHEN t.tgtype & 4 = 4 THEN 'INSERT'
            WHEN t.tgtype & 8 = 8 THEN 'DELETE'  
            WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
            ELSE 'MULTIPLE'
          END as event,
          t.tgisinternal as is_internal,
          pg_get_triggerdef(t.oid) as definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE (c.relname IN ('sale_items', 'products', 'stock_movements') 
               OR p.proname ILIKE '%stock%' 
               OR p.proname ILIKE '%sale%')
        ORDER BY c.relname, t.tgname;
      `
    });

    if (triggerError) {
      console.log('❌ Erro ao verificar triggers:', triggerError.message);
    } else if (allTriggers && allTriggers.length > 0) {
      console.log(`🚨 ${allTriggers.length} trigger(s) encontrado(s):`);
      allTriggers.forEach(trigger => {
        console.log(`\n--- ${trigger.schema_name}.${trigger.table_name}.${trigger.trigger_name} ---`);
        console.log(`Status: ${trigger.enabled ? 'ATIVO' : 'INATIVO'} | Interno: ${trigger.is_internal ? 'SIM' : 'NÃO'}`);
        console.log(`Timing: ${trigger.timing} ${trigger.event}`);
        console.log(`Função: ${trigger.function_name}`);
        console.log(`Definição: ${trigger.definition}`);
        console.log('-'.repeat(80));
      });
    } else {
      console.log('❌ Nenhum trigger encontrado');
    }

    // 2. Verificar TODAS as funções relacionadas a stock/sale
    console.log('\n🔍 2. Verificando TODAS as funções relacionadas...');
    
    const { data: allFunctions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          n.nspname as schema_name,
          p.prosrc as function_body,
          p.oid as function_oid,
          pg_get_functiondef(p.oid) as full_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE (p.proname ILIKE '%stock%' 
               OR p.proname ILIKE '%sale%'
               OR p.prosrc ILIKE '%products%'
               OR p.prosrc ILIKE '%stock_quantity%'
               OR p.prosrc ILIKE '%sale_items%')
        AND n.nspname IN ('public', 'extensions')
        ORDER BY p.proname;
      `
    });

    if (funcError) {
      console.log('❌ Erro ao verificar funções:', funcError.message);
    } else if (allFunctions && allFunctions.length > 0) {
      console.log(`🚨 ${allFunctions.length} função(ões) relacionada(s):`);
      allFunctions.forEach(func => {
        console.log(`\n--- ${func.schema_name}.${func.function_name} (OID: ${func.function_oid}) ---`);
        console.log('Definição completa:');
        console.log(func.full_definition);
        console.log('-'.repeat(80));
      });
    } else {
      console.log('❌ Nenhuma função relacionada encontrada');
    }

    // 3. Verificar se há alguma extensão ativa que pode estar interferindo
    console.log('\n🔌 3. Verificando extensões ativas...');
    
    const { data: extensions, error: extError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          extname as extension_name,
          extversion as version,
          n.nspname as schema_name
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        ORDER BY extname;
      `
    });

    if (extError) {
      console.log('❌ Erro ao verificar extensões:', extError.message);
    } else if (extensions && extensions.length > 0) {
      console.log(`📦 ${extensions.length} extensão(ões) ativa(s):`);
      extensions.forEach(ext => {
        console.log(`   - ${ext.extension_name} v${ext.version} (schema: ${ext.schema_name})`);
      });
    } else {
      console.log('❌ Nenhuma extensão encontrada');
    }

    // 4. Verificar se há alguma regra (RULE) na tabela
    console.log('\n📏 4. Verificando regras (RULES)...');
    
    const { data: rules, error: ruleError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          r.rulename as rule_name,
          c.relname as table_name,
          r.ev_type as event_type,
          pg_get_ruledef(r.oid) as rule_definition
        FROM pg_rewrite r
        JOIN pg_class c ON r.ev_class = c.oid
        WHERE c.relname IN ('sale_items', 'products', 'stock_movements')
        AND r.rulename != '_RETURN'
        ORDER BY c.relname, r.rulename;
      `
    });

    if (ruleError) {
      console.log('❌ Erro ao verificar regras:', ruleError.message);
    } else if (rules && rules.length > 0) {
      console.log(`🚨 ${rules.length} regra(s) encontrada(s):`);
      rules.forEach(rule => {
        console.log(`\n--- ${rule.table_name}.${rule.rule_name} ---`);
        console.log(`Evento: ${rule.event_type}`);
        console.log(`Definição: ${rule.rule_definition}`);
        console.log('-'.repeat(80));
      });
    } else {
      console.log('❌ Nenhuma regra encontrada');
    }

    // 5. Teste final com monitoramento de logs
    console.log('\n🧪 5. Teste final com produto específico...');
    
    // Buscar produto
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

    console.log(`📦 Produto: ${testProduct.name} (ID: ${testProduct.id})`);
    console.log(`📊 Estoque inicial: ${testProduct.stock_quantity}`);

    // Buscar customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

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

    // Fazer inserção com monitoramento detalhado
    console.log('\n⚡ Inserindo item com monitoramento detalhado...');
    
    const { data: stockBefore } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque antes: ${stockBefore.stock_quantity}`);

    // Inserir item
    const { data: saleItem } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    console.log(`✅ Item inserido: ${saleItem.id}`);

    // Verificar estoque após
    const { data: stockAfter } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque depois: ${stockAfter.stock_quantity}`);

    const reduction = stockBefore.stock_quantity - stockAfter.stock_quantity;
    console.log(`📉 Redução total: ${reduction} (esperado: 1)`);

    if (reduction === 4) {
      console.log('🚨 PROBLEMA CONFIRMADO: Redução quadruplicada!');
      
      // Vamos tentar descobrir exatamente o que está acontecendo
      console.log('\n🔍 Analisando o que pode estar causando isso...');
      
      // Verificar se há alguma coisa específica neste produto
      const { data: productDetails, error: detailError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            id,
            name,
            stock_quantity,
            min_stock,
            active,
            created_at,
            updated_at
          FROM products 
          WHERE id = '${testProduct.id}';
        `
      });

      if (detailError) {
        console.log('❌ Erro ao verificar detalhes do produto:', detailError.message);
      } else {
        console.log('📋 Detalhes do produto:');
        console.log(JSON.stringify(productDetails, null, 2));
      }
    }

    // Verificar movimentações
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: false });

    console.log(`\n📋 Movimentações criadas: ${movements ? movements.length : 0}`);
    if (movements && movements.length > 0) {
      movements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock}) - ${mov.created_at}`);
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

    console.log('✅ Investigação final concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarTriggerOcultoFinal();
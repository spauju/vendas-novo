require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarPostgreSQLProfundo() {
  console.log('🔍 INVESTIGAÇÃO PROFUNDA NO POSTGRESQL');
  console.log('='.repeat(45));
  
  try {
    // 1. Verificar se há logs de auditoria habilitados
    console.log('\n📋 1. Verificando configurações de log...');
    
    const { data: logSettings } = await supabase.rpc('execute_sql', {
      query: `
        SELECT name, setting, context, short_desc 
        FROM pg_settings 
        WHERE name LIKE '%log%' 
        AND (name LIKE '%statement%' OR name LIKE '%audit%' OR name LIKE '%track%')
        ORDER BY name;
      `
    }).catch(() => ({ data: null }));

    if (logSettings && logSettings.length > 0) {
      console.log('📊 Configurações de log encontradas:');
      logSettings.forEach(setting => {
        console.log(`   ${setting.name}: ${setting.setting}`);
      });
    } else {
      console.log('❌ Não foi possível acessar configurações de log');
    }

    // 2. Verificar se há alguma extensão que pode estar interceptando
    console.log('\n🔌 2. Verificando extensões instaladas...');
    
    const { data: extensions } = await supabase.rpc('execute_sql', {
      query: `
        SELECT extname, extversion, extrelocatable, extnamespace::regnamespace as schema
        FROM pg_extension 
        ORDER BY extname;
      `
    }).catch(() => ({ data: null }));

    if (extensions && extensions.length > 0) {
      console.log('📦 Extensões instaladas:');
      extensions.forEach(ext => {
        console.log(`   ${ext.extname} v${ext.extversion} (${ext.schema})`);
      });
    } else {
      console.log('❌ Não foi possível listar extensões');
    }

    // 3. Verificar se há alguma view ou função que pode estar sendo chamada
    console.log('\n👁️ 3. Verificando views e funções relacionadas a produtos...');
    
    const { data: objects } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          schemaname,
          tablename as name,
          'table' as type
        FROM pg_tables 
        WHERE tablename LIKE '%product%' OR tablename LIKE '%stock%' OR tablename LIKE '%sale%'
        UNION ALL
        SELECT 
          schemaname,
          viewname as name,
          'view' as type
        FROM pg_views 
        WHERE viewname LIKE '%product%' OR viewname LIKE '%stock%' OR viewname LIKE '%sale%'
        UNION ALL
        SELECT 
          n.nspname as schemaname,
          p.proname as name,
          'function' as type
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname LIKE '%product%' OR p.proname LIKE '%stock%' OR p.proname LIKE '%sale%'
        ORDER BY type, name;
      `
    }).catch(() => ({ data: null }));

    if (objects && objects.length > 0) {
      console.log('🗂️ Objetos relacionados encontrados:');
      objects.forEach(obj => {
        console.log(`   ${obj.type}: ${obj.schemaname}.${obj.name}`);
      });
    } else {
      console.log('❌ Não foi possível listar objetos');
    }

    // 4. Verificar se há alguma regra (RULE) nas tabelas
    console.log('\n📏 4. Verificando regras (RULES) nas tabelas...');
    
    const { data: rules } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          rulename,
          definition
        FROM pg_rules
        WHERE tablename IN ('products', 'sale_items', 'stock_movements', 'sales')
        ORDER BY tablename, rulename;
      `
    }).catch(() => ({ data: null }));

    if (rules && rules.length > 0) {
      console.log('📏 Regras encontradas:');
      rules.forEach(rule => {
        console.log(`   ${rule.tablename}.${rule.rulename}:`);
        console.log(`     ${rule.definition}`);
      });
    } else {
      console.log('❌ Nenhuma regra encontrada');
    }

    // 5. Verificar se há alguma política RLS que pode estar causando múltiplas execuções
    console.log('\n🔒 5. Verificando políticas RLS detalhadas...');
    
    const { data: policies } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename IN ('products', 'sale_items', 'stock_movements', 'sales')
        ORDER BY tablename, policyname;
      `
    }).catch(() => ({ data: null }));

    if (policies && policies.length > 0) {
      console.log('🔒 Políticas RLS encontradas:');
      policies.forEach(policy => {
        console.log(`   ${policy.tablename}.${policy.policyname}:`);
        console.log(`     Comando: ${policy.cmd}`);
        console.log(`     Qualificação: ${policy.qual || 'N/A'}`);
        console.log(`     With Check: ${policy.with_check || 'N/A'}`);
      });
    } else {
      console.log('❌ Nenhuma política RLS encontrada');
    }

    // 6. Verificar se há alguma constraint que pode estar executando funções
    console.log('\n⚖️ 6. Verificando constraints com funções...');
    
    const { data: constraints } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          tc.table_schema,
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          cc.check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name IN ('products', 'sale_items', 'stock_movements', 'sales')
        AND (tc.constraint_type = 'CHECK' OR cc.check_clause IS NOT NULL)
        ORDER BY tc.table_name, tc.constraint_name;
      `
    }).catch(() => ({ data: null }));

    if (constraints && constraints.length > 0) {
      console.log('⚖️ Constraints com possíveis funções:');
      constraints.forEach(constraint => {
        console.log(`   ${constraint.table_name}.${constraint.constraint_name}:`);
        console.log(`     Tipo: ${constraint.constraint_type}`);
        if (constraint.check_clause) {
          console.log(`     Cláusula: ${constraint.check_clause}`);
        }
      });
    } else {
      console.log('❌ Nenhuma constraint com função encontrada');
    }

    // 7. Teste final com monitoramento de conexões
    console.log('\n🔍 7. Teste com monitoramento de conexões...');
    
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

    console.log(`📦 Produto: ${testProduct.name}`);
    console.log(`📊 Estoque inicial: ${testProduct.stock_quantity}`);

    // Verificar conexões ativas antes
    const { data: connectionsBefore } = await supabase.rpc('execute_sql', {
      query: `
        SELECT count(*) as active_connections
        FROM pg_stat_activity 
        WHERE state = 'active' AND pid != pg_backend_pid();
      `
    }).catch(() => ({ data: [{ active_connections: 'N/A' }] }));

    console.log(`🔗 Conexões ativas antes: ${connectionsBefore[0]?.active_connections || 'N/A'}`);

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

    // Verificar estoque antes da inserção do item
    const { data: stockBefore } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque antes do item: ${stockBefore.stock_quantity}`);

    // Inserir item e verificar imediatamente
    const startTime = Date.now();
    
    await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      });

    const endTime = Date.now();
    
    const { data: stockAfter } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction = stockBefore.stock_quantity - stockAfter.stock_quantity;
    
    console.log(`📊 Estoque depois do item: ${stockAfter.stock_quantity}`);
    console.log(`📉 Redução observada: ${reduction}`);
    console.log(`⏱️ Tempo de inserção: ${endTime - startTime}ms`);

    // Verificar conexões ativas depois
    const { data: connectionsAfter } = await supabase.rpc('execute_sql', {
      query: `
        SELECT count(*) as active_connections
        FROM pg_stat_activity 
        WHERE state = 'active' AND pid != pg_backend_pid();
      `
    }).catch(() => ({ data: [{ active_connections: 'N/A' }] }));

    console.log(`🔗 Conexões ativas depois: ${connectionsAfter[0]?.active_connections || 'N/A'}`);

    // Verificar se há algum processo em background
    const { data: bgProcesses } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          pid,
          state,
          query,
          query_start,
          state_change
        FROM pg_stat_activity 
        WHERE state != 'idle' 
        AND pid != pg_backend_pid()
        AND query NOT LIKE '%pg_stat_activity%'
        ORDER BY query_start DESC
        LIMIT 5;
      `
    }).catch(() => ({ data: null }));

    if (bgProcesses && bgProcesses.length > 0) {
      console.log('🔄 Processos em background:');
      bgProcesses.forEach(proc => {
        console.log(`   PID ${proc.pid} (${proc.state}): ${proc.query?.substring(0, 100)}...`);
      });
    } else {
      console.log('❌ Nenhum processo em background encontrado');
    }

    // Limpeza
    console.log('\n🧹 Limpando...');
    await supabase.from('stock_movements').delete().eq('reference_id', sale.id);
    await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    await supabase.from('sales').delete().eq('id', sale.id);
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Investigação PostgreSQL profunda concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarPostgreSQLProfundo();
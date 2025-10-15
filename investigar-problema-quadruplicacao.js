require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarProblemaQuadruplicacao() {
  console.log('🔍 INVESTIGAÇÃO DETALHADA DO PROBLEMA DE QUADRUPLICAÇÃO');
  console.log('='.repeat(70));
  
  try {
    // 1. Verificar se há algum trigger ou função oculta
    console.log('\n📋 1. Verificando triggers e funções ocultas...');
    
    // Verificar usando pg_stat_user_functions para ver funções executadas
    const { data: funcStats, error: funcStatsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          funcname,
          calls,
          total_time,
          self_time
        FROM pg_stat_user_functions 
        WHERE schemaname = 'public'
        ORDER BY calls DESC;
      `
    });

    if (funcStatsError) {
      console.log('❌ Erro ao verificar estatísticas de funções:', funcStatsError.message);
    } else if (funcStats && funcStats.length > 0) {
      console.log(`✅ ${funcStats.length} função(ões) com estatísticas:`);
      funcStats.forEach(func => {
        console.log(`   - ${func.schemaname}.${func.funcname}: ${func.calls} chamadas`);
      });
    } else {
      console.log('❌ Nenhuma estatística de função encontrada');
    }

    // 2. Verificar se há RLS (Row Level Security) ou políticas que podem estar causando o problema
    console.log('\n🔒 2. Verificando políticas RLS...');
    
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
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
        WHERE schemaname = 'public'
        AND (tablename = 'products' OR tablename = 'sale_items' OR tablename = 'stock_movements')
        ORDER BY tablename, policyname;
      `
    });

    if (policiesError) {
      console.log('❌ Erro ao verificar políticas:', policiesError.message);
    } else if (policies && policies.length > 0) {
      console.log(`✅ ${policies.length} política(s) encontrada(s):`);
      policies.forEach(policy => {
        console.log(`   - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('❌ Nenhuma política RLS encontrada');
    }

    // 3. Verificar se há algum webhook ou função externa sendo chamada
    console.log('\n🌐 3. Verificando extensões e hooks...');
    
    const { data: extensions, error: extError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          extname,
          extversion,
          extrelocatable
        FROM pg_extension 
        WHERE extname NOT IN ('plpgsql', 'uuid-ossp', 'pgcrypto')
        ORDER BY extname;
      `
    });

    if (extError) {
      console.log('❌ Erro ao verificar extensões:', extError.message);
    } else if (extensions && extensions.length > 0) {
      console.log(`✅ ${extensions.length} extensão(ões) encontrada(s):`);
      extensions.forEach(ext => {
        console.log(`   - ${ext.extname} v${ext.extversion}`);
      });
    } else {
      console.log('❌ Nenhuma extensão adicional encontrada');
    }

    // 4. Teste com monitoramento de todas as operações
    console.log('\n🧪 4. Teste com monitoramento completo...');
    
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

    console.log(`📦 Produto: ${testProduct.name} (Estoque inicial: ${testProduct.stock_quantity})`);

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    if (!customer) {
      console.log('❌ Customer não encontrado');
      return;
    }

    // Monitorar estoque ANTES de qualquer operação
    console.log('\n📊 Monitoramento ANTES:');
    const stockBefore = testProduct.stock_quantity;
    console.log(`   Estoque: ${stockBefore}`);

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

    // Monitorar estoque IMEDIATAMENTE após criar venda (antes do item)
    const { data: stockAfterSale } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque após criar venda: ${stockAfterSale.stock_quantity}`);

    // Inserir item com monitoramento detalhado
    console.log('\n⏱️ Inserindo item com monitoramento...');
    
    const insertPromise = supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    // Executar inserção
    const { data: item } = await insertPromise;
    console.log(`✅ Item inserido: ${item.id}`);

    // Monitorar estoque em intervalos
    const monitoringIntervals = [0, 100, 500, 1000, 2000];
    
    for (const interval of monitoringIntervals) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const { data: currentStock } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', testProduct.id)
        .single();

      console.log(`📊 Estoque após ${interval}ms: ${currentStock.stock_quantity}`);
    }

    const finalReduction = stockBefore - (await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single()).data.stock_quantity;

    console.log(`\n📈 RESULTADO FINAL:`);
    console.log(`   Redução total: ${finalReduction} (esperado: 1)`);
    console.log(`   Multiplicador: ${finalReduction}x`);

    // Verificar todas as movimentações criadas
    const { data: allMovements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: true });

    if (allMovements) {
      console.log(`📋 Movimentações criadas: ${allMovements.length}`);
      allMovements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock}) - ${mov.created_at}`);
      });
    }

    // 5. Verificar se há algum processo em background
    console.log('\n🔄 5. Verificando processos em background...');
    
    const { data: bgProcesses, error: bgError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          state,
          query_start,
          query
        FROM pg_stat_activity 
        WHERE state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
        AND query NOT LIKE '%idle%'
        ORDER BY query_start DESC;
      `
    });

    if (bgError) {
      console.log('❌ Erro ao verificar processos:', bgError.message);
    } else if (bgProcesses && bgProcesses.length > 0) {
      console.log(`✅ ${bgProcesses.length} processo(s) ativo(s):`);
      bgProcesses.forEach((proc, index) => {
        console.log(`   ${index + 1}. ${proc.application_name} (${proc.state}): ${proc.query?.substring(0, 100)}...`);
      });
    } else {
      console.log('❌ Nenhum processo ativo encontrado');
    }

    // Limpeza
    console.log('\n🧹 Limpando...');
    if (allMovements) {
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

investigarProblemaQuadruplicacao();
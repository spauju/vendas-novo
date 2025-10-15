require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarSupabaseInternals() {
  console.log('🔍 INVESTIGANDO ASPECTOS INTERNOS DO SUPABASE');
  console.log('='.repeat(55));
  
  try {
    // 1. Verificar se há alguma configuração de realtime ou subscriptions
    console.log('\n📡 1. Verificando configurações de realtime...');
    
    const { data: realtimeConfig, error: realtimeError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE tablename IN ('products', 'sale_items', 'stock_movements')
        ORDER BY tablename;
      `
    });

    if (realtimeError) {
      console.log('❌ Erro ao verificar configurações:', realtimeError.message);
    } else if (realtimeConfig && realtimeConfig.length > 0) {
      console.log('📋 Configurações das tabelas:');
      realtimeConfig.forEach(config => {
        console.log(`   - ${config.tablename}: RLS=${config.rowsecurity ? 'ON' : 'OFF'}`);
      });
    }

    // 2. Verificar se há alguma publicação (publication) ativa
    console.log('\n📰 2. Verificando publicações ativas...');
    
    const { data: publications, error: pubError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.pubname,
          p.puballtables,
          p.pubinsert,
          p.pubupdate,
          p.pubdelete,
          array_agg(pt.schemaname || '.' || pt.tablename) as tables
        FROM pg_publication p
        LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
        GROUP BY p.pubname, p.puballtables, p.pubinsert, p.pubupdate, p.pubdelete
        ORDER BY p.pubname;
      `
    });

    if (pubError) {
      console.log('❌ Erro ao verificar publicações:', pubError.message);
    } else if (publications && publications.length > 0) {
      console.log(`📋 ${publications.length} publicação(ões) ativa(s):`);
      publications.forEach(pub => {
        console.log(`   - ${pub.pubname}:`);
        console.log(`     Todas as tabelas: ${pub.puballtables ? 'SIM' : 'NÃO'}`);
        console.log(`     INSERT: ${pub.pubinsert ? 'SIM' : 'NÃO'}`);
        console.log(`     UPDATE: ${pub.pubupdate ? 'SIM' : 'NÃO'}`);
        console.log(`     DELETE: ${pub.pubdelete ? 'SIM' : 'NÃO'}`);
        if (pub.tables && pub.tables[0]) {
          console.log(`     Tabelas: ${pub.tables.join(', ')}`);
        }
      });
    } else {
      console.log('❌ Nenhuma publicação encontrada');
    }

    // 3. Verificar se há algum event trigger
    console.log('\n⚡ 3. Verificando event triggers...');
    
    const { data: eventTriggers, error: eventError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          evtname as trigger_name,
          evtevent as event_type,
          evtenabled as enabled,
          evtfoid::regproc as function_name
        FROM pg_event_trigger
        ORDER BY evtname;
      `
    });

    if (eventError) {
      console.log('❌ Erro ao verificar event triggers:', eventError.message);
    } else if (eventTriggers && eventTriggers.length > 0) {
      console.log(`🚨 ${eventTriggers.length} event trigger(s):`);
      eventTriggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name}: ${trigger.event_type} (${trigger.enabled ? 'ATIVO' : 'INATIVO'})`);
        console.log(`     Função: ${trigger.function_name}`);
      });
    } else {
      console.log('❌ Nenhum event trigger encontrado');
    }

    // 4. Verificar se há alguma configuração de WAL sender
    console.log('\n📡 4. Verificando WAL senders...');
    
    const { data: walSenders, error: walError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          state,
          sent_lsn,
          write_lsn,
          flush_lsn,
          replay_lsn
        FROM pg_stat_replication
        ORDER BY pid;
      `
    });

    if (walError) {
      console.log('❌ Erro ao verificar WAL senders:', walError.message);
    } else if (walSenders && walSenders.length > 0) {
      console.log(`📋 ${walSenders.length} WAL sender(s):`);
      walSenders.forEach(sender => {
        console.log(`   - PID ${sender.pid} (${sender.usename}): ${sender.application_name} - ${sender.state}`);
        console.log(`     Client: ${sender.client_addr}`);
      });
    } else {
      console.log('❌ Nenhum WAL sender ativo');
    }

    // 5. Teste com transação explícita para ver se conseguimos isolar o problema
    console.log('\n🧪 5. Teste com transação explícita...');
    
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

    // Tentar usar uma transação manual via SQL
    console.log('\n⚡ Executando inserção via transação SQL...');
    
    const { data: transactionResult, error: transError } = await supabase.rpc('exec_sql', {
      sql: `
        BEGIN;
        
        -- Capturar estoque antes
        SELECT stock_quantity FROM products WHERE id = '${testProduct.id}';
        
        -- Inserir item via SQL puro
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, created_at)
        VALUES ('${sale.id}', '${testProduct.id}', 1, 10.00, NOW());
        
        -- Capturar estoque depois
        SELECT stock_quantity FROM products WHERE id = '${testProduct.id}';
        
        COMMIT;
      `
    });

    if (transError) {
      console.log('❌ Erro na transação SQL:', transError.message);
    } else {
      console.log('✅ Transação SQL executada');
    }

    // Verificar estoque final
    const { data: finalStock } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction = testProduct.stock_quantity - finalStock.stock_quantity;
    console.log(`📊 Estoque final: ${finalStock.stock_quantity}`);
    console.log(`📉 Redução observada: ${reduction} (esperado: 1)`);

    if (reduction === 4) {
      console.log('🚨 PROBLEMA PERSISTE MESMO COM SQL DIRETO!');
      console.log('💡 Isso indica que há algo no nível do PostgreSQL ou Supabase que está interceptando as inserções');
    }

    // 6. Verificar se há alguma configuração específica do Supabase
    console.log('\n🔧 6. Verificando configurações específicas do Supabase...');
    
    const { data: supabaseSettings, error: settingsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          name,
          setting,
          short_desc
        FROM pg_settings 
        WHERE name LIKE '%supabase%' 
           OR name LIKE '%realtime%'
           OR name LIKE '%webhook%'
        ORDER BY name;
      `
    });

    if (settingsError) {
      console.log('❌ Erro ao verificar configurações:', settingsError.message);
    } else if (supabaseSettings && supabaseSettings.length > 0) {
      console.log(`📋 ${supabaseSettings.length} configuração(ões) do Supabase:`);
      supabaseSettings.forEach(setting => {
        console.log(`   - ${setting.name}: ${setting.setting} (${setting.short_desc})`);
      });
    } else {
      console.log('❌ Nenhuma configuração específica do Supabase encontrada');
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

    console.log('✅ Investigação de internals concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarSupabaseInternals();
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarSupabaseConfig() {
  console.log('🔍 INVESTIGANDO CONFIGURAÇÕES DO SUPABASE');
  console.log('='.repeat(50));
  
  try {
    // 1. Verificar se há alguma configuração de replicação ou sincronização
    console.log('\n📋 1. Verificando configurações de replicação...');
    
    const { data: replConfig, error: replError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          slot_name,
          plugin,
          slot_type,
          datoid,
          active,
          restart_lsn
        FROM pg_replication_slots;
      `
    });

    if (replError) {
      console.log('❌ Erro ao verificar replicação:', replError.message);
    } else if (replConfig && replConfig.length > 0) {
      console.log(`🚨 ${replConfig.length} slot(s) de replicação:`);
      replConfig.forEach(slot => {
        console.log(`   - ${slot.slot_name}: ${slot.plugin} (${slot.slot_type}) - Ativo: ${slot.active}`);
      });
    } else {
      console.log('❌ Nenhum slot de replicação encontrado');
    }

    // 2. Verificar se há alguma configuração de WAL ou log
    console.log('\n📋 2. Verificando configurações de WAL...');
    
    const { data: walConfig, error: walError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          name,
          setting,
          unit,
          context,
          short_desc
        FROM pg_settings 
        WHERE name LIKE '%wal%' 
           OR name LIKE '%log%' 
           OR name LIKE '%repl%'
           OR name LIKE '%trigger%'
        ORDER BY name;
      `
    });

    if (walError) {
      console.log('❌ Erro ao verificar configurações WAL:', walError.message);
    } else if (walConfig && walConfig.length > 0) {
      console.log(`📋 ${walConfig.length} configuração(ões) relevante(s):`);
      walConfig.forEach(config => {
        console.log(`   - ${config.name}: ${config.setting} ${config.unit || ''} (${config.short_desc})`);
      });
    } else {
      console.log('❌ Nenhuma configuração relevante encontrada');
    }

    // 3. Verificar se há algum listener ou notificação ativa
    console.log('\n📋 3. Verificando listeners ativos...');
    
    const { data: listeners, error: listError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          state,
          query
        FROM pg_stat_activity 
        WHERE state = 'active' 
           OR query ILIKE '%LISTEN%'
           OR query ILIKE '%NOTIFY%'
        ORDER BY pid;
      `
    });

    if (listError) {
      console.log('❌ Erro ao verificar listeners:', listError.message);
    } else if (listeners && listeners.length > 0) {
      console.log(`📋 ${listeners.length} processo(s) ativo(s):`);
      listeners.forEach(proc => {
        console.log(`   - PID ${proc.pid} (${proc.usename}): ${proc.application_name} - ${proc.state}`);
        if (proc.query) {
          console.log(`     Query: ${proc.query.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('❌ Nenhum listener ativo encontrado');
    }

    // 4. Verificar se há alguma configuração específica do Supabase
    console.log('\n📋 4. Verificando configurações específicas...');
    
    const { data: supabaseConfig, error: configError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE tablename IN ('products', 'sale_items', 'stock_movements')
        ORDER BY tablename, attname;
      `
    });

    if (configError) {
      console.log('❌ Erro ao verificar estatísticas:', configError.message);
    } else if (supabaseConfig && supabaseConfig.length > 0) {
      console.log(`📋 ${supabaseConfig.length} estatística(s) de tabela:`);
      supabaseConfig.forEach(stat => {
        console.log(`   - ${stat.tablename}.${stat.attname}: distinct=${stat.n_distinct}, corr=${stat.correlation}`);
      });
    } else {
      console.log('❌ Nenhuma estatística encontrada');
    }

    // 5. Teste direto com UPDATE manual para ver se o problema persiste
    console.log('\n🧪 5. Teste com UPDATE manual direto...');
    
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

    // Fazer UPDATE direto via SQL
    const newStock = testProduct.stock_quantity - 1;
    const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE products 
        SET stock_quantity = ${newStock}
        WHERE id = '${testProduct.id}'
        RETURNING stock_quantity;
      `
    });

    if (updateError) {
      console.log('❌ Erro no UPDATE:', updateError.message);
    } else {
      console.log('✅ UPDATE executado');
    }

    // Verificar estoque após UPDATE
    const { data: stockAfterUpdate } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque após UPDATE: ${stockAfterUpdate.stock_quantity}`);
    console.log(`📊 Esperado: ${newStock}`);

    if (stockAfterUpdate.stock_quantity !== newStock) {
      const unexpectedReduction = testProduct.stock_quantity - stockAfterUpdate.stock_quantity;
      console.log(`🚨 PROBLEMA NO UPDATE DIRETO! Redução: ${unexpectedReduction} (esperado: 1)`);
    } else {
      console.log('✅ UPDATE direto funcionou corretamente');
    }

    // 6. Verificar se há alguma coisa específica na estrutura da tabela products
    console.log('\n📋 6. Verificando estrutura detalhada da tabela products...');
    
    const { data: tableStructure, error: structError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          a.attname as column_name,
          t.typname as data_type,
          a.attlen as length,
          a.atttypmod as type_modifier,
          a.attnotnull as not_null,
          a.atthasdef as has_default,
          pg_get_expr(d.adbin, d.adrelid) as default_value
        FROM pg_attribute a
        JOIN pg_type t ON a.atttypid = t.oid
        LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
        WHERE a.attrelid = 'products'::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
        ORDER BY a.attnum;
      `
    });

    if (structError) {
      console.log('❌ Erro ao verificar estrutura:', structError.message);
    } else if (tableStructure && tableStructure.length > 0) {
      console.log(`📋 Estrutura da tabela products:`);
      tableStructure.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.default_value || 'NULL'})`);
      });
    }

    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('\n✅ Investigação de configurações concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarSupabaseConfig();
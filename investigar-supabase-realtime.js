require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarSupabaseRealtime() {
  console.log('🔍 INVESTIGANDO CONFIGURAÇÕES DO SUPABASE REALTIME');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar configurações de replicação
    console.log('\n1️⃣ Verificando configurações de replicação...');
    
    const { data: replicationSettings, error: replError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          hasinserts,
          hasupdates,
          hasdeletes,
          hasrules
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('products', 'sales', 'sale_items', 'stock_movements')
        ORDER BY tablename;
      `
    });

    if (replError) {
      console.error('❌ Erro ao verificar replicação:', replError);
    } else {
      console.log(`📊 Tabelas verificadas: ${replicationSettings?.length || 0}`);
      replicationSettings?.forEach(table => {
        console.log(`   - ${table.tablename}:`);
        console.log(`     Inserts: ${table.hasinserts ? '✅' : '❌'}`);
        console.log(`     Updates: ${table.hasupdates ? '✅' : '❌'}`);
        console.log(`     Deletes: ${table.hasdeletes ? '✅' : '❌'}`);
        console.log(`     Rules: ${table.hasrules ? '✅' : '❌'}`);
      });
    }

    // 2. Verificar publicações do Realtime
    console.log('\n2️⃣ Verificando publicações do Realtime...');
    
    const { data: publications, error: pubError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.pubname as publication_name,
          p.puballtables as all_tables,
          p.pubinsert as pub_insert,
          p.pubupdate as pub_update,
          p.pubdelete as pub_delete,
          p.pubtruncate as pub_truncate
        FROM pg_publication p
        ORDER BY p.pubname;
      `
    });

    if (pubError) {
      console.error('❌ Erro ao verificar publicações:', pubError);
    } else {
      console.log(`📊 Publicações encontradas: ${publications?.length || 0}`);
      publications?.forEach(pub => {
        console.log(`   - ${pub.publication_name}:`);
        console.log(`     Todas as tabelas: ${pub.all_tables ? '✅' : '❌'}`);
        console.log(`     Insert: ${pub.pub_insert ? '✅' : '❌'}`);
        console.log(`     Update: ${pub.pub_update ? '✅' : '❌'}`);
        console.log(`     Delete: ${pub.pub_delete ? '✅' : '❌'}`);
        console.log(`     Truncate: ${pub.pub_truncate ? '✅' : '❌'}`);
      });
    }

    // 3. Verificar tabelas específicas nas publicações
    console.log('\n3️⃣ Verificando tabelas nas publicações...');
    
    const { data: pubTables, error: pubTableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.pubname as publication_name,
          n.nspname as schema_name,
          c.relname as table_name
        FROM pg_publication p
        JOIN pg_publication_rel pr ON p.oid = pr.prpubid
        JOIN pg_class c ON pr.prrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname IN ('products', 'sales', 'sale_items', 'stock_movements')
        ORDER BY p.pubname, c.relname;
      `
    });

    if (pubTableError) {
      console.error('❌ Erro ao verificar tabelas nas publicações:', pubTableError);
    } else {
      console.log(`📊 Tabelas em publicações: ${pubTables?.length || 0}`);
      pubTables?.forEach(table => {
        console.log(`   - ${table.publication_name}: ${table.schema_name}.${table.table_name}`);
        
        if (table.table_name === 'sale_items') {
          console.log(`     🚨 SALE_ITEMS ESTÁ SENDO PUBLICADA!`);
        }
      });
    }

    // 4. Verificar slots de replicação
    console.log('\n4️⃣ Verificando slots de replicação...');
    
    const { data: replSlots, error: slotError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          slot_name,
          plugin,
          slot_type,
          datoid,
          database,
          active,
          active_pid,
          restart_lsn,
          confirmed_flush_lsn
        FROM pg_replication_slots
        ORDER BY slot_name;
      `
    });

    if (slotError) {
      console.error('❌ Erro ao verificar slots:', slotError);
    } else {
      console.log(`📊 Slots de replicação: ${replSlots?.length || 0}`);
      replSlots?.forEach(slot => {
        console.log(`   - ${slot.slot_name}:`);
        console.log(`     Plugin: ${slot.plugin}`);
        console.log(`     Tipo: ${slot.slot_type}`);
        console.log(`     Ativo: ${slot.active ? '✅' : '❌'}`);
        console.log(`     PID: ${slot.active_pid || 'N/A'}`);
        
        if (slot.plugin === 'wal2json' || slot.plugin === 'pgoutput') {
          console.log(`     🔍 Plugin de replicação lógica detectado`);
        }
      });
    }

    // 5. Verificar WAL (Write-Ahead Logging)
    console.log('\n5️⃣ Verificando configurações WAL...');
    
    const { data: walSettings, error: walError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          name,
          setting,
          unit,
          category
        FROM pg_settings 
        WHERE name IN (
          'wal_level',
          'max_wal_senders',
          'max_replication_slots',
          'wal_keep_segments',
          'wal_sender_timeout',
          'synchronous_standby_names'
        )
        ORDER BY name;
      `
    });

    if (walError) {
      console.error('❌ Erro ao verificar WAL:', walError);
    } else {
      console.log(`📊 Configurações WAL:`);
      walSettings?.forEach(setting => {
        console.log(`   - ${setting.name}: ${setting.setting}${setting.unit || ''}`);
        
        if (setting.name === 'wal_level' && setting.setting === 'logical') {
          console.log(`     🔍 Replicação lógica habilitada`);
        }
      });
    }

    // 6. Teste específico para detectar duplicação via Realtime
    console.log('\n6️⃣ TESTE DE DUPLICAÇÃO VIA REALTIME...');
    
    // Buscar produto
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 15)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    const estoqueInicial = testProduct.stock_quantity;
    console.log(`📦 Produto: ${testProduct.name} (Estoque: ${estoqueInicial})`);

    // Configurar listener para mudanças em tempo real
    let changeCount = 0;
    const changes = [];

    const subscription = supabase
      .channel('stock-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: `id=eq.${testProduct.id}`
        }, 
        (payload) => {
          changeCount++;
          changes.push({
            timestamp: new Date().toISOString(),
            event: payload.eventType,
            old: payload.old,
            new: payload.new
          });
          console.log(`   📡 Realtime change ${changeCount}: ${payload.eventType}`);
          if (payload.new && payload.new.stock_quantity !== undefined) {
            console.log(`      Estoque: ${payload.old?.stock_quantity || 'N/A'} → ${payload.new.stock_quantity}`);
          }
        }
      )
      .subscribe();

    // Aguardar conexão
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Listener Realtime configurado');

    // Criar venda de teste
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: 40.00,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`✅ Venda criada: ${testSale.id}`);

    // Inserir item e monitorar mudanças
    const quantidadeTeste = 4;
    console.log(`📝 Inserindo ${quantidadeTeste} unidades...`);

    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: quantidadeTeste,
        unit_price: 10.00
      })
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return;
    }

    console.log(`✅ Item inserido`);

    // Aguardar mudanças do Realtime
    console.log('⏳ Aguardando mudanças do Realtime...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verificar estoque final
    const { data: finalProduct, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (!finalError && finalProduct) {
      const reducaoReal = estoqueInicial - finalProduct.stock_quantity;
      console.log(`📊 Redução real: ${reducaoReal} (esperado: ${quantidadeTeste})`);
      
      if (reducaoReal !== quantidadeTeste) {
        console.log(`❌ DUPLICAÇÃO CONFIRMADA: ${reducaoReal / quantidadeTeste}x`);
      }
    }

    // Analisar mudanças capturadas
    console.log(`\n📡 Mudanças capturadas pelo Realtime: ${changeCount}`);
    changes.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change.timestamp} - ${change.event}`);
      if (change.old && change.new) {
        console.log(`      ${change.old.stock_quantity} → ${change.new.stock_quantity}`);
      }
    });

    if (changeCount > 1) {
      console.log(`⚠️ MÚLTIPLAS MUDANÇAS DETECTADAS: ${changeCount}`);
      console.log('   Isso pode indicar processamento duplicado via Realtime');
    }

    // Desconectar listener
    await supabase.removeChannel(subscription);

    // Limpeza
    console.log('\n🧹 Limpando dados...');
    await supabase.from('sale_items').delete().eq('id', testItem.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueInicial })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída');

  } catch (error) {
    console.error('❌ Erro durante investigação:', error);
  }
}

// Executar investigação
investigarSupabaseRealtime();
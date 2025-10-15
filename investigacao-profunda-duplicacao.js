require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigacaoProfundaDuplicacao() {
  console.log('🔍 INVESTIGAÇÃO PROFUNDA - CAUSA RAIZ DA DUPLICAÇÃO 2X');
  console.log('='.repeat(70));
  
  try {
    // 1. Investigar TODOS os schemas e triggers do PostgreSQL
    console.log('\n1️⃣ INVESTIGANDO TODOS OS SCHEMAS E TRIGGERS...');
    
    const { data: allSchemas, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schema_name,
          schema_owner
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name;
      `
    });

    if (schemaError) {
      console.error('❌ Erro ao buscar schemas:', schemaError);
    } else {
      console.log(`📊 Schemas encontrados: ${allSchemas?.length || 0}`);
      allSchemas?.forEach(schema => {
        console.log(`   - ${schema.schema_name} (owner: ${schema.schema_owner})`);
      });
    }

    // 2. Buscar TODOS os triggers em TODOS os schemas
    console.log('\n2️⃣ BUSCANDO TRIGGERS EM TODOS OS SCHEMAS...');
    
    const { data: allTriggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          n.nspname as schema_name,
          c.relname as table_name,
          t.tgname as trigger_name,
          p.proname as function_name,
          CASE t.tgenabled 
            WHEN 'O' THEN 'enabled'
            WHEN 'D' THEN 'disabled'
            WHEN 'R' THEN 'replica'
            WHEN 'A' THEN 'always'
            ELSE 'unknown'
          END as status,
          t.tgisinternal as is_internal,
          CASE t.tgtype & 2
            WHEN 0 THEN 'BEFORE'
            ELSE 'AFTER'
          END as timing,
          CASE t.tgtype & 28
            WHEN 4 THEN 'INSERT'
            WHEN 8 THEN 'DELETE'
            WHEN 16 THEN 'UPDATE'
            WHEN 12 THEN 'INSERT OR DELETE'
            WHEN 20 THEN 'INSERT OR UPDATE'
            WHEN 24 THEN 'DELETE OR UPDATE'
            WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
            ELSE 'UNKNOWN'
          END as events,
          pg_get_triggerdef(t.oid) as definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY n.nspname, c.relname, t.tgname;
      `
    });

    if (triggerError) {
      console.error('❌ Erro ao buscar triggers:', triggerError);
    } else {
      console.log(`📊 Total de triggers encontrados: ${allTriggers?.length || 0}`);
      
      // Agrupar por schema
      const triggersBySchema = {};
      allTriggers?.forEach(trigger => {
        if (!triggersBySchema[trigger.schema_name]) {
          triggersBySchema[trigger.schema_name] = [];
        }
        triggersBySchema[trigger.schema_name].push(trigger);
      });

      Object.keys(triggersBySchema).forEach(schema => {
        console.log(`\n📋 Schema: ${schema} (${triggersBySchema[schema].length} triggers)`);
        
        triggersBySchema[schema].forEach(trigger => {
          console.log(`   - ${trigger.table_name}.${trigger.trigger_name}`);
          console.log(`     Função: ${trigger.function_name}`);
          console.log(`     Status: ${trigger.status} | Timing: ${trigger.timing} ${trigger.events}`);
          
          // Destacar triggers relacionados a estoque ou vendas
          if (trigger.table_name === 'sale_items' || 
              trigger.function_name.includes('stock') || 
              trigger.function_name.includes('sale') ||
              trigger.definition.includes('stock_quantity')) {
            console.log(`     🚨 RELEVANTE PARA ESTOQUE!`);
          }
        });
      });
    }

    // 3. Investigar funções que modificam stock_quantity
    console.log('\n3️⃣ INVESTIGANDO FUNÇÕES QUE MODIFICAM ESTOQUE...');
    
    const { data: stockFunctions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          n.nspname as schema_name,
          p.proname as function_name,
          p.prosrc as function_body,
          p.prokind as function_kind,
          p.provolatile as volatility,
          p.proisstrict as is_strict
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND (
          p.prosrc ILIKE '%stock_quantity%' OR
          p.prosrc ILIKE '%sale_items%' OR
          p.proname ILIKE '%stock%' OR
          p.proname ILIKE '%sale%'
        )
        ORDER BY n.nspname, p.proname;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao buscar funções:', funcError);
    } else {
      console.log(`📊 Funções relacionadas a estoque: ${stockFunctions?.length || 0}`);
      
      stockFunctions?.forEach((func, index) => {
        console.log(`\n${index + 1}. ${func.schema_name}.${func.function_name}`);
        console.log(`   Tipo: ${func.function_kind === 'f' ? 'Function' : 'Procedure'}`);
        console.log(`   Volatilidade: ${func.volatility}`);
        
        if (func.function_body.includes('stock_quantity')) {
          console.log('   🎯 MODIFICA ESTOQUE!');
          
          // Contar operações de UPDATE
          const updateMatches = (func.function_body.match(/UPDATE.*stock_quantity/gi) || []).length;
          const setMatches = (func.function_body.match(/SET.*stock_quantity/gi) || []).length;
          
          console.log(`   📊 Operações UPDATE: ${updateMatches}`);
          console.log(`   📊 Operações SET: ${setMatches}`);
          
          if (updateMatches > 1 || setMatches > 1) {
            console.log('   ⚠️ MÚLTIPLAS OPERAÇÕES DE ESTOQUE!');
          }
          
          // Mostrar linhas relevantes
          const lines = func.function_body.split('\n');
          const stockLines = lines.filter(line => 
            line.toLowerCase().includes('stock_quantity')
          );
          
          if (stockLines.length > 0) {
            console.log('   Linhas de estoque:');
            stockLines.forEach(line => {
              console.log(`     ${line.trim()}`);
            });
          }
        }
      });
    }

    // 4. Verificar se há extensões ativas que podem afetar
    console.log('\n4️⃣ VERIFICANDO EXTENSÕES ATIVAS...');
    
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
      console.error('❌ Erro ao verificar extensões:', extError);
    } else {
      console.log(`📊 Extensões ativas: ${extensions?.length || 0}`);
      extensions?.forEach(ext => {
        console.log(`   - ${ext.extension_name} v${ext.version} (${ext.schema_name})`);
        
        // Destacar extensões que podem afetar triggers
        if (['plpgsql', 'supabase_vault', 'pgsodium'].includes(ext.extension_name)) {
          console.log(`     🔍 Pode afetar triggers/funções`);
        }
      });
    }

    // 5. Investigar configurações específicas do PostgreSQL
    console.log('\n5️⃣ VERIFICANDO CONFIGURAÇÕES DO POSTGRESQL...');
    
    const { data: pgSettings, error: settingsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          name,
          setting,
          unit,
          category,
          short_desc
        FROM pg_settings 
        WHERE name IN (
          'log_statement',
          'log_min_duration_statement',
          'shared_preload_libraries',
          'session_replication_role',
          'synchronous_commit'
        )
        ORDER BY name;
      `
    });

    if (settingsError) {
      console.error('❌ Erro ao verificar configurações:', settingsError);
    } else {
      console.log(`📊 Configurações relevantes:`);
      pgSettings?.forEach(setting => {
        console.log(`   - ${setting.name}: ${setting.setting}${setting.unit || ''}`);
        console.log(`     ${setting.short_desc}`);
      });
    }

    // 6. Teste com logging detalhado
    console.log('\n6️⃣ TESTE COM LOGGING DETALHADO...');
    
    // Buscar produto para teste
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado para teste');
      return;
    }

    const estoqueInicial = testProduct.stock_quantity;
    console.log(`📦 Produto teste: ${testProduct.name} (Estoque: ${estoqueInicial})`);
    
    // Habilitar logging se possível
    try {
      await supabase.rpc('exec_sql', {
        sql: `SET log_statement = 'all';`
      });
      console.log('✅ Logging habilitado');
    } catch (error) {
      console.log('⚠️ Não foi possível habilitar logging');
    }

    // Criar venda com monitoramento
    console.log('\n🧪 Criando venda com monitoramento...');
    
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: 25.00,
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
    
    // Monitorar estoque antes da inserção
    console.log(`📊 Estoque antes da inserção: ${estoqueInicial}`);
    
    // Inserir item com quantidade específica
    const quantidadeTeste = 3;
    console.log(`📝 Inserindo item com ${quantidadeTeste} unidades...`);
    
    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: quantidadeTeste,
        unit_price: 8.33
      })
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return;
    }

    console.log(`✅ Item inserido: ${testItem.id}`);
    
    // Aguardar e verificar múltiplas vezes
    const checkIntervals = [500, 1000, 2000, 3000];
    
    for (const interval of checkIntervals) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const { data: currentProduct, error: checkError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', testProduct.id)
        .single();

      if (!checkError && currentProduct) {
        const reducaoAtual = estoqueInicial - currentProduct.stock_quantity;
        console.log(`📊 Após ${interval}ms: Estoque=${currentProduct.stock_quantity}, Redução=${reducaoAtual}`);
        
        if (reducaoAtual > quantidadeTeste) {
          console.log(`   ⚠️ Redução excessiva detectada: ${reducaoAtual}/${quantidadeTeste}`);
        }
      }
    }

    // Verificar movimentações de estoque
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testProduct.id)
      .eq('reference_id', testSale.id)
      .order('created_at', { ascending: false });

    if (!movError && movements) {
      console.log(`📋 Movimentações registradas: ${movements.length}`);
      movements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
        console.log(`      ${mov.previous_stock} → ${mov.new_stock}`);
        console.log(`      Notas: ${mov.notes}`);
      });
    }

    // Limpeza
    console.log('\n🧹 Limpando dados de teste...');
    await supabase.from('sale_items').delete().eq('id', testItem.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueInicial })
      .eq('id', testProduct.id);
    
    console.log('✅ Limpeza concluída');

    // 7. Análise final
    console.log('\n7️⃣ ANÁLISE FINAL...');
    
    const finalStock = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (finalStock.data) {
      const reducaoFinal = estoqueInicial - finalStock.data.stock_quantity;
      console.log(`📊 Redução final após limpeza: ${reducaoFinal}`);
      
      if (reducaoFinal === 0) {
        console.log('✅ Estoque restaurado corretamente');
      } else {
        console.log(`❌ Estoque não foi restaurado completamente: ${reducaoFinal} unidades`);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante investigação:', error);
  }
}

// Executar investigação
investigacaoProfundaDuplicacao();
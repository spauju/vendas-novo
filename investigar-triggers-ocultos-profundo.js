require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigarTriggersOcultos() {
  console.log('🔍 INVESTIGAÇÃO PROFUNDA DE TRIGGERS OCULTOS');
  console.log('='.repeat(70));
  
  try {
    // 1. Buscar TODOS os triggers no banco (incluindo internos)
    console.log('\n1️⃣ TODOS OS TRIGGERS (incluindo internos):');
    const { data: allTriggers, error: allError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          p.proname as function_name,
          CASE t.tgenabled
            WHEN 'O' THEN 'ENABLED'
            WHEN 'D' THEN 'DISABLED'
            WHEN 'R' THEN 'REPLICA'
            WHEN 'A' THEN 'ALWAYS'
            ELSE 'UNKNOWN'
          END as status,
          t.tgisinternal as is_internal,
          pg_get_triggerdef(t.oid) as trigger_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'public'
        AND c.relname IN ('sale_items', 'products', 'stock_movements', 'sales')
        ORDER BY c.relname, t.tgname;
      `
    });
    
    if (allError) {
      console.error('❌ Erro:', allError);
    } else if (allTriggers && allTriggers.length > 0) {
      console.log(`\n📊 Total de triggers encontrados: ${allTriggers.length}\n`);
      
      allTriggers.forEach(t => {
        console.log(`📌 ${t.table_name}.${t.trigger_name}`);
        console.log(`   Status: ${t.status}`);
        console.log(`   Função: ${t.function_name}`);
        console.log(`   Interno: ${t.is_internal ? 'Sim' : 'Não'}`);
        console.log(`   Definição: ${t.trigger_definition}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhum trigger encontrado');
    }
    
    // 2. Buscar funções que modificam stock_quantity
    console.log('\n2️⃣ FUNÇÕES QUE MODIFICAM stock_quantity:');
    const { data: stockFunctions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
          pg_get_functiondef(p.oid) ILIKE '%stock_quantity%'
          OR pg_get_functiondef(p.oid) ILIKE '%products%'
          OR pg_get_functiondef(p.oid) ILIKE '%sale_items%'
        )
        ORDER BY p.proname;
      `
    });
    
    if (funcError) {
      console.error('❌ Erro:', funcError);
    } else if (stockFunctions && stockFunctions.length > 0) {
      console.log(`\n📊 Total de funções encontradas: ${stockFunctions.length}\n`);
      
      stockFunctions.forEach(f => {
        console.log(`🔧 ${f.function_name}`);
        console.log('─'.repeat(70));
        console.log(f.function_definition);
        console.log('\n');
      });
    } else {
      console.log('✅ Nenhuma função encontrada');
    }
    
    // 3. Verificar políticas RLS que podem estar causando problemas
    console.log('\n3️⃣ POLÍTICAS RLS EM TABELAS CRÍTICAS:');
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
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
        WHERE tablename IN ('sale_items', 'products', 'stock_movements', 'sales')
        ORDER BY tablename, policyname;
      `
    });
    
    if (policyError) {
      console.error('❌ Erro:', policyError);
    } else if (policies && policies.length > 0) {
      console.log(`\n📊 Total de políticas encontradas: ${policies.length}\n`);
      
      let currentTable = '';
      policies.forEach(p => {
        if (p.tablename !== currentTable) {
          currentTable = p.tablename;
          console.log(`\n📋 Tabela: ${p.tablename}`);
        }
        console.log(`   🔒 ${p.policyname}`);
        console.log(`      Comando: ${p.cmd}`);
        console.log(`      Roles: ${p.roles}`);
        if (p.qual) console.log(`      Qual: ${p.qual}`);
        if (p.with_check) console.log(`      With Check: ${p.with_check}`);
      });
    } else {
      console.log('✅ Nenhuma política RLS encontrada');
    }
    
    // 4. Verificar event triggers
    console.log('\n4️⃣ EVENT TRIGGERS:');
    const { data: eventTriggers, error: eventError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          evtname as event_trigger_name,
          evtevent as event,
          evtenabled as enabled,
          evtfoid::regproc as function_name
        FROM pg_event_trigger
        ORDER BY evtname;
      `
    });
    
    if (eventError) {
      console.error('❌ Erro:', eventError);
    } else if (eventTriggers && eventTriggers.length > 0) {
      console.log(`\n📊 Total de event triggers: ${eventTriggers.length}\n`);
      eventTriggers.forEach(et => {
        console.log(`⚡ ${et.event_trigger_name}`);
        console.log(`   Evento: ${et.event}`);
        console.log(`   Status: ${et.enabled}`);
        console.log(`   Função: ${et.function_name}`);
      });
    } else {
      console.log('✅ Nenhum event trigger encontrado');
    }
    
    // 5. Testar inserção direta para ver o que acontece
    console.log('\n5️⃣ TESTE DE INSERÇÃO DIRETA:');
    console.log('Criando venda de teste...');
    
    // Buscar produto com estoque
    const { data: produto, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 20)
      .limit(1)
      .single();
    
    if (prodError || !produto) {
      console.log('❌ Produto não encontrado');
      return;
    }
    
    const estoqueAntes = produto.stock_quantity;
    console.log(`📦 Produto: ${produto.name}`);
    console.log(`📊 Estoque antes: ${estoqueAntes}`);
    
    // Criar venda
    const { data: venda, error: vendaError } = await supabase
      .from('sales')
      .insert({
        total_amount: 50,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid'
      })
      .select()
      .single();
    
    if (vendaError) {
      console.error('❌ Erro ao criar venda:', vendaError);
      return;
    }
    
    console.log(`✅ Venda criada: ${venda.id}`);
    
    // Inserir item SEM usar a função controlada
    const quantidadeTeste = 5;
    console.log(`\n📝 Inserindo ${quantidadeTeste} unidades em sale_items...`);
    
    const { data: item, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: venda.id,
        product_id: produto.id,
        quantity: quantidadeTeste,
        unit_price: 10
      })
      .select()
      .single();
    
    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return;
    }
    
    console.log(`✅ Item inserido: ${item.id}`);
    
    // Aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar estoque depois
    const { data: produtoDepois, error: depoisError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (!depoisError && produtoDepois) {
      const reducao = estoqueAntes - produtoDepois.stock_quantity;
      const multiplicador = reducao / quantidadeTeste;
      
      console.log(`\n📊 RESULTADO:`);
      console.log(`   Estoque antes: ${estoqueAntes}`);
      console.log(`   Estoque depois: ${produtoDepois.stock_quantity}`);
      console.log(`   Redução: ${reducao} unidades`);
      console.log(`   Quantidade inserida: ${quantidadeTeste}`);
      console.log(`   Multiplicador: ${multiplicador}x`);
      
      if (multiplicador === 1) {
        console.log(`   ✅ Correto!`);
      } else if (multiplicador === 2) {
        console.log(`   ❌ DUPLICAÇÃO 2X CONFIRMADA!`);
      } else {
        console.log(`   ⚠️ Multiplicador inesperado: ${multiplicador}x`);
      }
    }
    
    // Verificar movimentações criadas
    const { data: movimentos, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', produto.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!movError && movimentos && movimentos.length > 0) {
      console.log(`\n📋 Movimentações criadas: ${movimentos.length}`);
      movimentos.forEach((mov, i) => {
        console.log(`   ${i + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
        console.log(`      ${mov.previous_stock} → ${mov.new_stock}`);
        console.log(`      Notas: ${mov.notes || 'N/A'}`);
        console.log(`      Criado em: ${mov.created_at}`);
      });
    }
    
    // Limpar teste
    console.log('\n🧹 Limpando teste...');
    await supabase.from('sale_items').delete().eq('id', item.id);
    await supabase.from('sales').delete().eq('id', venda.id);
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueAntes })
      .eq('id', produto.id);
    console.log('✅ Limpeza concluída');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

investigarTriggersOcultos();

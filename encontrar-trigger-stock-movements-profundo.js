require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function encontrarTriggerStockMovements() {
  console.log('🔍 INVESTIGAÇÃO PROFUNDA: TRIGGER EM STOCK_MOVEMENTS');
  console.log('='.repeat(70));
  
  try {
    // Buscar TODOS os triggers (incluindo system triggers)
    console.log('\n1️⃣ TODOS OS TRIGGERS (incluindo system):');
    const { data: allTrigs, error: err1 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.oid,
          t.tgname as trigger_name,
          c.relname as table_name,
          t.tgenabled,
          t.tgisinternal,
          t.tgtype,
          p.proname as function_name,
          pg_get_triggerdef(t.oid, true) as trigger_def
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'public'
        AND c.relname IN ('stock_movements', 'products')
        ORDER BY c.relname, t.tgname;
      `
    });
    
    if (!err1 && allTrigs && allTrigs.length > 0) {
      console.log(`\n📊 Encontrados ${allTrigs.length} trigger(s):\n`);
      
      for (const t of allTrigs) {
        console.log(`📌 ${t.table_name}.${t.trigger_name} (OID: ${t.oid})`);
        console.log(`   Enabled: ${t.tgenabled}`);
        console.log(`   Internal: ${t.tgisinternal}`);
        console.log(`   Type: ${t.tgtype}`);
        console.log(`   Function: ${t.function_name}`);
        console.log(`   Definition: ${t.trigger_def}`);
        
        // Buscar definição da função
        if (t.function_name) {
          const { data: funcDef, error: funcErr } = await supabase.rpc('exec_sql', {
            sql: `
              SELECT pg_get_functiondef(oid) as definition
              FROM pg_proc
              WHERE proname = '${t.function_name}'
              LIMIT 1;
            `
          });
          
          if (!funcErr && funcDef && funcDef.length > 0) {
            console.log(`\n   📜 Código da Função:`);
            console.log('   ' + '─'.repeat(66));
            console.log(funcDef[0].definition.split('\n').map(line => '   ' + line).join('\n'));
          }
        }
        console.log('\n');
      }
      
      // Remover cada trigger encontrado
      console.log('\n2️⃣ REMOVENDO TRIGGERS ENCONTRADOS...\n');
      for (const t of allTrigs) {
        try {
          await supabase.rpc('exec_sql', {
            sql: `DROP TRIGGER IF EXISTS "${t.trigger_name}" ON ${t.table_name} CASCADE;`
          });
          console.log(`✅ Removido: ${t.table_name}.${t.trigger_name}`);
          
          // Tentar remover a função também
          if (t.function_name && !['exec_sql', 'reduce_stock_controlled', 'process_sale_with_stock_control', 'reduce_stock_simple'].includes(t.function_name)) {
            try {
              await supabase.rpc('exec_sql', {
                sql: `DROP FUNCTION IF EXISTS ${t.function_name} CASCADE;`
              });
              console.log(`✅ Função removida: ${t.function_name}`);
            } catch (e) {
              console.log(`⚠️ Não foi possível remover função: ${t.function_name}`);
            }
          }
        } catch (e) {
          console.log(`❌ Erro ao remover: ${t.trigger_name}`);
        }
      }
      
    } else {
      console.log('✅ Nenhum trigger encontrado');
    }
    
    // Verificar se há constraints ou rules
    console.log('\n3️⃣ VERIFICANDO RULES:');
    const { data: rules, error: rulesErr } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rulename,
          definition
        FROM pg_rules
        WHERE schemaname = 'public'
        AND tablename IN ('stock_movements', 'products')
        ORDER BY tablename, rulename;
      `
    });
    
    if (!rulesErr && rules && rules.length > 0) {
      console.log(`\n📊 Encontradas ${rules.length} rule(s):\n`);
      rules.forEach(r => {
        console.log(`📋 ${r.tablename}.${r.rulename}`);
        console.log(`   ${r.definition}`);
      });
    } else {
      console.log('✅ Nenhuma rule encontrada');
    }
    
    // Testar novamente
    console.log('\n4️⃣ TESTANDO APÓS REMOÇÃO...');
    
    const { data: produto, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 20)
      .limit(1)
      .single();
    
    if (!prodError && produto) {
      const estoqueInicial = produto.stock_quantity;
      console.log(`\n📦 Produto: ${produto.name}`);
      console.log(`📊 Estoque inicial: ${estoqueInicial}`);
      
      // Criar venda
      const { data: venda, error: vendaError } = await supabase
        .from('sales')
        .insert({
          total_amount: 30,
          payment_method: 'cash',
          status: 'completed',
          payment_status: 'paid'
        })
        .select()
        .single();
      
      if (!vendaError && venda) {
        console.log(`✅ Venda criada: ${venda.id}`);
        
        // Usar função com stock_movements
        const { data: result, error: resultError } = await supabase.rpc('reduce_stock_controlled', {
          p_product_id: produto.id,
          p_quantity: 3,
          p_sale_id: venda.id
        });
        
        if (!resultError) {
          console.log(`📊 Resultado:`, JSON.stringify(result, null, 2));
          
          // Aguardar
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verificar
          const { data: prodFinal, error: finalErr } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', produto.id)
            .single();
          
          if (!finalErr && prodFinal) {
            const reducao = estoqueInicial - prodFinal.stock_quantity;
            console.log(`\n📊 Estoque final: ${prodFinal.stock_quantity}`);
            console.log(`📊 Redução: ${reducao} (esperado: 3)`);
            console.log(`📊 Multiplicador: ${reducao / 3}x`);
            
            if (reducao === 3) {
              console.log(`\n✅ PROBLEMA RESOLVIDO! Sem duplicação!`);
            } else {
              console.log(`\n❌ Ainda há problema`);
            }
          }
          
          // Limpar
          await supabase.from('stock_movements').delete().eq('reference_id', venda.id);
          await supabase.from('sales').delete().eq('id', venda.id);
          await supabase.from('products').update({ stock_quantity: estoqueInicial }).eq('id', produto.id);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

encontrarTriggerStockMovements();

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarTriggersOcultos() {
  console.log('🔍 INVESTIGANDO TRIGGERS OCULTOS - CAUSA DA DUPLICAÇÃO 2X');
  console.log('='.repeat(70));
  
  try {
    // 1. Buscar TODOS os triggers do banco, incluindo internos
    console.log('\n1️⃣ Buscando TODOS os triggers (incluindo internos):');
    
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
        WHERE n.nspname IN ('public', 'auth', 'storage', 'realtime')
        ORDER BY c.relname, t.tgname;
      `
    });

    if (triggerError) {
      console.error('❌ Erro ao buscar triggers:', triggerError);
      return;
    }

    console.log(`📊 Total de triggers encontrados: ${allTriggers?.length || 0}`);
    
    // Filtrar triggers relacionados a sale_items ou estoque
    const relevantTriggers = allTriggers?.filter(t => 
      t.table_name === 'sale_items' ||
      t.function_name.includes('stock') ||
      t.function_name.includes('sale') ||
      t.definition.includes('stock_quantity') ||
      t.definition.includes('sale_items')
    ) || [];

    if (relevantTriggers.length > 0) {
      console.log(`\n🎯 TRIGGERS RELEVANTES ENCONTRADOS (${relevantTriggers.length}):`);
      
      relevantTriggers.forEach((trigger, index) => {
        console.log(`\n${index + 1}. ${trigger.schema_name}.${trigger.table_name}.${trigger.trigger_name}`);
        console.log(`   Função: ${trigger.function_name}`);
        console.log(`   Status: ${trigger.status}`);
        console.log(`   Interno: ${trigger.is_internal ? 'Sim' : 'Não'}`);
        console.log(`   Timing: ${trigger.timing} ${trigger.events}`);
        
        if (trigger.table_name === 'sale_items') {
          console.log('   🚨 ESTE TRIGGER ESTÁ NA TABELA SALE_ITEMS!');
        }
        
        if (trigger.function_name.includes('stock')) {
          console.log('   💰 ESTE TRIGGER AFETA ESTOQUE!');
        }
        
        console.log(`   Definição: ${trigger.definition}`);
      });
    } else {
      console.log('❌ Nenhum trigger relevante encontrado');
    }

    // 2. Buscar funções que modificam estoque
    console.log('\n2️⃣ Buscando funções que modificam estoque:');
    
    const { data: stockFunctions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          n.nspname as schema_name,
          p.proname as function_name,
          p.prosrc as function_body,
          p.prokind as function_kind
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname IN ('public', 'auth', 'storage')
        AND (
          p.prosrc LIKE '%stock_quantity%' OR
          p.prosrc LIKE '%sale_items%' OR
          p.proname LIKE '%stock%' OR
          p.proname LIKE '%sale%'
        )
        ORDER BY p.proname;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao buscar funções:', funcError);
    } else if (stockFunctions && stockFunctions.length > 0) {
      console.log(`📊 Funções que afetam estoque: ${stockFunctions.length}`);
      
      stockFunctions.forEach((func, index) => {
        console.log(`\n${index + 1}. ${func.schema_name}.${func.function_name}`);
        console.log(`   Tipo: ${func.function_kind === 'f' ? 'Function' : 'Procedure'}`);
        
        // Verificar se modifica stock_quantity
        if (func.function_body.includes('stock_quantity')) {
          console.log('   🎯 MODIFICA ESTOQUE!');
          
          // Contar quantas vezes modifica estoque
          const updateMatches = (func.function_body.match(/UPDATE.*stock_quantity/gi) || []).length;
          const setMatches = (func.function_body.match(/SET.*stock_quantity/gi) || []).length;
          
          if (updateMatches > 0 || setMatches > 0) {
            console.log(`   📊 Operações de UPDATE: ${updateMatches}`);
            console.log(`   📊 Operações de SET: ${setMatches}`);
            
            if (updateMatches > 1 || setMatches > 1) {
              console.log('   ⚠️ MÚLTIPLAS OPERAÇÕES DE ESTOQUE NA MESMA FUNÇÃO!');
            }
          }
          
          // Extrair linhas relevantes
          const lines = func.function_body.split('\n');
          const stockLines = lines.filter(line => 
            line.toLowerCase().includes('stock_quantity') && 
            (line.toLowerCase().includes('update') || line.toLowerCase().includes('set'))
          );
          
          if (stockLines.length > 0) {
            console.log('   Operações de estoque:');
            stockLines.forEach(line => {
              console.log(`     ${line.trim()}`);
            });
          }
        }
      });
    }

    // 3. Verificar se há triggers em outras tabelas que afetam sale_items
    console.log('\n3️⃣ Verificando triggers em outras tabelas que podem afetar sale_items:');
    
    const otherTriggers = allTriggers?.filter(t => 
      t.table_name !== 'sale_items' && 
      (t.definition.includes('sale_items') || t.function_name.includes('sale'))
    ) || [];

    if (otherTriggers.length > 0) {
      console.log(`📊 Triggers em outras tabelas: ${otherTriggers.length}`);
      
      otherTriggers.forEach((trigger, index) => {
        console.log(`\n${index + 1}. ${trigger.table_name}.${trigger.trigger_name}`);
        console.log(`   Função: ${trigger.function_name}`);
        console.log(`   🔗 PODE AFETAR SALE_ITEMS INDIRETAMENTE`);
        console.log(`   Definição: ${trigger.definition}`);
      });
    } else {
      console.log('✅ Nenhum trigger externo afetando sale_items');
    }

    // 4. Verificar se há RLS (Row Level Security) que pode estar duplicando
    console.log('\n4️⃣ Verificando RLS na tabela sale_items:');
    
    const { data: rlsPolicies, error: rlsError } = await supabase.rpc('exec_sql', {
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
        WHERE tablename = 'sale_items';
      `
    });

    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError);
    } else if (rlsPolicies && rlsPolicies.length > 0) {
      console.log(`📊 Políticas RLS encontradas: ${rlsPolicies.length}`);
      
      rlsPolicies.forEach((policy, index) => {
        console.log(`\n${index + 1}. ${policy.policyname}`);
        console.log(`   Comando: ${policy.cmd}`);
        console.log(`   Roles: ${policy.roles}`);
        console.log(`   Qualificação: ${policy.qual}`);
        console.log(`   With Check: ${policy.with_check}`);
      });
    } else {
      console.log('✅ Nenhuma política RLS em sale_items');
    }

    // 5. Teste final para confirmar a duplicação
    console.log('\n5️⃣ TESTE FINAL - Confirmando multiplicador de duplicação:');
    
    // Buscar produto
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 20)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado para teste');
      return;
    }

    const estoqueInicial = testProduct.stock_quantity;
    console.log(`📦 Produto: ${testProduct.name} (Estoque: ${estoqueInicial})`);
    
    // Testar com diferentes quantidades
    const testQuantities = [1, 3, 5];
    
    for (const qty of testQuantities) {
      console.log(`\n🧪 Testando com ${qty} unidades:`);
      
      // Criar venda
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_amount: qty * 10,
          payment_method: 'cash',
          status: 'completed',
          payment_status: 'paid'
        })
        .select()
        .single();

      if (saleError) {
        console.log(`❌ Erro ao criar venda: ${saleError.message}`);
        continue;
      }

      // Inserir item
      const { data: item, error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          product_id: testProduct.id,
          quantity: qty,
          unit_price: 10.00
        })
        .select()
        .single();

      if (itemError) {
        console.log(`❌ Erro ao inserir item: ${itemError.message}`);
        continue;
      }

      // Aguardar processamento
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verificar estoque
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', testProduct.id)
        .single();

      if (!updateError && updatedProduct) {
        const reducao = estoqueInicial - updatedProduct.stock_quantity;
        const multiplicador = reducao / qty;
        
        console.log(`   Esperado: ${qty} | Real: ${reducao} | Multiplicador: ${multiplicador}x`);
        
        if (multiplicador !== 1) {
          console.log(`   ❌ DUPLICAÇÃO CONFIRMADA: ${multiplicador}x`);
        } else {
          console.log(`   ✅ Sem duplicação`);
        }
      }

      // Limpeza
      await supabase.from('sale_items').delete().eq('id', item.id);
      await supabase.from('sales').delete().eq('id', sale.id);
      
      // Restaurar estoque
      await supabase
        .from('products')
        .update({ stock_quantity: estoqueInicial })
        .eq('id', testProduct.id);
    }

  } catch (error) {
    console.error('❌ Erro durante investigação:', error);
  }
}

// Executar investigação
investigarTriggersOcultos();
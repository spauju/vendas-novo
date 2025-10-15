require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersFinal() {
  console.log('🔍 VERIFICAÇÃO FINAL DE TRIGGERS - DESCOBRINDO A CAUSA DA QUADRUPLICAÇÃO');
  console.log('='.repeat(80));
  
  try {
    // 1. Verificar TODOS os triggers do banco (incluindo internos)
    console.log('\n📋 1. TODOS OS TRIGGERS DO BANCO...');
    
    const { data: allTriggers } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          n.nspname as schema_name,
          p.proname as function_name,
          CASE t.tgenabled 
            WHEN 'O' THEN 'enabled'
            WHEN 'D' THEN 'disabled'
            WHEN 'R' THEN 'replica'
            WHEN 'A' THEN 'always'
            ELSE 'unknown'
          END as status,
          t.tgisinternal as is_internal,
          pg_get_triggerdef(t.oid) as definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY c.relname, t.tgname;
      `
    }).catch(err => {
      console.log('❌ Erro ao buscar triggers:', err.message);
      return { data: null };
    });

    if (allTriggers && allTriggers.length > 0) {
      console.log(`📊 TOTAL DE TRIGGERS: ${allTriggers.length}`);
      
      // Filtrar por tabelas relevantes
      const relevantTriggers = allTriggers.filter(t => 
        ['sale_items', 'products', 'stock_movements', 'sales'].includes(t.table_name)
      );
      
      if (relevantTriggers.length > 0) {
        console.log(`\n🎯 TRIGGERS EM TABELAS RELEVANTES (${relevantTriggers.length}):`);
        relevantTriggers.forEach((trigger, index) => {
          console.log(`\n${index + 1}. ${trigger.table_name}.${trigger.trigger_name}`);
          console.log(`   Função: ${trigger.function_name}`);
          console.log(`   Status: ${trigger.status}`);
          console.log(`   Interno: ${trigger.is_internal ? 'Sim' : 'Não'}`);
          console.log(`   Schema: ${trigger.schema_name}`);
          
          if (trigger.table_name === 'sale_items') {
            console.log('   🚨 ESTE TRIGGER ESTÁ NA TABELA SALE_ITEMS!');
            console.log(`   Definição: ${trigger.definition}`);
          }
        });
      } else {
        console.log('❌ Nenhum trigger encontrado em tabelas relevantes');
      }
    } else {
      console.log('❌ Nenhum trigger encontrado no banco');
    }

    // 2. Verificar especificamente funções que modificam stock_quantity
    console.log('\n🔧 2. FUNÇÕES QUE MODIFICAM STOCK_QUANTITY...');
    
    const { data: stockFunctions } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          p.proname as function_name,
          n.nspname as schema_name,
          p.prosrc as source_code,
          p.oid as function_oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosrc LIKE '%stock_quantity%'
        ORDER BY p.proname;
      `
    }).catch(err => {
      console.log('❌ Erro ao buscar funções:', err.message);
      return { data: null };
    });

    if (stockFunctions && stockFunctions.length > 0) {
      console.log(`🚨 ENCONTRADAS ${stockFunctions.length} FUNÇÕES QUE MODIFICAM STOCK_QUANTITY:`);
      
      stockFunctions.forEach((func, index) => {
        console.log(`\n${index + 1}. ${func.function_name} (OID: ${func.function_oid})`);
        
        // Analisar o código da função
        const code = func.source_code;
        const lines = code.split('\n');
        
        // Procurar por UPDATEs em products
        const updateLines = lines.filter(line => 
          line.toLowerCase().includes('update') && 
          line.toLowerCase().includes('products') &&
          line.toLowerCase().includes('stock_quantity')
        );
        
        if (updateLines.length > 0) {
          console.log('   🚨 ESTA FUNÇÃO ATUALIZA STOCK_QUANTITY EM PRODUCTS!');
          console.log('   Linhas relevantes:');
          updateLines.forEach(line => {
            console.log(`     ${line.trim()}`);
          });
        }
        
        // Verificar se há múltiplas operações
        const allUpdateLines = lines.filter(line => 
          line.toLowerCase().includes('update') && 
          line.toLowerCase().includes('products')
        );
        
        if (allUpdateLines.length > 1) {
          console.log(`   ⚠️ MÚLTIPLAS OPERAÇÕES UPDATE (${allUpdateLines.length}):`);
          allUpdateLines.forEach(line => {
            console.log(`     ${line.trim()}`);
          });
        }
      });
    } else {
      console.log('❌ Nenhuma função que modifica stock_quantity encontrada');
    }

    // 3. Verificar se há triggers que chamam essas funções
    console.log('\n🔗 3. MAPEANDO TRIGGERS → FUNÇÕES...');
    
    if (allTriggers && stockFunctions) {
      const triggerFunctionMap = allTriggers
        .filter(t => ['sale_items', 'products'].includes(t.table_name))
        .map(trigger => {
          const matchingFunction = stockFunctions.find(f => f.function_name === trigger.function_name);
          return {
            trigger: trigger,
            hasStockFunction: !!matchingFunction
          };
        });
      
      const problematicTriggers = triggerFunctionMap.filter(t => t.hasStockFunction);
      
      if (problematicTriggers.length > 0) {
        console.log(`🚨 TRIGGERS PROBLEMÁTICOS ENCONTRADOS (${problematicTriggers.length}):`);
        problematicTriggers.forEach((item, index) => {
          const trigger = item.trigger;
          console.log(`\n${index + 1}. ${trigger.table_name}.${trigger.trigger_name}`);
          console.log(`   → Chama função: ${trigger.function_name}`);
          console.log(`   → Status: ${trigger.status}`);
          
          if (trigger.table_name === 'sale_items') {
            console.log('   🚨 ESTE É O TRIGGER QUE PODE ESTAR CAUSANDO O PROBLEMA!');
          }
        });
      } else {
        console.log('✅ Nenhum trigger problemático encontrado');
      }
    }

    // 4. Teste final com monitoramento detalhado
    console.log('\n🧪 4. TESTE FINAL COM MONITORAMENTO DETALHADO...');
    
    const { data: testProduct } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (!testProduct) {
      console.log('❌ Produto não encontrado para teste');
      return;
    }

    console.log(`📦 Produto: ${testProduct.name} (ID: ${testProduct.id})`);
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

    // Verificar estoque antes
    const { data: stockBefore } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque antes: ${stockBefore.stock_quantity}`);

    // Inserir item com monitoramento
    console.log('⚡ Inserindo item de venda...');
    
    const insertStart = Date.now();
    
    await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      });

    const insertEnd = Date.now();

    // Verificar estoque depois
    const { data: stockAfter } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction = stockBefore.stock_quantity - stockAfter.stock_quantity;
    
    console.log(`📊 Estoque depois: ${stockAfter.stock_quantity}`);
    console.log(`📉 Redução: ${reduction} unidades`);
    console.log(`⏱️ Tempo: ${insertEnd - insertStart}ms`);

    // Verificar movimentos criados
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id);

    console.log(`📋 Movimentos criados: ${movements?.length || 0}`);

    if (reduction === 4) {
      console.log('\n🚨 PROBLEMA CONFIRMADO!');
      console.log('💡 CAUSA PROVÁVEL: Trigger duplicado ou função executando múltiplas vezes');
      
      if (problematicTriggers && problematicTriggers.length > 0) {
        console.log('\n🎯 TRIGGERS SUSPEITOS:');
        problematicTriggers.forEach(item => {
          console.log(`   - ${item.trigger.table_name}.${item.trigger.trigger_name}`);
        });
      }
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

    console.log('✅ Verificação final concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarTriggersFinal();
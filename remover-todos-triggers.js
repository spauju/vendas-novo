require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function removerTodosTriggers() {
  console.log('🗑️ REMOVENDO TODOS OS TRIGGERS DE ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // Lista de todos os possíveis triggers que podem estar duplicados
    const triggersParaRemover = [
      'trigger_update_stock_on_sale',
      'trigger_update_stock_on_sale_insert',
      'trigger_revert_stock_on_sale_delete',
      'trigger_adjust_stock_on_sale_update',
      'trigger_update_stock_on_movement',
      'trigger_update_stock_on_movement_insert',
      'trigger_revert_stock_on_movement_delete'
    ];
    
    console.log('\n1️⃣ Removendo triggers da tabela sale_items...');
    
    for (const triggerName of triggersParaRemover) {
      console.log(`   🗑️ Removendo ${triggerName} da tabela sale_items...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP TRIGGER IF EXISTS ${triggerName} ON public.sale_items;`
      });
      
      if (error) {
        console.log(`   ⚠️ Erro ao remover ${triggerName}:`, error.message);
      } else {
        console.log(`   ✅ ${triggerName} removido (se existia)`);
      }
    }
    
    console.log('\n2️⃣ Removendo triggers da tabela stock_movements...');
    
    for (const triggerName of triggersParaRemover) {
      console.log(`   🗑️ Removendo ${triggerName} da tabela stock_movements...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP TRIGGER IF EXISTS ${triggerName} ON public.stock_movements;`
      });
      
      if (error) {
        console.log(`   ⚠️ Erro ao remover ${triggerName}:`, error.message);
      } else {
        console.log(`   ✅ ${triggerName} removido (se existia)`);
      }
    }
    
    console.log('\n3️⃣ Removendo funções relacionadas...');
    
    const funcoesParaRemover = [
      'update_stock_on_sale',
      'revert_stock_on_sale_delete',
      'adjust_stock_on_sale_update',
      'update_stock_on_movement',
      'revert_stock_on_movement_delete'
    ];
    
    for (const funcaoName of funcoesParaRemover) {
      console.log(`   🗑️ Removendo função ${funcaoName}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP FUNCTION IF EXISTS ${funcaoName}();`
      });
      
      if (error) {
        console.log(`   ⚠️ Erro ao remover função ${funcaoName}:`, error.message);
      } else {
        console.log(`   ✅ Função ${funcaoName} removida (se existia)`);
      }
    }
    
    console.log('\n4️⃣ Verificando se ainda existem triggers...');
    
    const { data: triggersRestantes, error: verificarError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_object_table,
          event_manipulation,
          action_timing
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
          AND (event_object_table = 'sale_items' OR event_object_table = 'stock_movements')
        ORDER BY event_object_table, trigger_name;
      `
    });
    
    if (verificarError) {
      console.error('❌ Erro ao verificar triggers restantes:', verificarError);
    } else if (triggersRestantes && triggersRestantes.length > 0) {
      console.log(`⚠️ Ainda existem ${triggersRestantes.length} triggers:`);
      triggersRestantes.forEach(trigger => {
        console.log(`   📌 ${trigger.trigger_name} na tabela ${trigger.event_object_table}`);
      });
    } else {
      console.log('✅ Nenhum trigger encontrado - limpeza completa!');
    }
    
    console.log('\n🎉 LIMPEZA CONCLUÍDA!');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Criar apenas UM trigger correto para sale_items');
    console.log('2. Testar se o estoque é reduzido corretamente (3x ao invés de 18x)');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

removerTodosTriggers();
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersExistentes() {
  console.log('🔍 Verificando triggers existentes no banco de dados...');
  
  try {
    // Verificar triggers usando SQL direto
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_object_table,
          action_timing,
          event_manipulation,
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        AND (
          trigger_name LIKE '%stock%' 
          OR trigger_name LIKE '%sale%'
          OR event_object_table IN ('sale_items', 'stock_movements', 'products')
        )
        ORDER BY event_object_table, trigger_name;
      `
    });

    if (error) {
      console.error('❌ Erro ao verificar triggers:', error);
      return;
    }

    const triggers = data || [];
    console.log(`✅ Encontrados ${triggers.length} triggers relacionados ao estoque:`);
    
    if (triggers.length === 0) {
      console.log('⚠️ Nenhum trigger encontrado!');
    } else {
      triggers.forEach((trigger, index) => {
        console.log(`\n${index + 1}. ${trigger.trigger_name}`);
        console.log(`   Tabela: ${trigger.event_object_table}`);
        console.log(`   Timing: ${trigger.action_timing}`);
        console.log(`   Evento: ${trigger.event_manipulation}`);
        console.log(`   Função: ${trigger.action_statement}`);
      });
    }

    // Verificar também as funções relacionadas
    console.log('\n🔍 Verificando funções relacionadas...');
    
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          routine_name,
          routine_type,
          data_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND (
          routine_name LIKE '%stock%' 
          OR routine_name LIKE '%sale%'
        )
        ORDER BY routine_name;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao verificar funções:', funcError);
    } else {
      const funcs = functions || [];
      console.log(`✅ Encontradas ${funcs.length} funções relacionadas:`);
      funcs.forEach((func, index) => {
        console.log(`${index + 1}. ${func.routine_name} (${func.routine_type})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTriggersExistentes();
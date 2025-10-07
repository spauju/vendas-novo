require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersExecSql() {
  console.log('🔍 Verificando triggers usando exec_sql...');
  
  try {
    // Verificar triggers
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement,
          event_object_table
        FROM information_schema.triggers 
        WHERE event_object_table = 'sale_items'
        AND trigger_schema = 'public'
        ORDER BY trigger_name;
      `
    });

    if (triggerError) {
      console.error('❌ Erro ao verificar triggers:', triggerError);
    } else {
      console.log(`✅ Encontrados ${triggers?.length || 0} triggers na tabela sale_items:`);
      triggers?.forEach((trigger, index) => {
        console.log(`\n${index + 1}. ${trigger.trigger_name}`);
        console.log(`   Evento: ${trigger.event_manipulation}`);
        console.log(`   Timing: ${trigger.action_timing}`);
        console.log(`   Ação: ${trigger.action_statement}`);
      });
    }

    // Verificar funções
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          routine_name,
          routine_type,
          data_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_name LIKE '%stock%'
        ORDER BY routine_name;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao verificar funções:', funcError);
    } else {
      console.log(`\n✅ Encontradas ${functions?.length || 0} funções relacionadas a estoque:`);
      functions?.forEach((func, index) => {
        console.log(`${index + 1}. ${func.routine_name} (${func.routine_type})`);
      });
    }

    // Verificar se as tabelas existem
    const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sale_items', 'stock_movements', 'products')
        ORDER BY table_name;
      `
    });

    if (tableError) {
      console.error('❌ Erro ao verificar tabelas:', tableError);
    } else {
      console.log(`\n✅ Tabelas encontradas: ${tables?.map(t => t.table_name).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTriggersExecSql();
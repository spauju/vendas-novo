require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersDuplicados() {
  console.log('🔍 Verificando triggers duplicados...');
  
  try {
    // Verificar todos os triggers na tabela sale_items
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement,
          trigger_schema,
          event_object_table
        FROM information_schema.triggers 
        WHERE event_object_table = 'sale_items'
        AND trigger_schema = 'public'
        ORDER BY trigger_name;
      `
    });

    if (triggerError) {
      console.error('❌ Erro ao verificar triggers:', triggerError);
      return;
    }

    console.log(`✅ Encontrados ${triggers?.length || 0} triggers na tabela sale_items:`);
    const triggerList = triggers || [];
    triggerList.forEach((trigger, index) => {
      console.log(`\n${index + 1}. ${trigger.trigger_name}`);
      console.log(`   Evento: ${trigger.event_manipulation}`);
      console.log(`   Timing: ${trigger.action_timing}`);
      console.log(`   Ação: ${trigger.action_statement}`);
    });

    // Verificar funções relacionadas a estoque
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          routine_name,
          routine_definition
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
      const functionList = functions || [];
      functionList.forEach((func, index) => {
        console.log(`\n${index + 1}. ${func.routine_name}`);
        console.log(`   Definição: ${func.routine_definition.substring(0, 200)}...`);
      });
    }

    // Se houver triggers duplicados, remover os antigos
    if (triggerList.length > 1) {
      console.log('\n⚠️ Detectados triggers duplicados! Removendo triggers antigos...');
      
      for (const trigger of triggerList) {
        console.log(`🗑️ Removendo trigger: ${trigger.trigger_name}`);
        
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql: `DROP TRIGGER IF EXISTS ${trigger.trigger_name} ON sale_items;`
        });

        if (dropError) {
          console.error(`❌ Erro ao remover trigger ${trigger.trigger_name}:`, dropError);
        } else {
          console.log(`✅ Trigger ${trigger.trigger_name} removido`);
        }
      }

      // Recriar apenas um trigger
      console.log('\n🔧 Recriando trigger único...');
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TRIGGER trigger_update_stock_on_sale
          AFTER INSERT ON sale_items
          FOR EACH ROW
          EXECUTE FUNCTION update_stock_on_sale();
        `
      });

      if (createError) {
        console.error('❌ Erro ao recriar trigger:', createError);
      } else {
        console.log('✅ Trigger único recriado com sucesso');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTriggersDuplicados();
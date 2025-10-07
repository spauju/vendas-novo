require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigarTriggersSQLDireto() {
  console.log('🔍 Investigando triggers usando SQL direto...\n');
  
  try {
    // 1. Verificar todos os triggers na tabela sale_items
    console.log('1️⃣ Verificando triggers na tabela sale_items...');
    
    const { data: triggers, error: triggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement,
          action_orientation,
          action_condition
        FROM information_schema.triggers 
        WHERE event_object_table = 'sale_items'
        ORDER BY trigger_name;
      `
    });
    
    if (triggersError) {
      console.log('❌ Erro ao verificar triggers:', triggersError.message);
    } else if (triggers && triggers.length > 0) {
      console.log(`✅ Encontrados ${triggers.length} triggers:`);
      triggers.forEach((trigger, index) => {
        console.log(`\n📌 Trigger ${index + 1}:`);
        console.log(`   Nome: ${trigger.trigger_name}`);
        console.log(`   Evento: ${trigger.event_manipulation}`);
        console.log(`   Timing: ${trigger.action_timing}`);
        console.log(`   Orientação: ${trigger.action_orientation}`);
        console.log(`   Condição: ${trigger.action_condition || 'Nenhuma'}`);
        console.log(`   Ação: ${trigger.action_statement}`);
      });
    } else {
      console.log('❌ Nenhum trigger encontrado na tabela sale_items');
    }
    
    // 2. Verificar todas as funções relacionadas a estoque
    console.log('\n2️⃣ Verificando funções relacionadas a estoque...');
    
    const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          routine_name,
          routine_type,
          routine_definition
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND (
          routine_name LIKE '%stock%' 
          OR routine_name LIKE '%estoque%'
          OR routine_name LIKE '%sale%'
          OR routine_name LIKE '%venda%'
        )
        ORDER BY routine_name;
      `
    });
    
    if (functionsError) {
      console.log('❌ Erro ao verificar funções:', functionsError.message);
    } else if (functions && functions.length > 0) {
      console.log(`✅ Encontradas ${functions.length} funções:`);
      functions.forEach((func, index) => {
        console.log(`\n🔧 Função ${index + 1}:`);
        console.log(`   Nome: ${func.routine_name}`);
        console.log(`   Tipo: ${func.routine_type}`);
        console.log(`   Definição: ${func.routine_definition?.substring(0, 200)}...`);
      });
    } else {
      console.log('❌ Nenhuma função relacionada a estoque encontrada');
    }
    
    // 3. Verificar triggers em outras tabelas relacionadas
    console.log('\n3️⃣ Verificando triggers em outras tabelas...');
    
    const { data: allTriggers, error: allTriggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          event_object_table,
          trigger_name,
          event_manipulation,
          action_timing
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public'
        AND event_object_table IN ('products', 'stock_movements', 'sales')
        ORDER BY event_object_table, trigger_name;
      `
    });
    
    if (allTriggersError) {
      console.log('❌ Erro ao verificar outros triggers:', allTriggersError.message);
    } else if (allTriggers && allTriggers.length > 0) {
      console.log(`✅ Encontrados ${allTriggers.length} triggers em outras tabelas:`);
      allTriggers.forEach((trigger, index) => {
        console.log(`   ${index + 1}. ${trigger.event_object_table}.${trigger.trigger_name} (${trigger.event_manipulation} ${trigger.action_timing})`);
      });
    } else {
      console.log('❌ Nenhum trigger encontrado em outras tabelas');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

investigarTriggersSQLDireto();
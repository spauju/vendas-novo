require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTriggersNativo() {
  console.log('🔍 Verificando triggers usando SQL nativo...');
  
  try {
    // Usar SQL direto para verificar triggers
    const { data, error } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('event_object_table', 'sale_items')
      .eq('trigger_schema', 'public');

    if (error) {
      console.error('❌ Erro ao verificar triggers:', error);
      
      // Tentar método alternativo usando rpc
      console.log('\n🔄 Tentando método alternativo...');
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('sql', {
        query: `
          SELECT 
            trigger_name,
            event_manipulation,
            action_timing,
            action_statement
          FROM information_schema.triggers 
          WHERE event_object_table = 'sale_items'
          AND trigger_schema = 'public';
        `
      });

      if (rpcError) {
        console.error('❌ Erro no método alternativo:', rpcError);
      } else {
        console.log('✅ Triggers encontrados (método alternativo):', rpcData);
      }
      
    } else {
      console.log('✅ Triggers encontrados:', data);
    }

    // Verificar funções também
    console.log('\n🔍 Verificando funções...');
    
    const { data: funcData, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_definition')
      .eq('routine_schema', 'public')
      .like('routine_name', '%stock%');

    if (funcError) {
      console.error('❌ Erro ao verificar funções:', funcError);
    } else {
      console.log('✅ Funções encontradas:', funcData?.length || 0);
      funcData?.forEach(func => {
        console.log(`- ${func.routine_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTriggersNativo();
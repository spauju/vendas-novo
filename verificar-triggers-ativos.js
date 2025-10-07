require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarTriggersAtivos() {
  console.log('🔍 VERIFICANDO TRIGGERS ATIVOS NO BANCO DE DADOS');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar triggers na tabela sale_items
    console.log('\n1️⃣ Triggers na tabela sale_items:');
    const { data: triggersSaleItems, error: triggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.trigger_name,
          t.event_manipulation,
          t.action_timing,
          t.action_statement,
          p.proname as function_name
        FROM information_schema.triggers t
        LEFT JOIN pg_proc p ON p.oid = (
          SELECT oid FROM pg_proc 
          WHERE proname = REPLACE(REPLACE(t.action_statement, 'EXECUTE FUNCTION ', ''), '()', '')
        )
        WHERE t.event_object_table = 'sale_items'
        ORDER BY t.trigger_name;
      `
    });
    
    if (triggersError) {
      console.error('❌ Erro ao buscar triggers:', triggersError);
    } else if (triggersSaleItems && triggersSaleItems.length > 0) {
      triggersSaleItems.forEach(trigger => {
        console.log(`   📌 ${trigger.trigger_name}`);
        console.log(`      Evento: ${trigger.event_manipulation}`);
        console.log(`      Timing: ${trigger.action_timing}`);
        console.log(`      Função: ${trigger.function_name || 'N/A'}`);
        console.log(`      Statement: ${trigger.action_statement}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️ Nenhum trigger encontrado na tabela sale_items');
    }
    
    // 2. Verificar triggers na tabela stock_movements
    console.log('\n2️⃣ Triggers na tabela stock_movements:');
    const { data: triggersStockMovements, error: triggersStockError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.trigger_name,
          t.event_manipulation,
          t.action_timing,
          t.action_statement,
          p.proname as function_name
        FROM information_schema.triggers t
        LEFT JOIN pg_proc p ON p.oid = (
          SELECT oid FROM pg_proc 
          WHERE proname = REPLACE(REPLACE(t.action_statement, 'EXECUTE FUNCTION ', ''), '()', '')
        )
        WHERE t.event_object_table = 'stock_movements'
        ORDER BY t.trigger_name;
      `
    });
    
    if (triggersStockError) {
      console.error('❌ Erro ao buscar triggers stock_movements:', triggersStockError);
    } else if (triggersStockMovements && triggersStockMovements.length > 0) {
      triggersStockMovements.forEach(trigger => {
        console.log(`   📌 ${trigger.trigger_name}`);
        console.log(`      Evento: ${trigger.event_manipulation}`);
        console.log(`      Timing: ${trigger.action_timing}`);
        console.log(`      Função: ${trigger.function_name || 'N/A'}`);
        console.log(`      Statement: ${trigger.action_statement}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️ Nenhum trigger encontrado na tabela stock_movements');
    }
    
    // 3. Verificar todas as funções relacionadas a estoque
    console.log('\n3️⃣ Funções relacionadas a estoque:');
    const { data: funcoes, error: funcoesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          prosrc as function_body
        FROM pg_proc 
        WHERE proname LIKE '%stock%' 
           OR proname LIKE '%estoque%'
           OR prosrc LIKE '%stock_quantity%'
           OR prosrc LIKE '%sale_items%'
        ORDER BY proname;
      `
    });
    
    if (funcoesError) {
      console.error('❌ Erro ao buscar funções:', funcoesError);
    } else if (funcoes && funcoes.length > 0) {
      funcoes.forEach(funcao => {
        console.log(`   🔧 ${funcao.function_name}`);
        // Mostrar apenas as primeiras linhas da função para não poluir o output
        const linhas = funcao.function_body.split('\n').slice(0, 5);
        linhas.forEach(linha => {
          if (linha.trim()) {
            console.log(`      ${linha.trim()}`);
          }
        });
        console.log('      ...');
        console.log('');
      });
    } else {
      console.log('   ℹ️ Nenhuma função relacionada a estoque encontrada');
    }
    
    // 4. Verificar todos os triggers do banco
    console.log('\n4️⃣ Todos os triggers do banco:');
    const { data: todosTriggers, error: todosTriggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.trigger_name,
          t.event_object_table,
          t.event_manipulation,
          t.action_timing,
          t.action_statement
        FROM information_schema.triggers t
        WHERE t.trigger_schema = 'public'
        ORDER BY t.event_object_table, t.trigger_name;
      `
    });
    
    if (todosTriggersError) {
      console.error('❌ Erro ao buscar todos os triggers:', todosTriggersError);
    } else if (todosTriggers && todosTriggers.length > 0) {
      let tabelaAtual = '';
      todosTriggers.forEach(trigger => {
        if (trigger.event_object_table !== tabelaAtual) {
          tabelaAtual = trigger.event_object_table;
          console.log(`\n   📋 Tabela: ${tabelaAtual}`);
        }
        console.log(`      📌 ${trigger.trigger_name} (${trigger.event_manipulation} ${trigger.action_timing})`);
      });
    } else {
      console.log('   ℹ️ Nenhum trigger encontrado no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTriggersAtivos();
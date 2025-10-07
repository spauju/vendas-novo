require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarTriggersSimples() {
  console.log('🔍 VERIFICANDO TRIGGERS ATIVOS NO BANCO DE DADOS');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar triggers básicos
    console.log('\n1️⃣ Triggers básicos:');
    const { data: triggers, error: triggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_object_table,
          event_manipulation,
          action_timing,
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name;
      `
    });
    
    if (triggersError) {
      console.error('❌ Erro ao buscar triggers:', triggersError);
    } else if (triggers && triggers.length > 0) {
      let tabelaAtual = '';
      triggers.forEach(trigger => {
        if (trigger.event_object_table !== tabelaAtual) {
          tabelaAtual = trigger.event_object_table;
          console.log(`\n   📋 Tabela: ${tabelaAtual}`);
        }
        console.log(`      📌 ${trigger.trigger_name}`);
        console.log(`         Evento: ${trigger.event_manipulation} ${trigger.action_timing}`);
        console.log(`         Ação: ${trigger.action_statement}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️ Nenhum trigger encontrado');
    }
    
    // 2. Verificar funções relacionadas a estoque
    console.log('\n2️⃣ Funções relacionadas a estoque:');
    const { data: funcoes, error: funcoesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          CASE 
            WHEN LENGTH(prosrc) > 200 THEN LEFT(prosrc, 200) || '...'
            ELSE prosrc
          END as function_preview
        FROM pg_proc 
        WHERE proname ILIKE '%stock%' 
           OR proname ILIKE '%estoque%'
           OR proname ILIKE '%sale%'
        ORDER BY proname;
      `
    });
    
    if (funcoesError) {
      console.error('❌ Erro ao buscar funções:', funcoesError);
    } else if (funcoes && funcoes.length > 0) {
      funcoes.forEach(funcao => {
        console.log(`   🔧 ${funcao.function_name}`);
        console.log(`      Preview: ${funcao.function_preview.replace(/\n/g, ' ').trim()}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️ Nenhuma função relacionada encontrada');
    }
    
    // 3. Verificar especificamente triggers na sale_items
    console.log('\n3️⃣ Triggers específicos na tabela sale_items:');
    const { data: saleItemsTriggers, error: saleItemsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'sale_items'
        ORDER BY trigger_name;
      `
    });
    
    if (saleItemsError) {
      console.error('❌ Erro ao buscar triggers sale_items:', saleItemsError);
    } else if (saleItemsTriggers && saleItemsTriggers.length > 0) {
      saleItemsTriggers.forEach(trigger => {
        console.log(`   📌 ${trigger.trigger_name}`);
        console.log(`      ${trigger.event_manipulation} ${trigger.action_timing}`);
        console.log(`      ${trigger.action_statement}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️ Nenhum trigger encontrado na tabela sale_items');
    }
    
    // 4. Verificar triggers na stock_movements
    console.log('\n4️⃣ Triggers específicos na tabela stock_movements:');
    const { data: stockTriggers, error: stockError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'stock_movements'
        ORDER BY trigger_name;
      `
    });
    
    if (stockError) {
      console.error('❌ Erro ao buscar triggers stock_movements:', stockError);
    } else if (stockTriggers && stockTriggers.length > 0) {
      stockTriggers.forEach(trigger => {
        console.log(`   📌 ${trigger.trigger_name}`);
        console.log(`      ${trigger.event_manipulation} ${trigger.action_timing}`);
        console.log(`      ${trigger.action_statement}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️ Nenhum trigger encontrado na tabela stock_movements');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTriggersSimples();
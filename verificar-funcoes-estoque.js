require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarFuncoesEstoque() {
  console.log('🔍 VERIFICANDO FUNÇÕES DE ESTOQUE NO BANCO');
  console.log('='.repeat(60));
  
  try {
    // Verificar se as funções existem
    const { data: funcoes, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          pg_get_functiondef(oid) as function_definition
        FROM pg_proc 
        WHERE proname IN ('reduce_stock_controlled', 'process_sale_with_stock_control')
        ORDER BY proname;
      `
    });
    
    if (error) {
      console.error('❌ Erro ao buscar funções:', error);
      return;
    }
    
    if (!funcoes || funcoes.length === 0) {
      console.log('❌ FUNÇÕES NÃO ENCONTRADAS!');
      console.log('   As funções de controle de estoque não estão criadas no banco.');
      console.log('\n💡 AÇÃO NECESSÁRIA:');
      console.log('   Execute: node solucao-duplicacao-estoque.js');
      return;
    }
    
    console.log(`✅ ${funcoes.length} função(ões) encontrada(s):\n`);
    
    funcoes.forEach(funcao => {
      console.log(`📌 ${funcao.function_name}`);
      console.log('─'.repeat(60));
      console.log(funcao.function_definition);
      console.log('\n');
    });
    
    // Verificar se há triggers ativos
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          t.tgenabled as enabled
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relname IN ('sale_items', 'products', 'stock_movements')
        AND NOT t.tgisinternal
        ORDER BY c.relname, t.tgname;
      `
    });
    
    if (!triggerError && triggers && triggers.length > 0) {
      console.log('\n⚠️ TRIGGERS ENCONTRADOS:');
      triggers.forEach(t => {
        const status = t.enabled === 'O' ? '✅ ATIVO' : '❌ DESABILITADO';
        console.log(`   ${status} - ${t.table_name}.${t.trigger_name}`);
      });
    } else {
      console.log('\n✅ Nenhum trigger ativo nas tabelas críticas');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

verificarFuncoesEstoque();

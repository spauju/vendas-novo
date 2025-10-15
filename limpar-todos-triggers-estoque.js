// Script para remover todos os triggers de estoque duplicados e garantir apenas UM trigger correto
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function limparTriggersEstoque() {
  const triggersParaRemover = [
    'trigger_update_stock_on_sale',
    'trigger_update_stock_on_sale_insert',
    'trigger_revert_stock_on_sale_delete',
    'trigger_adjust_stock_on_sale_update',
    'trigger_reduce_stock_on_sale_insert',
    'update_stock_on_sale_trigger',
    'trigger_update_stock_on_movement',
    'trigger_update_stock_on_movement_insert',
    'trigger_revert_stock_on_movement_delete',
    'trigger_reduce_stock_on_sale',
    'trigger_revert_stock_on_sale',
    'trigger_adjust_stock_on_sale',
  ];
  for (const triggerName of triggersParaRemover) {
    await supabase.rpc('exec_sql', {
      sql: `DROP TRIGGER IF EXISTS ${triggerName} ON public.sale_items;`
    });
  }
  console.log('✅ Todos os triggers de estoque removidos da tabela sale_items');
}

limparTriggersEstoque();

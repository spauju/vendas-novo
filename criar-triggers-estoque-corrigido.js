const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarTriggersEstoque() {
  console.log('🔧 CRIANDO TRIGGERS DE BAIXA AUTOMÁTICA NO ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // 1. Remover todos os triggers possíveis da tabela sale_items
    console.log('\n1️⃣ Removendo TODOS os triggers de sale_items...');
    const triggersParaRemover = [
      'trigger_update_stock_on_sale',
      'trigger_update_stock_on_sale_insert',
      'trigger_revert_stock_on_sale_delete',
      'trigger_adjust_stock_on_sale_update',
      'trigger_reduce_stock_on_sale_insert',
      'update_stock_on_sale_trigger',
      'trigger_update_stock_on_movement',
      'trigger_update_stock_on_movement_insert',
      'trigger_revert_stock_on_movement_delete'
    ];
    for (const triggerName of triggersParaRemover) {
      await supabase.rpc('exec_sql', {
        sql: `DROP TRIGGER IF EXISTS ${triggerName} ON public.sale_items;`
      });
    }
    console.log('✅ Todos os triggers removidos');

    // 2. Criar função ÚNICA para reduzir estoque quando um item de venda é inserido
    console.log('\n2️⃣ Criando função update_stock_on_sale...');
    const funcaoReducaoEstoque = `
      CREATE OR REPLACE FUNCTION update_stock_on_sale()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Verificar se o produto existe
          IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id) THEN
              RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
          END IF;
          -- Reduzir o estoque
          UPDATE public.products 
          SET stock_quantity = stock_quantity - NEW.quantity
          WHERE id = NEW.product_id;
          -- Verificar se há estoque suficiente (após a redução)
          IF (SELECT stock_quantity FROM public.products WHERE id = NEW.product_id) < 0 THEN
              RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Quantidade disponível: %', 
                  NEW.product_id, 
                  (SELECT stock_quantity + NEW.quantity FROM public.products WHERE id = NEW.product_id);
          END IF;
          -- Registrar movimento de estoque (apenas UM registro por venda)
          INSERT INTO public.stock_movements (
              product_id,
              movement_type,
              quantity,
              notes,
              created_at
          ) VALUES (
              NEW.product_id,
              'saida',
              NEW.quantity,
              'Venda - Sale ID: ' || NEW.sale_id,
              NOW()
          );
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    const { error: funcError1 } = await supabase.rpc('exec_sql', { sql: funcaoReducaoEstoque });
    if (funcError1) {
      console.error('❌ Erro ao criar função update_stock_on_sale:', funcError1);
    } else {
      console.log('✅ Função update_stock_on_sale criada com sucesso');
    }

    // 3. Criar apenas UM trigger para baixa de estoque
    console.log('\n3️⃣ Criando trigger único de baixa de estoque...');
    const triggerSql = `
      CREATE TRIGGER update_stock_on_sale_trigger
      AFTER INSERT ON public.sale_items
      FOR EACH ROW
      EXECUTE FUNCTION update_stock_on_sale();
    `;
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerSql });
    if (triggerError) {
      console.error('❌ Erro ao criar trigger único:', triggerError);
    } else {
      console.log('✅ Trigger único criado com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro durante criação dos triggers:', error);
  }
}

criarTriggersEstoque();
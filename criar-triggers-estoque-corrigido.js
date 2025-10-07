const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarTriggersEstoque() {
  console.log('🔧 CRIANDO TRIGGERS DE BAIXA AUTOMÁTICA NO ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // 1. Criar função para reduzir estoque quando um item de venda é inserido
    console.log('\n1️⃣ Criando função update_stock_on_sale...');
    
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
          
          -- Registrar movimento de estoque
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
    
    // 2. Criar função para reverter estoque quando um item de venda é deletado
    console.log('\n2️⃣ Criando função revert_stock_on_sale_delete...');
    
    const funcaoReversaoEstoque = `
      CREATE OR REPLACE FUNCTION revert_stock_on_sale_delete()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Verificar se o produto existe
          IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = OLD.product_id) THEN
              RAISE EXCEPTION 'Produto com ID % não encontrado', OLD.product_id;
          END IF;
          
          -- Reverter o estoque (adicionar de volta)
          UPDATE public.products 
          SET stock_quantity = stock_quantity + OLD.quantity
          WHERE id = OLD.product_id;
          
          -- Registrar movimento de estoque
          INSERT INTO public.stock_movements (
              product_id,
              movement_type,
              quantity,
              notes,
              created_at
          ) VALUES (
              OLD.product_id,
              'entrada',
              OLD.quantity,
              'Cancelamento de venda - Sale ID: ' || OLD.sale_id,
              NOW()
          );
          
          RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: funcError2 } = await supabase.rpc('exec_sql', { sql: funcaoReversaoEstoque });
    
    if (funcError2) {
      console.error('❌ Erro ao criar função revert_stock_on_sale_delete:', funcError2);
    } else {
      console.log('✅ Função revert_stock_on_sale_delete criada com sucesso');
    }
    
    // 3. Criar função para ajustar estoque quando um item de venda é atualizado
    console.log('\n3️⃣ Criando função adjust_stock_on_sale_update...');
    
    const funcaoAjusteEstoque = `
      CREATE OR REPLACE FUNCTION adjust_stock_on_sale_update()
      RETURNS TRIGGER AS $$
      DECLARE
          quantity_diff INTEGER;
      BEGIN
          -- Calcular diferença na quantidade
          quantity_diff := NEW.quantity - OLD.quantity;
          
          -- Se não houve mudança na quantidade, não fazer nada
          IF quantity_diff = 0 THEN
              RETURN NEW;
          END IF;
          
          -- Verificar se o produto existe
          IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id) THEN
              RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
          END IF;
          
          -- Ajustar o estoque
          UPDATE public.products 
          SET stock_quantity = stock_quantity - quantity_diff
          WHERE id = NEW.product_id;
          
          -- Verificar se há estoque suficiente (após o ajuste)
          IF quantity_diff > 0 THEN
              IF (SELECT stock_quantity FROM public.products WHERE id = NEW.product_id) < 0 THEN
                  RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Quantidade disponível: %', 
                      NEW.product_id, 
                      (SELECT stock_quantity + quantity_diff FROM public.products WHERE id = NEW.product_id);
              END IF;
          END IF;
          
          -- Registrar movimento de estoque
          IF quantity_diff > 0 THEN
              -- Mais produtos vendidos (saída adicional)
              INSERT INTO public.stock_movements (
                  product_id,
                  movement_type,
                  quantity,
                  notes,
                  created_at
              ) VALUES (
                  NEW.product_id,
                  'saida',
                  quantity_diff,
                  'Ajuste de venda - Sale ID: ' || NEW.sale_id,
                  NOW()
              );
          ELSE
              -- Menos produtos vendidos (entrada para reverter)
              INSERT INTO public.stock_movements (
                  product_id,
                  movement_type,
                  quantity,
                  notes,
                  created_at
              ) VALUES (
                  NEW.product_id,
                  'entrada',
                  ABS(quantity_diff),
                  'Ajuste de venda - Sale ID: ' || NEW.sale_id,
                  NOW()
              );
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: funcError3 } = await supabase.rpc('exec_sql', { sql: funcaoAjusteEstoque });
    
    if (funcError3) {
      console.error('❌ Erro ao criar função adjust_stock_on_sale_update:', funcError3);
    } else {
      console.log('✅ Função adjust_stock_on_sale_update criada com sucesso');
    }
    
    // 4. Remover triggers existentes se houver
    console.log('\n4️⃣ Removendo triggers existentes...');
    
    const removerTriggers = `
      DROP TRIGGER IF EXISTS trigger_update_stock_on_sale_insert ON public.sale_items;
      DROP TRIGGER IF EXISTS trigger_revert_stock_on_sale_delete ON public.sale_items;
      DROP TRIGGER IF EXISTS trigger_adjust_stock_on_sale_update ON public.sale_items;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: removerTriggers });
    
    if (dropError) {
      console.log('⚠️ Aviso ao remover triggers:', dropError.message);
    } else {
      console.log('✅ Triggers antigos removidos');
    }
    
    // 5. Criar os triggers
    console.log('\n5️⃣ Criando triggers...');
    
    const criarTriggers = `
      -- Trigger para quando um item de venda é inserido (baixa no estoque)
      CREATE TRIGGER trigger_update_stock_on_sale_insert
          AFTER INSERT ON public.sale_items
          FOR EACH ROW
          EXECUTE FUNCTION update_stock_on_sale();

      -- Trigger para quando um item de venda é deletado (reverter estoque)
      CREATE TRIGGER trigger_revert_stock_on_sale_delete
          AFTER DELETE ON public.sale_items
          FOR EACH ROW
          EXECUTE FUNCTION revert_stock_on_sale_delete();

      -- Trigger para quando um item de venda é atualizado (ajustar estoque)
      CREATE TRIGGER trigger_adjust_stock_on_sale_update
          AFTER UPDATE ON public.sale_items
          FOR EACH ROW
          EXECUTE FUNCTION adjust_stock_on_sale_update();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: criarTriggers });
    
    if (triggerError) {
      console.error('❌ Erro ao criar triggers:', triggerError);
    } else {
      console.log('✅ Triggers criados com sucesso');
    }
    
    // 6. Verificar se os triggers foram criados
    console.log('\n6️⃣ Verificando triggers criados...');
    
    const { data: triggers, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND event_object_table = 'sale_items'
        ORDER BY trigger_name;
      `
    });
    
    if (verifyError) {
      console.error('❌ Erro ao verificar triggers:', verifyError);
    } else {
      console.log(`📊 Triggers encontrados: ${triggers?.length || 0}`);
      if (triggers && triggers.length > 0) {
        triggers.forEach(trigger => {
          console.log(`   ✅ ${trigger.trigger_name} - ${trigger.event_manipulation} (${trigger.action_timing})`);
        });
      }
    }
    
    console.log('\n🎉 TRIGGERS DE BAIXA AUTOMÁTICA NO ESTOQUE CRIADOS!');
    console.log('='.repeat(60));
    console.log('✅ Funcionalidades implementadas:');
    console.log('   - Redução automática de estoque quando venda é inserida');
    console.log('   - Reversão de estoque quando venda é cancelada');
    console.log('   - Ajuste de estoque quando venda é atualizada');
    console.log('   - Registro de movimentações na tabela stock_movements');
    console.log('\n🎯 Próximo passo: Testar uma venda no PDV para verificar se o estoque é reduzido automaticamente');
    
  } catch (error) {
    console.error('❌ Erro durante criação dos triggers:', error);
  }
}

criarTriggersEstoque();
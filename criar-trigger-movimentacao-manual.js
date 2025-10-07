const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarTriggerMovimentacaoManual() {
  console.log('🔧 CRIANDO TRIGGER PARA MOVIMENTAÇÃO MANUAL DE ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // 1. Criar função para atualizar estoque quando há movimentação manual
    console.log('\n1️⃣ Criando função update_stock_on_movement...');
    
    const funcaoMovimentacaoManual = `
      CREATE OR REPLACE FUNCTION update_stock_on_movement()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Verificar se o produto existe
          IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id) THEN
              RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
          END IF;
          
          -- Atualizar estoque baseado no tipo de movimentação
          IF NEW.movement_type = 'entrada' THEN
              -- Entrada: adicionar ao estoque
              UPDATE public.products 
              SET stock_quantity = stock_quantity + NEW.quantity,
                  updated_at = NOW()
              WHERE id = NEW.product_id;
              
          ELSIF NEW.movement_type = 'saida' THEN
              -- Saída: reduzir do estoque
              UPDATE public.products 
              SET stock_quantity = stock_quantity - NEW.quantity,
                  updated_at = NOW()
              WHERE id = NEW.product_id;
              
              -- Verificar se há estoque suficiente (após a redução)
              IF (SELECT stock_quantity FROM public.products WHERE id = NEW.product_id) < 0 THEN
                  RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Quantidade disponível: %', 
                      NEW.product_id, 
                      (SELECT stock_quantity + NEW.quantity FROM public.products WHERE id = NEW.product_id);
              END IF;
              
          ELSIF NEW.movement_type = 'ajuste' THEN
              -- Ajuste: definir quantidade exata
              UPDATE public.products 
              SET stock_quantity = NEW.quantity,
                  updated_at = NOW()
              WHERE id = NEW.product_id;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: funcError } = await supabase.rpc('exec_sql', { sql: funcaoMovimentacaoManual });
    
    if (funcError) {
      console.error('❌ Erro ao criar função update_stock_on_movement:', funcError);
    } else {
      console.log('✅ Função update_stock_on_movement criada com sucesso');
    }
    
    // 2. Criar função para reverter movimentação quando deletada
    console.log('\n2️⃣ Criando função revert_stock_on_movement_delete...');
    
    const funcaoReversaoMovimentacao = `
      CREATE OR REPLACE FUNCTION revert_stock_on_movement_delete()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Verificar se o produto existe
          IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = OLD.product_id) THEN
              RAISE EXCEPTION 'Produto com ID % não encontrado', OLD.product_id;
          END IF;
          
          -- Reverter movimentação baseado no tipo
          IF OLD.movement_type = 'entrada' THEN
              -- Era entrada: remover do estoque
              UPDATE public.products 
              SET stock_quantity = stock_quantity - OLD.quantity,
                  updated_at = NOW()
              WHERE id = OLD.product_id;
              
              -- Verificar se não ficou negativo
              IF (SELECT stock_quantity FROM public.products WHERE id = OLD.product_id) < 0 THEN
                  RAISE EXCEPTION 'Não é possível reverter entrada. Estoque ficaria negativo para produto ID %', OLD.product_id;
              END IF;
              
          ELSIF OLD.movement_type = 'saida' THEN
              -- Era saída: adicionar de volta ao estoque
              UPDATE public.products 
              SET stock_quantity = stock_quantity + OLD.quantity,
                  updated_at = NOW()
              WHERE id = OLD.product_id;
              
          -- Para ajustes, não fazemos reversão automática pois não sabemos o valor anterior
          END IF;
          
          RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: funcError2 } = await supabase.rpc('exec_sql', { sql: funcaoReversaoMovimentacao });
    
    if (funcError2) {
      console.error('❌ Erro ao criar função revert_stock_on_movement_delete:', funcError2);
    } else {
      console.log('✅ Função revert_stock_on_movement_delete criada com sucesso');
    }
    
    // 3. Remover triggers existentes se houver
    console.log('\n3️⃣ Removendo triggers existentes...');
    
    const removerTriggers = `
      DROP TRIGGER IF EXISTS trigger_update_stock_on_movement_insert ON public.stock_movements;
      DROP TRIGGER IF EXISTS trigger_revert_stock_on_movement_delete ON public.stock_movements;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: removerTriggers });
    
    if (dropError) {
      console.log('⚠️ Aviso ao remover triggers:', dropError.message);
    } else {
      console.log('✅ Triggers antigos removidos');
    }
    
    // 4. Criar os triggers
    console.log('\n4️⃣ Criando triggers...');
    
    const criarTriggers = `
      -- Trigger para quando uma movimentação manual é inserida
      CREATE TRIGGER trigger_update_stock_on_movement_insert
          AFTER INSERT ON public.stock_movements
          FOR EACH ROW
          EXECUTE FUNCTION update_stock_on_movement();

      -- Trigger para quando uma movimentação manual é deletada
      CREATE TRIGGER trigger_revert_stock_on_movement_delete
          AFTER DELETE ON public.stock_movements
          FOR EACH ROW
          EXECUTE FUNCTION revert_stock_on_movement_delete();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: criarTriggers });
    
    if (triggerError) {
      console.error('❌ Erro ao criar triggers:', triggerError);
    } else {
      console.log('✅ Triggers criados com sucesso');
    }
    
    // 5. Verificar se os triggers foram criados
    console.log('\n5️⃣ Verificando triggers criados...');
    
    const { data: triggers, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND event_object_table = 'stock_movements'
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
    
    console.log('\n🎉 TRIGGERS DE MOVIMENTAÇÃO MANUAL CRIADOS!');
    console.log('='.repeat(60));
    console.log('✅ Funcionalidades implementadas:');
    console.log('   - Atualização automática de estoque em movimentações manuais');
    console.log('   - Entrada: adiciona ao estoque');
    console.log('   - Saída: reduz do estoque (com verificação)');
    console.log('   - Ajuste: define quantidade exata');
    console.log('   - Reversão quando movimentação é deletada');
    console.log('\n🎯 Próximo passo: Testar movimentação manual na página de estoque');
    
  } catch (error) {
    console.error('❌ Erro durante criação dos triggers:', error);
  }
}

criarTriggerMovimentacaoManual();
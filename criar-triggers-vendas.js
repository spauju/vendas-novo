require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function criarTriggersVendas() {
  console.log('🔧 Criando triggers para redução de estoque nas vendas...');
  
  try {
    // 1. Criar função para reduzir estoque quando um item de venda é inserido
    console.log('\n1️⃣ Criando função reduce_stock_on_sale...');
    
    const createReduceStockFunction = `
      CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
      RETURNS TRIGGER AS $$
      DECLARE
        current_stock INTEGER;
        product_name TEXT;
      BEGIN
        -- Buscar informações do produto
        SELECT stock_quantity, name INTO current_stock, product_name
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Verificar se o produto existe
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
        END IF;
        
        -- Verificar se há estoque suficiente
        IF current_stock < NEW.quantity THEN
          RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, Solicitado: %', 
            product_name, current_stock, NEW.quantity;
        END IF;
        
        -- Reduzir o estoque
        UPDATE products 
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;
        
        -- Registrar a movimentação de estoque
        INSERT INTO stock_movements (
          product_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reference_id,
          notes,
          created_at
        ) VALUES (
          NEW.product_id,
          'saida',
          NEW.quantity,
          current_stock,
          current_stock - NEW.quantity,
          NEW.sale_id,
          'Venda - Item ID: ' || NEW.id,
          NOW()
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: createReduceStockFunction
    });

    if (funcError) {
      console.error('❌ Erro ao criar função reduce_stock_on_sale:', funcError);
      return;
    }

    console.log('✅ Função reduce_stock_on_sale criada com sucesso');

    // 2. Criar função para reverter estoque quando um item de venda é deletado
    console.log('\n2️⃣ Criando função revert_stock_on_sale_delete...');
    
    const createRevertStockFunction = `
      CREATE OR REPLACE FUNCTION revert_stock_on_sale_delete()
      RETURNS TRIGGER AS $$
      DECLARE
        current_stock INTEGER;
        product_name TEXT;
      BEGIN
        -- Buscar informações do produto
        SELECT stock_quantity, name INTO current_stock, product_name
        FROM products 
        WHERE id = OLD.product_id;
        
        -- Verificar se o produto existe
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Produto com ID % não encontrado', OLD.product_id;
        END IF;
        
        -- Reverter o estoque
        UPDATE products 
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE id = OLD.product_id;
        
        -- Registrar a movimentação de estoque
        INSERT INTO stock_movements (
          product_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reference_id,
          notes,
          created_at
        ) VALUES (
          OLD.product_id,
          'entrada',
          OLD.quantity,
          current_stock,
          current_stock + OLD.quantity,
          OLD.sale_id,
          'Reversão de venda - Item ID: ' || OLD.id,
          NOW()
        );
        
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: revertFuncError } = await supabase.rpc('exec_sql', {
      sql: createRevertStockFunction
    });

    if (revertFuncError) {
      console.error('❌ Erro ao criar função revert_stock_on_sale_delete:', revertFuncError);
      return;
    }

    console.log('✅ Função revert_stock_on_sale_delete criada com sucesso');

    // 3. Criar função para ajustar estoque quando um item de venda é atualizado
    console.log('\n3️⃣ Criando função adjust_stock_on_sale_update...');
    
    const createAdjustStockFunction = `
      CREATE OR REPLACE FUNCTION adjust_stock_on_sale_update()
      RETURNS TRIGGER AS $$
      DECLARE
        current_stock INTEGER;
        product_name TEXT;
        quantity_diff INTEGER;
      BEGIN
        -- Calcular a diferença de quantidade
        quantity_diff := NEW.quantity - OLD.quantity;
        
        -- Se não houve mudança na quantidade, não fazer nada
        IF quantity_diff = 0 THEN
          RETURN NEW;
        END IF;
        
        -- Buscar informações do produto
        SELECT stock_quantity, name INTO current_stock, product_name
        FROM products 
        WHERE id = NEW.product_id;
        
        -- Verificar se o produto existe
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
        END IF;
        
        -- Se a quantidade aumentou, verificar se há estoque suficiente
        IF quantity_diff > 0 AND current_stock < quantity_diff THEN
          RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, Necessário: %', 
            product_name, current_stock, quantity_diff;
        END IF;
        
        -- Ajustar o estoque
        UPDATE products 
        SET stock_quantity = stock_quantity - quantity_diff
        WHERE id = NEW.product_id;
        
        -- Registrar a movimentação de estoque
        INSERT INTO stock_movements (
          product_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reference_id,
          notes,
          created_at
        ) VALUES (
          NEW.product_id,
          CASE WHEN quantity_diff > 0 THEN 'saida' ELSE 'entrada' END,
          ABS(quantity_diff),
          current_stock,
          current_stock - quantity_diff,
          NEW.sale_id,
          'Ajuste de venda - Item ID: ' || NEW.id || ' (quantidade: ' || OLD.quantity || ' → ' || NEW.quantity || ')',
          NOW()
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: adjustFuncError } = await supabase.rpc('exec_sql', {
      sql: createAdjustStockFunction
    });

    if (adjustFuncError) {
      console.error('❌ Erro ao criar função adjust_stock_on_sale_update:', adjustFuncError);
      return;
    }

    console.log('✅ Função adjust_stock_on_sale_update criada com sucesso');

    // 4. Criar trigger para INSERT na tabela sale_items
    console.log('\n4️⃣ Criando trigger para INSERT em sale_items...');
    
    const createInsertTrigger = `
      DROP TRIGGER IF EXISTS trigger_reduce_stock_on_sale_insert ON sale_items;
      
      CREATE TRIGGER trigger_reduce_stock_on_sale_insert
        AFTER INSERT ON sale_items
        FOR EACH ROW
        EXECUTE FUNCTION reduce_stock_on_sale();
    `;

    const { error: insertTriggerError } = await supabase.rpc('exec_sql', {
      sql: createInsertTrigger
    });

    if (insertTriggerError) {
      console.error('❌ Erro ao criar trigger de INSERT:', insertTriggerError);
      return;
    }

    console.log('✅ Trigger de INSERT criado com sucesso');

    // 5. Criar trigger para DELETE na tabela sale_items
    console.log('\n5️⃣ Criando trigger para DELETE em sale_items...');
    
    const createDeleteTrigger = `
      DROP TRIGGER IF EXISTS trigger_revert_stock_on_sale_delete ON sale_items;
      
      CREATE TRIGGER trigger_revert_stock_on_sale_delete
        AFTER DELETE ON sale_items
        FOR EACH ROW
        EXECUTE FUNCTION revert_stock_on_sale_delete();
    `;

    const { error: deleteTriggerError } = await supabase.rpc('exec_sql', {
      sql: createDeleteTrigger
    });

    if (deleteTriggerError) {
      console.error('❌ Erro ao criar trigger de DELETE:', deleteTriggerError);
      return;
    }

    console.log('✅ Trigger de DELETE criado com sucesso');

    // 6. Criar trigger para UPDATE na tabela sale_items
    console.log('\n6️⃣ Criando trigger para UPDATE em sale_items...');
    
    const createUpdateTrigger = `
      DROP TRIGGER IF EXISTS trigger_adjust_stock_on_sale_update ON sale_items;
      
      CREATE TRIGGER trigger_adjust_stock_on_sale_update
        AFTER UPDATE ON sale_items
        FOR EACH ROW
        EXECUTE FUNCTION adjust_stock_on_sale_update();
    `;

    const { error: updateTriggerError } = await supabase.rpc('exec_sql', {
      sql: createUpdateTrigger
    });

    if (updateTriggerError) {
      console.error('❌ Erro ao criar trigger de UPDATE:', updateTriggerError);
      return;
    }

    console.log('✅ Trigger de UPDATE criado com sucesso');

    // 7. Verificar se os triggers foram criados corretamente
    console.log('\n7️⃣ Verificando triggers criados...');
    
    const { data: createdTriggers, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'sale_items'
        AND trigger_schema = 'public'
        ORDER BY trigger_name;
      `
    });

    if (verifyError) {
      console.error('❌ Erro ao verificar triggers:', verifyError);
    } else {
      console.log('📋 Triggers criados na tabela sale_items:');
      createdTriggers?.forEach(trigger => {
        console.log(`   ✅ ${trigger.trigger_name}: ${trigger.event_manipulation} ${trigger.action_timing}`);
      });
    }

    console.log('\n🎉 Todos os triggers de vendas foram criados com sucesso!');
    console.log('📝 Agora as vendas irão automaticamente:');
    console.log('   - Reduzir o estoque quando itens são adicionados');
    console.log('   - Reverter o estoque quando itens são removidos');
    console.log('   - Ajustar o estoque quando quantidades são alteradas');
    console.log('   - Registrar todas as movimentações no histórico');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

criarTriggersVendas();
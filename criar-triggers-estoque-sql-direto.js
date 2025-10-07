require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function criarTriggersEstoque() {
  console.log('🔧 Criando triggers de estoque usando SQL direto...');
  
  try {
    // 1. Criar função para baixa automática de estoque em vendas
    console.log('\n1️⃣ Criando função para baixa automática de estoque...');
    
    const funcaoVenda = `
      CREATE OR REPLACE FUNCTION update_stock_on_sale()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Atualizar o estoque do produto
        UPDATE products 
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;
        
        -- Inserir registro na tabela de movimentações
        INSERT INTO stock_movements (
          product_id,
          user_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          notes,
          created_at
        )
        SELECT 
          NEW.product_id,
          COALESCE(
            (SELECT user_id FROM sales WHERE id = NEW.sale_id LIMIT 1),
            'dc5260de-2251-402c-b746-04050430288a'::uuid
          ),
          'saida',
          NEW.quantity,
          p.stock_quantity + NEW.quantity,
          p.stock_quantity,
          'Venda - Sale ID: ' || NEW.sale_id::text,
          NOW()
        FROM products p
        WHERE p.id = NEW.product_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: funcError1 } = await supabase.rpc('exec_sql', { sql: funcaoVenda });
    
    if (funcError1) {
      console.error('❌ Erro ao criar função de venda:', funcError1);
      return;
    }
    console.log('✅ Função update_stock_on_sale criada');

    // 2. Criar trigger para baixa automática
    console.log('\n2️⃣ Criando trigger para baixa automática...');
    
    const triggerVenda = `
      DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON sale_items;
      
      CREATE TRIGGER trigger_update_stock_on_sale
        AFTER INSERT ON sale_items
        FOR EACH ROW
        EXECUTE FUNCTION update_stock_on_sale();
    `;

    const { error: triggerError1 } = await supabase.rpc('exec_sql', { sql: triggerVenda });
    
    if (triggerError1) {
      console.error('❌ Erro ao criar trigger de venda:', triggerError1);
      return;
    }
    console.log('✅ Trigger trigger_update_stock_on_sale criado');

    // 3. Criar função para movimentações manuais
    console.log('\n3️⃣ Criando função para movimentações manuais...');
    
    const funcaoMovimentacao = `
      CREATE OR REPLACE FUNCTION update_stock_on_movement()
      RETURNS TRIGGER AS $$
      DECLARE
        current_stock INTEGER;
      BEGIN
        -- Buscar estoque atual
        SELECT stock_quantity INTO current_stock FROM products WHERE id = NEW.product_id;
        
        -- Atualizar estoque baseado no tipo de movimentação
        IF NEW.movement_type = 'entrada' THEN
          UPDATE products SET stock_quantity = stock_quantity + NEW.quantity WHERE id = NEW.product_id;
        ELSIF NEW.movement_type = 'saida' THEN
          -- Verificar se há estoque suficiente
          IF current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock, NEW.quantity;
          END IF;
          UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
        ELSIF NEW.movement_type = 'ajuste' THEN
          UPDATE products SET stock_quantity = NEW.quantity WHERE id = NEW.product_id;
        END IF;
        
        -- Atualizar campos de controle na movimentação
        UPDATE stock_movements 
        SET 
          previous_stock = current_stock,
          new_stock = CASE 
            WHEN NEW.movement_type = 'entrada' THEN current_stock + NEW.quantity
            WHEN NEW.movement_type = 'saida' THEN current_stock - NEW.quantity
            WHEN NEW.movement_type = 'ajuste' THEN NEW.quantity
            ELSE current_stock
          END
        WHERE id = NEW.id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: funcError2 } = await supabase.rpc('exec_sql', { sql: funcaoMovimentacao });
    
    if (funcError2) {
      console.error('❌ Erro ao criar função de movimentação:', funcError2);
      return;
    }
    console.log('✅ Função update_stock_on_movement criada');

    // 4. Criar trigger para movimentações manuais
    console.log('\n4️⃣ Criando trigger para movimentações manuais...');
    
    const triggerMovimentacao = `
      DROP TRIGGER IF EXISTS trigger_update_stock_on_movement ON stock_movements;
      
      CREATE TRIGGER trigger_update_stock_on_movement
        AFTER INSERT ON stock_movements
        FOR EACH ROW
        EXECUTE FUNCTION update_stock_on_movement();
    `;

    const { error: triggerError2 } = await supabase.rpc('exec_sql', { sql: triggerMovimentacao });
    
    if (triggerError2) {
      console.error('❌ Erro ao criar trigger de movimentação:', triggerError2);
      return;
    }
    console.log('✅ Trigger trigger_update_stock_on_movement criado');

    // 5. Verificar se os triggers foram criados
    console.log('\n5️⃣ Verificando triggers criados...');
    
    const verificacao = `
      SELECT 
        trigger_name,
        event_object_table,
        action_timing,
        event_manipulation
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      AND trigger_name IN ('trigger_update_stock_on_sale', 'trigger_update_stock_on_movement')
      ORDER BY trigger_name;
    `;

    const { data: triggers, error: verifyError } = await supabase.rpc('exec_sql', { sql: verificacao });
    
    if (verifyError) {
      console.error('❌ Erro ao verificar triggers:', verifyError);
    } else {
      const triggerList = triggers || [];
      console.log(`✅ Verificação concluída - ${triggerList.length} triggers encontrados:`);
      triggerList.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} na tabela ${trigger.event_object_table}`);
      });
    }

    console.log('\n🎉 Criação de triggers concluída!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

criarTriggersEstoque();
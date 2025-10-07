require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function criarTriggersComVerificacao() {
  console.log('🔧 Criando triggers de estoque com verificação...');
  
  try {
    // 1. Primeiro, verificar se as tabelas existem
    console.log('\n1️⃣ Verificando tabelas...');
    const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sale_items', 'stock_movements', 'products')
        ORDER BY table_name;
      `
    });

    if (tableError) {
      console.error('❌ Erro ao verificar tabelas:', tableError);
      return;
    }

    console.log('✅ Tabelas encontradas:', tables?.map(t => t.table_name) || []);

    // 2. Remover triggers existentes (se houver)
    console.log('\n2️⃣ Removendo triggers existentes...');
    await supabase.rpc('exec_sql', {
      sql: `DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON sale_items;`
    });
    await supabase.rpc('exec_sql', {
      sql: `DROP TRIGGER IF EXISTS trigger_update_stock_on_movement ON stock_movements;`
    });

    // 3. Remover funções existentes
    console.log('\n3️⃣ Removendo funções existentes...');
    await supabase.rpc('exec_sql', {
      sql: `DROP FUNCTION IF EXISTS update_stock_on_sale();`
    });
    await supabase.rpc('exec_sql', {
      sql: `DROP FUNCTION IF EXISTS update_stock_on_movement();`
    });

    // 4. Criar função para baixa automática de estoque
    console.log('\n4️⃣ Criando função update_stock_on_sale...');
    const { error: funcError1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_stock_on_sale()
        RETURNS TRIGGER AS $$
        DECLARE
          current_stock INTEGER;
          user_uuid UUID;
        BEGIN
          -- Buscar estoque atual
          SELECT stock_quantity INTO current_stock 
          FROM products 
          WHERE id = NEW.product_id;
          
          -- Verificar se há estoque suficiente
          IF current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock, NEW.quantity;
          END IF;
          
          -- Atualizar estoque
          UPDATE products 
          SET stock_quantity = stock_quantity - NEW.quantity
          WHERE id = NEW.product_id;
          
          -- Buscar user_id da venda ou usar um padrão
          SELECT user_id INTO user_uuid FROM sales WHERE id = NEW.sale_id;
          IF user_uuid IS NULL THEN
            user_uuid := '00000000-0000-0000-0000-000000000001'::UUID;
          END IF;
          
          -- Registrar movimentação
          INSERT INTO stock_movements (
            product_id,
            user_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reference_id,
            reference_type,
            notes
          ) VALUES (
            NEW.product_id,
            user_uuid,
            'saida',
            NEW.quantity,
            current_stock,
            current_stock - NEW.quantity,
            NEW.sale_id,
            'sale',
            'Venda - Sale ID: ' || NEW.sale_id
          );
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (funcError1) {
      console.error('❌ Erro ao criar função update_stock_on_sale:', funcError1);
      return;
    }
    console.log('✅ Função update_stock_on_sale criada');

    // 5. Criar trigger para baixa automática
    console.log('\n5️⃣ Criando trigger trigger_update_stock_on_sale...');
    const { error: triggerError1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TRIGGER trigger_update_stock_on_sale
        AFTER INSERT ON sale_items
        FOR EACH ROW
        EXECUTE FUNCTION update_stock_on_sale();
      `
    });

    if (triggerError1) {
      console.error('❌ Erro ao criar trigger trigger_update_stock_on_sale:', triggerError1);
      return;
    }
    console.log('✅ Trigger trigger_update_stock_on_sale criado');

    // 6. Criar função para movimentações manuais
    console.log('\n6️⃣ Criando função update_stock_on_movement...');
    const { error: funcError2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_stock_on_movement()
        RETURNS TRIGGER AS $$
        DECLARE
          current_stock INTEGER;
        BEGIN
          -- Buscar estoque atual
          SELECT stock_quantity INTO current_stock 
          FROM products 
          WHERE id = NEW.product_id;
          
          -- Calcular novo estoque
          IF NEW.movement_type = 'entrada' THEN
            UPDATE products 
            SET stock_quantity = stock_quantity + NEW.quantity
            WHERE id = NEW.product_id;
            
            NEW.previous_stock := current_stock;
            NEW.new_stock := current_stock + NEW.quantity;
          ELSE
            -- Verificar se há estoque suficiente para saída
            IF current_stock < NEW.quantity THEN
              RAISE EXCEPTION 'Estoque insuficiente para saída. Disponível: %, Solicitado: %', current_stock, NEW.quantity;
            END IF;
            
            UPDATE products 
            SET stock_quantity = stock_quantity - NEW.quantity
            WHERE id = NEW.product_id;
            
            NEW.previous_stock := current_stock;
            NEW.new_stock := current_stock - NEW.quantity;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (funcError2) {
      console.error('❌ Erro ao criar função update_stock_on_movement:', funcError2);
      return;
    }
    console.log('✅ Função update_stock_on_movement criada');

    // 7. Criar trigger para movimentações manuais
    console.log('\n7️⃣ Criando trigger trigger_update_stock_on_movement...');
    const { error: triggerError2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TRIGGER trigger_update_stock_on_movement
        BEFORE INSERT ON stock_movements
        FOR EACH ROW
        EXECUTE FUNCTION update_stock_on_movement();
      `
    });

    if (triggerError2) {
      console.error('❌ Erro ao criar trigger trigger_update_stock_on_movement:', triggerError2);
      return;
    }
    console.log('✅ Trigger trigger_update_stock_on_movement criado');

    // 8. Verificar se os triggers foram criados
    console.log('\n8️⃣ Verificando triggers criados...');
    const { data: createdTriggers, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        AND trigger_name IN ('trigger_update_stock_on_sale', 'trigger_update_stock_on_movement')
        ORDER BY trigger_name;
      `
    });

    if (verifyError) {
      console.error('❌ Erro ao verificar triggers:', verifyError);
    } else {
      console.log(`✅ Triggers verificados: ${createdTriggers?.length || 0} encontrados`);
      createdTriggers?.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} em ${trigger.event_object_table}`);
      });
    }

    // 9. Verificar funções criadas
    console.log('\n9️⃣ Verificando funções criadas...');
    const { data: createdFunctions, error: funcVerifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT routine_name
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_name IN ('update_stock_on_sale', 'update_stock_on_movement')
        ORDER BY routine_name;
      `
    });

    if (funcVerifyError) {
      console.error('❌ Erro ao verificar funções:', funcVerifyError);
    } else {
      console.log(`✅ Funções verificadas: ${createdFunctions?.length || 0} encontradas`);
      createdFunctions?.forEach(func => {
        console.log(`   - ${func.routine_name}`);
      });
    }

    console.log('\n🎉 Processo de criação de triggers concluído!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

criarTriggersComVerificacao();
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarTriggerUnico() {
  console.log('🔧 CRIANDO TRIGGER ÚNICO E CORRETO PARA ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // 1. Criar função para reduzir estoque quando um item de venda é inserido
    console.log('\n1️⃣ Criando função update_stock_on_sale...');
    
    const { error: funcError } = await supabase.rpc('exec_sql', {
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
          
          -- Verificar se o produto existe
          IF current_stock IS NULL THEN
            RAISE EXCEPTION 'Produto com ID % não encontrado', NEW.product_id;
          END IF;
          
          -- Verificar se há estoque suficiente
          IF current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock, NEW.quantity;
          END IF;
          
          -- Atualizar estoque
          UPDATE products 
          SET stock_quantity = stock_quantity - NEW.quantity
          WHERE id = NEW.product_id;
          
          -- Buscar user_id da venda
          SELECT user_id INTO user_uuid FROM sales WHERE id = NEW.sale_id;
          
          -- Registrar movimentação de estoque
          INSERT INTO stock_movements (
            product_id,
            user_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            notes,
            created_at
          ) VALUES (
            NEW.product_id,
            user_uuid,
            'saida',
            NEW.quantity,
            current_stock,
            current_stock - NEW.quantity,
            'Venda - Sale ID: ' || NEW.sale_id,
            NOW()
          );
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (funcError) {
      console.error('❌ Erro ao criar função:', funcError);
      return;
    }
    
    console.log('✅ Função update_stock_on_sale criada com sucesso');
    
    // 2. Criar o trigger
    console.log('\n2️⃣ Criando trigger na tabela sale_items...');
    
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TRIGGER trigger_update_stock_on_sale
          AFTER INSERT ON public.sale_items
          FOR EACH ROW
          EXECUTE FUNCTION update_stock_on_sale();
      `
    });
    
    if (triggerError) {
      console.error('❌ Erro ao criar trigger:', triggerError);
      return;
    }
    
    console.log('✅ Trigger trigger_update_stock_on_sale criado com sucesso');
    
    // 3. Verificar se o trigger foi criado
    console.log('\n3️⃣ Verificando se o trigger foi criado...');
    
    const { data: triggers, error: verificarError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_object_table,
          event_manipulation,
          action_timing,
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
          AND event_object_table = 'sale_items'
        ORDER BY trigger_name;
      `
    });
    
    if (verificarError) {
      console.error('❌ Erro ao verificar trigger:', verificarError);
    } else if (triggers && triggers.length > 0) {
      console.log(`✅ ${triggers.length} trigger(s) encontrado(s):`);
      triggers.forEach(trigger => {
        console.log(`   📌 ${trigger.trigger_name}`);
        console.log(`      Tabela: ${trigger.event_object_table}`);
        console.log(`      Evento: ${trigger.event_manipulation} ${trigger.action_timing}`);
        console.log(`      Ação: ${trigger.action_statement}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhum trigger encontrado');
    }
    
    console.log('\n🎉 TRIGGER ÚNICO CRIADO COM SUCESSO!');
    console.log('📋 PRÓXIMO PASSO: Testar se o estoque é reduzido corretamente');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

criarTriggerUnico();
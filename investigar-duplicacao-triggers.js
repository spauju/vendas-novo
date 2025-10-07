require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarDuplicacao() {
  console.log('🔍 Investigando duplicação nos triggers...');
  
  try {
    // 1. Verificar quantos triggers existem
    console.log('\n1️⃣ Verificando triggers existentes...');
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          event_object_table,
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        AND (event_object_table = 'sale_items' OR event_object_table = 'stock_movements')
        ORDER BY event_object_table, trigger_name;
      `
    });

    if (triggerError) {
      console.error('❌ Erro ao verificar triggers:', triggerError);
    } else {
      console.log(`✅ Encontrados ${triggers?.length || 0} triggers:`);
      triggers?.forEach((trigger, index) => {
        console.log(`\n${index + 1}. ${trigger.trigger_name}`);
        console.log(`   Tabela: ${trigger.event_object_table}`);
        console.log(`   Evento: ${trigger.event_manipulation}`);
        console.log(`   Timing: ${trigger.action_timing}`);
        console.log(`   Função: ${trigger.action_statement}`);
      });
    }

    // 2. Verificar funções existentes
    console.log('\n2️⃣ Verificando funções existentes...');
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          routine_name,
          routine_type,
          routine_definition
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_name LIKE '%stock%'
        ORDER BY routine_name;
      `
    });

    if (funcError) {
      console.error('❌ Erro ao verificar funções:', funcError);
    } else {
      console.log(`✅ Encontradas ${functions?.length || 0} funções:`);
      functions?.forEach((func, index) => {
        console.log(`\n${index + 1}. ${func.routine_name} (${func.routine_type})`);
        console.log(`   Definição: ${func.routine_definition?.substring(0, 300)}...`);
      });
    }

    // 3. Fazer um teste controlado
    console.log('\n3️⃣ Fazendo teste controlado...');
    
    // Buscar um produto para teste
    const { data: product } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .limit(1)
      .single();

    if (!product) {
      console.log('❌ Nenhum produto encontrado para teste');
      return;
    }

    console.log(`📦 Produto de teste: ${product.name}`);
    console.log(`📊 Estoque inicial: ${product.stock_quantity}`);

    // Criar uma venda simples
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        total_amount: 10.00,
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`🛒 Venda criada: ${sale.id}`);

    // Verificar estoque antes da inserção do item
    const { data: beforeStock } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', product.id)
      .single();

    console.log(`📊 Estoque antes do item: ${beforeStock.stock_quantity}`);

    // Inserir item da venda (isso deve disparar o trigger)
    const { data: saleItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: product.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao criar item da venda:', itemError);
    } else {
      console.log(`✅ Item da venda criado: ${saleItem.id}`);
    }

    // Verificar estoque após a inserção
    const { data: afterStock } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', product.id)
      .single();

    console.log(`📊 Estoque após o item: ${afterStock.stock_quantity}`);
    console.log(`📉 Diferença: ${beforeStock.stock_quantity - afterStock.stock_quantity} (esperado: 1)`);

    // Verificar movimentações criadas
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: false });

    console.log(`📋 Movimentações criadas: ${movements?.length || 0}`);
    movements?.forEach((mov, index) => {
      console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
      console.log(`      Estoque: ${mov.previous_stock} → ${mov.new_stock}`);
    });

    // Limpeza
    console.log('\n4️⃣ Limpando dados de teste...');
    await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    await supabase.from('sales').delete().eq('id', sale.id);
    await supabase.from('stock_movements').delete().eq('reference_id', sale.id);
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: product.stock_quantity })
      .eq('id', product.id);

    console.log('✅ Limpeza concluída');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

investigarDuplicacao();
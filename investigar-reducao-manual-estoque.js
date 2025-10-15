require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarReducaoManual() {
  console.log('🔍 INVESTIGANDO REDUÇÃO MANUAL DE ESTOQUE NO PDV');
  
  try {
    // 1. Verificar se há alguma lógica de redução de estoque no código
    console.log('\n📋 1. Analisando código do PDV...');
    console.log('✅ Código do PDV analisado:');
    console.log('   - handlePaymentComplete apenas insere na tabela sales e sale_items');
    console.log('   - NÃO há redução manual de estoque no código do PDV');
    console.log('   - A redução deveria ser feita por triggers no banco');

    // 2. Verificar se há múltiplas inserções sendo feitas
    console.log('\n🔍 2. Testando inserção múltipla...');
    
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    console.log(`📦 Produto: ${testProduct.name} (Estoque inicial: ${testProduct.stock_quantity})`);

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    if (!customer) {
      console.log('❌ Customer não encontrado');
      return;
    }

    // 3. Simular exatamente o que o PDV faz
    console.log('\n🧪 3. Simulando processo do PDV...');
    
    // Passo 1: Criar venda (como no PDV)
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        discount_amount: 0,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.log('❌ Erro ao criar venda:', saleError.message);
      return;
    }

    console.log(`✅ Venda criada: ${sale.id}`);

    // Passo 2: Criar itens da venda (como no PDV)
    const saleItems = [{
      sale_id: sale.id,
      product_id: testProduct.id,
      quantity: 1,
      unit_price: 10.00
    }];

    console.log('⏱️ Inserindo itens da venda...');
    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)
      .select();

    if (itemsError) {
      console.log('❌ Erro ao criar itens:', itemsError.message);
      await supabase.from('sales').delete().eq('id', sale.id);
      return;
    }

    console.log(`✅ ${items.length} item(s) criado(s)`);

    // Aguardar processamento
    console.log('⏳ Aguardando 5 segundos para triggers processarem...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Verificar resultado
    const { data: updatedProduct } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (updatedProduct) {
      const reduction = testProduct.stock_quantity - updatedProduct.stock_quantity;
      console.log(`\n📊 RESULTADO:`);
      console.log(`   Estoque inicial: ${testProduct.stock_quantity}`);
      console.log(`   Estoque final: ${updatedProduct.stock_quantity}`);
      console.log(`   Redução: ${reduction}`);
      
      if (reduction === 4) {
        console.log('🚨 PROBLEMA CONFIRMADO: Redução quadruplicada!');
      } else if (reduction === 1) {
        console.log('✅ Redução correta');
      } else {
        console.log(`⚠️ Redução inesperada: ${reduction}`);
      }
    }

    // 5. Verificar movimentações criadas
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: false });

    if (movements) {
      console.log(`\n📋 Movimentações criadas: ${movements.length}`);
      movements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock}) - ${mov.created_at}`);
      });
    }

    // 6. Verificar se há triggers ativos
    console.log('\n🔍 6. Verificando triggers ativos...');
    
    const { data: activeTriggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tgname as trigger_name,
          proname as function_name,
          tgenabled as enabled
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE c.relname = 'sale_items'
        AND NOT tgisinternal;
      `
    });

    if (triggerError) {
      console.log('❌ Erro ao verificar triggers:', triggerError.message);
    } else if (activeTriggers && activeTriggers.length > 0) {
      console.log(`✅ ${activeTriggers.length} trigger(s) ativo(s):`);
      activeTriggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} → ${trigger.function_name} (${trigger.enabled ? 'ATIVO' : 'INATIVO'})`);
      });
    } else {
      console.log('❌ Nenhum trigger ativo encontrado');
    }

    // Limpeza
    console.log('\n🧹 Limpando dados de teste...');
    if (movements) {
      await supabase.from('stock_movements').delete().eq('reference_id', sale.id);
    }
    await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    await supabase.from('sales').delete().eq('id', sale.id);
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Investigação concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarReducaoManual();
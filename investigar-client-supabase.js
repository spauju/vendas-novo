require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Criar múltiplas instâncias do cliente para testar
const supabase1 = createClient(supabaseUrl, supabaseServiceKey);
const supabase2 = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function investigarClientSupabase() {
  console.log('🔍 INVESTIGANDO CLIENTE SUPABASE E CONFIGURAÇÕES');
  console.log('='.repeat(55));
  
  try {
    // 1. Verificar se há diferença entre clientes
    console.log('\n👥 1. Testando com diferentes clientes Supabase...');
    
    const { data: testProduct } = await supabase1
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (!testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    console.log(`📦 Produto: ${testProduct.name}`);
    console.log(`📊 Estoque inicial: ${testProduct.stock_quantity}`);

    const { data: customer } = await supabase1
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    // Teste com cliente 1
    console.log('\n🧪 Teste com Cliente 1 (padrão)...');
    
    const { data: sale1 } = await supabase1
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    const { data: stockBefore1 } = await supabase1
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque antes (Cliente 1): ${stockBefore1.stock_quantity}`);

    const { data: item1 } = await supabase1
      .from('sale_items')
      .insert({
        sale_id: sale1.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    const { data: stockAfter1 } = await supabase1
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction1 = stockBefore1.stock_quantity - stockAfter1.stock_quantity;
    console.log(`📊 Estoque depois (Cliente 1): ${stockAfter1.stock_quantity}`);
    console.log(`📉 Redução Cliente 1: ${reduction1}`);

    // Restaurar estoque para teste 2
    await supabase1
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    // Teste com cliente 2
    console.log('\n🧪 Teste com Cliente 2 (configurado)...');
    
    const { data: sale2 } = await supabase2
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    const { data: stockBefore2 } = await supabase2
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque antes (Cliente 2): ${stockBefore2.stock_quantity}`);

    const { data: item2 } = await supabase2
      .from('sale_items')
      .insert({
        sale_id: sale2.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    const { data: stockAfter2 } = await supabase2
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction2 = stockBefore2.stock_quantity - stockAfter2.stock_quantity;
    console.log(`📊 Estoque depois (Cliente 2): ${stockAfter2.stock_quantity}`);
    console.log(`📉 Redução Cliente 2: ${reduction2}`);

    // 2. Testar inserção com diferentes métodos
    console.log('\n🔧 2. Testando diferentes métodos de inserção...');
    
    // Restaurar estoque
    await supabase1
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    // Método 1: Insert simples
    console.log('\n📝 Método 1: Insert simples...');
    
    const { data: sale3 } = await supabase1
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    const { data: stockBefore3 } = await supabase1
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    await supabase1
      .from('sale_items')
      .insert({
        sale_id: sale3.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      });

    const { data: stockAfter3 } = await supabase1
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction3 = stockBefore3.stock_quantity - stockAfter3.stock_quantity;
    console.log(`📉 Redução Método 1: ${reduction3}`);

    // Restaurar estoque
    await supabase1
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    // Método 2: Insert com upsert
    console.log('\n📝 Método 2: Insert com upsert...');
    
    const { data: sale4 } = await supabase1
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    const { data: stockBefore4 } = await supabase1
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    await supabase1
      .from('sale_items')
      .upsert({
        sale_id: sale4.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      });

    const { data: stockAfter4 } = await supabase1
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction4 = stockBefore4.stock_quantity - stockAfter4.stock_quantity;
    console.log(`📉 Redução Método 2: ${reduction4}`);

    // 3. Verificar se há alguma configuração de retry ou timeout
    console.log('\n⏱️ 3. Testando com timeout personalizado...');
    
    const supabase3 = createClient(supabaseUrl, supabaseServiceKey, {
      db: { 
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'test-client'
        }
      }
    });

    // Restaurar estoque
    await supabase1
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    const { data: sale5 } = await supabase3
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    const { data: stockBefore5 } = await supabase3
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    await supabase3
      .from('sale_items')
      .insert({
        sale_id: sale5.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      });

    const { data: stockAfter5 } = await supabase3
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reduction5 = stockBefore5.stock_quantity - stockAfter5.stock_quantity;
    console.log(`📉 Redução Cliente 3: ${reduction5}`);

    // 4. Verificar se há alguma configuração de cache
    console.log('\n💾 4. Verificando configurações de cache...');
    
    // Fazer múltiplas consultas para ver se há cache
    const start = Date.now();
    for (let i = 0; i < 3; i++) {
      await supabase1
        .from('products')
        .select('stock_quantity')
        .eq('id', testProduct.id)
        .single();
    }
    const end = Date.now();
    
    console.log(`⏱️ 3 consultas levaram: ${end - start}ms`);

    // Resumo dos resultados
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log(`   Cliente 1 (padrão): ${reduction1}x redução`);
    console.log(`   Cliente 2 (config): ${reduction2}x redução`);
    console.log(`   Método 1 (insert): ${reduction3}x redução`);
    console.log(`   Método 2 (upsert): ${reduction4}x redução`);
    console.log(`   Cliente 3 (header): ${reduction5}x redução`);

    if (reduction1 === reduction2 && reduction2 === reduction3 && reduction3 === reduction4 && reduction4 === reduction5) {
      console.log('\n✅ CONSISTÊNCIA: Todos os métodos produzem o mesmo resultado');
      if (reduction1 === 4) {
        console.log('🚨 PROBLEMA CONFIRMADO: Todos os métodos causam redução 4x');
        console.log('💡 O problema não está no cliente, mas sim no servidor/banco');
      }
    } else {
      console.log('\n⚠️ INCONSISTÊNCIA: Diferentes métodos produzem resultados diferentes');
    }

    // Limpeza
    console.log('\n🧹 Limpando...');
    const saleIds = [sale1.id, sale2.id, sale3.id, sale4.id, sale5.id];
    
    await supabase1.from('stock_movements').delete().in('reference_id', saleIds);
    await supabase1.from('sale_items').delete().in('sale_id', saleIds);
    await supabase1.from('sales').delete().in('id', saleIds);
    await supabase1
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Investigação de cliente concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarClientSupabase();
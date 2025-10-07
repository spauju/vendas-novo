require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testarTriggers() {
  console.log('🧪 Testando triggers de estoque...');
  
  try {
    // Usar um produto existente
    const productId = '06cc973a-dc17-40ce-a6e6-d07b44cc16ad'; // Produto Exemplo 1
    const userId = 'dc5260de-2251-402c-b746-04050430288a'; // Admin user
    
    // 1. Verificar estoque inicial
    console.log('\n1️⃣ Verificando estoque inicial...');
    const { data: initialProduct, error: initialError } = await supabase
      .from('products')
      .select('name, code, stock_quantity')
      .eq('id', productId)
      .single();

    if (initialError) {
      console.error('❌ Erro ao buscar produto:', initialError);
      return;
    }

    console.log(`✅ Produto: ${initialProduct.name} (${initialProduct.code})`);
    console.log(`   Estoque inicial: ${initialProduct.stock_quantity} unidades`);

    // 2. Simular uma venda (inserir em sale_items)
    console.log('\n2️⃣ Simulando venda...');
    const saleQuantity = 3;
    
    const { data: saleItem, error: saleError } = await supabase
      .from('sale_items')
      .insert({
        product_id: productId,
        quantity: saleQuantity,
        unit_price: 23.39,
        sale_id: '00000000-0000-0000-0000-000000000001' // ID fictício para teste
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao inserir venda:', saleError);
    } else {
      console.log(`✅ Venda inserida: ${saleQuantity} unidades`);
    }

    // 3. Verificar se o estoque foi reduzido automaticamente
    console.log('\n3️⃣ Verificando redução automática de estoque...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
    
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (updateError) {
      console.error('❌ Erro ao verificar estoque atualizado:', updateError);
    } else {
      const expectedStock = initialProduct.stock_quantity - saleQuantity;
      console.log(`   Estoque esperado: ${expectedStock}`);
      console.log(`   Estoque atual: ${updatedProduct.stock_quantity}`);
      
      if (updatedProduct.stock_quantity === expectedStock) {
        console.log('✅ Trigger funcionando! Estoque reduzido automaticamente');
      } else {
        console.log('❌ Trigger não funcionou - estoque não foi reduzido');
      }
    }

    // 4. Testar movimento manual de estoque
    console.log('\n4️⃣ Testando movimento manual de estoque...');
    const movementQuantity = 2;
    
    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        movement_type: 'entrada',
        quantity: movementQuantity,
        notes: 'Teste de entrada manual - trigger corrigido para usar stock_quantity',
        user_id: userId
      })
      .select()
      .single();

    if (movementError) {
      console.error('❌ Erro ao inserir movimento:', movementError);
    } else {
      console.log(`✅ Movimento inserido: +${movementQuantity} unidades`);
    }

    // 5. Verificar se o movimento afetou o estoque
    console.log('\n5️⃣ Verificando efeito do movimento no estoque...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
    
    const { data: finalProduct, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (finalError) {
      console.error('❌ Erro ao verificar estoque final:', finalError);
    } else {
      console.log(`   Estoque final: ${finalProduct.stock_quantity}`);
    }

    // 6. Limpeza - remover dados de teste
    console.log('\n6️⃣ Limpando dados de teste...');
    
    if (saleItem) {
      await supabase
        .from('sale_items')
        .delete()
        .eq('id', saleItem.id);
      console.log('✅ Item de venda removido');
    }
    
    if (movement) {
      await supabase
        .from('stock_movements')
        .delete()
        .eq('id', movement.id);
      console.log('✅ Movimento de estoque removido');
    }

    // Restaurar estoque original
    await supabase
      .from('products')
      .update({ stock_quantity: initialProduct.stock_quantity })
      .eq('id', productId);
    console.log('✅ Estoque restaurado ao valor original');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarTriggers();
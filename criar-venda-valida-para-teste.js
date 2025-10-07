require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function criarVendaValidaParaTeste() {
  console.log('🛒 Criando venda válida para testar triggers...');
  
  try {
    const productId = '06cc973a-dc17-40ce-a6e6-d07b44cc16ad'; // Produto Exemplo 1
    const userId = 'dc5260de-2251-402c-b746-04050430288a'; // Admin user
    
    // 1. Verificar estoque inicial
    console.log('\n1️⃣ Verificando estoque inicial...');
    const { data: initialProduct, error: initialError } = await supabase
      .from('products')
      .select('name, code, stock_quantity, sale_price')
      .eq('id', productId)
      .single();

    if (initialError) {
      console.error('❌ Erro ao buscar produto:', initialError);
      return;
    }

    console.log(`✅ Produto: ${initialProduct.name} (${initialProduct.code})`);
    console.log(`   Estoque inicial: ${initialProduct.stock_quantity} unidades`);
    console.log(`   Preço de venda: R$ ${initialProduct.sale_price}`);

    // 2. Criar uma venda válida
    console.log('\n2️⃣ Criando venda...');
    const saleQuantity = 2;
    const unitPrice = initialProduct.sale_price;
    const totalAmount = saleQuantity * unitPrice;
    
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        final_amount: totalAmount,
        payment_method: 'dinheiro',
        status: 'completed',
        notes: 'Venda de teste para triggers'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`✅ Venda criada: ${sale.id}`);
    console.log(`   Total: R$ ${sale.total_amount}`);

    // 3. Adicionar item à venda (deve disparar o trigger)
    console.log('\n3️⃣ Adicionando item à venda (trigger deve ser disparado)...');
    
    const { data: saleItem, error: saleItemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: productId,
        quantity: saleQuantity,
        unit_price: unitPrice
      })
      .select()
      .single();

    if (saleItemError) {
      console.error('❌ Erro ao criar item da venda:', saleItemError);
      
      // Limpar venda criada
      await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);
      return;
    }

    console.log(`✅ Item da venda criado: ${saleQuantity} unidades`);
    console.log(`   Preço unitário: R$ ${unitPrice}`);
    console.log(`   Total do item: R$ ${saleItem.total_price || (saleQuantity * unitPrice)}`);

    // 4. Verificar se o estoque foi reduzido automaticamente
    console.log('\n4️⃣ Verificando redução automática de estoque...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
    
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
        console.log('✅ TRIGGER FUNCIONANDO! Estoque reduzido automaticamente');
      } else {
        console.log('❌ Trigger não funcionou - estoque não foi reduzido');
      }
    }

    // 5. Verificar movimentações de estoque criadas
    console.log('\n5️⃣ Verificando movimentações de estoque...');
    
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (movError) {
      console.error('❌ Erro ao buscar movimentações:', movError);
    } else {
      console.log(`✅ Encontradas ${movements.length} movimentações recentes:`);
      movements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
        console.log(`      Estoque: ${mov.previous_stock} → ${mov.new_stock}`);
        console.log(`      Motivo: ${mov.notes || 'N/A'}`);
        console.log(`      Data: ${new Date(mov.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 6. Limpeza - perguntar se deve limpar
    console.log('\n6️⃣ Limpeza dos dados de teste...');
    
    // Remover item da venda
    await supabase
      .from('sale_items')
      .delete()
      .eq('id', saleItem.id);
    console.log('✅ Item da venda removido');
    
    // Remover venda
    await supabase
      .from('sales')
      .delete()
      .eq('id', sale.id);
    console.log('✅ Venda removida');
    
    // Restaurar estoque original
    await supabase
      .from('products')
      .update({ stock_quantity: initialProduct.stock_quantity })
      .eq('id', productId);
    console.log('✅ Estoque restaurado ao valor original');

    // Remover movimentações de teste (opcional)
    const testMovements = movements.filter(m => 
      m.notes && m.notes.includes('Venda automática - Sale ID: ' + sale.id)
    );
    
    if (testMovements.length > 0) {
      for (const mov of testMovements) {
        await supabase
          .from('stock_movements')
          .delete()
          .eq('id', mov.id);
      }
      console.log(`✅ ${testMovements.length} movimentação(ões) de teste removida(s)`);
    }

    console.log('\n🎉 Teste completo! Dados de teste limpos.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

criarVendaValidaParaTeste();
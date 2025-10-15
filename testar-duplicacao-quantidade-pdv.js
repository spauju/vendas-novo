require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testarDuplicacaoQuantidadePDV() {
  console.log('🔍 TESTANDO DUPLICAÇÃO DE QUANTIDADE NO PDV');
  console.log('='.repeat(60));
  
  try {
    // 1. Buscar um produto para teste
    console.log('\n1️⃣ Buscando produto para teste...');
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, sale_price, barcode, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 5)
      .limit(1);

    if (productError || !products || products.length === 0) {
      console.error('❌ Erro ao buscar produto:', productError);
      return;
    }

    const testProduct = products[0];
    console.log(`✅ Produto selecionado: ${testProduct.name}`);
    console.log(`   ID: ${testProduct.id}`);
    console.log(`   Estoque atual: ${testProduct.stock_quantity}`);
    console.log(`   Preço: R$ ${testProduct.sale_price}`);

    // 2. Registrar estoque inicial
    const estoqueInicial = testProduct.stock_quantity;
    console.log(`\n📦 Estoque inicial registrado: ${estoqueInicial} unidades`);

    // 3. Simular cenário PDV: Adicionar produto com quantidade inicial
    console.log('\n2️⃣ Simulando cenário PDV...');
    
    // Simular adição ao carrinho com quantidade inicial
    const quantidadeInicial = 2;
    console.log(`   📝 Produto adicionado ao carrinho: ${quantidadeInicial} unidades`);
    
    // Simular alteração de quantidade no carrinho (cenário comum)
    const quantidadeFinal = 3;
    console.log(`   ✏️ Quantidade alterada no carrinho: ${quantidadeFinal} unidades`);
    
    // 4. Simular finalização da venda (como no PDV real)
    console.log('\n3️⃣ Finalizando venda simulada...');
    
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id: null,
        total_amount: testProduct.sale_price * quantidadeFinal,
        discount_amount: 0,
        final_amount: testProduct.sale_price * quantidadeFinal,
        status: 'completed',
        payment_method: 'cash',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`✅ Venda criada: ID ${sale.id}`);
    console.log(`   Total: R$ ${sale.final_amount}`);

    // 5. Inserir item da venda com quantidade FINAL
    const saleItem = {
      sale_id: sale.id,
      product_id: testProduct.id,
      quantity: quantidadeFinal, // Quantidade que deveria ser debitada
      unit_price: testProduct.sale_price
    };

    console.log(`\n📋 Inserindo item da venda:`);
    console.log(`   Produto: ${testProduct.name}`);
    console.log(`   Quantidade: ${saleItem.quantity} unidades`);
    console.log(`   Preço unitário: R$ ${saleItem.unit_price}`);

    const { data: insertedItem, error: itemError } = await supabase
      .from('sale_items')
      .insert(saleItem)
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return;
    }

    console.log(`✅ Item inserido com sucesso`);

    // 6. Aguardar processamento dos triggers
    console.log('\n⏳ Aguardando processamento dos triggers...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 7. Verificar estoque após a venda
    console.log('\n4️⃣ Verificando estoque após venda...');
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (updateError) {
      console.error('❌ Erro ao verificar estoque:', updateError);
      return;
    }

    const estoqueFinal = updatedProduct.stock_quantity;
    const reducaoReal = estoqueInicial - estoqueFinal;

    console.log(`📦 Estoque após venda: ${estoqueFinal} unidades`);
    console.log(`📉 Redução real do estoque: ${reducaoReal} unidades`);

    // 8. Verificar movimentações de estoque
    console.log('\n5️⃣ Verificando movimentações de estoque...');
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testProduct.id)
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: false });

    if (movError) {
      console.error('❌ Erro ao buscar movimentações:', movError);
    } else {
      console.log(`📋 Movimentações encontradas: ${movements?.length || 0}`);
      
      movements?.forEach((mov, index) => {
        console.log(`   ${index + 1}. Tipo: ${mov.movement_type}`);
        console.log(`      Quantidade: ${mov.quantity}`);
        console.log(`      Estoque: ${mov.previous_stock} → ${mov.new_stock}`);
        console.log(`      Notas: ${mov.notes}`);
        console.log(`      Data: ${new Date(mov.created_at).toLocaleString()}`);
      });
    }

    // 9. Análise dos resultados
    console.log('\n6️⃣ ANÁLISE DOS RESULTADOS');
    console.log('='.repeat(40));
    
    console.log(`📊 Quantidade esperada para debitar: ${quantidadeFinal} unidades`);
    console.log(`📊 Quantidade realmente debitada: ${reducaoReal} unidades`);
    
    if (reducaoReal === quantidadeFinal) {
      console.log('✅ SUCESSO: Quantidade debitada está CORRETA');
    } else if (reducaoReal > quantidadeFinal) {
      console.log(`❌ PROBLEMA: Estoque foi debitado em EXCESSO`);
      console.log(`   Diferença: ${reducaoReal - quantidadeFinal} unidades a mais`);
    } else {
      console.log(`⚠️ PROBLEMA: Estoque foi debitado INSUFICIENTEMENTE`);
      console.log(`   Diferença: ${quantidadeFinal - reducaoReal} unidades a menos`);
    }

    // Verificar se há múltiplas movimentações (indicativo de duplicação)
    if (movements && movements.length > 1) {
      console.log(`⚠️ ATENÇÃO: ${movements.length} movimentações encontradas para uma única venda`);
      console.log('   Isso pode indicar duplicação de triggers ou processamento');
    } else if (movements && movements.length === 1) {
      console.log('✅ Apenas 1 movimentação encontrada (comportamento esperado)');
    }

    // 10. Limpeza - Reverter a venda de teste
    console.log('\n7️⃣ Limpando dados de teste...');
    
    // Deletar item da venda
    await supabase.from('sale_items').delete().eq('id', insertedItem.id);
    
    // Deletar venda
    await supabase.from('sales').delete().eq('id', sale.id);
    
    // Restaurar estoque manualmente se necessário
    if (reducaoReal !== quantidadeFinal) {
      const estoqueCorreto = estoqueInicial;
      await supabase
        .from('products')
        .update({ stock_quantity: estoqueCorreto })
        .eq('id', testProduct.id);
      
      console.log(`🔄 Estoque restaurado para: ${estoqueCorreto} unidades`);
    }
    
    console.log('✅ Limpeza concluída');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testarDuplicacaoQuantidadePDV();
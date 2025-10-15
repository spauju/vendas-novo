require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testeSemTotalPrice() {
  console.log('🔍 TESTE SEM TOTAL_PRICE');
  console.log('='.repeat(70));
  
  try {
    // Buscar produto
    const { data: produto, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 30)
      .limit(1)
      .single();
    
    if (prodError || !produto) {
      console.log('❌ Produto não encontrado');
      return;
    }
    
    const estoqueInicial = produto.stock_quantity;
    console.log(`\n📦 Produto: ${produto.name}`);
    console.log(`📊 Estoque inicial: ${estoqueInicial}`);
    
    // Criar venda
    const { data: venda, error: vendaError } = await supabase
      .from('sales')
      .insert({
        total_amount: 40,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid'
      })
      .select()
      .single();
    
    if (vendaError) {
      console.log('❌ Erro ao criar venda:', vendaError);
      return;
    }
    
    console.log(`✅ Venda criada: ${venda.id}`);
    
    // Inserir em sale_items SEM total_price
    const quantidadeTeste = 4;
    console.log(`\n📝 Inserindo ${quantidadeTeste} unidades em sale_items (SEM total_price)...`);
    
    const { data: item, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: venda.id,
        product_id: produto.id,
        quantity: quantidadeTeste,
        unit_price: 10
        // NÃO incluir total_price (é gerado automaticamente)
      })
      .select()
      .single();
    
    if (itemError) {
      console.log('❌ Erro ao inserir item:', itemError);
      await supabase.from('sales').delete().eq('id', venda.id);
      return;
    }
    
    console.log(`✅ Item inserido: ${item.id}`);
    console.log(`   Quantity: ${item.quantity}`);
    console.log(`   Unit Price: ${item.unit_price}`);
    console.log(`   Total Price: ${item.total_price} (gerado automaticamente)`);
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar estoque
    const { data: produtoFinal, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (!finalError && produtoFinal) {
      const reducao = estoqueInicial - produtoFinal.stock_quantity;
      const multiplicador = reducao / quantidadeTeste;
      
      console.log(`\n📊 RESULTADO:`);
      console.log(`   Estoque inicial: ${estoqueInicial}`);
      console.log(`   Estoque final: ${produtoFinal.stock_quantity}`);
      console.log(`   Redução: ${reducao} unidades`);
      console.log(`   Esperado: ${quantidadeTeste} unidades`);
      console.log(`   Multiplicador: ${multiplicador}x`);
      
      if (multiplicador === 1) {
        console.log(`\n   ✅ PERFEITO! Sem duplicação!`);
        console.log(`\n   🎉 O PROBLEMA FOI RESOLVIDO!`);
      } else if (multiplicador === 2) {
        console.log(`\n   ❌ DUPLICAÇÃO 2X AINDA PRESENTE!`);
        console.log(`\n   🔍 Vou investigar mais...`);
        
        // Verificar se há movimentações criadas
        const { data: movs, error: movError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('product_id', produto.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (!movError && movs && movs.length > 0) {
          console.log(`\n   📋 Movimentações recentes:`);
          movs.forEach((mov, i) => {
            console.log(`      ${i + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
            console.log(`         Criado em: ${mov.created_at}`);
            console.log(`         Notas: ${mov.notes || 'N/A'}`);
          });
        }
      } else {
        console.log(`\n   ⚠️ Multiplicador inesperado: ${multiplicador}x`);
      }
    }
    
    // Limpar
    await supabase.from('sale_items').delete().eq('id', item.id);
    await supabase.from('sales').delete().eq('id', venda.id);
    await supabase.from('products').update({ stock_quantity: estoqueInicial }).eq('id', produto.id);
    
    console.log('\n✅ Teste concluído e dados restaurados');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testeSemTotalPrice();

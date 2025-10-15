require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarSaleItemsIsolado() {
  console.log('🔍 TESTE: INSERIR EM SALE_ITEMS ISOLADAMENTE');
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
        total_amount: 80,
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
    
    // Inserir em sale_items SEM tocar no estoque
    const quantidadeTeste = 8;
    console.log(`\n📝 Inserindo ${quantidadeTeste} unidades em sale_items...`);
    console.log(`   (SEM atualizar products.stock_quantity)`);
    
    const { data: item, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: venda.id,
        product_id: produto.id,
        quantity: quantidadeTeste,
        unit_price: 10
      })
      .select()
      .single();
    
    if (itemError) {
      console.log('❌ Erro ao inserir item:', itemError);
      return;
    }
    
    console.log(`✅ Item inserido: ${item.id}`);
    
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
      
      console.log(`\n📊 RESULTADO:`);
      console.log(`   Estoque inicial: ${estoqueInicial}`);
      console.log(`   Estoque final: ${produtoFinal.stock_quantity}`);
      console.log(`   Redução: ${reducao} unidades`);
      console.log(`   Esperado: 0 (não tocamos no estoque)`);
      
      if (reducao === 0) {
        console.log(`\n   ✅ Correto! sale_items não causa redução automática`);
      } else if (reducao === quantidadeTeste) {
        console.log(`\n   ❌ TRIGGER OCULTO EM SALE_ITEMS!`);
        console.log(`   🎯 Inserir em sale_items reduz o estoque automaticamente!`);
      } else {
        console.log(`\n   ⚠️ Redução inesperada de ${reducao} unidades`);
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

testarSaleItemsIsolado();

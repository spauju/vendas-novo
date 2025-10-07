require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usando service role para contornar RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Definida' : '❌ Não definida');
  console.error('\n💡 Verifique o arquivo .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarEstoqueCompleto() {
  console.log('🧪 Teste completo do sistema de estoque');
  console.log('=====================================\n');

  try {
    // 1. Verificar produtos existentes
    console.log('1️⃣ Verificando produtos existentes...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, sale_price')
      .eq('active', true)
      .limit(5);

    if (productsError) {
      console.error('❌ Erro ao buscar produtos:', productsError);
      return;
    }

    if (!products || products.length === 0) {
      console.log('⚠️ Nenhum produto encontrado');
      return;
    }

    console.log(`✅ Encontrados ${products.length} produtos:`);
    products.forEach(p => {
      console.log(`   - ${p.name}: ${p.stock_quantity} unidades (R$ ${p.sale_price})`);
    });

    // 2. Testar venda (baixa automática)
    console.log('\n2️⃣ Testando venda (baixa automática)...');
    const testProduct = products[0];
    const stockAntes = testProduct.stock_quantity;
    
    // Criar uma venda de teste
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id: null,
        total_amount: testProduct.sale_price * 2,
        payment_method: 'dinheiro',
        notes: 'Teste automático de estoque'
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`✅ Venda criada: ID ${sale.id}`);

    // Criar item da venda (sem total_price pois é uma coluna gerada)
    const { error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: testProduct.id,
        quantity: 2,
        unit_price: testProduct.sale_price
      });

    if (itemError) {
      console.error('❌ Erro ao criar item da venda:', itemError);
      return;
    }

    console.log('✅ Item da venda criado (2 unidades)');

    // Verificar se o estoque foi reduzido
    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar trigger

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (updateError) {
      console.error('❌ Erro ao verificar estoque atualizado:', updateError);
      return;
    }

    const stockDepois = updatedProduct.stock_quantity;
    console.log(`📊 Estoque antes: ${stockAntes}, depois: ${stockDepois}`);
    
    if (stockDepois === stockAntes - 2) {
      console.log('✅ Baixa automática funcionando!');
    } else {
      console.log('❌ Baixa automática NÃO funcionando!');
    }

    // 3. Testar movimentação manual
    console.log('\n3️⃣ Testando movimentação manual...');
    const stockAntesManual = stockDepois;

    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: testProduct.id,
        movement_type: 'saida',
        quantity: 1,
        notes: 'Teste manual de saída',
        user_id: 'dc5260de-2251-402c-b746-04050430288a' // ID do admin
      });

    if (movementError) {
      console.error('❌ Erro ao criar movimentação manual:', movementError);
      return;
    }

    console.log('✅ Movimentação manual criada (saída de 1 unidade)');

    // Verificar se o estoque foi reduzido
    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar trigger

    const { data: finalProduct, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (finalError) {
      console.error('❌ Erro ao verificar estoque final:', finalError);
      return;
    }

    const stockFinal = finalProduct.stock_quantity;
    console.log(`📊 Estoque antes da movimentação: ${stockAntesManual}, depois: ${stockFinal}`);
    
    if (stockFinal === stockAntesManual - 1) {
      console.log('✅ Movimentação manual funcionando!');
    } else {
      console.log('❌ Movimentação manual NÃO funcionando!');
    }

    // 4. Verificar movimentações registradas
    console.log('\n4️⃣ Verificando movimentações registradas...');
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', testProduct.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (movementsError) {
      console.error('❌ Erro ao buscar movimentações:', movementsError);
      return;
    }

    console.log(`✅ Encontradas ${movements.length} movimentações:`);
    movements.forEach(m => {
      console.log(`   - ${m.movement_type}: ${m.quantity} unidades (${m.notes || 'Sem motivo'})`);
    });

    // 5. Limpeza - remover dados de teste
    console.log('\n5️⃣ Limpando dados de teste...');
    
    // Remover item da venda
    await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    
    // Remover venda
    await supabase.from('sales').delete().eq('id', sale.id);
    
    // Restaurar estoque original
    await supabase
      .from('products')
      .update({ stock_quantity: stockAntes })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída - estoque restaurado');

    console.log('\n🎉 Teste completo finalizado!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarEstoqueCompleto();
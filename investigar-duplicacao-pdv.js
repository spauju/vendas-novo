require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarDuplicacaoPDV() {
  console.log('🔍 Investigando duplicação de valores no PDV...');
  
  try {
    // 1. Verificar vendas recentes para identificar padrões de duplicação
    console.log('\n1️⃣ Verificando vendas recentes...');
    
    const { data: recentSales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        final_amount,
        created_at,
        payment_method,
        sale_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products (
            name,
            sale_price
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (salesError) {
      console.error('❌ Erro ao buscar vendas:', salesError);
      return;
    }

    console.log(`✅ Encontradas ${recentSales?.length || 0} vendas recentes:`);
    
    recentSales?.forEach((sale, index) => {
      console.log(`\n${index + 1}. Venda ${sale.id}`);
      console.log(`   Data: ${new Date(sale.created_at).toLocaleString()}`);
      console.log(`   Total: R$ ${sale.total_amount}`);
      console.log(`   Final: R$ ${sale.final_amount}`);
      console.log(`   Método: ${sale.payment_method}`);
      console.log(`   Itens: ${sale.sale_items?.length || 0}`);
      
      // Verificar se há problemas nos itens
      sale.sale_items?.forEach((item, itemIndex) => {
        const expectedTotal = item.quantity * item.unit_price;
        const actualTotal = item.total_price || expectedTotal;
        const priceDifference = Math.abs(expectedTotal - actualTotal);
        
        console.log(`     ${itemIndex + 1}. ${item.products?.name || 'Produto desconhecido'}`);
        console.log(`        Qtd: ${item.quantity} | Preço Unit: R$ ${item.unit_price}`);
        console.log(`        Total Esperado: R$ ${expectedTotal.toFixed(2)}`);
        console.log(`        Total Registrado: R$ ${actualTotal.toFixed(2)}`);
        
        if (priceDifference > 0.01) {
          console.log(`        ⚠️ DIFERENÇA DETECTADA: R$ ${priceDifference.toFixed(2)}`);
        }
        
        // Verificar se o preço unitário está diferente do preço de venda do produto
        if (item.products?.sale_price && Math.abs(item.unit_price - item.products.sale_price) > 0.01) {
          console.log(`        ⚠️ PREÇO DIFERENTE DO CADASTRO: Cadastrado R$ ${item.products.sale_price}, Vendido R$ ${item.unit_price}`);
        }
      });
    });

    // 2. Verificar se há movimentações de estoque duplicadas
    console.log('\n2️⃣ Verificando movimentações de estoque...');
    
    const { data: stockMovements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('movement_type', 'saida')
      .order('created_at', { ascending: false })
      .limit(20);

    if (movError) {
      console.error('❌ Erro ao buscar movimentações:', movError);
    } else {
      console.log(`✅ Encontradas ${stockMovements?.length || 0} movimentações de saída recentes:`);
      
      // Agrupar por reference_id para detectar duplicações
      const groupedMovements = {};
      stockMovements?.forEach(mov => {
        const key = mov.reference_id || 'sem_referencia';
        if (!groupedMovements[key]) {
          groupedMovements[key] = [];
        }
        groupedMovements[key].push(mov);
      });

      Object.entries(groupedMovements).forEach(([refId, movements]) => {
        if (movements.length > 1) {
          console.log(`\n⚠️ POSSÍVEL DUPLICAÇÃO - Referência ${refId}:`);
          movements.forEach((mov, index) => {
            console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
            console.log(`      Data: ${new Date(mov.created_at).toLocaleString()}`);
            console.log(`      Notas: ${mov.notes}`);
          });
        }
      });
    }

    // 3. Simular uma venda para testar o comportamento atual
    console.log('\n3️⃣ Simulando venda para testar comportamento...');
    
    // Buscar um produto para teste
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, sale_price, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 0)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Nenhum produto disponível para teste');
      return;
    }

    console.log(`📦 Produto de teste: ${testProduct.name}`);
    console.log(`📊 Estoque atual: ${testProduct.stock_quantity}`);
    console.log(`💰 Preço: R$ ${testProduct.sale_price}`);

    // Buscar um usuário válido
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado para teste');
      return;
    }

    const testUserId = users[0].id;

    // Criar venda de teste
    const saleData = {
      user_id: testUserId,
      total_amount: testProduct.sale_price,
      final_amount: testProduct.sale_price,
      status: 'completed',
      payment_method: 'dinheiro',
      payment_status: 'paid'
    };

    console.log('\n📝 Criando venda de teste...');
    const { data: testSale, error: testSaleError } = await supabase
      .from('sales')
      .insert(saleData)
      .select()
      .single();

    if (testSaleError) {
      console.error('❌ Erro ao criar venda de teste:', testSaleError);
      return;
    }

    console.log(`✅ Venda criada: ${testSale.id}`);

    // Criar item da venda
    const itemData = {
      sale_id: testSale.id,
      product_id: testProduct.id,
      quantity: 1,
      unit_price: testProduct.sale_price
    };

    console.log('\n📝 Criando item da venda...');
    const { data: testItem, error: testItemError } = await supabase
      .from('sale_items')
      .insert(itemData)
      .select()
      .single();

    if (testItemError) {
      console.error('❌ Erro ao criar item da venda:', testItemError);
      // Limpar venda criada
      await supabase.from('sales').delete().eq('id', testSale.id);
      return;
    }

    console.log(`✅ Item criado: ${testItem.id}`);

    // Aguardar um pouco para triggers processarem
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se o estoque foi atualizado
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (updateError) {
      console.error('❌ Erro ao verificar estoque atualizado:', updateError);
    } else {
      const stockDifference = testProduct.stock_quantity - updatedProduct.stock_quantity;
      console.log(`📊 Estoque após venda: ${updatedProduct.stock_quantity}`);
      console.log(`📉 Diferença: ${stockDifference} (esperado: 1)`);
      
      if (stockDifference !== 1) {
        console.log('⚠️ PROBLEMA DETECTADO: Estoque não foi reduzido corretamente!');
      }
    }

    // Verificar movimentações criadas para esta venda
    const { data: newMovements, error: newMovError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', testSale.id);

    if (newMovError) {
      console.error('❌ Erro ao verificar movimentações:', newMovError);
    } else {
      console.log(`📋 Movimentações criadas: ${newMovements?.length || 0}`);
      newMovements?.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
        console.log(`      Estoque: ${mov.previous_stock} → ${mov.new_stock}`);
        console.log(`      Notas: ${mov.notes}`);
      });

      if (newMovements && newMovements.length > 1) {
        console.log('⚠️ DUPLICAÇÃO DETECTADA: Múltiplas movimentações para a mesma venda!');
      }
    }

    // Limpeza
    console.log('\n4️⃣ Limpando dados de teste...');
    await supabase.from('stock_movements').delete().eq('reference_id', testSale.id);
    await supabase.from('sale_items').delete().eq('sale_id', testSale.id);
    await supabase.from('sales').delete().eq('id', testSale.id);
    
    // Restaurar estoque original
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

investigarDuplicacaoPDV();
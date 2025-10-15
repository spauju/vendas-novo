require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarEstruturaTabelasVendas() {
  console.log('🔍 Verificando estrutura das tabelas de vendas...');
  
  try {
    // 1. Verificar tabela sales
    console.log('\n1️⃣ Verificando tabela sales...');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .limit(5);

    if (salesError) {
      console.error('❌ Erro ao acessar tabela sales:', salesError);
    } else {
      console.log(`✅ Tabela sales encontrada com ${sales?.length || 0} registros`);
      if (sales && sales.length > 0) {
        console.log('📋 Estrutura da primeira venda:');
        console.log(JSON.stringify(sales[0], null, 2));
      }
    }

    // 2. Verificar tabela sale_items
    console.log('\n2️⃣ Verificando tabela sale_items...');
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('*')
      .limit(5);

    if (itemsError) {
      console.error('❌ Erro ao acessar tabela sale_items:', itemsError);
    } else {
      console.log(`✅ Tabela sale_items encontrada com ${saleItems?.length || 0} registros`);
      if (saleItems && saleItems.length > 0) {
        console.log('📋 Estrutura do primeiro item:');
        console.log(JSON.stringify(saleItems[0], null, 2));
      }
    }

    // 3. Verificar tabela products
    console.log('\n3️⃣ Verificando tabela products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(3);

    if (productsError) {
      console.error('❌ Erro ao acessar tabela products:', productsError);
    } else {
      console.log(`✅ Tabela products encontrada com ${products?.length || 0} registros`);
      if (products && products.length > 0) {
        console.log('📋 Estrutura do primeiro produto:');
        console.log(JSON.stringify(products[0], null, 2));
      }
    }

    // 4. Verificar tabela stock_movements
    console.log('\n4️⃣ Verificando tabela stock_movements...');
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .limit(5);

    if (movementsError) {
      console.error('❌ Erro ao acessar tabela stock_movements:', movementsError);
    } else {
      console.log(`✅ Tabela stock_movements encontrada com ${movements?.length || 0} registros`);
      if (movements && movements.length > 0) {
        console.log('📋 Estrutura da primeira movimentação:');
        console.log(JSON.stringify(movements[0], null, 2));
      }
    }

    // 5. Tentar buscar vendas com itens (sem join)
    console.log('\n5️⃣ Buscando vendas e itens separadamente...');
    
    const { data: recentSales, error: recentSalesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentSalesError) {
      console.error('❌ Erro ao buscar vendas recentes:', recentSalesError);
    } else {
      console.log(`✅ Encontradas ${recentSales?.length || 0} vendas recentes`);
      
      for (const sale of recentSales || []) {
        console.log(`\n📊 Venda ${sale.id}:`);
        console.log(`   Data: ${new Date(sale.created_at).toLocaleString()}`);
        console.log(`   Total: R$ ${sale.total_amount}`);
        console.log(`   Final: R$ ${sale.final_amount}`);
        console.log(`   Status: ${sale.status}`);
        console.log(`   Método: ${sale.payment_method}`);

        // Buscar itens desta venda
        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', sale.id);

        if (itemsError) {
          console.error(`   ❌ Erro ao buscar itens: ${itemsError.message}`);
        } else {
          console.log(`   📦 Itens: ${items?.length || 0}`);
          
          for (const item of items || []) {
            console.log(`     - Produto ${item.product_id}: ${item.quantity}x R$ ${item.unit_price} = R$ ${item.total_price || (item.quantity * item.unit_price)}`);
            
            // Buscar dados do produto
            const { data: product, error: prodError } = await supabase
              .from('products')
              .select('name, sale_price')
              .eq('id', item.product_id)
              .single();

            if (!prodError && product) {
              console.log(`       Nome: ${product.name}`);
              console.log(`       Preço cadastrado: R$ ${product.sale_price}`);
              
              if (Math.abs(item.unit_price - product.sale_price) > 0.01) {
                console.log(`       ⚠️ DIFERENÇA DE PREÇO DETECTADA!`);
              }
            }
          }
        }

        // Verificar movimentações de estoque para esta venda
        const { data: saleMovements, error: movError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('reference_id', sale.id);

        if (!movError && saleMovements) {
          console.log(`   📋 Movimentações de estoque: ${saleMovements.length}`);
          saleMovements.forEach((mov, index) => {
            console.log(`     ${index + 1}. ${mov.movement_type}: ${mov.quantity} unidades (${mov.previous_stock} → ${mov.new_stock})`);
          });

          if (saleMovements.length > (items?.length || 0)) {
            console.log(`   ⚠️ POSSÍVEL DUPLICAÇÃO: ${saleMovements.length} movimentações para ${items?.length || 0} itens!`);
          }
        }
      }
    }

    // 6. Verificar se há triggers ativos
    console.log('\n6️⃣ Verificando triggers ativos...');
    
    const { data: triggers, error: triggersError } = await supabase
      .rpc('get_triggers_info');

    if (triggersError) {
      console.log('❌ Não foi possível verificar triggers (função não existe)');
      
      // Tentar uma consulta SQL direta para verificar triggers
      const { data: triggerCheck, error: triggerCheckError } = await supabase
        .from('information_schema.triggers')
        .select('*');
        
      if (triggerCheckError) {
        console.log('❌ Também não foi possível acessar information_schema.triggers');
      }
    } else {
      console.log('✅ Triggers encontrados:', triggers);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarEstruturaTabelasVendas();
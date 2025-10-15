require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarTabelasSistema() {
  console.log('🔍 Verificando tabelas do sistema...');
  
  try {
    // Lista de tabelas para verificar
    const tablesToCheck = [
      'users',
      'customers', 
      'sales',
      'sale_items',
      'products',
      'stock_movements'
    ];

    console.log('\n📋 Verificando existência das tabelas...');
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Existe (${data?.length || 0} registros encontrados)`);
          
          // Se for a primeira vez que encontramos dados, mostrar estrutura
          if (data && data.length > 0) {
            console.log(`   📝 Estrutura: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: Erro ao verificar - ${err.message}`);
      }
    }

    // Verificar se existe tabela customers e se pode ser usada como users
    console.log('\n👥 Verificando tabela customers como alternativa...');
    
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(3);

    if (customersError) {
      console.log('❌ Tabela customers não disponível:', customersError.message);
    } else {
      console.log(`✅ Tabela customers encontrada com ${customers?.length || 0} registros`);
      
      if (customers && customers.length > 0) {
        console.log('📝 Estrutura da tabela customers:');
        console.log(JSON.stringify(customers[0], null, 2));
      }
    }

    // Testar venda usando customers se disponível
    if (!customersError && customers && customers.length > 0) {
      console.log('\n🧪 Testando venda com tabela customers...');
      
      const testCustomer = customers[0];
      
      // Buscar produto
      const { data: testProduct, error: productError } = await supabase
        .from('products')
        .select('id, name, sale_price, stock_quantity')
        .eq('active', true)
        .gt('stock_quantity', 2)
        .limit(1)
        .single();

      if (productError || !testProduct) {
        console.log('❌ Nenhum produto disponível para teste');
        return;
      }

      console.log(`📦 Produto: ${testProduct.name} (Estoque: ${testProduct.stock_quantity})`);

      // Criar venda usando customer_id em vez de user_id
      const saleData = {
        customer_id: testCustomer.id, // Usar customer_id
        total_amount: testProduct.sale_price,
        final_amount: testProduct.sale_price,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      };

      const { data: testSale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) {
        console.log('❌ Erro ao criar venda com customer_id:', saleError.message);
        
        // Tentar sem customer_id/user_id
        const { customer_id, ...saleDataWithoutUser } = saleData;
        const { data: testSale2, error: saleError2 } = await supabase
          .from('sales')
          .insert(saleDataWithoutUser)
          .select()
          .single();

        if (saleError2) {
          console.log('❌ Erro ao criar venda sem user:', saleError2.message);
          return;
        } else {
          console.log(`✅ Venda criada sem user: ${testSale2.id}`);
          testSale = testSale2;
        }
      } else {
        console.log(`✅ Venda criada com customer: ${testSale.id}`);
      }

      // Criar item da venda
      const itemData = {
        sale_id: testSale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: testProduct.sale_price
      };

      const { data: testItem, error: itemError } = await supabase
        .from('sale_items')
        .insert(itemData)
        .select()
        .single();

      if (itemError) {
        console.log('❌ Erro ao criar item:', itemError.message);
        await supabase.from('sales').delete().eq('id', testSale.id);
        return;
      }

      console.log(`✅ Item criado: ${testItem.id}`);

      // Aguardar triggers
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verificar estoque
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', testProduct.id)
        .single();

      if (!updateError) {
        const reduction = testProduct.stock_quantity - updatedProduct.stock_quantity;
        console.log(`📊 Estoque: ${testProduct.stock_quantity} → ${updatedProduct.stock_quantity} (redução: ${reduction})`);
        
        if (reduction === 1) {
          console.log('✅ SUCESSO: Trigger funcionando! Estoque reduzido corretamente!');
        } else {
          console.log('❌ PROBLEMA: Estoque não foi reduzido!');
        }
      }

      // Verificar movimentações
      const { data: movements, error: movError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('reference_id', testSale.id);

      if (!movError && movements) {
        console.log(`📋 Movimentações: ${movements.length}`);
        movements.forEach(mov => {
          console.log(`   - ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock})`);
        });
      }

      // Limpeza
      console.log('\n🧹 Limpando teste...');
      await supabase.from('stock_movements').delete().eq('reference_id', testSale.id);
      await supabase.from('sale_items').delete().eq('sale_id', testSale.id);
      await supabase.from('sales').delete().eq('id', testSale.id);
      await supabase
        .from('products')
        .update({ stock_quantity: testProduct.stock_quantity })
        .eq('id', testProduct.id);
      
      console.log('✅ Teste concluído!');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarTabelasSistema();
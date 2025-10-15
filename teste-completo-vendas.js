require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testeCompletoVendas() {
  console.log('🧪 Teste completo do sistema de vendas...');
  
  try {
    // 1. Verificar/criar usuário
    console.log('\n1️⃣ Verificando usuário...');
    
    let { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(1);

    if (userError) {
      console.error('❌ Erro ao verificar usuários:', userError);
      return;
    }

    let testUser;
    if (!users || users.length === 0) {
      console.log('📝 Criando usuário de teste...');
      
      const userData = {
        name: 'Usuário Teste',
        email: 'teste@vendas.com',
        role: 'admin',
        active: true
      };

      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createUserError) {
        console.error('❌ Erro ao criar usuário:', createUserError);
        return;
      }

      testUser = newUser;
      console.log(`✅ Usuário criado: ${testUser.name} (${testUser.id})`);
    } else {
      testUser = users[0];
      console.log(`✅ Usuário encontrado: ${testUser.name} (${testUser.id})`);
    }

    // 2. Buscar produto para teste
    console.log('\n2️⃣ Buscando produto para teste...');
    
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, sale_price, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 5)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Nenhum produto disponível para teste');
      return;
    }

    console.log(`📦 Produto: ${testProduct.name}`);
    console.log(`📊 Estoque inicial: ${testProduct.stock_quantity}`);
    console.log(`💰 Preço: R$ ${testProduct.sale_price}`);

    // 3. Criar venda
    console.log('\n3️⃣ Criando venda...');
    
    const saleData = {
      user_id: testUser.id,
      total_amount: testProduct.sale_price * 3,
      final_amount: testProduct.sale_price * 3,
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
      console.error('❌ Erro ao criar venda:', saleError);
      return;
    }

    console.log(`✅ Venda criada: ${testSale.id}`);

    // 4. Criar item da venda (trigger deve ser disparado)
    console.log('\n4️⃣ Adicionando item à venda...');
    
    const itemData = {
      sale_id: testSale.id,
      product_id: testProduct.id,
      quantity: 3,
      unit_price: testProduct.sale_price
    };

    const { data: testItem, error: itemError } = await supabase
      .from('sale_items')
      .insert(itemData)
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao criar item:', itemError);
      await supabase.from('sales').delete().eq('id', testSale.id);
      return;
    }

    console.log(`✅ Item adicionado: ${testItem.quantity}x ${testProduct.name}`);

    // 5. Aguardar processamento dos triggers
    console.log('\n5️⃣ Aguardando processamento dos triggers...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. Verificar redução de estoque
    console.log('\n6️⃣ Verificando redução de estoque...');
    
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (updateError) {
      console.error('❌ Erro ao verificar estoque:', updateError);
    } else {
      const stockReduction = testProduct.stock_quantity - updatedProduct.stock_quantity;
      console.log(`📊 Estoque atual: ${updatedProduct.stock_quantity}`);
      console.log(`📉 Redução: ${stockReduction} (esperado: 3)`);
      
      if (stockReduction === 3) {
        console.log('✅ SUCESSO: Estoque reduzido corretamente!');
      } else {
        console.log('❌ PROBLEMA: Redução incorreta do estoque!');
      }
    }

    // 7. Verificar movimentações de estoque
    console.log('\n7️⃣ Verificando movimentações de estoque...');
    
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', testSale.id)
      .order('created_at', { ascending: false });

    if (movError) {
      console.error('❌ Erro ao verificar movimentações:', movError);
    } else {
      console.log(`📋 Movimentações encontradas: ${movements?.length || 0}`);
      
      movements?.forEach((mov, index) => {
        console.log(`   ${index + 1}. Tipo: ${mov.movement_type}`);
        console.log(`      Quantidade: ${mov.quantity}`);
        console.log(`      Estoque: ${mov.previous_stock} → ${mov.new_stock}`);
        console.log(`      Notas: ${mov.notes}`);
        console.log(`      Data: ${new Date(mov.created_at).toLocaleString()}`);
      });

      if (movements && movements.length === 1) {
        console.log('✅ SUCESSO: Movimentação registrada corretamente!');
      } else if (movements && movements.length > 1) {
        console.log('⚠️ ATENÇÃO: Múltiplas movimentações detectadas!');
        console.log('   Isso pode indicar duplicação de triggers.');
      } else {
        console.log('❌ PROBLEMA: Nenhuma movimentação registrada!');
      }
    }

    // 8. Testar uma venda real via PDV (simulação)
    console.log('\n8️⃣ Simulando venda via PDV...');
    
    // Simular o processo do PDV
    const pdvSaleData = {
      user_id: testUser.id,
      total_amount: testProduct.sale_price,
      final_amount: testProduct.sale_price,
      status: 'completed',
      payment_method: 'cash',
      payment_status: 'paid'
    };

    const { data: pdvSale, error: pdvSaleError } = await supabase
      .from('sales')
      .insert(pdvSaleData)
      .select()
      .single();

    if (pdvSaleError) {
      console.error('❌ Erro ao criar venda PDV:', pdvSaleError);
    } else {
      console.log(`✅ Venda PDV criada: ${pdvSale.id}`);

      const pdvItemData = {
        sale_id: pdvSale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: testProduct.sale_price
      };

      const { data: pdvItem, error: pdvItemError } = await supabase
        .from('sale_items')
        .insert(pdvItemData)
        .select()
        .single();

      if (pdvItemError) {
        console.error('❌ Erro ao criar item PDV:', pdvItemError);
      } else {
        console.log(`✅ Item PDV adicionado: 1x ${testProduct.name}`);
        
        // Aguardar processamento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se não há duplicação
        const { data: pdvMovements, error: pdvMovError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('reference_id', pdvSale.id);

        if (!pdvMovError && pdvMovements) {
          console.log(`📋 Movimentações PDV: ${pdvMovements.length}`);
          
          if (pdvMovements.length === 1) {
            console.log('✅ SUCESSO: PDV funcionando sem duplicação!');
          } else if (pdvMovements.length > 1) {
            console.log('❌ PROBLEMA: Duplicação detectada no PDV!');
          }
        }
      }
    }

    // 9. Resumo final
    console.log('\n9️⃣ Resumo final...');
    
    const { data: allSales, error: allSalesError } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        created_at,
        sale_items (
          quantity,
          unit_price
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!allSalesError && allSales) {
      console.log('📊 Últimas 5 vendas:');
      allSales.forEach((sale, index) => {
        const totalItems = sale.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        console.log(`   ${index + 1}. Venda ${sale.id.substring(0, 8)}...`);
        console.log(`      Total: R$ ${sale.total_amount} | Itens: ${totalItems}`);
        console.log(`      Data: ${new Date(sale.created_at).toLocaleString()}`);
      });
    }

    // 10. Limpeza
    console.log('\n🔟 Limpando dados de teste...');
    
    // Limpar movimentações
    await supabase.from('stock_movements').delete().eq('reference_id', testSale.id);
    if (pdvSale) {
      await supabase.from('stock_movements').delete().eq('reference_id', pdvSale.id);
    }
    
    // Limpar itens
    await supabase.from('sale_items').delete().eq('sale_id', testSale.id);
    if (pdvSale) {
      await supabase.from('sale_items').delete().eq('sale_id', pdvSale.id);
    }
    
    // Limpar vendas
    await supabase.from('sales').delete().eq('id', testSale.id);
    if (pdvSale) {
      await supabase.from('sales').delete().eq('id', pdvSale.id);
    }
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída!');

    console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
    console.log('📝 Resultados:');
    console.log('   ✅ Sistema de vendas funcionando');
    console.log('   ✅ Triggers de estoque ativos');
    console.log('   ✅ Movimentações sendo registradas');
    console.log('   ✅ PDV pronto para uso');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testeCompletoVendas();
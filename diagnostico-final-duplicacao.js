require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticoFinal() {
  console.log('🔍 DIAGNÓSTICO FINAL - RASTREANDO A DUPLICAÇÃO');
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
    console.log(`📦 Produto: ${produto.name}`);
    console.log(`📊 Estoque inicial: ${estoqueInicial}\n`);
    
    // TESTE 1: Inserir sale_items SEM criar venda (para ver se sale_items causa duplicação)
    console.log('═'.repeat(70));
    console.log('TESTE 1: Inserir em sale_items sem venda');
    console.log('═'.repeat(70));
    
    // Criar uma venda fake apenas para ter um ID
    const fakeVendaId = '00000000-0000-0000-0000-000000000001';
    
    console.log(`\n📝 Inserindo 2 unidades em sale_items (sem venda real)...`);
    console.log(`   Estoque antes: ${estoqueInicial}`);
    
    const { data: item1, error: item1Error } = await supabase
      .from('sale_items')
      .insert({
        sale_id: fakeVendaId,
        product_id: produto.id,
        quantity: 2,
        unit_price: 10
      })
      .select()
      .single();
    
    if (item1Error) {
      console.log('❌ Erro ao inserir (esperado - venda não existe):', item1Error.message);
    } else {
      console.log(`✅ Item inserido: ${item1.id}`);
      
      // Aguardar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar estoque
      const { data: prod1, error: err1 } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', produto.id)
        .single();
      
      if (!err1 && prod1) {
        const reducao1 = estoqueInicial - prod1.stock_quantity;
        console.log(`   Estoque depois: ${prod1.stock_quantity}`);
        console.log(`   Redução: ${reducao1} unidades`);
        
        if (reducao1 === 0) {
          console.log(`   ✅ Nenhuma redução (correto - sem trigger)`);
        } else if (reducao1 === 2) {
          console.log(`   ⚠️ Redução de 2 (há algum mecanismo automático)`);
        } else {
          console.log(`   ❌ Redução de ${reducao1} (DUPLICAÇÃO!)`);
        }
      }
      
      // Limpar
      await supabase.from('sale_items').delete().eq('id', item1.id);
      await supabase.from('products').update({ stock_quantity: estoqueInicial }).eq('id', produto.id);
    }
    
    // TESTE 2: Atualizar stock_quantity DIRETAMENTE
    console.log('\n' + '═'.repeat(70));
    console.log('TESTE 2: Atualizar stock_quantity diretamente');
    console.log('═'.repeat(70));
    
    console.log(`\n📝 Reduzindo 5 unidades diretamente...`);
    console.log(`   Estoque antes: ${estoqueInicial}`);
    
    const novoEstoque = estoqueInicial - 5;
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: novoEstoque })
      .eq('id', produto.id);
    
    if (updateError) {
      console.log('❌ Erro ao atualizar:', updateError);
    } else {
      console.log(`✅ Atualização enviada: ${estoqueInicial} → ${novoEstoque}`);
      
      // Aguardar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar
      const { data: prod2, error: err2 } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', produto.id)
        .single();
      
      if (!err2 && prod2) {
        console.log(`   Estoque real: ${prod2.stock_quantity}`);
        
        if (prod2.stock_quantity === novoEstoque) {
          console.log(`   ✅ Correto! Sem duplicação na atualização direta`);
        } else {
          const diff = novoEstoque - prod2.stock_quantity;
          console.log(`   ❌ Diferença de ${diff} unidades!`);
        }
      }
      
      // Restaurar
      await supabase.from('products').update({ stock_quantity: estoqueInicial }).eq('id', produto.id);
    }
    
    // TESTE 3: Usar a função reduce_stock_controlled diretamente
    console.log('\n' + '═'.repeat(70));
    console.log('TESTE 3: Usar reduce_stock_controlled');
    console.log('═'.repeat(70));
    
    // Criar venda real
    const { data: vendaReal, error: vendaError } = await supabase
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
    
    console.log(`\n✅ Venda criada: ${vendaReal.id}`);
    console.log(`📝 Reduzindo 4 unidades com função controlada...`);
    console.log(`   Estoque antes: ${estoqueInicial}`);
    
    const { data: funcResult, error: funcError } = await supabase.rpc('reduce_stock_controlled', {
      p_product_id: produto.id,
      p_quantity: 4,
      p_sale_id: vendaReal.id
    });
    
    if (funcError) {
      console.log('❌ Erro na função:', funcError);
    } else {
      console.log(`📊 Resultado da função:`, JSON.stringify(funcResult, null, 2));
      
      // Aguardar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar
      const { data: prod3, error: err3 } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', produto.id)
        .single();
      
      if (!err3 && prod3) {
        const reducaoEsperada = 4;
        const reducaoReal = estoqueInicial - prod3.stock_quantity;
        
        console.log(`   Estoque real: ${prod3.stock_quantity}`);
        console.log(`   Redução esperada: ${reducaoEsperada}`);
        console.log(`   Redução real: ${reducaoReal}`);
        console.log(`   Multiplicador: ${reducaoReal / reducaoEsperada}x`);
        
        if (reducaoReal === reducaoEsperada) {
          console.log(`   ✅ PERFEITO! Sem duplicação!`);
        } else {
          console.log(`   ❌ DUPLICAÇÃO DETECTADA!`);
        }
      }
      
      // Verificar movimentações
      const { data: movs, error: movError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('reference_id', vendaReal.id)
        .order('created_at', { ascending: false });
      
      if (!movError && movs) {
        console.log(`\n📋 Movimentações criadas: ${movs.length}`);
        movs.forEach((mov, i) => {
          console.log(`   ${i + 1}. ${mov.movement_type}: ${mov.quantity} unidades`);
          console.log(`      ${mov.previous_stock} → ${mov.new_stock}`);
          console.log(`      Notas: ${mov.notes}`);
        });
      }
      
      // Limpar
      await supabase.from('stock_movements').delete().eq('reference_id', vendaReal.id);
      await supabase.from('sales').delete().eq('id', vendaReal.id);
      await supabase.from('products').update({ stock_quantity: estoqueInicial }).eq('id', produto.id);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('CONCLUSÃO');
    console.log('═'.repeat(70));
    console.log('\nSe a duplicação ocorre apenas quando usamos sale_items,');
    console.log('mas NÃO ocorre em atualizações diretas de products,');
    console.log('então há um mecanismo oculto ligado à tabela sale_items.');
    console.log('\nPossíveis causas:');
    console.log('1. Trigger no Supabase Dashboard não visível via SQL');
    console.log('2. Webhook configurado no Supabase');
    console.log('3. Edge Function automática');
    console.log('4. Configuração de Realtime duplicando operações');
    console.log('5. Extensão PostgreSQL com lógica customizada');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

diagnosticoFinal();

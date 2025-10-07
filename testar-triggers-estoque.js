const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarTriggersEstoque() {
  console.log('🧪 TESTANDO TRIGGERS DE BAIXA AUTOMÁTICA NO ESTOQUE');
  console.log('='.repeat(60));
  
  try {
    // 1. Buscar um produto com estoque para testar
    console.log('\n1️⃣ Buscando produto com estoque...');
    
    const { data: produtos, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 0)
      .limit(1);
    
    if (prodError) {
      console.error('❌ Erro ao buscar produtos:', prodError);
      return;
    }
    
    if (!produtos || produtos.length === 0) {
      console.log('⚠️ Nenhum produto com estoque encontrado. Criando produto de teste...');
      
      // Criar produto de teste
      const { data: novoProduto, error: createError } = await supabase
        .from('products')
        .insert({
          name: 'Produto Teste Trigger',
          unit_price: 10.00,
          stock_quantity: 100,
          min_stock_level: 5,
          category: 'Teste',
          sku: `TEST${Date.now()}`
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar produto de teste:', createError);
        return;
      }
      
      console.log(`✅ Produto de teste criado: ${novoProduto.name} (ID: ${novoProduto.id})`);
      produtos.push(novoProduto);
    }
    
    const produto = produtos[0];
    console.log(`📦 Produto selecionado: ${produto.name} (ID: ${produto.id})`);
    console.log(`📊 Estoque atual: ${produto.stock_quantity}`);
    
    // 2. Criar uma venda de teste
    console.log('\n2️⃣ Criando venda de teste...');
    
    const { data: venda, error: vendaError } = await supabase
      .from('sales')
      .insert({
        total_amount: 50.00,
        payment_method: 'dinheiro',
        status: 'completed'
      })
      .select()
      .single();
    
    if (vendaError) {
      console.error('❌ Erro ao criar venda:', vendaError);
      return;
    }
    
    console.log(`✅ Venda criada com ID: ${venda.id}`);
    
    // 3. Adicionar item à venda (isso deve disparar o trigger)
    console.log('\n3️⃣ Adicionando item à venda (deve disparar trigger)...');
    
    const quantidadeVenda = 5;
    const { data: itemVenda, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: venda.id,
        product_id: produto.id,
        quantity: quantidadeVenda,
        unit_price: 10.00,
        total_price: 50.00
      })
      .select()
      .single();
    
    if (itemError) {
      console.error('❌ Erro ao adicionar item à venda:', itemError);
      console.error('Detalhes:', itemError);
      return;
    }
    
    console.log(`✅ Item adicionado à venda: ${quantidadeVenda} unidades`);
    
    // 4. Verificar se o estoque foi reduzido
    console.log('\n4️⃣ Verificando se o estoque foi reduzido...');
    
    const { data: produtoAtualizado, error: checkError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (checkError) {
      console.error('❌ Erro ao verificar estoque:', checkError);
      return;
    }
    
    const estoqueAnterior = produto.stock_quantity;
    const estoqueAtual = produtoAtualizado.stock_quantity;
    const reducaoEsperada = quantidadeVenda;
    const reducaoReal = estoqueAnterior - estoqueAtual;
    
    console.log(`📊 Estoque anterior: ${estoqueAnterior}`);
    console.log(`📊 Estoque atual: ${estoqueAtual}`);
    console.log(`📊 Redução esperada: ${reducaoEsperada}`);
    console.log(`📊 Redução real: ${reducaoReal}`);
    
    if (reducaoReal === reducaoEsperada) {
      console.log('✅ TRIGGER FUNCIONANDO! Estoque foi reduzido corretamente');
    } else {
      console.log('❌ TRIGGER NÃO FUNCIONANDO! Estoque não foi reduzido');
    }
    
    // 5. Verificar se foi criado movimento de estoque
    console.log('\n5️⃣ Verificando movimentação de estoque...');
    
    const { data: movimentos, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', produto.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (movError) {
      console.error('❌ Erro ao verificar movimentos:', movError);
    } else if (movimentos && movimentos.length > 0) {
      const movimento = movimentos[0];
      console.log(`✅ Movimento registrado:`);
      console.log(`   - Tipo: ${movimento.movement_type}`);
      console.log(`   - Quantidade: ${movimento.quantity}`);
      console.log(`   - Observações: ${movimento.notes}`);
    } else {
      console.log('❌ Nenhum movimento de estoque registrado');
    }
    
    // 6. Limpar dados de teste
    console.log('\n6️⃣ Limpando dados de teste...');
    
    // Deletar item de venda (deve disparar trigger de reversão)
    const { error: deleteItemError } = await supabase
      .from('sale_items')
      .delete()
      .eq('id', itemVenda.id);
    
    if (deleteItemError) {
      console.error('❌ Erro ao deletar item:', deleteItemError);
    } else {
      console.log('✅ Item de venda deletado');
    }
    
    // Deletar venda
    const { error: deleteVendaError } = await supabase
      .from('sales')
      .delete()
      .eq('id', venda.id);
    
    if (deleteVendaError) {
      console.error('❌ Erro ao deletar venda:', deleteVendaError);
    } else {
      console.log('✅ Venda deletada');
    }
    
    // Verificar se o estoque foi revertido
    const { data: produtoRevertido, error: revertError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (revertError) {
      console.error('❌ Erro ao verificar reversão:', revertError);
    } else {
      const estoqueRevertido = produtoRevertido.stock_quantity;
      console.log(`📊 Estoque após reversão: ${estoqueRevertido}`);
      
      if (estoqueRevertido === estoqueAnterior) {
        console.log('✅ REVERSÃO FUNCIONANDO! Estoque foi revertido corretamente');
      } else {
        console.log('❌ REVERSÃO NÃO FUNCIONANDO! Estoque não foi revertido');
      }
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

testarTriggersEstoque();
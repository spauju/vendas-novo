const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usando service role key

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigarTriggersDetalhado() {
  console.log('🔍 Investigação detalhada dos triggers...\n');
  
  try {
    // 1. Verificar se as tabelas existem
    console.log('1️⃣ Verificando existência das tabelas...');
    const tabelas = ['products', 'sales', 'sale_items', 'stock_movements'];
    
    for (const tabela of tabelas) {
      try {
        const { data, error } = await supabase.from(tabela).select('*').limit(1);
        if (error) {
          console.log(`❌ Tabela ${tabela}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${tabela}: OK`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${tabela}: ${err.message}`);
      }
    }
    
    // 2. Verificar produto de teste
    console.log('\n2️⃣ Verificando produto de teste...');
    const { data: produto, error: produtoError } = await supabase
      .from('products')
      .select('*')
      .eq('name', 'Produto Exemplo 1')
      .single();
    
    if (produtoError) {
      console.log('❌ Produto de teste não encontrado:', produtoError.message);
      return;
    }
    
    console.log(`✅ Produto encontrado: ${produto.name}`);
    console.log(`📦 Estoque inicial: ${produto.stock_quantity}`);
    
    // 3. Criar uma venda de teste com logs detalhados
    console.log('\n3️⃣ Criando venda de teste...');
    
    // Primeiro, criar um usuário de teste se não existir
    console.log('👤 Verificando usuário de teste...');
    
    // Usar um ID de usuário existente do auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado no auth.users');
      return;
    }
    
    const userId = users[0].id; // Usar o primeiro usuário encontrado
    console.log(`✅ Usando usuário: ${users[0].email} (${userId})`);
    
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        id: '11111111-1111-1111-1111-111111111111',
        user_id: userId,
        total_amount: 20.00,
        discount_amount: 0,
        final_amount: 20.00,
        status: 'completed',
        payment_method: 'cash',
        payment_status: 'paid'
      })
      .select()
      .single();
    
    if (saleError) {
      console.log('❌ Erro ao criar venda:', saleError.message);
      return;
    }
    
    console.log(`✅ Venda criada: ${sale.id}`);
    
    // 4. Verificar estoque antes da inserção do item
    console.log('\n4️⃣ Verificando estoque antes da inserção do item...');
    const { data: produtoAntes } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    console.log(`📦 Estoque antes: ${produtoAntes.stock_quantity}`);
    
    // 5. Inserir item da venda (isso deve disparar o trigger)
    console.log('\n5️⃣ Inserindo item da venda...');
    const { data: saleItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: produto.id,
        quantity: 3,
        unit_price: 10.00
      })
      .select()
      .single();
    
    if (itemError) {
      console.log('❌ Erro ao inserir item:', itemError.message);
      return;
    }
    
    console.log(`✅ Item inserido: ${saleItem.id}`);
    
    // 6. Aguardar um pouco para o trigger processar
    console.log('\n6️⃣ Aguardando processamento do trigger...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 7. Verificar estoque depois
    console.log('\n7️⃣ Verificando estoque depois da inserção...');
    const { data: produtoDepois } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    console.log(`📦 Estoque depois: ${produtoDepois.stock_quantity}`);
    console.log(`📊 Diferença: ${produtoAntes.stock_quantity - produtoDepois.stock_quantity} (esperado: 3)`);
    
    // 8. Verificar movimentações de estoque criadas
    console.log('\n8️⃣ Verificando movimentações de estoque...');
    const { data: movimentos } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', produto.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (movimentos && movimentos.length > 0) {
      console.log(`📋 ${movimentos.length} movimentações encontradas:`);
      movimentos.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type} | Qtd: ${mov.quantity} | Motivo: ${mov.reason} | Data: ${mov.created_at}`);
      });
    } else {
      console.log('❌ Nenhuma movimentação de estoque encontrada');
    }
    
    // 9. Limpeza
    console.log('\n9️⃣ Limpando dados de teste...');
    
    // Remover item da venda
    await supabase.from('sale_items').delete().eq('id', saleItem.id);
    
    // Remover venda
    await supabase.from('sales').delete().eq('id', sale.id);
    
    // Restaurar estoque original
    await supabase
      .from('products')
      .update({ stock_quantity: produto.stock_quantity })
      .eq('id', produto.id);
    
    // Remover movimentações de teste
    if (movimentos && movimentos.length > 0) {
      const movimentosIds = movimentos.map(m => m.id);
      await supabase.from('stock_movements').delete().in('id', movimentosIds);
    }
    
    console.log('✅ Limpeza concluída');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

investigarTriggersDetalhado();
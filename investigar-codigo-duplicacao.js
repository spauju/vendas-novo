require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigarDuplicacao() {
  console.log('🔍 INVESTIGANDO POSSÍVEL DUPLICAÇÃO DE CÓDIGO');
  console.log('='.repeat(60));
  
  try {
    // 1. Criar produto de teste
    console.log('\n1️⃣ Criando produto de teste...');
    
    const { data: produto, error: produtoError } = await supabase
      .from('products')
      .upsert({
        id: '11111111-1111-1111-1111-111111111111',
        code: 'TEST001',
        name: 'Produto Teste Duplicação',
        sale_price: 10.00,
        stock_quantity: 100,
        barcode: 'TEST123456'
      })
      .select()
      .single();
    
    if (produtoError) {
      console.error('❌ Erro ao criar produto:', produtoError);
      return;
    }
    
    console.log(`✅ Produto criado: ${produto.name} (Estoque: ${produto.stock_quantity})`);
    
    // 2. Buscar um usuário válido
    console.log('\n2️⃣ Buscando usuário válido...');
    
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    const usuario = users[0];
    console.log(`✅ Usuário encontrado: ${usuario.email}`);
    
    // 3. Monitorar inserções na sale_items
    console.log('\n3️⃣ Testando inserção única na sale_items...');
    
    // Verificar estoque antes
    const { data: produtoAntes, error: antesError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (antesError) {
      console.error('❌ Erro ao verificar estoque antes:', antesError);
      return;
    }
    
    console.log(`📊 Estoque antes: ${produtoAntes.stock_quantity}`);
    
    // Criar venda
    const { data: venda, error: vendaError } = await supabase
      .from('sales')
      .insert({
        user_id: usuario.id,
        total_amount: 30.00,
        discount_amount: 0,
        final_amount: 30.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();
    
    if (vendaError) {
      console.error('❌ Erro ao criar venda:', vendaError);
      return;
    }
    
    console.log(`✅ Venda criada: ${venda.id}`);
    
    // Inserir APENAS UM item na venda
    console.log('\n4️⃣ Inserindo APENAS UM item na venda...');
    
    const { data: item, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: venda.id,
        product_id: produto.id,
        quantity: 3,
        unit_price: 10.00
      })
      .select()
      .single();
    
    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return;
    }
    
    console.log(`✅ Item inserido: ${item.id} (Quantidade: ${item.quantity})`);
    
    // Aguardar um pouco para garantir que qualquer trigger seja executado
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar estoque depois
    const { data: produtoDepois, error: depoisError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (depoisError) {
      console.error('❌ Erro ao verificar estoque depois:', depoisError);
      return;
    }
    
    console.log(`📊 Estoque depois: ${produtoDepois.stock_quantity}`);
    
    const diferenca = produtoAntes.stock_quantity - produtoDepois.stock_quantity;
    console.log(`📉 Diferença: ${diferenca} (esperado: 3)`);
    
    if (diferenca === 3) {
      console.log('✅ Estoque reduzido corretamente!');
    } else {
      console.log(`❌ PROBLEMA: Estoque reduzido em ${diferenca} ao invés de 3`);
      
      // Verificar movimentações de estoque
      console.log('\n5️⃣ Verificando movimentações de estoque...');
      
      const { data: movimentacoes, error: movError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', produto.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (movError) {
        console.error('❌ Erro ao buscar movimentações:', movError);
      } else {
        console.log(`📋 Movimentações encontradas: ${movimentacoes.length}`);
        movimentacoes.forEach((mov, index) => {
          console.log(`   ${index + 1}. ${mov.movement_type} - Qtd: ${mov.quantity} - ${mov.notes || 'Sem observação'}`);
        });
      }
    }
    
    // 6. Limpar dados de teste
    console.log('\n6️⃣ Limpando dados de teste...');
    
    await supabase.from('sale_items').delete().eq('sale_id', venda.id);
    await supabase.from('sales').delete().eq('id', venda.id);
    await supabase.from('stock_movements').delete().eq('product_id', produto.id);
    await supabase.from('products').delete().eq('id', produto.id);
    
    console.log('✅ Dados de teste removidos');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

investigarDuplicacao();
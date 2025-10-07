require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function criarProdutoTeste() {
  console.log('🛍️ Criando produto de teste para estoque...');
  
  try {
    // Inserir produto de teste
    const { data: produto, error: produtoError } = await supabase
      .from('products')
      .insert({
        code: 'TESTE001',
        name: 'Produto Teste Estoque',
        description: 'Produto criado para testar sistema de estoque',
        category: 'Teste',
        brand: 'Teste',
        cost_price: 10.00,
        sale_price: 20.00,
        profit_margin: 50,
        stock_quantity: 100,
        min_stock: 10,
        active: true
      })
      .select()
      .single();

    if (produtoError) {
      console.error('❌ Erro ao criar produto:', produtoError);
      return;
    }

    console.log('✅ Produto criado com sucesso:');
    console.log(`   ID: ${produto.id}`);
    console.log(`   Nome: ${produto.name}`);
    console.log(`   Código: ${produto.code}`);
    console.log(`   Estoque: ${produto.stock_quantity} unidades`);
    console.log(`   Preço: R$ ${produto.sale_price}`);

    // Verificar se o produto foi inserido
    const { data: verificacao, error: verificacaoError } = await supabase
      .from('products')
      .select('*')
      .eq('code', 'TESTE001')
      .single();

    if (verificacaoError) {
      console.error('❌ Erro ao verificar produto:', verificacaoError);
      return;
    }

    console.log('\n✅ Verificação: Produto encontrado no banco de dados');
    console.log('🎉 Produto de teste criado com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

criarProdutoTeste();
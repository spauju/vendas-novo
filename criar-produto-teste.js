require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usando service role key

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarProdutoTeste() {
  console.log('🛍️ Criando produto de teste...\n');
  
  try {
    // Verificar se já existe
    const { data: existente } = await supabase
      .from('products')
      .select('*')
      .eq('name', 'Produto Exemplo 1')
      .maybeSingle();
    
    if (existente) {
      console.log('✅ Produto de teste já existe:', existente.name);
      console.log(`📦 Estoque atual: ${existente.stock_quantity}`);
      return;
    }
    
    // Criar produto de teste
    const { data: produto, error } = await supabase
      .from('products')
      .insert({
        name: 'Produto Exemplo 1',
        description: 'Produto para teste de triggers',
        sale_price: 10.00,
        cost_price: 5.00,
        stock_quantity: 100,
        barcode: '1234567890123',
        category: 'Teste',
        active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar produto:', error.message);
      return;
    }
    
    console.log('✅ Produto criado com sucesso!');
    console.log(`📝 Nome: ${produto.name}`);
    console.log(`💰 Preço: R$ ${produto.sale_price}`);
    console.log(`📦 Estoque: ${produto.stock_quantity}`);
    console.log(`🔢 Código: ${produto.barcode}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

criarProdutoTeste();
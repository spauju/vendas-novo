const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEstruturaProducts() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA PRODUCTS');
  console.log('='.repeat(60));
  
  try {
    // 1. Tentar buscar um produto para ver as colunas disponíveis
    console.log('\n1️⃣ Verificando colunas disponíveis...');
    
    const { data: produtos, error: prodError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (prodError) {
      console.error('❌ Erro ao acessar tabela products:', prodError);
      return;
    }
    
    if (produtos && produtos.length > 0) {
      console.log('✅ Produto encontrado! Colunas disponíveis:');
      const colunas = Object.keys(produtos[0]);
      colunas.forEach(coluna => {
        console.log(`   - ${coluna}: ${typeof produtos[0][coluna]} (${produtos[0][coluna]})`);
      });
    } else {
      console.log('⚠️ Nenhum produto encontrado na tabela');
      
      // Tentar inserir um produto simples para descobrir as colunas
      console.log('\n2️⃣ Tentando inserir produto simples...');
      
      const { data: novoProduto, error: insertError } = await supabase
        .from('products')
        .insert({
          name: 'Produto Teste Estrutura'
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Erro ao inserir produto:', insertError);
        
        // Tentar com diferentes combinações de colunas
        console.log('\n3️⃣ Testando diferentes combinações de colunas...');
        
        const tentativas = [
          { name: 'Teste 1', sku: 'TEST1' },
          { name: 'Teste 2', code: 'TEST2' },
          { name: 'Teste 3', unit_price: 10.00 },
          { name: 'Teste 4', price: 10.00 },
          { name: 'Teste 5', sale_price: 10.00 },
          { name: 'Teste 6', stock_quantity: 10 },
          { name: 'Teste 7', category: 'Teste' }
        ];
        
        for (const tentativa of tentativas) {
          console.log(`   Testando: ${JSON.stringify(tentativa)}`);
          
          const { data: teste, error: testeError } = await supabase
            .from('products')
            .insert(tentativa)
            .select()
            .single();
          
          if (testeError) {
            console.log(`   ❌ ${testeError.message}`);
          } else {
            console.log(`   ✅ Sucesso! Produto criado:`, teste);
            
            // Deletar o produto de teste
            await supabase
              .from('products')
              .delete()
              .eq('id', teste.id);
            
            break;
          }
        }
      } else {
        console.log('✅ Produto inserido com sucesso:', novoProduto);
        
        // Deletar o produto de teste
        await supabase
          .from('products')
          .delete()
          .eq('id', novoProduto.id);
      }
    }
    
    // 4. Verificar se existem produtos com estoque
    console.log('\n4️⃣ Verificando produtos com estoque...');
    
    const { data: produtosComEstoque, error: estoqueError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 0)
      .limit(5);
    
    if (estoqueError) {
      console.error('❌ Erro ao verificar estoque:', estoqueError);
    } else {
      console.log(`📦 Produtos com estoque: ${produtosComEstoque?.length || 0}`);
      if (produtosComEstoque && produtosComEstoque.length > 0) {
        produtosComEstoque.forEach(produto => {
          console.log(`   - ${produto.name}: ${produto.stock_quantity} unidades`);
        });
      }
    }
    
    console.log('\n🎯 ESTRUTURA VERIFICADA!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

verificarEstruturaProducts();
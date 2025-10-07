const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarProdutoTeste() {
  console.log('🛠️ CRIANDO PRODUTO DE TESTE PARA TRIGGERS');
  console.log('='.repeat(60));
  
  try {
    // 1. Primeiro, vamos tentar descobrir a estrutura exata da tabela
    console.log('\n1️⃣ Verificando estrutura da tabela products...');
    
    // Usar SQL direto para inserir produto
    const produtoTeste = {
      name: 'Produto Teste Trigger',
      code: `TEST${Date.now()}`,
      sale_price: 10.00,
      cost_price: 6.00,
      stock_quantity: 100,
      min_stock: 5,
      category: 'Teste',
      active: true
    };
    
    console.log('📦 Tentando inserir produto:', produtoTeste);
    
    const { data: produto, error: insertError } = await supabase
      .from('products')
      .insert(produtoTeste)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir produto:', insertError);
      
      // Tentar com estrutura mais simples
      console.log('\n2️⃣ Tentando com estrutura mais simples...');
      
      const produtoSimples = {
        name: 'Produto Teste Simples',
        code: `SIMPLE${Date.now()}`
      };
      
      const { data: produtoSimples2, error: simpleError } = await supabase
        .from('products')
        .insert(produtoSimples)
        .select()
        .single();
      
      if (simpleError) {
        console.error('❌ Erro com produto simples:', simpleError);
        return;
      } else {
        console.log('✅ Produto simples criado:', produtoSimples2);
        
        // Atualizar com mais dados
        const { data: produtoAtualizado, error: updateError } = await supabase
          .from('products')
          .update({
            sale_price: 10.00,
            stock_quantity: 100
          })
          .eq('id', produtoSimples2.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erro ao atualizar produto:', updateError);
        } else {
          console.log('✅ Produto atualizado:', produtoAtualizado);
        }
      }
    } else {
      console.log('✅ Produto criado com sucesso:', produto);
    }
    
    // 3. Listar produtos disponíveis
    console.log('\n3️⃣ Listando produtos disponíveis...');
    
    const { data: produtos, error: listError } = await supabase
      .from('products')
      .select('*')
      .limit(5);
    
    if (listError) {
      console.error('❌ Erro ao listar produtos:', listError);
    } else {
      console.log(`📋 Produtos encontrados: ${produtos?.length || 0}`);
      if (produtos && produtos.length > 0) {
        produtos.forEach(p => {
          console.log(`   - ${p.name} (ID: ${p.id})`);
          console.log(`     Estoque: ${p.stock_quantity || 'N/A'}`);
          console.log(`     Preço: ${p.sale_price || p.unit_price || p.price || 'N/A'}`);
        });
      }
    }
    
    console.log('\n🎯 PRODUTO DE TESTE CRIADO!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro durante criação:', error);
  }
}

criarProdutoTeste();
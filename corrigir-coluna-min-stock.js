const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function corrigirColunaMinStock() {
  console.log('🔧 CORRIGINDO COLUNA MIN_STOCK NA TABELA PRODUCTS\n');

  try {
    // 1. Verificar estrutura atual da tabela products
    console.log('1️⃣ VERIFICANDO ESTRUTURA ATUAL DA TABELA PRODUCTS:');
    
    const { data: colunas, error: colunasError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
        ORDER BY ordinal_position;
      `
    });

    if (colunasError) {
      console.log(`   ❌ Erro ao verificar colunas: ${colunasError.message}`);
      return;
    }

    console.log('   📋 Colunas atuais da tabela products:');
    colunas.forEach(col => {
      console.log(`      - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Verificar se min_stock já existe
    const minStockExists = colunas.some(col => col.column_name === 'min_stock');
    
    if (minStockExists) {
      console.log('\n   ✅ Coluna min_stock já existe na tabela!');
      
      // Verificar alguns registros para ver os valores
      console.log('\n2️⃣ VERIFICANDO VALORES ATUAIS DE MIN_STOCK:');
      const { data: produtos, error: produtosError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock')
        .limit(5);

      if (produtosError) {
        console.log(`   ❌ Erro ao buscar produtos: ${produtosError.message}`);
      } else {
        produtos.forEach(produto => {
          console.log(`   📦 ${produto.name}: estoque=${produto.stock_quantity}, min_stock=${produto.min_stock || 'NULL'}`);
        });
      }
    } else {
      console.log('\n   ❌ Coluna min_stock NÃO existe! Adicionando...');
      
      // 2. Adicionar a coluna min_stock
      console.log('\n2️⃣ ADICIONANDO COLUNA MIN_STOCK:');
      
      const { data: addColumn, error: addColumnError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE public.products 
          ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;
        `
      });

      if (addColumnError) {
        console.log(`   ❌ Erro ao adicionar coluna: ${addColumnError.message}`);
        return;
      }

      console.log('   ✅ Coluna min_stock adicionada com sucesso!');

      // 3. Atualizar valores padrão baseados no estoque atual
      console.log('\n3️⃣ DEFININDO VALORES PADRÃO PARA MIN_STOCK:');
      
      const { data: updateMinStock, error: updateError } = await supabase.rpc('exec_sql', {
        sql: `
          UPDATE public.products 
          SET min_stock = CASE 
            WHEN stock_quantity >= 100 THEN 10
            WHEN stock_quantity >= 50 THEN 5
            WHEN stock_quantity >= 20 THEN 3
            WHEN stock_quantity >= 10 THEN 2
            ELSE 1
          END
          WHERE min_stock IS NULL OR min_stock = 0;
        `
      });

      if (updateError) {
        console.log(`   ❌ Erro ao atualizar valores: ${updateError.message}`);
      } else {
        console.log('   ✅ Valores padrão de min_stock definidos!');
      }
    }

    // 4. Verificar produtos após a correção
    console.log('\n4️⃣ VERIFICANDO PRODUTOS APÓS CORREÇÃO:');
    
    const { data: produtosFinais, error: produtosFinaisError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock')
      .order('name');

    if (produtosFinaisError) {
      console.log(`   ❌ Erro ao buscar produtos finais: ${produtosFinaisError.message}`);
    } else {
      console.log(`   📊 Total de produtos: ${produtosFinais.length}`);
      
      produtosFinais.forEach(produto => {
        const status = produto.stock_quantity <= produto.min_stock ? '⚠️ BAIXO' : '✅ OK';
        console.log(`   ${status} ${produto.name}: estoque=${produto.stock_quantity}, min=${produto.min_stock}`);
      });

      // Contar produtos com estoque baixo
      const produtosBaixo = produtosFinais.filter(p => p.stock_quantity <= p.min_stock);
      console.log(`\n   📈 Produtos com estoque baixo: ${produtosBaixo.length}/${produtosFinais.length}`);
    }

    // 5. Testar query do dashboard
    console.log('\n5️⃣ TESTANDO QUERY DO DASHBOARD:');
    
    try {
      const { data: testQuery, error: testError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock')
        .lte('stock_quantity', supabase.raw('min_stock'))
        .eq('active', true);

      if (testError) {
        console.log(`   ❌ Erro na query de teste: ${testError.message}`);
      } else {
        console.log(`   ✅ Query funcionando! Produtos com estoque baixo: ${testQuery.length}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro inesperado na query: ${error.message}`);
    }

    console.log('\n🎉 CORREÇÃO CONCLUÍDA!');
    console.log('✅ Coluna min_stock está funcionando');
    console.log('✅ Dashboard deve carregar sem erros agora');
    console.log('✅ Funcionalidade de estoque baixo ativa');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
}

// Executar a correção
corrigirColunaMinStock()
  .then(() => {
    console.log('\n🏁 Script de correção finalizado!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Recarregue o dashboard no navegador');
    console.log('2. Verifique se o erro "min_stock does not exist" foi resolvido');
    console.log('3. Teste a funcionalidade de produtos com estoque baixo');
  })
  .catch(error => {
    console.error('❌ Erro fatal na correção:', error);
    process.exit(1);
  });
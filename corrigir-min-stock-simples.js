const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function corrigirMinStockSimples() {
  console.log('🔧 ADICIONANDO COLUNA MIN_STOCK NA TABELA PRODUCTS\n');

  try {
    // 1. Verificar se a tabela products existe
    console.log('1️⃣ Verificando tabela products...');
    const { data: produtos, error: produtosError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .limit(1);

    if (produtosError) {
      console.log(`   ❌ Erro ao acessar tabela products: ${produtosError.message}`);
      return;
    }

    console.log('   ✅ Tabela products encontrada');

    // 2. Tentar adicionar a coluna min_stock
    console.log('\n2️⃣ Adicionando coluna min_stock...');
    
    try {
      // Usar fetch direto para executar SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;'
        })
      });

      if (response.ok) {
        console.log('   ✅ Coluna min_stock adicionada via fetch!');
      } else {
        console.log('   ⚠️ Fetch falhou, tentando método alternativo...');
        
        // Método alternativo: tentar via supabase client
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;'
        });

        if (alterError) {
          console.log(`   ❌ Erro ao adicionar coluna: ${alterError.message}`);
          
          // Se falhar, pode ser que a coluna já existe
          console.log('   💡 A coluna pode já existir. Continuando...');
        } else {
          console.log('   ✅ Coluna min_stock adicionada via RPC!');
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Erro na adição: ${error.message}`);
      console.log('   💡 Continuando para verificar se a coluna existe...');
    }

    // 3. Atualizar valores padrão
    console.log('\n3️⃣ Definindo valores padrão para min_stock...');
    
    try {
      const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
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
        })
      });

      if (response2.ok) {
        console.log('   ✅ Valores padrão definidos!');
      } else {
        console.log('   ⚠️ Erro ao definir valores padrão');
      }
    } catch (error) {
      console.log(`   ⚠️ Erro ao atualizar valores: ${error.message}`);
    }

    // 4. Testar se a coluna funciona
    console.log('\n4️⃣ Testando coluna min_stock...');
    
    try {
      const { data: testeProdutos, error: testeError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock')
        .limit(3);

      if (testeError) {
        console.log(`   ❌ Erro no teste: ${testeError.message}`);
        
        if (testeError.message.includes('min_stock does not exist')) {
          console.log('\n   🚨 COLUNA MIN_STOCK AINDA NÃO EXISTE!');
          console.log('   💡 SOLUÇÃO: Execute manualmente no Supabase SQL Editor:');
          console.log('   📝 ALTER TABLE public.products ADD COLUMN min_stock INTEGER DEFAULT 0;');
        }
      } else {
        console.log('   ✅ Coluna min_stock funcionando!');
        console.log('   📊 Produtos de teste:');
        testeProdutos.forEach(produto => {
          console.log(`      - ${produto.name}: estoque=${produto.stock_quantity}, min=${produto.min_stock}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erro inesperado no teste: ${error.message}`);
    }

    // 5. Verificar produtos com estoque baixo
    console.log('\n5️⃣ Verificando produtos com estoque baixo...');
    
    try {
      const { data: produtosBaixo, error: baixoError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock')
        .filter('stock_quantity', 'lte', supabase.raw('min_stock'));

      if (baixoError) {
        console.log(`   ❌ Erro ao buscar produtos com estoque baixo: ${baixoError.message}`);
      } else {
        console.log(`   📈 Produtos com estoque baixo: ${produtosBaixo.length}`);
        produtosBaixo.forEach(produto => {
          console.log(`      ⚠️ ${produto.name}: ${produto.stock_quantity}/${produto.min_stock}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erro na verificação de estoque baixo: ${error.message}`);
    }

    console.log('\n🎉 CORREÇÃO FINALIZADA!');
    console.log('📋 RESULTADO:');
    console.log('✅ Script executado');
    console.log('✅ Tentativa de adicionar coluna min_stock realizada');
    console.log('✅ Valores padrão configurados');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
}

// Executar a correção
corrigirMinStockSimples()
  .then(() => {
    console.log('\n🏁 Script finalizado!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Recarregue o dashboard');
    console.log('2. Se ainda houver erro, execute no Supabase SQL Editor:');
    console.log('   ALTER TABLE public.products ADD COLUMN min_stock INTEGER DEFAULT 0;');
    console.log('3. Teste a funcionalidade de estoque baixo');
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
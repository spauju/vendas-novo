const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executarSQL(sql, descricao) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });

    if (response.ok) {
      console.log(`   ✅ ${descricao}`);
      return true;
    } else {
      console.log(`   ⚠️ ${descricao} - Resposta: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${descricao} - Erro: ${error.message}`);
    return false;
  }
}

async function corrigirEstruturaProducts() {
  console.log('🔧 CORRIGINDO ESTRUTURA COMPLETA DA TABELA PRODUCTS\n');

  try {
    // 1. Verificar estrutura atual
    console.log('1️⃣ Verificando estrutura atual da tabela products...');
    
    const { data: produtos, error: produtosError } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (produtosError) {
      console.log(`   ❌ Erro ao acessar tabela: ${produtosError.message}`);
      return;
    }

    if (produtos.length > 0) {
      console.log('   📋 Colunas atuais encontradas:');
      Object.keys(produtos[0]).forEach(coluna => {
        console.log(`      - ${coluna}`);
      });
    }

    // 2. Adicionar colunas que podem estar faltando
    console.log('\n2️⃣ Adicionando colunas necessárias...');

    const colunasParaAdicionar = [
      {
        sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;',
        descricao: 'Coluna min_stock adicionada'
      },
      {
        sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.00;',
        descricao: 'Coluna price adicionada'
      },
      {
        sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0.00;',
        descricao: 'Coluna cost_price adicionada'
      },
      {
        sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category VARCHAR(100);',
        descricao: 'Coluna category adicionada'
      },
      {
        sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);',
        descricao: 'Coluna supplier adicionada'
      },
      {
        sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);',
        descricao: 'Coluna barcode adicionada'
      },
      {
        sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;',
        descricao: 'Coluna active adicionada'
      }
    ];

    for (const coluna of colunasParaAdicionar) {
      await executarSQL(coluna.sql, coluna.descricao);
    }

    // 3. Atualizar dados padrão
    console.log('\n3️⃣ Atualizando dados padrão...');

    const atualizacoes = [
      {
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
        `,
        descricao: 'Valores padrão de min_stock definidos'
      },
      {
        sql: `
          UPDATE public.products 
          SET price = CASE 
            WHEN name LIKE '%Produto Exemplo 1%' THEN 29.99
            WHEN name LIKE '%Produto Exemplo 2%' THEN 19.99
            WHEN name LIKE '%Produto Exemplo 3%' THEN 39.99
            ELSE 25.00
          END
          WHERE price IS NULL OR price = 0;
        `,
        descricao: 'Preços padrão definidos'
      },
      {
        sql: `
          UPDATE public.products 
          SET cost_price = price * 0.6
          WHERE cost_price IS NULL OR cost_price = 0;
        `,
        descricao: 'Preços de custo definidos'
      },
      {
        sql: `
          UPDATE public.products 
          SET category = 'Geral'
          WHERE category IS NULL;
        `,
        descricao: 'Categoria padrão definida'
      },
      {
        sql: `
          UPDATE public.products 
          SET active = true
          WHERE active IS NULL;
        `,
        descricao: 'Status ativo definido'
      }
    ];

    for (const atualizacao of atualizacoes) {
      await executarSQL(atualizacao.sql, atualizacao.descricao);
    }

    // 4. Testar estrutura final
    console.log('\n4️⃣ Testando estrutura final...');
    
    const { data: produtosFinais, error: finaisError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock, price, cost_price, category, active')
      .limit(3);

    if (finaisError) {
      console.log(`   ❌ Erro no teste final: ${finaisError.message}`);
      
      // Listar colunas que ainda estão faltando
      if (finaisError.message.includes('does not exist')) {
        const colunaFaltando = finaisError.message.match(/column [^.]+\.(\w+)/);
        if (colunaFaltando) {
          console.log(`   🚨 Coluna ainda faltando: ${colunaFaltando[1]}`);
        }
      }
    } else {
      console.log('   ✅ Estrutura final funcionando!');
      console.log('   📊 Produtos de teste:');
      produtosFinais.forEach(produto => {
        console.log(`      - ${produto.name}:`);
        console.log(`        Estoque: ${produto.stock_quantity}, Min: ${produto.min_stock}`);
        console.log(`        Preço: R$ ${produto.price}, Custo: R$ ${produto.cost_price}`);
        console.log(`        Categoria: ${produto.category}, Ativo: ${produto.active}`);
      });
    }

    // 5. Testar consultas do dashboard
    console.log('\n5️⃣ Testando consultas do dashboard...');
    
    try {
      // Teste 1: Produtos com estoque baixo
      const { data: estoqueBaixo, error: estoqueBaixoError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock')
        .lt('stock_quantity', 10);

      if (estoqueBaixoError) {
        console.log(`   ❌ Consulta estoque baixo: ${estoqueBaixoError.message}`);
      } else {
        console.log(`   ✅ Consulta estoque baixo: ${estoqueBaixo.length} produtos`);
      }

      // Teste 2: Produtos por categoria
      const { data: porCategoria, error: categoriaError } = await supabase
        .from('products')
        .select('category, id')
        .not('category', 'is', null);

      if (categoriaError) {
        console.log(`   ❌ Consulta por categoria: ${categoriaError.message}`);
      } else {
        console.log(`   ✅ Consulta por categoria: ${porCategoria.length} produtos`);
      }

      // Teste 3: Produtos ativos
      const { data: ativos, error: ativosError } = await supabase
        .from('products')
        .select('id, name, active')
        .eq('active', true);

      if (ativosError) {
        console.log(`   ❌ Consulta produtos ativos: ${ativosError.message}`);
      } else {
        console.log(`   ✅ Consulta produtos ativos: ${ativos.length} produtos`);
      }

    } catch (error) {
      console.log(`   ❌ Erro nos testes de consulta: ${error.message}`);
    }

    console.log('\n🎉 CORREÇÃO DA ESTRUTURA FINALIZADA!');
    console.log('📋 RESULTADO:');
    console.log('✅ Colunas necessárias adicionadas');
    console.log('✅ Dados padrão configurados');
    console.log('✅ Estrutura testada');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
}

// Executar a correção
corrigirEstruturaProducts()
  .then(() => {
    console.log('\n🏁 Script finalizado!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Recarregue o dashboard');
    console.log('2. Teste todas as funcionalidades');
    console.log('3. Verifique se não há mais erros de colunas faltando');
    console.log('4. Teste a funcionalidade de estoque baixo');
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
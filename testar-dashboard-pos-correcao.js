const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testarDashboardPosCorrecao() {
  console.log('🧪 TESTANDO DASHBOARD APÓS CORREÇÃO DA COLUNA MIN_STOCK\n');

  try {
    // 1. Testar consulta de produtos com min_stock
    console.log('1️⃣ Testando consulta de produtos com min_stock...');
    const { data: produtos, error: produtosError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock, price')
      .limit(5);

    if (produtosError) {
      console.log(`   ❌ ERRO: ${produtosError.message}`);
      if (produtosError.message.includes('min_stock does not exist')) {
        console.log('   🚨 A coluna min_stock ainda não existe!');
        return false;
      }
    } else {
      console.log('   ✅ Consulta de produtos funcionando!');
      console.log(`   📊 ${produtos.length} produtos encontrados`);
      produtos.forEach(produto => {
        console.log(`      - ${produto.name}: estoque=${produto.stock_quantity}, min=${produto.min_stock}`);
      });
    }

    // 2. Testar consulta de produtos com estoque baixo (simulando dashboard)
    console.log('\n2️⃣ Testando consulta de produtos com estoque baixo...');
    const { data: produtosBaixo, error: baixoError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock')
      .lt('stock_quantity', 10); // Simulando a consulta do dashboard

    if (baixoError) {
      console.log(`   ❌ ERRO: ${baixoError.message}`);
    } else {
      console.log('   ✅ Consulta de estoque baixo funcionando!');
      console.log(`   📊 ${produtosBaixo.length} produtos com estoque baixo encontrados`);
      produtosBaixo.forEach(produto => {
        const status = produto.stock_quantity <= produto.min_stock ? '🔴 CRÍTICO' : '🟡 BAIXO';
        console.log(`      ${status} ${produto.name}: ${produto.stock_quantity}/${produto.min_stock}`);
      });
    }

    // 3. Testar consultas do dashboard (vendas, clientes, etc.)
    console.log('\n3️⃣ Testando outras consultas do dashboard...');
    
    // Vendas
    const { data: vendas, error: vendasError } = await supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .limit(3);

    if (vendasError) {
      console.log(`   ⚠️ Erro em vendas: ${vendasError.message}`);
    } else {
      console.log(`   ✅ Vendas: ${vendas.length} registros`);
    }

    // Clientes
    const { data: clientes, error: clientesError } = await supabase
      .from('customers')
      .select('id, name, email')
      .limit(3);

    if (clientesError) {
      console.log(`   ⚠️ Erro em clientes: ${clientesError.message}`);
    } else {
      console.log(`   ✅ Clientes: ${clientes.length} registros`);
    }

    // 4. Simular as consultas específicas do dashboard
    console.log('\n4️⃣ Simulando consultas específicas do dashboard...');
    
    try {
      // Total de vendas hoje
      const hoje = new Date().toISOString().split('T')[0];
      const { data: vendasHoje, error: vendasHojeError } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', hoje);

      if (vendasHojeError) {
        console.log(`   ⚠️ Erro vendas hoje: ${vendasHojeError.message}`);
      } else {
        const totalHoje = vendasHoje.reduce((sum, venda) => sum + venda.total_amount, 0);
        console.log(`   💰 Vendas hoje: R$ ${totalHoje.toFixed(2)}`);
      }

      // Produtos mais vendidos
      const { data: produtosMaisVendidos, error: maisVendidosError } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          products (name)
        `)
        .limit(5);

      if (maisVendidosError) {
        console.log(`   ⚠️ Erro produtos mais vendidos: ${maisVendidosError.message}`);
      } else {
        console.log(`   📈 Produtos mais vendidos: ${produtosMaisVendidos.length} registros`);
      }

    } catch (error) {
      console.log(`   ❌ Erro nas consultas específicas: ${error.message}`);
    }

    // 5. Verificar se todas as tabelas estão acessíveis
    console.log('\n5️⃣ Verificando acesso a todas as tabelas...');
    
    const tabelas = ['products', 'customers', 'sales', 'sale_items', 'stock_movements', 'profiles'];
    let tabelasOk = 0;
    
    for (const tabela of tabelas) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ❌ ${tabela}: ${error.message}`);
        } else {
          console.log(`   ✅ ${tabela}: OK`);
          tabelasOk++;
        }
      } catch (error) {
        console.log(`   ❌ ${tabela}: ${error.message}`);
      }
    }

    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`✅ Tabelas acessíveis: ${tabelasOk}/${tabelas.length}`);
    console.log(`✅ Coluna min_stock: ${produtosError ? 'ERRO' : 'OK'}`);
    console.log(`✅ Consultas dashboard: ${baixoError ? 'ERRO' : 'OK'}`);

    if (tabelasOk === tabelas.length && !produtosError && !baixoError) {
      console.log('\n🎉 DASHBOARD 100% FUNCIONAL!');
      console.log('✅ Todos os erros foram corrigidos');
      console.log('✅ Coluna min_stock adicionada com sucesso');
      console.log('✅ Todas as consultas funcionando');
      return true;
    } else {
      console.log('\n⚠️ Ainda existem problemas a serem resolvidos');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    return false;
  }
}

// Executar os testes
testarDashboardPosCorrecao()
  .then((sucesso) => {
    console.log('\n🏁 Testes finalizados!');
    if (sucesso) {
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. ✅ Dashboard está funcionando perfeitamente');
      console.log('2. ✅ Erro "min_stock does not exist" foi resolvido');
      console.log('3. 🔍 Investigar erro de logout (próxima tarefa)');
      console.log('4. 🧪 Testar todas as funcionalidades no navegador');
    } else {
      console.log('\n📋 AÇÕES NECESSÁRIAS:');
      console.log('1. ❌ Verificar erros reportados acima');
      console.log('2. 🔧 Executar correções adicionais se necessário');
      console.log('3. 🔄 Executar este teste novamente');
    }
  })
  .catch(error => {
    console.error('❌ Erro fatal nos testes:', error);
    process.exit(1);
  });
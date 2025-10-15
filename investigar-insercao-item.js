require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarInsercaoItem() {
  console.log('🔍 INVESTIGANDO INSERÇÃO DE SALE_ITEM');
  console.log('='.repeat(50));
  
  try {
    // Buscar produto de teste
    const { data: testProduct } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (!testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    console.log(`📦 Produto: ${testProduct.name}`);
    console.log(`📊 Estoque inicial: ${testProduct.stock_quantity}`);

    // Buscar customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    if (!customer) {
      console.log('❌ Customer não encontrado');
      return;
    }

    // Criar venda
    const { data: sale } = await supabase
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    console.log(`✅ Venda criada: ${sale.id}`);

    // Verificar estoque após criar venda
    const { data: stockAfterSale } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque após criar venda: ${stockAfterSale.stock_quantity}`);

    // AGORA vamos inserir o item e monitorar TUDO
    console.log('\n⚡ INSERINDO ITEM COM MONITORAMENTO INTENSIVO...');
    
    // Capturar estoque antes
    const { data: stockBefore } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque ANTES da inserção: ${stockBefore.stock_quantity}`);

    // Inserir o item
    const startTime = Date.now();
    const { data: saleItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: testProduct.id,
        quantity: 1,
        unit_price: 10.00
      })
      .select()
      .single();

    const endTime = Date.now();
    console.log(`⏱️ Inserção levou: ${endTime - startTime}ms`);

    if (itemError) {
      console.log('❌ Erro ao inserir item:', itemError.message);
      return;
    }

    console.log(`✅ Item inserido: ${saleItem.id}`);

    // Capturar estoque imediatamente após
    const { data: stockAfter } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    console.log(`📊 Estoque APÓS inserção: ${stockAfter.stock_quantity}`);

    const reduction = stockBefore.stock_quantity - stockAfter.stock_quantity;
    console.log(`📉 Redução observada: ${reduction} unidades`);

    if (reduction !== 1) {
      console.log(`🚨 PROBLEMA CONFIRMADO: Esperado 1, obtido ${reduction}`);
    }

    // Verificar movimentações criadas
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('reference_id', sale.id)
      .order('created_at', { ascending: false });

    console.log(`\n📋 Movimentações criadas: ${movements ? movements.length : 0}`);
    if (movements && movements.length > 0) {
      movements.forEach((mov, index) => {
        console.log(`   ${index + 1}. ${mov.movement_type}: ${mov.quantity} (${mov.previous_stock} → ${mov.new_stock}) - ${mov.created_at}`);
      });
    }

    // Agora vamos tentar descobrir COMO o estoque está sendo reduzido
    console.log('\n🔍 INVESTIGANDO COMO O ESTOQUE ESTÁ SENDO REDUZIDO...');

    // Vamos fazer uma inserção manual direta no banco para ver se o problema persiste
    console.log('\n🧪 Teste: Inserção direta via SQL...');
    
    // Primeiro, vamos restaurar o estoque
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log(`📊 Estoque restaurado para: ${testProduct.stock_quantity}`);

    // Criar nova venda para teste SQL
    const { data: sale2 } = await supabase
      .from('sales')
      .insert({
        customer_id: customer.id,
        total_amount: 10.00,
        final_amount: 10.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid'
      })
      .select()
      .single();

    // Tentar inserção via SQL direto
    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
        VALUES ('${sale2.id}', '${testProduct.id}', 1, 10.00)
        RETURNING id;
      `
    });

    if (sqlError) {
      console.log('❌ Erro na inserção SQL:', sqlError.message);
    } else {
      console.log('✅ Inserção SQL executada');
    }

    // Verificar estoque após SQL
    const { data: stockAfterSQL } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    const reductionSQL = testProduct.stock_quantity - stockAfterSQL.stock_quantity;
    console.log(`📊 Estoque após SQL: ${stockAfterSQL.stock_quantity}`);
    console.log(`📉 Redução via SQL: ${reductionSQL} unidades`);

    // Verificar se há alguma coisa no nível da aplicação
    console.log('\n🔍 VERIFICANDO CONFIGURAÇÕES DO SUPABASE...');
    
    // Verificar se há alguma configuração especial
    const { data: tableInfo, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          column_default,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (tableError) {
      console.log('❌ Erro ao verificar estrutura da tabela:', tableError.message);
    } else {
      console.log('📋 Estrutura da tabela sale_items:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
      });
    }

    // Limpeza
    console.log('\n🧹 Limpando dados de teste...');
    
    // Limpar movimentações
    if (movements) {
      await supabase.from('stock_movements').delete().in('reference_id', [sale.id, sale2.id]);
    }
    
    // Limpar itens
    await supabase.from('sale_items').delete().in('sale_id', [sale.id, sale2.id]);
    
    // Limpar vendas
    await supabase.from('sales').delete().in('id', [sale.id, sale2.id]);
    
    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Limpeza concluída');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarInsercaoItem();
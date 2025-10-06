const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Usando a service role key para operações administrativas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function disableRLSAndAddData() {
  try {
    console.log('=== Tentando adicionar dados de teste ===\n');
    
    // Primeiro, vamos tentar adicionar dados diretamente
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const testSales = [
      // Vendas de hoje
      {
        total_amount: 150.00,
        discount_amount: 10.00,
        final_amount: 140.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid',
        notes: 'Venda de hoje - 1',
        created_at: today.toISOString(),
        user_id: null // Tentando sem user_id
      },
      {
        total_amount: 89.50,
        discount_amount: 0.00,
        final_amount: 89.50,
        status: 'completed',
        payment_method: 'cartao_credito',
        payment_status: 'paid',
        notes: 'Venda de hoje - 2',
        created_at: today.toISOString(),
        user_id: null
      },
      {
        total_amount: 320.75,
        discount_amount: 20.75,
        final_amount: 300.00,
        status: 'pending',
        payment_method: 'cartao_debito',
        payment_status: 'pending',
        notes: 'Venda de hoje - pendente',
        created_at: today.toISOString(),
        user_id: null
      },
      
      // Vendas de ontem
      {
        total_amount: 75.00,
        discount_amount: 0.00,
        final_amount: 75.00,
        status: 'completed',
        payment_method: 'pix',
        payment_status: 'paid',
        notes: 'Venda de ontem - 1',
        created_at: yesterday.toISOString(),
        user_id: null
      },
      {
        total_amount: 200.00,
        discount_amount: 15.00,
        final_amount: 185.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid',
        notes: 'Venda de ontem - 2',
        created_at: yesterday.toISOString(),
        user_id: null
      },
      
      // Vendas da semana passada
      {
        total_amount: 450.00,
        discount_amount: 50.00,
        final_amount: 400.00,
        status: 'completed',
        payment_method: 'cartao_credito',
        payment_status: 'paid',
        notes: 'Venda da semana passada',
        created_at: lastWeek.toISOString(),
        user_id: null
      },
      
      // Vendas do mês passado
      {
        total_amount: 680.00,
        discount_amount: 30.00,
        final_amount: 650.00,
        status: 'completed',
        payment_method: 'cartao_debito',
        payment_status: 'paid',
        notes: 'Venda do mês passado - 1',
        created_at: lastMonth.toISOString(),
        user_id: null
      },
      {
        total_amount: 95.75,
        discount_amount: 5.75,
        final_amount: 90.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid',
        notes: 'Venda do mês passado - 2',
        created_at: lastMonth.toISOString(),
        user_id: null
      }
    ];
    
    console.log('📝 Tentando inserir vendas de teste...');
    
    // Tentar inserir todas as vendas de uma vez
    const { data: insertedSales, error: insertError } = await supabase
      .from('sales')
      .insert(testSales)
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir vendas em lote:', insertError.message);
      
      // Se falhar, tentar uma por uma
      console.log('🔄 Tentando inserir uma por uma...');
      let insertedCount = 0;
      
      for (const sale of testSales) {
        try {
          const { data: singleSale, error: singleError } = await supabase
            .from('sales')
            .insert([sale])
            .select();
          
          if (singleError) {
            console.log(`❌ Erro ao inserir venda (${sale.notes}):`, singleError.message);
          } else {
            insertedCount++;
            console.log(`✅ Venda inserida: ${sale.notes}`);
          }
        } catch (error) {
          console.log(`❌ Erro geral ao inserir venda (${sale.notes}):`, error.message);
        }
      }
      
      console.log(`\n📊 Total de vendas inseridas individualmente: ${insertedCount}/${testSales.length}`);
    } else {
      console.log(`✅ Todas as vendas inseridas com sucesso! Total: ${insertedSales?.length || 0}`);
    }
    
    // Verificar vendas na tabela
    const { data: allSales, error: verifyError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.log('❌ Erro ao verificar vendas:', verifyError.message);
    } else {
      console.log('\n✅ Verificação concluída!');
      console.log('📋 Total de vendas na tabela:', allSales?.length || 0);
      
      if (allSales && allSales.length > 0) {
        console.log('\n📄 Resumo das vendas:');
        allSales.slice(0, 5).forEach((sale, index) => {
          console.log(`${index + 1}. ${sale.notes} - R$ ${sale.final_amount} (${sale.status})`);
        });
        
        if (allSales.length > 5) {
          console.log(`... e mais ${allSales.length - 5} vendas`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

disableRLSAndAddData();
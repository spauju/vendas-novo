const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addTestSalesData() {
  try {
    console.log('=== Adicionando dados de teste para diferentes períodos ===\n');
    
    // Verificar se já existem vendas
    const { data: existingSales, error: checkError } = await supabase
      .from('sales')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('❌ Erro ao verificar vendas existentes:', checkError);
      return;
    }
    
    if (existingSales && existingSales.length > 0) {
      console.log('⚠️  Já existem vendas na tabela. Limpando dados antigos...');
      
      // Limpar dados existentes
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.log('❌ Erro ao limpar dados:', deleteError);
        return;
      }
      
      console.log('✅ Dados antigos removidos');
    }
    
    // Criar vendas para diferentes períodos
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
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
        created_at: today.toISOString()
      },
      {
        total_amount: 89.50,
        discount_amount: 0.00,
        final_amount: 89.50,
        status: 'completed',
        payment_method: 'cartao_credito',
        payment_status: 'paid',
        notes: 'Venda de hoje - 2',
        created_at: today.toISOString()
      },
      {
        total_amount: 320.75,
        discount_amount: 20.75,
        final_amount: 300.00,
        status: 'pending',
        payment_method: 'cartao_debito',
        payment_status: 'pending',
        notes: 'Venda de hoje - pendente',
        created_at: today.toISOString()
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
        created_at: yesterday.toISOString()
      },
      {
        total_amount: 200.00,
        discount_amount: 15.00,
        final_amount: 185.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid',
        notes: 'Venda de ontem - 2',
        created_at: yesterday.toISOString()
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
        created_at: lastWeek.toISOString()
      },
      {
        total_amount: 125.30,
        discount_amount: 0.00,
        final_amount: 125.30,
        status: 'cancelled',
        payment_method: 'pix',
        payment_status: 'refunded',
        notes: 'Venda cancelada da semana passada',
        created_at: lastWeek.toISOString()
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
        created_at: lastMonth.toISOString()
      },
      {
        total_amount: 95.75,
        discount_amount: 5.75,
        final_amount: 90.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid',
        notes: 'Venda do mês passado - 2',
        created_at: lastMonth.toISOString()
      },
      
      // Vendas de dois meses atrás
      {
        total_amount: 1200.00,
        discount_amount: 100.00,
        final_amount: 1100.00,
        status: 'completed',
        payment_method: 'cartao_credito',
        payment_status: 'paid',
        notes: 'Venda de dois meses atrás',
        created_at: twoMonthsAgo.toISOString()
      }
    ];
    
    console.log('📝 Inserindo vendas de teste para diferentes períodos...');
    
    // Inserir vendas uma por uma para evitar problemas de RLS
    let insertedCount = 0;
    for (const sale of testSales) {
      try {
        const { data: insertedSale, error: insertError } = await supabase
          .from('sales')
          .insert([sale])
          .select();
        
        if (insertError) {
          console.log(`❌ Erro ao inserir venda (${sale.notes}):`, insertError.message);
        } else {
          insertedCount++;
          console.log(`✅ Venda inserida: ${sale.notes}`);
        }
      } catch (error) {
        console.log(`❌ Erro geral ao inserir venda (${sale.notes}):`, error);
      }
    }
    
    console.log(`\n📊 Total de vendas inseridas: ${insertedCount}/${testSales.length}`);
    
    // Verificar se as vendas foram inseridas corretamente
    const { data: allSales, error: verifyError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.log('❌ Erro ao verificar vendas:', verifyError);
    } else {
      console.log('✅ Verificação concluída!');
      console.log('📋 Total de vendas na tabela:', allSales?.length || 0);
      
      if (allSales && allSales.length > 0) {
        console.log('\n📄 Resumo por período:');
        
        const todayCount = allSales.filter(sale => 
          new Date(sale.created_at).toDateString() === today.toDateString()
        ).length;
        
        const yesterdayCount = allSales.filter(sale => 
          new Date(sale.created_at).toDateString() === yesterday.toDateString()
        ).length;
        
        console.log(`- Hoje: ${todayCount} vendas`);
        console.log(`- Ontem: ${yesterdayCount} vendas`);
        console.log(`- Total: ${allSales.length} vendas`);
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

addTestSalesData();
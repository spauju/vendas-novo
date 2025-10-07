const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ktjepcetwwuoxbocbupj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amVwY2V0d3d1b3hib2NidXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzg1MTIsImV4cCI6MjA3NDg1NDUxMn0.mC1aGVEYb7mJfV9QwylP7LVYFiKecp9hHklJSpr4qS4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboardData() {
  console.log('🔍 Testando dados do dashboard...\n');
  
  try {
    // 1. Verificar data/hora atual
    const now = new Date();
    console.log('📅 Data/hora atual:');
    console.log(`   Local: ${now.toLocaleString('pt-BR')}`);
    console.log(`   UTC: ${now.toISOString()}`);
    console.log(`   Timezone offset: ${now.getTimezoneOffset()} minutos\n`);

    // 2. Testar a lógica do dashboard (exatamente como no código)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📊 Filtros de data do dashboard:');
    console.log(`   Início do dia (today): ${today.toISOString()}`);
    console.log(`   Fim do dia (tomorrow): ${tomorrow.toISOString()}\n`);

    // 3. Buscar vendas de hoje usando a mesma query do dashboard
    console.log('🔍 Buscando vendas de hoje...');
    const { data: todaySales, error: salesError } = await supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('❌ Erro ao buscar vendas de hoje:', salesError);
      return;
    }

    console.log(`✅ Vendas encontradas hoje: ${todaySales?.length || 0}`);
    
    if (todaySales && todaySales.length > 0) {
      console.log('\n📋 Detalhes das vendas de hoje:');
      todaySales.forEach((sale, index) => {
        const saleDate = new Date(sale.created_at);
        console.log(`   ${index + 1}. ID: ${sale.id}`);
        console.log(`      Valor: R$ ${sale.total_amount.toFixed(2)}`);
        console.log(`      Data: ${saleDate.toLocaleString('pt-BR')}`);
        console.log(`      UTC: ${sale.created_at}`);
      });
      
      const totalToday = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);
      console.log(`\n💰 Total de vendas hoje: R$ ${totalToday.toFixed(2)}`);
    }

    // 4. Buscar vendas de ontem para comparação
    console.log('\n🔍 Buscando vendas de ontem para comparação...');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStart = new Date(today);
    
    const { data: yesterdaySales, error: yesterdayError } = await supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });

    if (yesterdayError) {
      console.error('❌ Erro ao buscar vendas de ontem:', yesterdayError);
    } else {
      console.log(`✅ Vendas encontradas ontem: ${yesterdaySales?.length || 0}`);
      
      if (yesterdaySales && yesterdaySales.length > 0) {
        console.log('\n📋 Detalhes das vendas de ontem:');
        yesterdaySales.forEach((sale, index) => {
          const saleDate = new Date(sale.created_at);
          console.log(`   ${index + 1}. ID: ${sale.id}`);
          console.log(`      Valor: R$ ${sale.total_amount.toFixed(2)}`);
          console.log(`      Data: ${saleDate.toLocaleString('pt-BR')}`);
          console.log(`      UTC: ${sale.created_at}`);
        });
        
        const totalYesterday = yesterdaySales.reduce((sum, sale) => sum + sale.total_amount, 0);
        console.log(`\n💰 Total de vendas ontem: R$ ${totalYesterday.toFixed(2)}`);
      }
    }

    // 5. Buscar todas as vendas recentes (últimas 10)
    console.log('\n🔍 Buscando vendas recentes (últimas 10)...');
    const { data: recentSales, error: recentError } = await supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Erro ao buscar vendas recentes:', recentError);
    } else {
      console.log(`✅ Vendas recentes encontradas: ${recentSales?.length || 0}`);
      
      if (recentSales && recentSales.length > 0) {
        console.log('\n📋 Últimas vendas:');
        recentSales.forEach((sale, index) => {
          const saleDate = new Date(sale.created_at);
          const isToday = saleDate.toDateString() === now.toDateString();
          const dayLabel = isToday ? '(HOJE)' : '(OUTRO DIA)';
          
          console.log(`   ${index + 1}. ID: ${sale.id} ${dayLabel}`);
          console.log(`      Valor: R$ ${sale.total_amount.toFixed(2)}`);
          console.log(`      Data: ${saleDate.toLocaleString('pt-BR')}`);
          console.log(`      UTC: ${sale.created_at}`);
        });
      }
    }

    // 6. Verificar se há diferença de timezone
    console.log('\n🌍 Análise de timezone:');
    if (recentSales && recentSales.length > 0) {
      const firstSale = recentSales[0];
      const saleDate = new Date(firstSale.created_at);
      const localDate = new Date(saleDate.getTime() - (saleDate.getTimezoneOffset() * 60000));
      
      console.log(`   Venda mais recente:`);
      console.log(`   - UTC: ${firstSale.created_at}`);
      console.log(`   - Local: ${saleDate.toLocaleString('pt-BR')}`);
      console.log(`   - Ajustado: ${localDate.toLocaleString('pt-BR')}`);
      
      const isToday = saleDate.toDateString() === now.toDateString();
      console.log(`   - É de hoje? ${isToday ? 'SIM' : 'NÃO'}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testDashboardData();
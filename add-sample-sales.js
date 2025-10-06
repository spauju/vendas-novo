const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addSampleSales() {
  try {
    console.log('=== Adicionando dados de exemplo para SALES ===\n');
    
    // 1. Verificar se já existem vendas
    const { data: existingSales, error: checkError } = await supabase
      .from('sales')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('❌ Erro ao verificar vendas existentes:', checkError);
      return;
    }
    
    if (existingSales && existingSales.length > 0) {
      console.log('⚠️  Já existem vendas na tabela. Pulando inserção.');
      return;
    }
    
    // 2. Verificar se existem clientes
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name')
      .limit(3);
    
    if (customersError) {
      console.log('❌ Erro ao buscar clientes:', customersError);
      return;
    }
    
    console.log('📋 Clientes encontrados:', customers?.length || 0);
    
    // 3. Criar vendas de exemplo
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const sampleSales = [
      {
        customer_id: customers && customers.length > 0 ? customers[0].id : null,
        total_amount: 150.00,
        discount_amount: 10.00,
        final_amount: 140.00,
        status: 'completed',
        payment_method: 'dinheiro',
        payment_status: 'paid',
        notes: 'Venda de teste 1',
        created_at: today.toISOString()
      },
      {
        customer_id: customers && customers.length > 1 ? customers[1].id : null,
        total_amount: 89.50,
        discount_amount: 0.00,
        final_amount: 89.50,
        status: 'completed',
        payment_method: 'cartao_credito',
        payment_status: 'paid',
        notes: 'Venda de teste 2',
        created_at: today.toISOString()
      },
      {
        customer_id: null, // Venda sem cliente
        total_amount: 25.00,
        discount_amount: 0.00,
        final_amount: 25.00,
        status: 'completed',
        payment_method: 'pix',
        payment_status: 'paid',
        notes: 'Venda balcão',
        created_at: yesterday.toISOString()
      },
      {
        customer_id: customers && customers.length > 2 ? customers[2].id : null,
        total_amount: 320.75,
        discount_amount: 20.75,
        final_amount: 300.00,
        status: 'pending',
        payment_method: 'cartao_debito',
        payment_status: 'pending',
        notes: 'Venda pendente',
        created_at: today.toISOString()
      }
    ];
    
    console.log('📝 Inserindo vendas de exemplo...');
    
    const { data: insertedSales, error: insertError } = await supabase
      .from('sales')
      .insert(sampleSales)
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir vendas:', insertError);
      return;
    }
    
    console.log('✅ Vendas inseridas com sucesso!');
    console.log('📊 Total de vendas criadas:', insertedSales?.length || 0);
    
    // 4. Verificar se as vendas foram inseridas corretamente
    const { data: allSales, error: verifyError } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          name,
          cpf_cnpj
        )
      `)
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      console.log('❌ Erro ao verificar vendas:', verifyError);
    } else {
      console.log('✅ Verificação concluída!');
      console.log('📋 Total de vendas na tabela:', allSales?.length || 0);
      
      if (allSales && allSales.length > 0) {
        console.log('\n📄 Exemplo de venda:');
        console.log(JSON.stringify(allSales[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

addSampleSales();
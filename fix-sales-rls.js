const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixSalesRLS() {
  try {
    console.log('=== Corrigindo políticas RLS da tabela SALES ===\n');
    
    // 1. Verificar políticas existentes
    console.log('1. Verificando políticas RLS existentes:');
    
    const checkPoliciesSQL = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'sales';
    `;
    
    // Como não temos acesso direto ao RPC, vamos tentar uma abordagem diferente
    // Vamos testar se conseguimos inserir dados diretamente
    
    console.log('2. Testando inserção simples:');
    
    const testSale = {
      total_amount: 100.00,
      discount_amount: 0.00,
      final_amount: 100.00,
      status: 'completed',
      payment_method: 'dinheiro',
      payment_status: 'paid',
      notes: 'Teste RLS'
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('sales')
      .insert([testSale])
      .select();
    
    if (insertError) {
      console.log('❌ Erro na inserção:', insertError);
      console.log('Código do erro:', insertError.code);
      
      if (insertError.code === '42501') {
        console.log('\n🔒 Problema de RLS detectado. Tentando soluções...');
        
        // Tentar inserção com user_id nulo
        console.log('3. Testando inserção sem user_id:');
        const testSale2 = {
          user_id: null,
          total_amount: 100.00,
          discount_amount: 0.00,
          final_amount: 100.00,
          status: 'completed',
          payment_method: 'dinheiro',
          payment_status: 'paid',
          notes: 'Teste RLS sem user_id'
        };
        
        const { data: insertTest2, error: insertError2 } = await supabase
          .from('sales')
          .insert([testSale2])
          .select();
        
        if (insertError2) {
          console.log('❌ Ainda com erro:', insertError2);
        } else {
          console.log('✅ Inserção sem user_id funcionou!');
          
          // Limpar o teste
          if (insertTest2 && insertTest2.length > 0) {
            await supabase
              .from('sales')
              .delete()
              .eq('id', insertTest2[0].id);
            console.log('🧹 Registro de teste removido');
          }
        }
      }
    } else {
      console.log('✅ Inserção funcionou!');
      console.log('📄 Dados inseridos:', insertTest);
      
      // Limpar o teste
      if (insertTest && insertTest.length > 0) {
        await supabase
          .from('sales')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }
    
    // 4. Verificar se conseguimos ler dados
    console.log('\n4. Testando leitura de dados:');
    const { data: readTest, error: readError } = await supabase
      .from('sales')
      .select('*')
      .limit(1);
    
    if (readError) {
      console.log('❌ Erro na leitura:', readError);
    } else {
      console.log('✅ Leitura funcionou!');
      console.log('📊 Registros encontrados:', readTest?.length || 0);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

fixSalesRLS();
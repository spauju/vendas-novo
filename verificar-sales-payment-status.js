const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarPaymentStatus() {
  try {
    console.log('🔍 Verificando estrutura da tabela sales...');
    
    // Tentar fazer uma consulta que inclui a coluna payment_status
    const { data, error } = await supabase
      .from('sales')
      .select('id, payment_status, status, payment_method')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao consultar tabela sales:', error);
      
      if (error.message.includes("payment_status")) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO:');
        console.log('   A coluna "payment_status" não existe na tabela sales');
        console.log('   Isso está causando o erro no PDV');
        
        // Verificar quais colunas existem
        console.log('\n🔍 Verificando colunas existentes...');
        const { data: basicData, error: basicError } = await supabase
          .from('sales')
          .select('*')
          .limit(1);
        
        if (basicError) {
          console.error('❌ Erro ao verificar colunas básicas:', basicError);
        } else {
          console.log('📋 Colunas encontradas na tabela sales:');
          if (basicData && basicData.length > 0) {
            const columns = Object.keys(basicData[0]);
            columns.forEach(col => console.log(`   - ${col}`));
          } else {
            console.log('   (Tabela vazia - não é possível determinar colunas)');
          }
        }
      }
    } else {
      console.log('✅ Coluna payment_status existe e está funcionando!');
      console.log('📊 Dados de teste:', data);
    }
    
    // Verificar se podemos inserir um registro de teste
    console.log('\n🧪 Testando inserção com payment_status...');
    
    const testSale = {
      total_amount: 10.00,
      final_amount: 10.00,
      payment_method: 'dinheiro',
      payment_status: 'paid',
      status: 'completed',
      notes: 'Teste de verificação'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('sales')
      .insert(testSale)
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir registro de teste:', insertError);
      
      if (insertError.message.includes("payment_status")) {
        console.log('\n🔧 SOLUÇÃO NECESSÁRIA:');
        console.log('   A tabela sales precisa ser atualizada para incluir a coluna payment_status');
        console.log('   Execute o arquivo criar-tabela-sales.sql no Supabase Dashboard');
      }
    } else {
      console.log('✅ Inserção de teste bem-sucedida!');
      console.log('📊 Registro criado:', insertData);
      
      // Limpar o registro de teste
      if (insertData && insertData.length > 0) {
        await supabase
          .from('sales')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

verificarPaymentStatus();
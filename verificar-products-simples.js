const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarProducts() {
  try {
    console.log('🔍 Verificando tabela products...');
    
    // Tentar uma consulta simples
    const { data, error } = await supabase
      .from('products')
      .select('id, name, code, barcode, sale_price, stock_quantity, min_stock, active')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na consulta products:', error);
      
      if (error.message.includes("Could not find the 'code' column")) {
        console.log('🔧 A coluna "code" não existe na tabela products');
        console.log('📋 Isso explica o erro no frontend');
        
        // Vamos tentar descobrir quais colunas existem
        console.log('🔍 Tentando descobrir a estrutura atual...');
        
        const { data: basicData, error: basicError } = await supabase
          .from('products')
          .select('*')
          .limit(1);
          
        if (basicError) {
          console.error('❌ Erro ao consultar estrutura básica:', basicError);
        } else {
          console.log('✅ Estrutura atual da tabela products:');
          if (basicData && basicData.length > 0) {
            console.log('📊 Colunas disponíveis:', Object.keys(basicData[0]));
          } else {
            console.log('📊 Tabela vazia, mas existe');
          }
        }
      }
    } else {
      console.log('✅ Tabela products está funcionando corretamente');
      console.log('📊 Dados encontrados:', data?.length || 0, 'registros');
      if (data && data.length > 0) {
        console.log('📋 Estrutura:', Object.keys(data[0]));
      }
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

verificarProducts();
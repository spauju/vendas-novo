const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function adicionarColunaCode() {
  try {
    console.log('🔍 Verificando estrutura atual da tabela products...');
    
    // Primeiro, vamos ver a estrutura atual
    const { data: currentData, error: currentError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (currentError && !currentError.message.includes('code')) {
      console.error('❌ Erro ao acessar tabela products:', currentError);
      return;
    }
    
    if (currentData && currentData.length > 0) {
      console.log('📋 Colunas atuais:', Object.keys(currentData[0]));
    }
    
    console.log('➕ Adicionando coluna "code" à tabela products...');
    
    // Usar SQL direto via REST API
    const sqlCommands = [
      // Adicionar a coluna code
      'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS code TEXT;',
      
      // Criar índice único para code
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_unique ON public.products(code);',
      
      // Atualizar produtos existentes com códigos baseados no SKU ou ID
      `UPDATE public.products 
       SET code = COALESCE(sku, 'PROD' || LPAD(EXTRACT(EPOCH FROM created_at)::TEXT, 10, '0'))
       WHERE code IS NULL OR code = '';`,
      
      // Tornar a coluna NOT NULL
      'ALTER TABLE public.products ALTER COLUMN code SET NOT NULL;'
    ];
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const sql = sqlCommands[i];
      console.log(`🔧 Executando comando ${i + 1}/${sqlCommands.length}...`);
      
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({ sql })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Erro no comando ${i + 1}:`, errorText);
          
          // Se for erro de função não encontrada, tentar abordagem alternativa
          if (errorText.includes('exec')) {
            console.log('🔄 Tentando abordagem alternativa...');
            break;
          }
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
        }
      } catch (err) {
        console.error(`❌ Erro no comando ${i + 1}:`, err.message);
      }
    }
    
    // Verificar se a correção funcionou
    console.log('🔍 Verificando se a correção funcionou...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('products')
      .select('id, code, name, sku')
      .limit(3);
    
    if (verifyError) {
      console.error('❌ Ainda há erro:', verifyError);
    } else {
      console.log('✅ Correção bem-sucedida!');
      console.log('📊 Dados de verificação:', verifyData);
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

adicionarColunaCode();
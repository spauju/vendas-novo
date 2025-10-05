require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔧 Corrigindo o campo button no banco de dados...');
    
    // Ler o arquivo SQL
    const sqlQuery = fs.readFileSync('./corrigir-button.sql', 'utf8');
    
    // Executar a query SQL diretamente
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlQuery });
    
    if (error) {
      // Se falhar com exec_sql, tentar com outro método
      console.log('⚠️ Método exec_sql falhou, tentando query SQL direta...');
      
      // Executar queries individuais
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ button: 'user' })
        .eq('button', 'cashier');
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar valores: ${updateError.message}`);
      } else {
        console.log('✅ Valores atualizados com sucesso');
      }
      
      // Verificar se a coluna existe
      const { data: columnData, error: columnError } = await supabase
        .from('profiles')
        .select('button')
        .limit(1);
      
      if (columnError) {
        console.error(`❌ Erro ao verificar coluna: ${columnError.message}`);
      } else if (columnData && columnData.length > 0) {
        console.log('✅ Coluna button existe na tabela profiles');
        console.log('ℹ️ Não é possível alterar o tipo da coluna diretamente via API, use o SQL Editor do Supabase');
      }
    } else {
      console.log('✅ SQL executado com sucesso');
    }
    
    console.log('🎉 Processo concluído!');
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
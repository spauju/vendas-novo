require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔄 Iniciando atualização de funções no banco de dados...');
    
    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'atualizar-funcoes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir o conteúdo SQL em comandos individuais
    // Cada comando termina com ponto e vírgula seguido de uma nova linha
    const sqlCommands = sqlContent.split(/;\s*\n/);
    
    // Executar cada comando SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i].trim();
      if (!command) continue; // Pular linhas vazias
      
      console.log(`\n🔹 Executando comando SQL ${i + 1}/${sqlCommands.length}...`);
      
      try {
        // Tentar executar via RPC
        const { error } = await supabase.rpc('exec_sql', { sql: command + ';' });
        
        if (error) {
          console.warn(`⚠️ Erro ao executar via RPC: ${error.message}`);
          console.log('🔄 Tentando método alternativo...');
          
          // Se falhar, tentar executar diretamente via API REST
          const { error: directError } = await supabase.from('_exec_sql').select('*').eq('sql', command + ';');
          
          if (directError) {
            throw new Error(`Não foi possível executar o comando: ${directError.message}`);
          }
        }
        
        console.log('✅ Comando executado com sucesso');
      } catch (cmdError) {
        console.error(`❌ Erro ao executar comando: ${cmdError.message}`);
        console.log('⚠️ Continuando com o próximo comando...');
      }
    }
    
    console.log('\n🎉 Atualização de funções concluída!');
    console.log('\n⚠️ IMPORTANTE: Para aplicar todas as funções, você precisa executar este SQL diretamente no console SQL do Supabase.');
    console.log('📋 Acesse o painel do Supabase, vá para a seção SQL e cole o conteúdo do arquivo atualizar-funcoes.sql');
    
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
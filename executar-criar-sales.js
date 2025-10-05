require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function criarTabelaSales() {
  try {
    console.log('🔧 CRIANDO TABELA SALES E ESTRUTURAS RELACIONADAS');
    console.log('==================================================\n');

    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('./criar-tabela-sales.sql', 'utf8');
    
    // Dividir o SQL em comandos individuais
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📋 Executando ${sqlCommands.length} comandos SQL...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Executar cada comando individualmente
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // Pular comentários e comandos vazios
      if (command.startsWith('--') || command.trim().length === 0) {
        continue;
      }

      console.log(`${i + 1}. Executando: ${command.substring(0, 50)}...`);

      try {
        // Tentar executar via RPC exec_sql
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: command 
        });

        if (error) {
          console.log(`   ⚠️ RPC falhou: ${error.message}`);
          
          // Tentar métodos alternativos para comandos específicos
          if (command.includes('CREATE TABLE') && command.includes('sales')) {
            console.log('   🔄 Tentando criar tabela sales via método alternativo...');
            
            // Verificar se a tabela já existe
            const { data: existingTable, error: checkError } = await supabase
              .from('sales')
              .select('id')
              .limit(1);

            if (checkError && checkError.code === 'PGRST205') {
              console.log('   ❌ Tabela sales não existe e não pode ser criada via API');
              errorCount++;
            } else {
              console.log('   ✅ Tabela sales já existe ou foi criada');
              successCount++;
            }
          } else {
            console.log(`   ❌ Erro: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log('   ✅ Comando executado com sucesso');
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ Erro inesperado: ${err.message}`);
        errorCount++;
      }

      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 RESUMO DA EXECUÇÃO');
    console.log('=====================');
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);

    // Verificar se a tabela sales foi criada
    console.log('\n🔍 Verificando se a tabela sales foi criada...');
    
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id')
        .limit(1);

      if (salesError) {
        if (salesError.code === 'PGRST205') {
          console.log('❌ TABELA SALES AINDA NÃO EXISTE');
          console.log('   Você precisa executar o SQL manualmente no Supabase SQL Editor');
          console.log('   Arquivo: criar-tabela-sales.sql');
        } else {
          console.log(`❌ Erro ao verificar tabela sales: ${salesError.message}`);
        }
      } else {
        console.log('✅ TABELA SALES CRIADA COM SUCESSO!');
        
        // Verificar tabela sale_items também
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select('id')
          .limit(1);

        if (itemsError) {
          console.log(`⚠️ Problema com tabela sale_items: ${itemsError.message}`);
        } else {
          console.log('✅ TABELA SALE_ITEMS TAMBÉM ESTÁ FUNCIONANDO!');
        }
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar tabelas: ${error.message}`);
    }

    console.log('\n🎯 PRÓXIMOS PASSOS');
    console.log('==================');
    
    if (errorCount > 0) {
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o conteúdo do arquivo criar-tabela-sales.sql');
      console.log('4. Execute este script novamente para verificar');
    } else {
      console.log('✅ Todas as estruturas foram criadas com sucesso!');
      console.log('✅ O erro da tabela sales deve estar resolvido');
    }

  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message);
    process.exit(1);
  }
}

criarTabelaSales();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executarSQLCompleto() {
  console.log('🚀 EXECUTANDO SCRIPT SQL COMPLETO PARA CRIAR TABELAS\n');

  try {
    // 1. Ler o arquivo SQL
    console.log('1️⃣ Lendo arquivo SQL...');
    const sqlPath = path.join(__dirname, 'criar-todas-tabelas.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Arquivo criar-todas-tabelas.sql não encontrado');
      return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ Arquivo SQL carregado com sucesso');

    // 2. Dividir o SQL em comandos individuais
    console.log('\n2️⃣ Processando comandos SQL...');
    const commands = dividirComandosSQL(sqlContent);
    console.log(`✅ ${commands.length} comandos SQL identificados`);

    // 3. Executar comandos um por um
    console.log('\n3️⃣ Executando comandos SQL...');
    let sucessos = 0;
    let erros = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      
      if (command.length === 0 || command.startsWith('--')) {
        continue; // Pular comentários e linhas vazias
      }

      console.log(`\n📝 Executando comando ${i + 1}/${commands.length}:`);
      console.log(`   ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);

      try {
        const resultado = await executarComandoSQL(command);
        if (resultado.sucesso) {
          console.log('   ✅ Sucesso');
          sucessos++;
        } else {
          console.log(`   ❌ Erro: ${resultado.erro}`);
          erros++;
        }
      } catch (error) {
        console.log(`   ❌ Erro inesperado: ${error.message}`);
        erros++;
      }

      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. Verificar resultados
    console.log('\n4️⃣ Verificando tabelas criadas...');
    await verificarTabelasCriadas();

    // 5. Resumo final
    console.log('\n📊 RESUMO DA EXECUÇÃO:');
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📝 Total: ${sucessos + erros}`);

    if (erros > 0) {
      console.log('\n⚠️ ATENÇÃO: Alguns comandos falharam.');
      console.log('💡 Recomendação: Execute o SQL manualmente no Supabase SQL Editor');
      console.log('📁 Arquivo: criar-todas-tabelas.sql');
    } else {
      console.log('\n🎉 Todos os comandos executados com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

function dividirComandosSQL(sqlContent) {
  // Remover comentários de linha
  let cleanSQL = sqlContent.replace(/--.*$/gm, '');
  
  // Remover comentários de bloco
  cleanSQL = cleanSQL.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Dividir por ponto e vírgula, mas preservar comandos complexos
  const commands = [];
  let currentCommand = '';
  let inFunction = false;
  let dollarQuoteTag = null;
  
  const lines = cleanSQL.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Detectar início/fim de função
    if (trimmedLine.includes('$$')) {
      if (dollarQuoteTag === null) {
        dollarQuoteTag = '$$';
        inFunction = true;
      } else if (trimmedLine.includes(dollarQuoteTag)) {
        inFunction = false;
        dollarQuoteTag = null;
      }
    }
    
    currentCommand += line + '\n';
    
    // Se não estamos em uma função e encontramos um ponto e vírgula
    if (!inFunction && trimmedLine.endsWith(';')) {
      commands.push(currentCommand.trim());
      currentCommand = '';
    }
  }
  
  // Adicionar último comando se não terminar com ;
  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }
  
  return commands.filter(cmd => cmd.length > 0);
}

async function executarComandoSQL(command) {
  try {
    // Tentar via RPC exec_sql primeiro
    const { data, error } = await supabase.rpc('exec_sql', { sql: command });
    
    if (error) {
      // Se exec_sql falhar, tentar métodos alternativos baseados no tipo de comando
      return await executarComandoAlternativo(command, error);
    }
    
    return { sucesso: true, data };
  } catch (error) {
    return { sucesso: false, erro: error.message };
  }
}

async function executarComandoAlternativo(command, originalError) {
  const commandUpper = command.toUpperCase().trim();
  
  try {
    // Para comandos CREATE TABLE, tentar via REST API
    if (commandUpper.startsWith('CREATE TABLE')) {
      // Extrair nome da tabela
      const match = command.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)/i);
      if (match) {
        const tableName = match[1];
        console.log(`   🔄 Tentando criar tabela ${tableName} via método alternativo...`);
        
        // Tentar executar via fetch direto
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ sql: command })
        });
        
        if (response.ok) {
          return { sucesso: true, data: await response.json() };
        }
      }
    }
    
    // Para outros comandos, registrar o erro original
    return { 
      sucesso: false, 
      erro: `${originalError.message} (Comando: ${commandUpper.substring(0, 50)}...)` 
    };
    
  } catch (error) {
    return { 
      sucesso: false, 
      erro: `Erro alternativo: ${error.message}` 
    };
  }
}

async function verificarTabelasCriadas() {
  const tabelasEsperadas = ['customers', 'products', 'sales', 'sale_items', 'stock_movements'];
  
  console.log('🔍 Verificando tabelas criadas:');
  
  for (const tabela of tabelasEsperadas) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.log(`   ❌ ${tabela}: Não encontrada`);
        } else {
          console.log(`   ⚠️ ${tabela}: Erro - ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${tabela}: Criada e acessível`);
      }
    } catch (error) {
      console.log(`   ❌ ${tabela}: Erro inesperado - ${error.message}`);
    }
  }
}

// Executar o script
executarSQLCompleto()
  .then(() => {
    console.log('\n🏁 Execução do script concluída!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Verifique se as tabelas foram criadas no Supabase Dashboard');
    console.log('2. Se houver erros, execute o SQL manualmente no SQL Editor');
    console.log('3. Teste o dashboard para confirmar que os erros foram resolvidos');
    console.log('4. Faça login no sistema para verificar se tudo está funcionando');
  })
  .catch(error => {
    console.error('❌ Erro fatal na execução:', error);
    process.exit(1);
  });
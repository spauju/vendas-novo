const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ubdvcpbvaqmogdtlzqdp.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZHZjcGJ2YXFtb2dkdGx6cWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODk1MjUsImV4cCI6MjA3NDA2NTUyNX0.npleCsUOwiJ9O6p6xDfvxsi80cPk6u24f9HDJc_jvW4';

const supabase = createClient(supabaseUrl, anonKey);

async function verifyTables() {
  console.log('🔍 Verificando se as tabelas foram criadas...\n');
  
  const tables = [
    'profiles',
    'customers', 
    'products',
    'sales',
    'sale_items',
    'stock_movements'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const tableName of tables) {
    try {
      console.log(`⏳ Verificando tabela: ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ ${tableName}: Tabela existe e acessível`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${tableName}: Erro de conexão - ${err.message}`);
      errorCount++;
    }
    
    // Pequena pausa entre verificações
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Resumo da verificação:`);
  console.log(`✅ Tabelas acessíveis: ${successCount}`);
  console.log(`❌ Tabelas com erro: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log(`\n🎉 Todas as tabelas estão funcionando corretamente!`);
    console.log(`\n📝 Próximos passos:`);
    console.log(`1. As tabelas foram criadas com sucesso`);
    console.log(`2. O sistema está pronto para uso`);
    console.log(`3. Você pode acessar a aplicação em http://localhost:3000`);
  } else {
    console.log(`\n⚠️  Algumas tabelas não foram encontradas.`);
    console.log(`📋 Para criar as tabelas manualmente:`);
    console.log(`1. Acesse o Supabase Dashboard`);
    console.log(`2. Vá para SQL Editor`);
    console.log(`3. Execute os comandos do arquivo create-tables-manual.md`);
  }
}

// Executar verificação
verifyTables();
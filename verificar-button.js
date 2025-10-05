require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔍 Verificando tabelas do banco de dados...');
    
    // Listar todas as tabelas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('⚠️ Não foi possível listar tabelas via API, verificando auth.users...');
      
      // Verificar auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error(`❌ Erro ao buscar usuários: ${authError.message}`);
      } else {
        console.log(`✅ Encontrados ${authUsers.users.length} usuários no auth.users`);
        
        // Verificar metadados dos usuários
        authUsers.users.forEach(user => {
          console.log(`\n👤 Usuário: ${user.email}`);
          console.log(`Metadados: ${JSON.stringify(user.user_metadata, null, 2)}`);
          
          // Verificar se há algum campo button nos metadados
          if (user.user_metadata && user.user_metadata.button) {
            console.log(`⚠️ Campo button encontrado nos metadados: ${user.user_metadata.button}`);
          }
        });
      }
    } else {
      console.log(`✅ Tabelas encontradas: ${tables.map(t => t.table_name).join(', ')}`);
      
      // Verificar cada tabela por um campo button
      for (const table of tables) {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name);
        
        if (!columnsError && columns) {
          const buttonColumn = columns.find(c => c.column_name === 'button');
          if (buttonColumn) {
            console.log(`🔍 Campo button encontrado na tabela ${table.table_name} (tipo: ${buttonColumn.data_type})`);
            
            // Verificar valores do campo button
            const { data: values, error: valuesError } = await supabase
              .from(table.table_name)
              .select('button')
              .not('button', 'is', null);
            
            if (!valuesError && values && values.length > 0) {
              console.log(`✅ Valores encontrados para button: ${JSON.stringify(values)}`);
            }
          }
        }
      }
    }
    
    console.log('\n🎉 Verificação concluída!');
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
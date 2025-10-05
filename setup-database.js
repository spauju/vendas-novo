require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Inicializar cliente Supabase com a chave de serviço
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function setupDatabase() {
  console.log('Iniciando configuração do banco de dados...');

  try {
    // Executar script SQL
    const sqlScript = fs.readFileSync(path.join(__dirname, 'setup-database.sql'), 'utf8');
    
    // Dividir o script em comandos individuais
    const commands = sqlScript.split(';').filter(cmd => cmd.trim() !== '');
    
    for (const command of commands) {
      try {
        const { error } = await supabase.from('_sql').rpc('run_sql', { query: command + ';' });
        if (error) console.error('Erro ao executar SQL:', error.message);
      } catch (err) {
        console.error('Erro ao executar comando SQL:', err.message);
      }
    }

    // Criar usuário administrador
    console.log('Criando usuário administrador...');
    
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@vendas.com',
      password: 'admin123',
      email_confirm: true
    });

    if (adminError) {
      if (adminError.message.includes('already exists')) {
        console.log('Usuário admin já existe');
        
        // Buscar usuário existente
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingAdmin = existingUsers?.users?.find(u => u.email === 'admin@vendas.com');
        
        if (existingAdmin) {
          // Criar perfil para o admin existente
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: existingAdmin.id,
              email: 'admin@vendas.com',
              name: 'Administrador',
              role: 'administrador'
            });
          
          if (profileError) console.error('Erro ao criar perfil admin:', profileError.message);
          else console.log('Perfil admin atualizado com sucesso');
        }
      } else {
        console.error('Erro ao criar usuário admin:', adminError.message);
      }
    } else {
      console.log('Usuário admin criado com sucesso');
      
      // Criar perfil para o admin
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: adminUser.user.id,
          email: 'admin@vendas.com',
          name: 'Administrador',
          role: 'administrador'
        });
      
      if (profileError) console.error('Erro ao criar perfil admin:', profileError.message);
      else console.log('Perfil admin criado com sucesso');
    }

    console.log('Configuração do banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a configuração do banco de dados:', error.message);
  }
}

// Executar a configuração
setupDatabase();
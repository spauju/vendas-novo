require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('🔄 Iniciando atualização de papéis de usuário...');
    
    // 1. Atualizar usuários de 'authenticado' para 'administrador'
    console.log('\n1️⃣ Atualizando usuários de authenticado para administrador...');
    
    // Buscar todos os usuários
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
    }
    
    console.log(`📋 Encontrados ${users.users.length} usuários no auth.users`);
    
    // Processar cada usuário
    for (const user of users.users) {
      console.log(`\n👤 Processando usuário: ${user.email}`);
      
      // Verificar se o usuário tem role 'authenticado'
      const userRole = user.user_metadata?.role || 'authenticado';
      
      if (userRole === 'authenticado') {
        console.log(`🔄 Atualizando papel de '${userRole}' para 'administrador'`);
        
        // Atualizar metadados do usuário
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { user_metadata: { ...user.user_metadata, role: 'administrador' } }
        );
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar metadados: ${updateError.message}`);
        } else {
          console.log('✅ Metadados atualizados com sucesso');
          
          // Sincronizar com a tabela profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              role: 'administrador',
              full_name: user.user_metadata?.full_name || user.email.split('@')[0],
              active: true
            }, { onConflict: 'id' });
          
          if (profileError) {
            console.error(`❌ Erro ao atualizar perfil: ${profileError.message}`);
          } else {
            console.log('✅ Perfil atualizado com sucesso');
          }
        }
      } else {
        console.log(`ℹ️ Usuário já tem papel '${userRole}', nenhuma alteração necessária`);
      }
    }
    
    // 2. Verificar e ajustar permissões
    console.log('\n2️⃣ Verificando e ajustando permissões...');
    
    // Verificar se existem permissões para o papel 'administrador'
    const { data: adminPermissions, error: permissionsError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', 'administrador');
    
    if (permissionsError) {
      console.error(`❌ Erro ao verificar permissões: ${permissionsError.message}`);
    } else if (!adminPermissions || adminPermissions.length === 0) {
      console.log('⚠️ Nenhuma permissão encontrada para o papel administrador, inserindo permissões...');
      
      // Lista de módulos do sistema
      const modules = [
        'usuarios', 'reports', 'produtos', 'estoque', 'pdv', 
        'clientes', 'fornecedores', 'settings', 'dashboard', 
        'system', 'pagamentos'
      ];
      
      // Inserir permissões para cada módulo
      for (const module of modules) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .upsert({
            role: 'administrador',
            module,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true
          }, { onConflict: ['role', 'module'] });
        
        if (insertError) {
          console.error(`❌ Erro ao inserir permissão para ${module}: ${insertError.message}`);
        } else {
          console.log(`✅ Permissões para ${module} configuradas com sucesso`);
        }
      }
    } else {
      console.log(`✅ ${adminPermissions.length} permissões encontradas para o papel administrador`);
    }
    
    // 3. Configurar papel padrão para novos usuários
    console.log('\n3️⃣ Configurando papel padrão para novos usuários...');
    
    // Verificar se existem permissões para o papel 'user'
    const { data: userPermissions, error: userPermissionsError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', 'user');
    
    if (userPermissionsError) {
      console.error(`❌ Erro ao verificar permissões de usuário: ${userPermissionsError.message}`);
    } else if (!userPermissions || userPermissions.length === 0) {
      console.log('⚠️ Nenhuma permissão encontrada para o papel user, inserindo permissões básicas...');
      
      // Lista de módulos do sistema com permissões básicas
      const modules = [
        'usuarios', 'reports', 'produtos', 'estoque', 'pdv', 
        'clientes', 'fornecedores', 'settings', 'dashboard', 
        'system', 'pagamentos'
      ];
      
      // Inserir permissões básicas para cada módulo
      for (const module of modules) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .upsert({
            role: 'user',
            module,
            can_view: true,
            can_create: module !== 'usuarios' && module !== 'settings' && module !== 'system',
            can_edit: module !== 'usuarios' && module !== 'settings' && module !== 'system',
            can_delete: module !== 'usuarios' && module !== 'settings' && module !== 'system'
          }, { onConflict: ['role', 'module'] });
        
        if (insertError) {
          console.error(`❌ Erro ao inserir permissão para ${module}: ${insertError.message}`);
        } else {
          console.log(`✅ Permissões básicas para ${module} configuradas com sucesso`);
        }
      }
    } else {
      console.log(`✅ ${userPermissions.length} permissões encontradas para o papel user`);
    }
    
    console.log('\n🎉 Atualização de papéis de usuário concluída com sucesso!');
  } catch (error) {
    console.error(`❌ Erro durante a execução: ${error.message}`);
    process.exit(1);
  }
}

main();
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function normalizeRole(roleName) {
  if (!roleName) return 'user';
  const lowerCaseRole = String(roleName).toLowerCase().trim();
  if (['admin', 'administrator', 'administrador'].includes(lowerCaseRole)) {
    return 'administrador';
  }
  if (['manager', 'gerente'].includes(lowerCaseRole)) {
    return 'gerente';
  }
  return 'user';
}

async function updateRolesAndPermissions() {
  try {
    console.log('🔄 Iniciando atualização de papéis e permissões...');

    // Definir o papel desejado para o usuário principal
    const targetRole = 'administrador';
    const userToUpdateEmail = 'paulo@pdv.com'; // Altere para o email do usuário que você quer tornar admin

    // 1. Buscar todos os usuários de auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Erro ao buscar usuários de autenticação: ${authError.message}`);
    }
    
    console.log(`📋 Encontrados ${authUsers.users.length} usuários em auth.users`);

    for (const authUser of authUsers.users) {
      let needsAuthMetadataUpdate = false;
      const newAuthMetadata = { ...authUser.user_metadata };
      let currentProfileRole = 'user'; // Default for profile if not found yet

      // Buscar perfil do usuário para obter o role atual do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, active')
        .eq('id', authUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn(`⚠️ Erro ao buscar perfil para ${authUser.email}: ${profileError.message}`);
      } else if (profile) {
        currentProfileRole = normalizeRole(profile.role);
      }

      // Decidir se o usuário deve ser atualizado para o targetRole
      const shouldUpdateToTargetRole = (authUser.email === userToUpdateEmail) || (authUser.email === 'admin@vendas.com');

      if (shouldUpdateToTargetRole && newAuthMetadata.role !== targetRole) {
        newAuthMetadata.role = targetRole;
        needsAuthMetadataUpdate = true;
        console.log(`🔄 Role nos metadados de ${authUser.email} alterado para '${targetRole}'`);
      } else if (!shouldUpdateToTargetRole && newAuthMetadata.role !== currentProfileRole) {
        // Se não é o usuário alvo, garantir que o role nos metadados corresponda ao do perfil
        newAuthMetadata.role = currentProfileRole;
        needsAuthMetadataUpdate = true;
        console.log(`🔄 Role nos metadados de ${authUser.email} ajustado para '${currentProfileRole}' (do perfil)`);
      }

      // Remover campo 'button' se existir
      if (newAuthMetadata.button) {
        delete newAuthMetadata.button;
        needsAuthMetadataUpdate = true;
        console.log('🗑️ Removendo campo "button" dos metadados');
      }

      // Atualizar metadados em auth.users se houver mudanças
      if (needsAuthMetadataUpdate) {
        const { error: updateMetadataError } = await supabase.auth.admin.updateUserById(
          authUser.id,
          { user_metadata: newAuthMetadata }
        );

        if (updateMetadataError) {
          console.error(`❌ Erro ao atualizar metadados para ${authUser.email}: ${updateMetadataError.message}`);
        } else {
          console.log(`✅ Metadados de ${authUser.email} atualizados com sucesso.`);
        }
      } else {
        console.log(`✅ Metadados de ${authUser.email} já estão normalizados/sincronizados.`);
      }

      // 2. Sincronizar/Atualizar com a tabela public.profiles
      let needsProfileUpdate = false;
      const profileUpdateData = {
        id: authUser.id,
        email: authUser.email,
        full_name: newAuthMetadata.full_name || authUser.email.split('@')[0],
        role: newAuthMetadata.role, // Usar o role já atualizado/normalizado dos metadados
        active: true // Garantir que o perfil esteja ativo
      };

      if (!profile) {
        // Se o perfil não existe, criar um novo
        console.log(`➕ Criando novo perfil para ${authUser.email}`);
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert(profileUpdateData);
        if (insertProfileError) {
          console.error(`❌ Erro ao criar perfil para ${authUser.email}: ${insertProfileError.message}`);
        } else {
          console.log(`✅ Perfil criado com sucesso para ${authUser.email}.`);
        }
      } else {
        // Se o perfil existe, verificar se precisa de atualização
        if (profile.full_name !== profileUpdateData.full_name ||
            profile.role !== profileUpdateData.role ||
            !profile.active) { // Check if active needs to be set to true
          needsProfileUpdate = true;
        }

        if (needsProfileUpdate) {
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', authUser.id);
          if (updateProfileError) {
            console.error(`❌ Erro ao atualizar perfil para ${authUser.email}: ${updateProfileError.message}`);
          } else {
            console.log(`✅ Perfil de ${authUser.email} atualizado com sucesso.`);
          }
        } else {
          console.log(`✅ Perfil de ${authUser.email} já está sincronizado.`);
        }
      }
    }

    // 3. Garantir que as permissões para o papel 'administrador' existam e estejam completas
    console.log('\n🛡️ Verificando e configurando permissões para o papel "administrador"...');
    const modules = [
      'dashboard', 'pdv', 'produtos', 'estoque', 'clientes', 'fornecedores', 
      'reports', 'settings', 'usuarios', 'system', 'pagamentos'
    ];
    const permissionsToInsert = modules.map(module => ({
      role: 'administrador',
      module,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true
    }));

    const { error: upsertPermissionsError } = await supabase
      .from('role_permissions')
      .upsert(permissionsToInsert, { onConflict: ['role', 'module'] });

    if (upsertPermissionsError) {
      console.error(`❌ Erro ao configurar permissões de administrador: ${upsertPermissionsError.message}`);
    } else {
      console.log('✅ Permissões de "administrador" configuradas/atualizadas com sucesso para todos os módulos.');
    }

    console.log('\n🎉 Sincronização e configuração de permissões concluída com sucesso!');
    console.log('⚠️ Lembre-se: Para que as mudanças tenham efeito, os usuários afetados devem fazer LOGOUT e LOGIN novamente.');

  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error);
    process.exit(1);
  }
}

updateRolesAndPermissions();
// Script para sincronizar usuários entre auth.users e profiles
// Corrige problemas de conflito no campo role

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sincronizarUsuarios() {
  try {
    console.log('🔄 Iniciando sincronização de usuários...');

    // Corrigir o campo button no banco de dados
    console.log('🔧 Verificando e corrigindo o campo button no banco de dados...');
    const { error: buttonError } = await supabase.rpc('execute_sql', {
      query: `
        DO $$
        BEGIN
          -- Verificar se a coluna button existe na tabela profiles
          IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'button'
          ) THEN
            -- Atualizar valores 'cashier' para 'user'
            UPDATE public.profiles 
            SET button = 'user' 
            WHERE button = 'cashier';
            
            -- Alterar o tipo da coluna para text se for varchar
            ALTER TABLE public.profiles 
            ALTER COLUMN button TYPE text;
            
            RAISE NOTICE 'Campo button corrigido com sucesso';
          ELSE
            RAISE NOTICE 'Campo button não encontrado na tabela profiles';
          END IF;
        END $$;
      `
    });
    
    if (buttonError) {
      console.error(`❌ Erro ao corrigir o campo button: ${buttonError.message}`);
    } else {
      console.log('✅ Verificação e correção do campo button concluída');
    }

    // 1. Buscar todos os usuários do auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Erro ao buscar usuários: ${authError.message}`);
    }
    
    console.log(`📋 Encontrados ${authUsers.users.length} usuários no auth.users`);

    // 2. Para cada usuário, verificar/criar/atualizar o perfil correspondente
    for (const authUser of authUsers.users) {
      console.log(`\n👤 Processando usuário: ${authUser.email}`);
      
      // Verificar se já existe um perfil para este usuário
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error(`❌ Erro ao verificar perfil para ${authUser.email}:`, profileError.message);
        continue;
      }
      
      // Determinar o papel (role) correto
      // Prioridade: 1. Metadados do usuário, 2. Perfil existente, 3. Padrão 'user'
      let role = 'user';
      
      if (authUser.user_metadata && authUser.user_metadata.role) {
        role = normalizarRole(authUser.user_metadata.role);
        console.log(`ℹ️ Role encontrado nos metadados: ${role}`);
      } else if (existingProfile && existingProfile.role) {
        role = normalizarRole(existingProfile.role);
        console.log(`ℹ️ Role encontrado no perfil existente: ${role}`);
      }
      
      // Preparar dados do perfil
      const profileData = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || existingProfile?.full_name || authUser.email.split('@')[0],
        role: role,
        active: true,
        updated_at: new Date().toISOString()
      };
      
      // Criar ou atualizar o perfil
      if (!existingProfile) {
        console.log(`➕ Criando novo perfil para ${authUser.email} com role '${role}'`);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);
        
        if (insertError) {
          console.error(`❌ Erro ao criar perfil para ${authUser.email}:`, insertError.message);
          continue;
        }
        
        console.log(`✅ Perfil criado com sucesso para ${authUser.email}`);
      } else {
        console.log(`🔄 Atualizando perfil para ${authUser.email} com role '${role}'`);
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', authUser.id);
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar perfil para ${authUser.email}:`, updateError.message);
          continue;
        }
        
        console.log(`✅ Perfil atualizado com sucesso para ${authUser.email}`);
      }
      
      // Atualizar metadados do usuário para garantir consistência
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { user_metadata: { ...authUser.user_metadata, role } }
      );
      
      if (metadataError) {
        console.error(`❌ Erro ao atualizar metadados para ${authUser.email}:`, metadataError.message);
      } else {
        console.log(`✅ Metadados atualizados com sucesso para ${authUser.email}`);
      }
    }
    
    console.log('\n🎉 Sincronização de usuários concluída com sucesso!');
    
    // 3. Verificar permissões para cada role
    await verificarPermissoes();
    
  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error);
    process.exit(1);
  }
}

// Função para normalizar o valor do role
function normalizarRole(role) {
  // Converter para minúsculas e remover espaços
  const normalizado = String(role).toLowerCase().trim();
  
  // Mapear variações para os valores padrão
  if (normalizado === 'admin' || normalizado === 'administrator' || normalizado === 'administrador') {
    return 'administrador';
  } else if (normalizado === 'manager' || normalizado === 'gerente') {
    return 'gerente';
  } else if (normalizado === 'cashier' || normalizado === 'caixa' || normalizado === 'button') {
    return 'user'; // Convertendo cashier/button para user
  } else {
    return 'user';
  }
}

// Função para verificar e garantir que as permissões existam para cada role
async function verificarPermissoes() {
  console.log('\n🔍 Verificando permissões...');
  
  const roles = ['administrador', 'gerente', 'user'];
  const modules = [
    'usuarios', 'reports', 'produtos', 'estoque', 'pdv', 
    'clientes', 'fornecedores', 'settings', 'dashboard', 
    'system', 'pagamentos'
  ];
  
  for (const role of roles) {
    console.log(`\n👑 Verificando permissões para o papel: ${role}`);
    
    // Buscar permissões existentes
    const { data: existingPermissions, error: permError } = await supabase
      .from('role_permissions')
      .select('module')
      .eq('role', role);
    
    if (permError) {
      console.error(`❌ Erro ao verificar permissões para ${role}:`, permError.message);
      continue;
    }
    
    const existingModules = existingPermissions.map(p => p.module);
    console.log(`ℹ️ Módulos existentes: ${existingModules.join(', ') || 'nenhum'}`);
    
    // Verificar módulos faltantes
    const missingModules = modules.filter(m => !existingModules.includes(m));
    
    if (missingModules.length > 0) {
      console.log(`🔄 Adicionando ${missingModules.length} módulos faltantes para ${role}: ${missingModules.join(', ')}`);
      
      // Preparar permissões baseadas no papel
      const permissionsToInsert = missingModules.map(module => {
        let canView = true;
        let canCreate = role !== 'user';
        let canEdit = role !== 'user';
        let canDelete = role === 'administrador' || (role === 'gerente' && module !== 'usuarios' && module !== 'settings' && module !== 'system');
        
        // Ajustes específicos
        if (role === 'user' && module === 'pdv') {
          canCreate = true;
        }
        
        return {
          role,
          module,
          can_view: canView,
          can_create: canCreate,
          can_edit: canEdit,
          can_delete: canDelete
        };
      });
      
      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);
        
        if (insertError) {
          console.error(`❌ Erro ao inserir permissões para ${role}:`, insertError.message);
        } else {
          console.log(`✅ Permissões adicionadas com sucesso para ${role}`);
        }
      }
    } else {
      console.log(`✅ Todas as permissões já existem para ${role}`);
    }
  }
  
  console.log('\n🎉 Verificação de permissões concluída!');
}

// Executar o script
sincronizarUsuarios();
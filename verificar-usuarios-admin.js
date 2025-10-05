const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarUsuariosEAdmin() {
  console.log('🔍 VERIFICAÇÃO COMPLETA DE USUÁRIOS E ADMINISTRADORES\n');

  try {
    // 1. Verificar tabela profiles
    console.log('1️⃣ Verificando tabela profiles...');
    await verificarTabelaProfiles();

    // 2. Verificar usuários autenticados
    console.log('\n2️⃣ Verificando usuários autenticados...');
    await verificarUsuariosAuth();

    // 3. Verificar perfis de usuários
    console.log('\n3️⃣ Verificando perfis de usuários...');
    await verificarPerfisUsuarios();

    // 4. Verificar usuários administradores
    console.log('\n4️⃣ Verificando usuários administradores...');
    await verificarAdministradores();

    // 5. Verificar módulos/permissões (se existir tabela)
    console.log('\n5️⃣ Verificando módulos e permissões...');
    await verificarModulosPermissoes();

    // 6. Testar funcionalidades de admin
    console.log('\n6️⃣ Testando funcionalidades administrativas...');
    await testarFuncionalidadesAdmin();

    // 7. Verificar RLS e políticas
    console.log('\n7️⃣ Verificando RLS e políticas...');
    await verificarRLSPoliticas();

  } catch (error) {
    console.error('❌ Erro geral na verificação:', error);
  }
}

async function verificarTabelaProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao acessar tabela profiles:', error);
      return false;
    }

    console.log('✅ Tabela profiles acessível');
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar tabela profiles:', error);
    return false;
  }
}

async function verificarUsuariosAuth() {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Erro ao listar usuários:', error);
      return;
    }

    console.log(`✅ Encontrados ${users.length} usuários autenticados:`);
    
    users.forEach((user, index) => {
      console.log(`\n👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
      console.log(`   Última atualização: ${new Date(user.updated_at).toLocaleString('pt-BR')}`);
      console.log(`   Email confirmado: ${user.email_confirmed_at ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Telefone confirmado: ${user.phone_confirmed_at ? '✅ Sim' : '❌ Não'}`);
      
      if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
        console.log('   📋 Metadados do usuário:');
        Object.entries(user.user_metadata).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }

      if (user.app_metadata && Object.keys(user.app_metadata).length > 0) {
        console.log('   🔧 Metadados da aplicação:');
        Object.entries(user.app_metadata).forEach(([key, value]) => {
          console.log(`      ${key}: ${JSON.stringify(value)}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar usuários auth:', error);
  }
}

async function verificarPerfisUsuarios() {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar perfis:', error);
      return;
    }

    console.log(`✅ Encontrados ${profiles.length} perfis:`);
    
    profiles.forEach((profile, index) => {
      console.log(`\n👤 Perfil ${index + 1}:`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Nome: ${profile.full_name || 'Não informado'}`);
      console.log(`   Email: ${profile.email || 'Não informado'}`);
      console.log(`   Role: ${profile.role || 'Não definido'}`);
      console.log(`   Ativo: ${profile.active ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Criado em: ${new Date(profile.created_at).toLocaleString('pt-BR')}`);
      console.log(`   Atualizado em: ${new Date(profile.updated_at).toLocaleString('pt-BR')}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar perfis:', error);
  }
}

async function verificarAdministradores() {
  try {
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'administrador')
      .eq('active', true);

    if (error) {
      console.error('❌ Erro ao buscar administradores:', error);
      return;
    }

    console.log(`✅ Encontrados ${admins.length} administradores ativos:`);
    
    if (admins.length === 0) {
      console.log('⚠️ ATENÇÃO: Nenhum administrador ativo encontrado!');
      return;
    }

    admins.forEach((admin, index) => {
      console.log(`\n👑 Administrador ${index + 1}:`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Nome: ${admin.full_name || 'Não informado'}`);
      console.log(`   Email: ${admin.email || 'Não informado'}`);
      console.log(`   Status: ${admin.active ? '✅ Ativo' : '❌ Inativo'}`);
      console.log(`   Criado em: ${new Date(admin.created_at).toLocaleString('pt-BR')}`);
    });

    // Verificar se os administradores têm usuários auth correspondentes
    console.log('\n🔍 Verificando correspondência com usuários auth...');
    
    for (const admin of admins) {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(admin.id);
        
        if (authError) {
          console.log(`❌ Admin ${admin.full_name} (${admin.id}) não tem usuário auth correspondente`);
        } else {
          console.log(`✅ Admin ${admin.full_name} tem usuário auth válido`);
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar usuário auth para ${admin.full_name}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar administradores:', error);
  }
}

async function verificarModulosPermissoes() {
  try {
    // Verificar se existe tabela de módulos ou permissões
    const tabelasParaVerificar = ['user_modules', 'permissions', 'user_permissions', 'modules'];
    
    for (const tabela of tabelasParaVerificar) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('count')
          .limit(1);

        if (!error) {
          console.log(`✅ Tabela ${tabela} encontrada`);
          
          // Buscar dados da tabela
          const { data: dados, error: dadosError } = await supabase
            .from(tabela)
            .select('*')
            .limit(10);

          if (!dadosError && dados.length > 0) {
            console.log(`   📊 Primeiros registros de ${tabela}:`);
            dados.forEach((registro, index) => {
              console.log(`   ${index + 1}. ${JSON.stringify(registro, null, 2)}`);
            });
          } else {
            console.log(`   ℹ️ Tabela ${tabela} está vazia`);
          }
        }
      } catch (error) {
        // Tabela não existe, continuar
      }
    }

    // Se não encontrou nenhuma tabela de módulos
    console.log('ℹ️ Nenhuma tabela específica de módulos/permissões encontrada');
    console.log('ℹ️ O sistema pode estar usando apenas roles básicos (user, gerente, administrador)');

  } catch (error) {
    console.error('❌ Erro ao verificar módulos:', error);
  }
}

async function testarFuncionalidadesAdmin() {
  try {
    // Testar se administradores podem acessar todas as tabelas principais
    const tabelasParaTestar = ['profiles', 'customers', 'products', 'sales'];
    
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'administrador')
      .eq('active', true)
      .limit(1);

    if (!admins || admins.length === 0) {
      console.log('⚠️ Nenhum administrador para testar');
      return;
    }

    const admin = admins[0];
    console.log(`🧪 Testando acesso do admin: ${admin.full_name}`);

    for (const tabela of tabelasParaTestar) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('count')
          .limit(1);

        if (error) {
          console.log(`❌ Admin não pode acessar tabela ${tabela}: ${error.message}`);
        } else {
          console.log(`✅ Admin pode acessar tabela ${tabela}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao testar acesso à tabela ${tabela}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao testar funcionalidades admin:', error);
  }
}

async function verificarRLSPoliticas() {
  try {
    // Verificar RLS nas tabelas principais
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            schemaname, 
            tablename, 
            rowsecurity as rls_enabled,
            hasindexes as has_indexes
          FROM pg_tables 
          WHERE schemaname = 'public' 
            AND tablename IN ('profiles', 'customers', 'products', 'sales', 'sale_items')
          ORDER BY tablename;
        `
      });

    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError);
    } else {
      console.log('✅ Status RLS das tabelas:');
      if (rlsStatus && rlsStatus.length > 0) {
        rlsStatus.forEach(tabela => {
          console.log(`   ${tabela.tablename}: RLS ${tabela.rls_enabled ? '✅ Ativo' : '❌ Inativo'}`);
        });
      }
    }

    // Verificar políticas específicas para administradores
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            cmd,
            qual
          FROM pg_policies 
          WHERE schemaname = 'public' 
            AND (
              policyname ILIKE '%admin%' OR 
              policyname ILIKE '%administrador%' OR
              qual ILIKE '%administrador%'
            )
          ORDER BY tablename, policyname;
        `
      });

    if (policiesError) {
      console.error('❌ Erro ao verificar políticas admin:', policiesError);
    } else {
      console.log('\n✅ Políticas específicas para administradores:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
        });
      } else {
        console.log('   ℹ️ Nenhuma política específica para administradores encontrada');
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar RLS e políticas:', error);
  }
}

// Executar verificação
verificarUsuariosEAdmin()
  .then(() => {
    console.log('\n🎉 VERIFICAÇÃO COMPLETA CONCLUÍDA!');
    console.log('\n📋 RESUMO E RECOMENDAÇÕES:');
    console.log('1. Verifique se todos os administradores estão ativos e funcionais');
    console.log('2. Confirme se as políticas RLS estão permitindo acesso adequado');
    console.log('3. Teste o login com usuários administradores');
    console.log('4. Verifique se o dashboard carrega corretamente após as correções');
  })
  .catch(error => {
    console.error('❌ Erro fatal na verificação:', error);
    process.exit(1);
  });
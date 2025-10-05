const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente do Supabase não encontradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUserModule() {
    console.log('🔍 Verificando estrutura do módulo de usuários...\n');

    try {
        // 1. Verificar tabelas criadas
        console.log('📋 Verificando tabelas...');
        const tables = ['profiles', 'role_permissions', 'user_settings', 'user_activity_logs'];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`❌ Tabela ${table}: ${error.message}`);
            } else {
                console.log(`✅ Tabela ${table}: OK`);
            }
        }

        // 2. Verificar permissões por role
        console.log('\n🔐 Verificando permissões por role...');
        const { data: permissions, error: permError } = await supabase
            .from('role_permissions')
            .select('role, module, can_view, can_create, can_edit, can_delete');

        if (permError) {
            console.log(`❌ Erro ao buscar permissões: ${permError.message}`);
        } else {
            const roleStats = {};
            permissions.forEach(perm => {
                if (!roleStats[perm.role]) {
                    roleStats[perm.role] = { total: 0, modules: [] };
                }
                roleStats[perm.role].total++;
                roleStats[perm.role].modules.push(perm.module);
            });

            Object.entries(roleStats).forEach(([role, stats]) => {
                console.log(`✅ Role '${role}': ${stats.total} permissões`);
                console.log(`   Módulos: ${stats.modules.join(', ')}`);
            });
        }

        // 3. Verificar usuários e roles
        console.log('\n👥 Verificando usuários...');
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('role, active, status');

        if (profileError) {
            console.log(`❌ Erro ao buscar perfis: ${profileError.message}`);
        } else {
            const userStats = {};
            profiles.forEach(profile => {
                const key = `${profile.role}_${profile.active ? 'ativo' : 'inativo'}`;
                userStats[key] = (userStats[key] || 0) + 1;
            });

            console.log('Distribuição de usuários:');
            Object.entries(userStats).forEach(([key, count]) => {
                console.log(`✅ ${key}: ${count} usuários`);
            });
        }

        // 4. Verificar usuário administrador padrão
        console.log('\n👑 Verificando usuário administrador...');
        const { data: admin, error: adminError } = await supabase
            .from('profiles')
            .select('email, role, active')
            .eq('email', 'admin@vendas.com')
            .single();

        if (adminError) {
            console.log(`❌ Usuário administrador não encontrado: ${adminError.message}`);
        } else {
            console.log(`✅ Administrador encontrado: ${admin.email} (${admin.role}, ${admin.active ? 'ativo' : 'inativo'})`);
        }

        // 5. Verificar políticas RLS
        console.log('\n🛡️ Verificando políticas RLS...');
        const { data: policies, error: policyError } = await supabase.rpc('get_policies_info');
        
        if (policyError) {
            console.log('ℹ️ Não foi possível verificar políticas RLS automaticamente');
        } else {
            console.log('✅ Políticas RLS verificadas');
        }

        console.log('\n🎉 Verificação do módulo de usuários concluída!');
        console.log('\n📝 Próximos passos recomendados:');
        console.log('1. Testar login com o usuário administrador (admin@vendas.com / admin123)');
        console.log('2. Atualizar o frontend para usar as novas permissões');
        console.log('3. Criar interface de gerenciamento de usuários');
        console.log('4. Testar criação de novos usuários');

    } catch (error) {
        console.error('❌ Erro durante a verificação:', error.message);
    }
}

verifyUserModule();
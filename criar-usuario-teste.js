require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarUsuarioTeste() {
  console.log('👤 Criando usuário de teste...\n');
  
  try {
    const userId = '00000000-0000-0000-0000-000000000001';
    
    // Verificar se já existe
    const { data: existente } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (existente) {
      console.log('✅ Usuário de teste já existe:', existente.name || existente.email);
      return;
    }
    
    // Criar usuário de teste
    const { data: usuario, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: 'Usuário Teste',
        email: 'teste@exemplo.com',
        role: 'admin'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar usuário:', error.message);
      return;
    }
    
    console.log('✅ Usuário criado com sucesso!');
    console.log(`📝 Nome: ${usuario.name}`);
    console.log(`📧 Email: ${usuario.email}`);
    console.log(`🔑 ID: ${usuario.id}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

criarUsuarioTeste();
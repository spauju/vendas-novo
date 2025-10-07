require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarProdutos() {
  console.log('🔍 Verificando produtos existentes...');
  
  try {
    // Primeiro, verificar a estrutura da tabela
    const { data: columns, error: structError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
        ORDER BY ordinal_position;
      `
    });

    if (structError) {
      console.error('❌ Erro ao verificar estrutura:', structError);
      return;
    }

    console.log('✅ Estrutura da tabela products:');
    const cols = columns || [];
    const columnNames = cols.map(col => col.column_name);
    console.log('   Colunas:', columnNames.join(', '));

    // Buscar produtos usando apenas colunas que existem
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      return;
    }

    console.log(`\n✅ Encontrados ${products.length} produtos:`);
    
    if (products.length === 0) {
      console.log('⚠️ Nenhum produto encontrado no banco');
    } else {
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name || 'Nome não definido'}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Dados completos:`, product);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verificarProdutos();
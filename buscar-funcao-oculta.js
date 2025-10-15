require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function buscarFuncaoOculta() {
  console.log('🔍 BUSCANDO FUNÇÃO OCULTA QUE DUPLICA ESTOQUE');
  console.log('='.repeat(70));
  
  try {
    // Buscar TODAS as funções no schema public
    console.log('\n1️⃣ TODAS AS FUNÇÕES NO SCHEMA PUBLIC:');
    const { data: allFunctions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        ORDER BY p.proname;
      `
    });
    
    if (funcError) {
      console.error('❌ Erro:', funcError);
    } else if (allFunctions && allFunctions.length > 0) {
      console.log(`\n📊 Total de funções: ${allFunctions.length}\n`);
      
      allFunctions.forEach(f => {
        console.log(`🔧 ${f.function_name}`);
        console.log('─'.repeat(70));
        console.log(f.function_definition);
        console.log('\n');
      });
    } else {
      console.log('✅ Nenhuma função encontrada');
    }
    
    // Buscar regras (RULES) que podem estar causando duplicação
    console.log('\n2️⃣ REGRAS (RULES) NAS TABELAS:');
    const { data: rules, error: rulesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rulename,
          definition
        FROM pg_rules
        WHERE schemaname = 'public'
        AND tablename IN ('sale_items', 'products', 'stock_movements', 'sales')
        ORDER BY tablename, rulename;
      `
    });
    
    if (rulesError) {
      console.error('❌ Erro:', rulesError);
    } else if (rules && rules.length > 0) {
      console.log(`\n📊 Total de regras: ${rules.length}\n`);
      rules.forEach(r => {
        console.log(`📋 ${r.tablename}.${r.rulename}`);
        console.log(`   ${r.definition}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhuma regra encontrada');
    }
    
    // Verificar se há subscriptions do Realtime
    console.log('\n3️⃣ PUBLICAÇÕES DO REALTIME:');
    const { data: publications, error: pubError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          pubname,
          puballtables,
          pubinsert,
          pubupdate,
          pubdelete,
          pubtruncate
        FROM pg_publication
        ORDER BY pubname;
      `
    });
    
    if (pubError) {
      console.error('❌ Erro:', pubError);
    } else if (publications && publications.length > 0) {
      console.log(`\n📊 Total de publicações: ${publications.length}\n`);
      publications.forEach(p => {
        console.log(`📡 ${p.pubname}`);
        console.log(`   All tables: ${p.puballtables}`);
        console.log(`   Insert: ${p.pubinsert}, Update: ${p.pubupdate}, Delete: ${p.pubdelete}`);
      });
      
      // Para cada publicação, ver quais tabelas
      for (const pub of publications) {
        const { data: pubTables, error: tablesError } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT 
              schemaname,
              tablename
            FROM pg_publication_tables
            WHERE pubname = '${pub.pubname}'
            ORDER BY tablename;
          `
        });
        
        if (!tablesError && pubTables && pubTables.length > 0) {
          console.log(`   Tabelas:`);
          pubTables.forEach(t => {
            console.log(`      - ${t.schemaname}.${t.tablename}`);
          });
        }
        console.log('');
      }
    } else {
      console.log('✅ Nenhuma publicação encontrada');
    }
    
    // Verificar constraints que podem ter ações
    console.log('\n4️⃣ CONSTRAINTS COM AÇÕES:');
    const { data: constraints, error: constError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          conname as constraint_name,
          conrelid::regclass as table_name,
          confrelid::regclass as referenced_table,
          confupdtype as on_update,
          confdeltype as on_delete,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
        AND contype = 'f'
        AND (conrelid::regclass::text LIKE '%sale_items%' 
             OR conrelid::regclass::text LIKE '%products%'
             OR confrelid::regclass::text LIKE '%products%')
        ORDER BY conrelid::regclass;
      `
    });
    
    if (constError) {
      console.error('❌ Erro:', constError);
    } else if (constraints && constraints.length > 0) {
      console.log(`\n📊 Total de constraints: ${constraints.length}\n`);
      constraints.forEach(c => {
        console.log(`🔗 ${c.constraint_name}`);
        console.log(`   Tabela: ${c.table_name}`);
        console.log(`   Referencia: ${c.referenced_table}`);
        console.log(`   On Update: ${c.on_update}, On Delete: ${c.on_delete}`);
        console.log(`   Definição: ${c.definition}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhum constraint com ações encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

buscarFuncaoOculta();

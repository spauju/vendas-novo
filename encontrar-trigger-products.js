require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function encontrarTriggerProducts() {
  console.log('🔍 PROCURANDO TRIGGER OCULTO NA TABELA PRODUCTS');
  console.log('='.repeat(70));
  
  try {
    // Buscar triggers na tabela products usando pg_catalog
    console.log('\n1️⃣ TRIGGERS NA TABELA PRODUCTS (pg_catalog):');
    const { data: triggers, error: trigError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          t.tgenabled as enabled,
          t.tgisinternal as is_internal,
          p.proname as function_name,
          pg_get_triggerdef(t.oid) as trigger_definition,
          pg_get_functiondef(p.oid) as function_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'public'
        AND c.relname = 'products'
        ORDER BY t.tgname;
      `
    });
    
    if (trigError) {
      console.error('❌ Erro:', trigError);
    } else if (triggers && triggers.length > 0) {
      console.log(`\n📊 Encontrados ${triggers.length} trigger(s):\n`);
      
      triggers.forEach(t => {
        const status = t.enabled === 'O' ? 'ATIVO' : 'DESABILITADO';
        const interno = t.is_internal ? 'SIM' : 'NÃO';
        
        console.log(`📌 ${t.trigger_name}`);
        console.log(`   Status: ${status}`);
        console.log(`   Interno: ${interno}`);
        console.log(`   Função: ${t.function_name || 'N/A'}`);
        console.log(`   Definição do Trigger:`);
        console.log(`   ${t.trigger_definition}`);
        
        if (t.function_definition) {
          console.log(`\n   Definição da Função:`);
          console.log('   ' + '─'.repeat(66));
          console.log(t.function_definition.split('\n').map(line => '   ' + line).join('\n'));
        }
        console.log('\n');
      });
    } else {
      console.log('✅ Nenhum trigger encontrado na tabela products');
    }
    
    // Buscar na tabela stock_movements também
    console.log('\n2️⃣ TRIGGERS NA TABELA STOCK_MOVEMENTS:');
    const { data: triggers2, error: trig2Error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          t.tgenabled as enabled,
          p.proname as function_name,
          pg_get_triggerdef(t.oid) as trigger_definition,
          pg_get_functiondef(p.oid) as function_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'public'
        AND c.relname = 'stock_movements'
        ORDER BY t.tgname;
      `
    });
    
    if (!trig2Error && triggers2 && triggers2.length > 0) {
      console.log(`\n📊 Encontrados ${triggers2.length} trigger(s):\n`);
      
      triggers2.forEach(t => {
        console.log(`📌 ${t.trigger_name}`);
        console.log(`   Função: ${t.function_name}`);
        console.log(`   Definição: ${t.trigger_definition}`);
        if (t.function_definition) {
          console.log(`\n   Código da Função:`);
          console.log('   ' + '─'.repeat(66));
          console.log(t.function_definition.split('\n').map(line => '   ' + line).join('\n'));
        }
        console.log('\n');
      });
    } else {
      console.log('✅ Nenhum trigger encontrado na tabela stock_movements');
    }
    
    // Verificar se há extensões instaladas
    console.log('\n3️⃣ EXTENSÕES POSTGRESQL INSTALADAS:');
    const { data: extensions, error: extError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          extname as extension_name,
          extversion as version
        FROM pg_extension
        ORDER BY extname;
      `
    });
    
    if (!extError && extensions) {
      console.log('\n📦 Extensões:');
      extensions.forEach(ext => {
        console.log(`   - ${ext.extension_name} (v${ext.version})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

encontrarTriggerProducts();

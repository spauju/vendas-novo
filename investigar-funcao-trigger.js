require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigarFuncaoTrigger() {
  console.log('🔍 INVESTIGANDO CÓDIGO DA FUNÇÃO DO TRIGGER');
  
  try {
    // 1. Buscar o código da função reduce_stock_on_sale
    console.log('\n📋 1. Buscando código da função reduce_stock_on_sale...');
    
    const { data: funcCode, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          prosrc as function_body,
          proargnames as arg_names
        FROM pg_proc 
        WHERE proname = 'reduce_stock_on_sale';
      `
    });

    if (funcError) {
      console.log('❌ Erro ao buscar função:', funcError.message);
    } else if (funcCode && funcCode.length > 0) {
      console.log('✅ Função encontrada:');
      console.log('📝 Código da função:');
      console.log('=' .repeat(80));
      console.log(funcCode[0].function_body);
      console.log('=' .repeat(80));
    } else {
      console.log('❌ Função reduce_stock_on_sale não encontrada');
    }

    // 2. Verificar todas as funções relacionadas a stock/sale
    console.log('\n🔍 2. Verificando todas as funções relacionadas...');
    
    const { data: allFuncs, error: allFuncError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          prosrc as function_body
        FROM pg_proc 
        WHERE proname LIKE '%stock%' 
           OR proname LIKE '%sale%'
        ORDER BY proname;
      `
    });

    if (allFuncError) {
      console.log('❌ Erro ao buscar funções:', allFuncError.message);
    } else if (allFuncs && allFuncs.length > 0) {
      console.log(`✅ ${allFuncs.length} funções encontradas:`);
      allFuncs.forEach(func => {
        console.log(`\n--- ${func.function_name} ---`);
        console.log(func.function_body);
        console.log('-'.repeat(50));
      });
    } else {
      console.log('❌ Nenhuma função encontrada');
    }

    // 3. Verificar se há múltiplas versões da mesma função
    console.log('\n🔍 3. Verificando versões múltiplas...');
    
    const { data: versions, error: versionError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname as function_name,
          oid,
          proargnames,
          proargtypes
        FROM pg_proc 
        WHERE proname LIKE '%reduce_stock%'
           OR proname LIKE '%stock_on_sale%'
        ORDER BY proname, oid;
      `
    });

    if (versionError) {
      console.log('❌ Erro ao verificar versões:', versionError.message);
    } else if (versions && versions.length > 0) {
      console.log(`✅ ${versions.length} versões encontradas:`);
      versions.forEach(ver => {
        console.log(`   - ${ver.function_name} (OID: ${ver.oid})`);
      });
      
      // Verificar se há duplicatas
      const funcNames = versions.map(v => v.function_name);
      const duplicates = funcNames.filter((name, index) => funcNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        console.log('🚨 FUNÇÕES DUPLICADAS ENCONTRADAS:');
        duplicates.forEach(name => console.log(`   - ${name}`));
      }
    } else {
      console.log('❌ Nenhuma versão encontrada');
    }

    // 4. Testar manualmente a redução de estoque
    console.log('\n🧪 4. Teste manual de redução...');
    
    const { data: testProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('active', true)
      .gt('stock_quantity', 10)
      .limit(1)
      .single();

    if (productError || !testProduct) {
      console.log('❌ Produto não encontrado');
      return;
    }

    console.log(`📦 Produto: ${testProduct.name} (Estoque inicial: ${testProduct.stock_quantity})`);

    // Reduzir manualmente 1 unidade
    console.log('⏱️ Reduzindo 1 unidade manualmente...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('products')
      .update({ 
        stock_quantity: testProduct.stock_quantity - 1 
      })
      .eq('id', testProduct.id)
      .select();

    if (updateError) {
      console.log('❌ Erro na atualização manual:', updateError.message);
    } else {
      console.log('✅ Atualização manual realizada');
    }

    // Verificar resultado
    const { data: afterManual, error: afterError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();

    if (!afterError && afterManual) {
      console.log(`📊 Após redução manual: ${afterManual.stock_quantity}`);
      console.log(`📈 Diferença: ${testProduct.stock_quantity - afterManual.stock_quantity}`);
    }

    // Restaurar estoque
    await supabase
      .from('products')
      .update({ stock_quantity: testProduct.stock_quantity })
      .eq('id', testProduct.id);

    console.log('✅ Estoque restaurado');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

investigarFuncaoTrigger();
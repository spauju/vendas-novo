require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarTriggersCompleto() {
  console.log('🔍 VERIFICAÇÃO COMPLETA DE TRIGGERS E FUNÇÕES');
  console.log('='.repeat(70));
  
  try {
    // 1. Verificar TODOS os triggers (usando pg_trigger diretamente)
    console.log('\n1️⃣ TODOS OS TRIGGERS NO BANCO:');
    const { data: triggers, error: trigError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          n.nspname as schema_name,
          c.relname as table_name,
          t.tgname as trigger_name,
          t.tgenabled as enabled,
          p.proname as function_name,
          pg_get_triggerdef(t.oid) as definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE NOT t.tgisinternal
        ORDER BY n.nspname, c.relname, t.tgname;
      `
    });
    
    if (!trigError && triggers && triggers.length > 0) {
      console.log(`\n📊 Encontrados ${triggers.length} trigger(s):\n`);
      triggers.forEach(t => {
        const status = t.enabled === 'O' ? '🟢 ATIVO' : '🔴 DESABILITADO';
        console.log(`${status} ${t.schema_name}.${t.table_name}.${t.trigger_name}`);
        console.log(`   Função: ${t.function_name}`);
        console.log(`   Definição: ${t.definition}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhum trigger encontrado');
    }
    
    // 2. Verificar TODAS as funções
    console.log('\n2️⃣ TODAS AS FUNÇÕES NO SCHEMA PUBLIC:');
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        ORDER BY p.proname;
      `
    });
    
    if (!funcError && functions && functions.length > 0) {
      console.log(`\n📊 Encontradas ${functions.length} função(ões):\n`);
      functions.forEach(f => {
        console.log(`🔧 ${f.function_name}`);
        console.log('─'.repeat(70));
        // Mostrar apenas primeiras linhas
        const lines = f.definition.split('\n').slice(0, 10);
        lines.forEach(line => console.log(line));
        if (f.definition.split('\n').length > 10) {
          console.log('   ... (continua)');
        }
        console.log('\n');
      });
    } else {
      console.log('✅ Nenhuma função encontrada');
    }
    
    // 3. Teste REAL - inserir em sale_items e ver o que acontece
    console.log('\n3️⃣ TESTE REAL DE INSERÇÃO:');
    
    const { data: produto, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 30)
      .limit(1)
      .single();
    
    if (prodError || !produto) {
      console.log('❌ Produto não encontrado');
      return;
    }
    
    const estoqueInicial = produto.stock_quantity;
    console.log(`\n📦 Produto: ${produto.name}`);
    console.log(`📊 Estoque inicial: ${estoqueInicial}`);
    
    // Criar venda
    const { data: venda, error: vendaError } = await supabase
      .from('sales')
      .insert({
        total_amount: 30,
        payment_method: 'cash',
        status: 'completed',
        payment_status: 'paid'
      })
      .select()
      .single();
    
    if (vendaError) {
      console.log('❌ Erro ao criar venda:', vendaError);
      return;
    }
    
    console.log(`✅ Venda criada: ${venda.id}`);
    
    // Inserir em sale_items
    const quantidadeTeste = 3;
    console.log(`\n📝 Inserindo ${quantidadeTeste} unidades em sale_items...`);
    
    const { data: item, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: venda.id,
        product_id: produto.id,
        quantity: quantidadeTeste,
        unit_price: 10,
        total_price: 30  // Incluindo total_price
      })
      .select()
      .single();
    
    if (itemError) {
      console.log('❌ Erro ao inserir item:', itemError);
      return;
    }
    
    console.log(`✅ Item inserido: ${item.id}`);
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar estoque
    const { data: produtoFinal, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (!finalError && produtoFinal) {
      const reducao = estoqueInicial - produtoFinal.stock_quantity;
      
      console.log(`\n📊 RESULTADO:`);
      console.log(`   Estoque inicial: ${estoqueInicial}`);
      console.log(`   Estoque final: ${produtoFinal.stock_quantity}`);
      console.log(`   Redução: ${reducao} unidades`);
      console.log(`   Esperado: ${quantidadeTeste} unidades`);
      console.log(`   Multiplicador: ${reducao / quantidadeTeste}x`);
      
      if (reducao === quantidadeTeste) {
        console.log(`\n   ✅ CORRETO! Sem duplicação!`);
      } else if (reducao === quantidadeTeste * 2) {
        console.log(`\n   ❌ DUPLICAÇÃO 2X AINDA PRESENTE!`);
      } else {
        console.log(`\n   ⚠️ Comportamento inesperado`);
      }
    }
    
    // Limpar
    await supabase.from('sale_items').delete().eq('id', item.id);
    await supabase.from('sales').delete().eq('id', venda.id);
    await supabase.from('products').update({ stock_quantity: estoqueInicial }).eq('id', produto.id);
    
    console.log('\n✅ Teste concluído e dados restaurados');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

verificarTriggersCompleto();

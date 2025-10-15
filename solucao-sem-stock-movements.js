require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarSemStockMovements() {
  console.log('🔍 TESTE: REDUZIR ESTOQUE SEM USAR STOCK_MOVEMENTS');
  console.log('='.repeat(70));
  
  try {
    // Criar função que NÃO insere em stock_movements
    console.log('\n1️⃣ Criando função SEM stock_movements...');
    
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION reduce_stock_simple(
          p_product_id UUID,
          p_quantity INTEGER
        )
        RETURNS JSON AS $$
        DECLARE
          current_stock INTEGER;
          new_stock INTEGER;
        BEGIN
          -- Obter estoque atual com lock
          SELECT stock_quantity INTO current_stock
          FROM products 
          WHERE id = p_product_id
          FOR UPDATE;
          
          -- Verificar estoque
          IF current_stock < p_quantity THEN
            RETURN json_build_object(
              'success', false,
              'message', 'Estoque insuficiente'
            );
          END IF;
          
          -- Calcular novo estoque
          new_stock := current_stock - p_quantity;
          
          -- Atualizar estoque (SEM inserir em stock_movements)
          UPDATE products 
          SET stock_quantity = new_stock
          WHERE id = p_product_id;
          
          RETURN json_build_object(
            'success', true,
            'previous_stock', current_stock,
            'new_stock', new_stock
          );
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (funcError) {
      console.error('❌ Erro:', funcError);
      return;
    }
    console.log('✅ Função criada');
    
    // Testar
    const { data: produto, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .gt('stock_quantity', 20)
      .limit(1)
      .single();
    
    if (prodError || !produto) {
      console.log('❌ Produto não encontrado');
      return;
    }
    
    const estoqueInicial = produto.stock_quantity;
    console.log(`\n2️⃣ Testando com produto: ${produto.name}`);
    console.log(`   Estoque inicial: ${estoqueInicial}`);
    
    const quantidadeTeste = 7;
    console.log(`\n3️⃣ Reduzindo ${quantidadeTeste} unidades SEM stock_movements...`);
    
    const { data: result, error: resultError } = await supabase.rpc('reduce_stock_simple', {
      p_product_id: produto.id,
      p_quantity: quantidadeTeste
    });
    
    if (resultError) {
      console.error('❌ Erro:', resultError);
      return;
    }
    
    console.log(`📊 Resultado da função:`, JSON.stringify(result, null, 2));
    
    // Aguardar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar estoque real
    const { data: produtoFinal, error: finalError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', produto.id)
      .single();
    
    if (!finalError && produtoFinal) {
      const reducaoReal = estoqueInicial - produtoFinal.stock_quantity;
      const multiplicador = reducaoReal / quantidadeTeste;
      
      console.log(`\n4️⃣ RESULTADO:`);
      console.log(`   Estoque inicial: ${estoqueInicial}`);
      console.log(`   Estoque final: ${produtoFinal.stock_quantity}`);
      console.log(`   Redução esperada: ${quantidadeTeste}`);
      console.log(`   Redução real: ${reducaoReal}`);
      console.log(`   Multiplicador: ${multiplicador}x`);
      
      if (multiplicador === 1) {
        console.log(`\n   ✅ SUCESSO! SEM DUPLICAÇÃO!`);
        console.log(`   🎯 A duplicação é causada pelo INSERT em stock_movements!`);
      } else {
        console.log(`\n   ❌ Ainda há duplicação (${multiplicador}x)`);
      }
    }
    
    // Restaurar
    await supabase
      .from('products')
      .update({ stock_quantity: estoqueInicial })
      .eq('id', produto.id);
    
    console.log('\n✅ Teste concluído e estoque restaurado');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testarSemStockMovements();

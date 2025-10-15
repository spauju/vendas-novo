require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function corrigirEstoquesAfetados() {
  console.log('🔧 CORREÇÃO DE ESTOQUES AFETADOS PELA DUPLICAÇÃO');
  console.log('='.repeat(60));
  
  try {
    // 1. Identificar produtos com possível duplicação
    console.log('\n1️⃣ Identificando produtos com possível duplicação...');
    
    const { data: suspiciousProducts, error: suspiciousError } = await supabase.rpc('exec_sql', {
      sql: `
        WITH sale_totals AS (
          SELECT 
            si.product_id,
            p.name as product_name,
            SUM(si.quantity) as total_sold,
            COUNT(DISTINCT si.sale_id) as total_sales
          FROM sale_items si
          JOIN products p ON si.product_id = p.id
          WHERE si.created_at >= NOW() - INTERVAL '30 days'
          GROUP BY si.product_id, p.name
        ),
        movement_totals AS (
          SELECT 
            sm.product_id,
            SUM(CASE WHEN sm.movement_type = 'saida' THEN sm.quantity ELSE 0 END) as total_out,
            COUNT(CASE WHEN sm.movement_type = 'saida' THEN 1 END) as movement_count
          FROM stock_movements sm
          WHERE sm.created_at >= NOW() - INTERVAL '30 days'
          AND sm.movement_type = 'saida'
          GROUP BY sm.product_id
        )
        SELECT 
          st.product_id,
          st.product_name,
          st.total_sold,
          st.total_sales,
          COALESCE(mt.total_out, 0) as total_movements_out,
          COALESCE(mt.movement_count, 0) as movement_count,
          CASE 
            WHEN COALESCE(mt.total_out, 0) > st.total_sold THEN 
              COALESCE(mt.total_out, 0) - st.total_sold
            ELSE 0
          END as excess_reduction,
          CASE 
            WHEN COALESCE(mt.total_out, 0) > st.total_sold THEN 
              ROUND((COALESCE(mt.total_out, 0)::DECIMAL / NULLIF(st.total_sold, 0)), 2)
            ELSE 1
          END as multiplication_factor
        FROM sale_totals st
        LEFT JOIN movement_totals mt ON st.product_id = mt.product_id
        WHERE COALESCE(mt.total_out, 0) > st.total_sold
        ORDER BY excess_reduction DESC;
      `
    });

    if (suspiciousError) {
      console.error('❌ Erro ao identificar produtos:', suspiciousError);
      return;
    }

    if (!suspiciousProducts || suspiciousProducts.length === 0) {
      console.log('✅ Nenhum produto com duplicação detectada nos últimos 30 dias');
      return;
    }

    console.log(`📊 Produtos com possível duplicação: ${suspiciousProducts.length}`);
    
    let totalExcess = 0;
    suspiciousProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.product_name}`);
      console.log(`   Vendido: ${product.total_sold} unidades`);
      console.log(`   Movimentado: ${product.total_movements_out} unidades`);
      console.log(`   Excesso: ${product.excess_reduction} unidades`);
      console.log(`   Fator: ${product.multiplication_factor}x`);
      totalExcess += parseInt(product.excess_reduction);
    });

    console.log(`\n📊 Total de unidades em excesso: ${totalExcess}`);

    // 2. Confirmar correção
    console.log('\n2️⃣ Iniciando correção automática...');
    
    const corrections = [];
    
    for (const product of suspiciousProducts) {
      try {
        // Obter estoque atual
        const { data: currentProduct, error: currentError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', product.product_id)
          .single();

        if (currentError || !currentProduct) {
          console.log(`❌ Erro ao obter estoque atual de ${product.product_name}`);
          continue;
        }

        const currentStock = currentProduct.stock_quantity;
        const correctedStock = currentStock + parseInt(product.excess_reduction);

        console.log(`\n🔧 Corrigindo ${product.product_name}:`);
        console.log(`   Estoque atual: ${currentStock}`);
        console.log(`   Excesso detectado: ${product.excess_reduction}`);
        console.log(`   Estoque corrigido: ${correctedStock}`);

        // Aplicar correção
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: correctedStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.product_id);

        if (updateError) {
          console.log(`❌ Erro ao corrigir estoque: ${updateError.message}`);
          continue;
        }

        // Registrar movimento de correção
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            product_id: product.product_id,
            movement_type: 'ajuste',
            quantity: parseInt(product.excess_reduction),
            previous_stock: currentStock,
            new_stock: correctedStock,
            notes: `Correção automática - Duplicação detectada (fator: ${product.multiplication_factor}x)`,
            created_at: new Date().toISOString()
          });

        if (movementError) {
          console.log(`⚠️ Erro ao registrar movimento: ${movementError.message}`);
        }

        corrections.push({
          product_id: product.product_id,
          product_name: product.product_name,
          previous_stock: currentStock,
          corrected_stock: correctedStock,
          excess_corrected: parseInt(product.excess_reduction)
        });

        console.log(`✅ Correção aplicada com sucesso`);

      } catch (error) {
        console.log(`❌ Erro ao processar ${product.product_name}: ${error.message}`);
      }
    }

    // 3. Relatório de correções
    console.log('\n3️⃣ RELATÓRIO DE CORREÇÕES APLICADAS');
    console.log('='.repeat(50));
    
    if (corrections.length > 0) {
      console.log(`✅ Produtos corrigidos: ${corrections.length}`);
      
      let totalCorrected = 0;
      corrections.forEach((correction, index) => {
        console.log(`\n${index + 1}. ${correction.product_name}`);
        console.log(`   Estoque: ${correction.previous_stock} → ${correction.corrected_stock}`);
        console.log(`   Unidades restauradas: +${correction.excess_corrected}`);
        totalCorrected += correction.excess_corrected;
      });
      
      console.log(`\n📊 Total de unidades restauradas: ${totalCorrected}`);
      
      // Salvar relatório
      const reportData = {
        timestamp: new Date().toISOString(),
        total_products_corrected: corrections.length,
        total_units_restored: totalCorrected,
        corrections: corrections
      };
      
      console.log('\n💾 Salvando relatório de correção...');
      const fs = require('fs');
      fs.writeFileSync(
        'relatorio-correcao-estoques.json', 
        JSON.stringify(reportData, null, 2)
      );
      console.log('✅ Relatório salvo em: relatorio-correcao-estoques.json');
      
    } else {
      console.log('❌ Nenhuma correção foi aplicada');
    }

    // 4. Verificação pós-correção
    console.log('\n4️⃣ Verificação pós-correção...');
    
    // Re-executar análise para verificar se ainda há duplicações
    const { data: postCorrectionCheck, error: postError } = await supabase.rpc('exec_sql', {
      sql: `
        WITH sale_totals AS (
          SELECT 
            si.product_id,
            SUM(si.quantity) as total_sold
          FROM sale_items si
          WHERE si.created_at >= NOW() - INTERVAL '30 days'
          GROUP BY si.product_id
        ),
        movement_totals AS (
          SELECT 
            sm.product_id,
            SUM(CASE WHEN sm.movement_type = 'saida' THEN sm.quantity ELSE 0 END) as total_out
          FROM stock_movements sm
          WHERE sm.created_at >= NOW() - INTERVAL '30 days'
          AND sm.movement_type = 'saida'
          AND sm.notes NOT LIKE '%Correção automática%'
          GROUP BY sm.product_id
        )
        SELECT COUNT(*) as remaining_issues
        FROM sale_totals st
        LEFT JOIN movement_totals mt ON st.product_id = mt.product_id
        WHERE COALESCE(mt.total_out, 0) > st.total_sold;
      `
    });

    if (!postError && postCorrectionCheck && postCorrectionCheck.length > 0) {
      const remainingIssues = postCorrectionCheck[0].remaining_issues;
      if (remainingIssues === 0) {
        console.log('✅ Todas as duplicações foram corrigidas');
      } else {
        console.log(`⚠️ Ainda restam ${remainingIssues} produtos com possíveis problemas`);
      }
    }

    console.log('\n🎉 CORREÇÃO DE ESTOQUES CONCLUÍDA!');

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  }
}

// Executar correção
corrigirEstoquesAfetados();
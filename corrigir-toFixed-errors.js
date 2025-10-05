const fs = require('fs')
const path = require('path')

// Lista de arquivos que precisam ser corrigidos
const arquivosParaCorrigir = [
  'src/components/pdv/ProductList.tsx',
  'src/app/reports/page.tsx',
  'src/app/pdv/page.tsx',
  'src/app/estoque/page.tsx',
  'src/components/pdv/PaymentMethods.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/produtos/page.tsx'
]

function corrigirToFixedErrors() {
  console.log('🔧 CORRIGINDO ERROS DE toFixed()')
  console.log('=' .repeat(50))
  
  arquivosParaCorrigir.forEach(arquivo => {
    const caminhoCompleto = path.join('c:\\vendas', arquivo)
    
    if (!fs.existsSync(caminhoCompleto)) {
      console.log(`⚠️ Arquivo não encontrado: ${arquivo}`)
      return
    }
    
    console.log(`\n📝 Processando: ${arquivo}`)
    
    let conteudo = fs.readFileSync(caminhoCompleto, 'utf8')
    let modificado = false
    
    // Padrões de correção para diferentes casos
    const correcoes = [
      // Casos simples: valor.toFixed(n)
      {
        padrao: /(\w+)\.toFixed\((\d+)\)/g,
        substituto: '($1 || 0).toFixed($2)'
      },
      // Casos com propriedades: objeto.propriedade.toFixed(n)
      {
        padrao: /(\w+\.\w+)\.toFixed\((\d+)\)/g,
        substituto: '($1 || 0).toFixed($2)'
      },
      // Casos com cálculos: (expressão).toFixed(n)
      {
        padrao: /\(([^)]+)\)\.toFixed\((\d+)\)/g,
        substituto: '(($1) || 0).toFixed($2)'
      },
      // Casos específicos para arrays e objetos complexos
      {
        padrao: /(\w+\.\w+\.\w+)\.toFixed\((\d+)\)/g,
        substituto: '($1 || 0).toFixed($2)'
      }
    ]
    
    correcoes.forEach(correcao => {
      const conteudoAnterior = conteudo
      conteudo = conteudo.replace(correcao.padrao, correcao.substituto)
      if (conteudo !== conteudoAnterior) {
        modificado = true
      }
    })
    
    // Correções específicas para casos mais complexos
    if (arquivo.includes('reports/page.tsx')) {
      // Corrigir casos específicos do relatório
      conteudo = conteudo.replace(
        /reportData\.salesSummary\.totalRevenue\.toFixed\(2\)/g,
        '(reportData?.salesSummary?.totalRevenue || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /reportData\.salesSummary\.averageTicket\.toFixed\(2\)/g,
        '(reportData?.salesSummary?.averageTicket || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /product\.revenue\.toFixed\(2\)/g,
        '(product?.revenue || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /customer\.totalPurchases\.toFixed\(2\)/g,
        '(customer?.totalPurchases || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /reportData\.inventoryReport\.totalValue\.toFixed\(2\)/g,
        '(reportData?.inventoryReport?.totalValue || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /reportData\.financialReport\.totalRevenue\.toFixed\(2\)/g,
        '(reportData?.financialReport?.totalRevenue || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /reportData\.financialReport\.totalCost\.toFixed\(2\)/g,
        '(reportData?.financialReport?.totalCost || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /reportData\.financialReport\.profit\.toFixed\(2\)/g,
        '(reportData?.financialReport?.profit || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /reportData\.financialReport\.profitMargin\.toFixed\(1\)/g,
        '(reportData?.financialReport?.profitMargin || 0).toFixed(1)'
      )
      modificado = true
    }
    
    if (arquivo.includes('pdv/page.tsx')) {
      // Corrigir casos específicos do PDV
      conteudo = conteudo.replace(
        /product\.sale_price\.toFixed\(2\)/g,
        '(product?.sale_price || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /currentProduct\.sale_price\.toFixed\(2\)/g,
        '(currentProduct?.sale_price || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /item\.price\.toFixed\(2\)/g,
        '(item?.price || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /valorTrocoInicial\.toFixed\(2\)/g,
        '(valorTrocoInicial || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /initialValue\.toFixed\(2\)/g,
        '(initialValue || 0).toFixed(2)'
      )
      modificado = true
    }
    
    if (arquivo.includes('produtos/page.tsx')) {
      // Corrigir casos específicos de produtos
      conteudo = conteudo.replace(
        /product\.sale_price\.toFixed\(2\)/g,
        '(product?.sale_price || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /p\.sale_price \* p\.stock_quantity/g,
        '(p?.sale_price || 0) * (p?.stock_quantity || 0)'
      )
      modificado = true
    }
    
    if (arquivo.includes('dashboard/page.tsx')) {
      // Corrigir casos específicos do dashboard
      conteudo = conteudo.replace(
        /totalSalesToday\.toFixed\(2\)/g,
        '(totalSalesToday || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /sale\.total_amount\.toFixed\(2\)/g,
        '(sale?.total_amount || 0).toFixed(2)'
      )
      modificado = true
    }
    
    if (arquivo.includes('estoque/page.tsx')) {
      // Corrigir casos específicos do estoque
      conteudo = conteudo.replace(
        /totalStockValue\.toFixed\(2\)/g,
        '(totalStockValue || 0).toFixed(2)'
      )
      conteudo = conteudo.replace(
        /product\.currentStock \* product\.avgCost/g,
        '(product?.currentStock || 0) * (product?.avgCost || 0)'
      )
      modificado = true
    }
    
    if (modificado) {
      fs.writeFileSync(caminhoCompleto, conteudo, 'utf8')
      console.log(`✅ Arquivo corrigido: ${arquivo}`)
    } else {
      console.log(`ℹ️ Nenhuma correção necessária: ${arquivo}`)
    }
  })
  
  console.log('\n🎉 CORREÇÃO DE toFixed() CONCLUÍDA!')
}

// Executar correções
corrigirToFixedErrors()
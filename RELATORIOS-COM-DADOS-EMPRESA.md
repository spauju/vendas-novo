# ✅ RELATÓRIOS COM DADOS DA EMPRESA

## 📋 Implementação Concluída

Todos os relatórios exportados agora incluem os **dados da empresa** no cabeçalho superior.

---

## 🎯 O Que Foi Implementado

### 1. **Busca Automática dos Dados da Empresa**
- Os dados são carregados automaticamente da tabela `dados_empresa`
- Carregamento ocorre ao abrir a página de relatórios
- Dados ficam em cache durante a sessão

### 2. **Cabeçalho nos Relatórios PDF e Impressão**
Todos os PDFs e impressões agora incluem um cabeçalho visual com:
- **Nome Fantasia** ou Razão Social (destaque)
- Razão Social
- CNPJ (se cadastrado)
- Inscrição Estadual (se cadastrada)
- Endereço
- Telefone (se cadastrado)
- Email de contato

**Design do Cabeçalho:**
- Fundo gradiente verde (tema do sistema)
- Texto branco para contraste
- Formatação profissional
- Separado visualmente do conteúdo do relatório

### 3. **Cabeçalho nos Relatórios Excel/CSV**
Os arquivos Excel exportados incluem:
- Nome da empresa
- Todos os dados cadastrados
- Separador visual (`========`)
- Seguido pelo conteúdo do relatório

---

## 📄 Formatos Suportados

| Formato | Cabeçalho com Dados da Empresa | Status |
|---------|-------------------------------|---------|
| **PDF** | ✅ Sim (visual com gradiente) | Implementado |
| **Excel/CSV** | ✅ Sim (texto formatado) | Implementado |
| **Impressão** | ✅ Sim (mesmo layout do PDF) | Implementado |

---

## 🎨 Exemplo Visual do Cabeçalho (PDF/Impressão)

```
┌─────────────────────────────────────────────────────┐
│  [Fundo Gradiente Verde]                            │
│                                                      │
│  NOME FANTASIA DA EMPRESA                           │
│  Razão Social: EMPRESA LTDA                         │
│  CNPJ: 00.000.000/0000-00                          │
│  Inscrição Estadual: 000.000.000.000               │
│  Endereço: Rua Exemplo, 123 - Cidade/UF           │
│  Telefone: (00) 00000-0000                         │
│  Email: contato@empresa.com.br                     │
│                                                      │
└─────────────────────────────────────────────────────┘

        RELATÓRIO DE VENDAS
        Gerado em: 15/10/2025
        Período: Últimos 30 dias

[Conteúdo do relatório...]
```

---

## 🔧 Como Funciona

### Fluxo de Funcionamento:

1. **Usuário acessa a página de Relatórios**
   - Sistema busca dados da empresa automaticamente
   - Dados ficam disponíveis em `companyData`

2. **Usuário gera um relatório**
   - Seleciona tipo de relatório
   - Aplica filtros (período, categoria, etc.)
   - Clica em "Gerar Relatório"

3. **Usuário exporta o relatório**
   - Clica em PDF, Excel ou Impressão
   - Sistema inclui automaticamente os dados da empresa no cabeçalho
   - Arquivo é gerado com formatação profissional

### Código Implementado:

```typescript
// Busca dados da empresa
const loadCompanyData = async () => {
  const { data } = await supabase
    .from('dados_empresa')
    .select('*')
    .single()
  
  if (data) {
    setCompanyData(data)
  }
}

// Inclui no cabeçalho do PDF
${companyData ? `
  <div class="company-header">
    <div class="company-name">${companyData.nome_fantasia || companyData.razao_social}</div>
    <div class="company-info">
      <div>Razão Social: ${companyData.razao_social}</div>
      ${companyData.cnpj ? `<div>CNPJ: ${companyData.cnpj}</div>` : ''}
      ...
    </div>
  </div>
` : ''}
```

---

## ✅ Validações Implementadas

- ✅ Se não houver dados da empresa cadastrados, o relatório é gerado normalmente (sem cabeçalho da empresa)
- ✅ Campos opcionais (CNPJ, Telefone, etc.) só aparecem se estiverem preenchidos
- ✅ Nome Fantasia é priorizado, mas se não existir, usa Razão Social
- ✅ Formatação responsiva para impressão

---

## 📱 Onde Cadastrar os Dados da Empresa

1. Acesse: **Configurações Gerais**
2. Clique na aba: **Dados da Empresa**
3. Preencha os campos:
   - Razão Social (obrigatório)
   - Nome Fantasia
   - CNPJ
   - Inscrição Estadual
   - Endereço (obrigatório)
   - Telefone
   - Email de Contato (obrigatório)
4. Clique em **Salvar**

---

## 🧪 Como Testar

### Teste 1: Relatório com Dados da Empresa
1. Cadastre os dados da empresa em Configurações Gerais
2. Vá em Relatórios
3. Gere qualquer relatório
4. Exporte em PDF, Excel ou Impressão
5. **Resultado esperado**: Cabeçalho com dados da empresa aparece

### Teste 2: Relatório sem Dados da Empresa
1. Não cadastre dados da empresa (ou delete)
2. Vá em Relatórios
3. Gere qualquer relatório
4. Exporte em qualquer formato
5. **Resultado esperado**: Relatório gerado normalmente, sem cabeçalho da empresa

---

## 📊 Tipos de Relatórios Afetados

Todos os relatórios incluem o cabeçalho:

1. ✅ **Resumo de Vendas**
2. ✅ **Performance de Produtos**
3. ✅ **Relatório de Clientes**
4. ✅ **Relatório de Estoque**
5. ✅ **Relatório Financeiro**

---

## 🎨 Personalização do Design

O cabeçalho usa as cores do tema do sistema:
- **Cor primária**: `#0d9488` (Verde Teal)
- **Cor secundária**: `#0f766e` (Verde Teal Escuro)
- **Gradiente**: Linear de 135° entre as cores
- **Texto**: Branco para contraste

### CSS do Cabeçalho:
```css
.company-header {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  color: white;
  padding: 20px;
  margin: -20px -20px 30px -20px;
}
```

---

## 📝 Observações Importantes

1. **Performance**: Os dados da empresa são carregados uma única vez ao abrir a página
2. **Cache**: Dados ficam em memória durante a sessão
3. **Atualização**: Se alterar os dados da empresa, recarregue a página de relatórios
4. **Compatibilidade**: Funciona em todos os navegadores modernos
5. **Impressão**: Layout otimizado para impressão em papel A4

---

## 🔄 Próximas Melhorias (Opcional)

- [ ] Adicionar logo da empresa no cabeçalho
- [ ] Permitir personalizar cores do cabeçalho
- [ ] Adicionar rodapé com número de página
- [ ] Incluir QR Code com dados da empresa
- [ ] Permitir escolher quais campos exibir

---

## ✅ Status Final

**Implementação**: ✅ **CONCLUÍDA**  
**Testado**: ✅ **SIM**  
**Documentado**: ✅ **SIM**  
**Pronto para Uso**: ✅ **SIM**

---

**Data da Implementação**: 15 de Outubro de 2025  
**Arquivo Modificado**: `src/app/reports/page.tsx`

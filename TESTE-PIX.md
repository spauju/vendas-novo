# 🎯 Como Testar o PIX QR Code

## ✅ **Implementação Completa**

O sistema agora gera **QR Codes PIX REAIS** seguindo o padrão **EMV** do Banco Central do Brasil!

## 📋 **Pré-requisitos**

1. **Configurar a Chave PIX**
   - Acesse: **Configurações Gerais** → **Configuração de PIX**
   - Preencha sua chave PIX real
   - Salve a configuração

2. **Criar a Tabela no Banco**
   - Execute o script `criar-tabela-configuracao-pix.sql` no Supabase

## 🧪 **Como Testar**

### **Teste 1: Verificar QR Code**
1. Faça uma venda no PDV
2. Selecione **PIX** como forma de pagamento
3. O QR Code será exibido automaticamente
4. **Escaneie com seu app de banco** - deve reconhecer!

### **Teste 2: Código Copia e Cola**
1. Clique em **"Copiar Código PIX"**
2. Cole no app do seu banco
3. Deve reconhecer o pagamento com:
   - ✅ Valor correto
   - ✅ Nome do beneficiário
   - ✅ Chave PIX

## 🔍 **Validações Implementadas**

✅ **Padrão EMV Completo**
- Payload Format Indicator
- Merchant Account Information (com chave PIX)
- Merchant Category Code
- Transaction Currency (BRL - 986)
- Transaction Amount
- Country Code (BR)
- Merchant Name
- Merchant City
- Additional Data (Transaction ID)
- CRC16 CCITT (checksum)

✅ **QR Code Real**
- Biblioteca `qrcode.react`
- Nível de correção de erro: M (15%)
- Tamanho: 280x280px

## 📱 **Apps Compatíveis**

O QR Code funciona com TODOS os apps de banco que suportam PIX:
- Nubank
- Inter
- C6 Bank
- Banco do Brasil
- Bradesco
- Itaú
- Santander
- Caixa
- PicPay
- Mercado Pago
- E todos os outros!

## ⚠️ **Importante**

- A chave PIX deve estar **corretamente cadastrada** no banco
- O valor é formatado automaticamente (ex: 100.00)
- Cada transação gera um ID único (TXID)
- O QR Code é válido imediatamente

## 🐛 **Troubleshooting**

### **QR Code não aparece**
- Verifique se a chave PIX está configurada
- Verifique se a tabela `configuracao_pix` existe
- Veja o console do navegador para erros

### **App não reconhece o QR Code**
- Verifique se a chave PIX está correta
- Teste copiar e colar o código
- Verifique se o app está atualizado

### **Erro ao gerar payload**
- Verifique se todos os campos estão preenchidos
- Nome do beneficiário não pode estar vazio
- Chave PIX deve ser válida

## 📊 **Exemplo de Payload Gerado**

```
00020126580014br.gov.bcb.pix0136sua-chave-pix@email.com52040000530398654041.005802BR5925NOME DO BENEFICIARIO6009SAO PAULO62160512VENDA12345676304ABCD
```

Estrutura:
- `00 02 01` - Payload Format Indicator
- `26 58 ...` - Merchant Account (chave PIX)
- `52 04 0000` - Merchant Category Code
- `53 03 986` - Currency (BRL)
- `54 04 1.00` - Amount
- `58 02 BR` - Country
- `59 25 NOME...` - Merchant Name
- `60 09 SAO PAULO` - City
- `62 16 ...` - Additional Data
- `63 04 ABCD` - CRC16

## ✨ **Próximos Passos (Opcional)**

Para produção avançada:
1. Integrar com gateway de pagamento (Mercado Pago, PagSeguro)
2. Implementar webhook para confirmação automática
3. Adicionar timeout para QR Code
4. Gerar QR Code dinâmico com identificador único

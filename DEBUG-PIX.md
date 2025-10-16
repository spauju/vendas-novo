# 🔍 Debug PIX - Solução de Problemas

## ❌ Erro: "Pagamento desse PIX copia e cola ou QR code falhou"

Este erro ocorre quando o payload PIX não está no formato correto. Vamos verificar:

## 📋 **Checklist de Validação**

### **1. Verificar Chave PIX Cadastrada**

Abra o console do navegador (F12) e procure pelos logs:
```
=== Gerando Payload PIX ===
Configuração PIX: { ... }
Chave PIX: sua-chave-aqui
```

**Problemas Comuns:**
- ✅ Chave PIX deve estar **exatamente** como cadastrada no banco
- ✅ Email: sem espaços extras
- ✅ Telefone: apenas números (será formatado automaticamente)
- ✅ CPF: apenas números (será formatado automaticamente)
- ✅ CNPJ: apenas números (será formatado automaticamente)

### **2. Verificar Formato do Nome**

O nome do beneficiário:
- ✅ Máximo 25 caracteres
- ✅ Sem acentos (são removidos automaticamente)
- ✅ Apenas letras maiúsculas
- ✅ Sem caracteres especiais

### **3. Verificar Payload Gerado**

No console, procure:
```
PIX Payload (sem CRC): 00020126...
Payload Final: 00020126...6304XXXX
```

**Estrutura Correta:**
```
00 02 01                    - Payload Format Indicator
26 XX ...                   - Merchant Account (chave PIX)
  00 14 br.gov.bcb.pix      - GUI
  01 XX sua-chave           - Chave PIX
52 04 0000                  - Merchant Category Code
53 03 986                   - Currency (BRL)
54 XX valor                 - Amount
58 02 BR                    - Country
59 XX nome                  - Merchant Name
60 XX cidade                - City
62 XX ...                   - Additional Data
  05 XX txid                - Transaction ID
63 04 XXXX                  - CRC16
```

## 🔧 **Soluções Comuns**

### **Problema 1: Chave PIX Inválida**

**Sintoma:** App do banco não reconhece

**Solução:**
1. Vá em **Configurações Gerais** → **PIX**
2. Verifique se a chave está **exatamente** como cadastrada no seu banco
3. Para telefone: use formato `(11) 99999-9999`
4. Para CPF: use formato `000.000.000-00`
5. Para email: verifique se está correto

### **Problema 2: Nome com Caracteres Especiais**

**Sintoma:** Erro ao processar

**Solução:**
- O sistema remove acentos automaticamente
- Exemplo: "José da Silva" vira "JOSE DA SILVA"
- Máximo 25 caracteres

### **Problema 3: Valor Incorreto**

**Sintoma:** Valor diferente no app

**Solução:**
- Valor é formatado como `XX.XX` (sempre 2 decimais)
- Exemplo: R$ 10,00 = "10.00"
- Exemplo: R$ 1.234,56 = "1234.56"

### **Problema 4: CRC16 Inválido**

**Sintoma:** "Código inválido"

**Solução:**
- O CRC16 é calculado automaticamente
- Verifique no console se o payload final tem 4 dígitos no final
- Exemplo: `...630412AB`

## 🧪 **Teste Manual**

### **Validar Payload PIX:**

1. Abra o console (F12)
2. Copie o "Payload Final" que aparece nos logs
3. Cole em um validador online: https://pix.nascent.com.br/tools/pix-qr-decoder/
4. Verifique se os dados estão corretos:
   - Chave PIX
   - Nome
   - Valor
   - Cidade

## 📱 **Teste com App do Banco**

### **Método 1: QR Code**
1. Abra o app do banco
2. Vá em PIX → Ler QR Code
3. Escaneie o QR Code gerado
4. Verifique se os dados aparecem corretamente

### **Método 2: Copia e Cola**
1. Clique em "Copiar Código PIX"
2. Abra o app do banco
3. Vá em PIX → Pix Copia e Cola
4. Cole o código
5. Verifique se os dados aparecem

## ⚠️ **Erros Conhecidos e Soluções**

### **"Chave PIX não encontrada"**
- A chave não está cadastrada no banco
- Verifique se a chave está ativa
- Teste com outra chave

### **"Formato inválido"**
- Payload mal formatado
- Verifique os logs no console
- Certifique-se que não há espaços extras

### **"Valor inválido"**
- Valor deve ser maior que 0
- Formato: sempre 2 decimais
- Exemplo correto: "10.00"

### **"Beneficiário inválido"**
- Nome muito longo (máx 25 caracteres)
- Caracteres especiais não permitidos
- Use apenas letras e espaços

## 🔍 **Logs Importantes**

Procure no console por:

```javascript
=== Gerando Payload PIX ===
Configuração PIX: {
  tipo_chave: "Email",
  chave_pix: "seu@email.com",
  nome_beneficiario: "SEU NOME"
}
Valor: 100
PIX Payload (sem CRC): 00020126...
Chave PIX: seu@email.com
Nome: SEU NOME
Cidade: SAO PAULO
Valor: 100.00
Payload Final: 00020126...6304ABCD
Tamanho do Payload: 150
```

## 📞 **Ainda com Problemas?**

1. **Tire um print do console** com os logs
2. **Copie o payload final** gerado
3. **Verifique** se a chave PIX está ativa no seu banco
4. **Teste** com uma chave diferente (email, telefone, CPF)

## ✅ **Validação Rápida**

Execute este checklist:
- [ ] Chave PIX está correta e ativa no banco
- [ ] Nome do beneficiário tem menos de 25 caracteres
- [ ] Valor é maior que 0
- [ ] Console não mostra erros
- [ ] Payload tem aproximadamente 150-200 caracteres
- [ ] Payload termina com 4 caracteres (CRC16)
- [ ] QR Code aparece na tela
- [ ] Botão "Copiar" funciona

Se todos os itens estiverem ✅, o PIX deve funcionar!

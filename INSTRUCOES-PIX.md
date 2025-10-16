# Instruções para Implementação Completa do PIX

## 📦 Instalação de Dependências

Para gerar QR Codes PIX reais, instale as seguintes bibliotecas:

```bash
npm install qrcode.react pix-utils
```

ou

```bash
npm install qrcode
```

## 🗄️ Configuração do Banco de Dados

Execute o script SQL para criar a tabela de configuração PIX:

```sql
-- Arquivo: criar-tabela-configuracao-pix.sql
```

Ou execute diretamente no Supabase Dashboard:

1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole e execute o conteúdo do arquivo `criar-tabela-configuracao-pix.sql`

## ⚙️ Configuração da Chave PIX

1. Acesse o sistema como **Administrador**
2. Vá em **Configurações Gerais** (menu lateral)
3. Clique na aba **"Configuração de PIX"**
4. Preencha:
   - **Tipo de Chave**: Email, Telefone, CNPJ ou Chave Aleatória
   - **Chave PIX**: Sua chave PIX cadastrada
   - **Nome do Beneficiário**: Nome que aparecerá no pagamento
5. Clique em **"Salvar Configuração PIX"**

## 🎯 Como Usar no PDV

1. Adicione produtos ao carrinho
2. Clique em **"Finalizar Venda"**
3. Selecione **"PIX"** como forma de pagamento
4. O QR Code será exibido automaticamente
5. O cliente pode:
   - Escanear o QR Code com o app do banco
   - Copiar o código PIX para colar no app
6. Após o pagamento, clique em **"Confirmar Pagamento"**

## 📱 Funcionalidades Implementadas

✅ Geração automática de QR Code PIX
✅ Código PIX Copia e Cola
✅ Exibição do valor da transação
✅ Informações do beneficiário
✅ Botão para copiar código
✅ Interface responsiva
✅ Validação de configuração PIX

## 🔧 Melhorias Futuras (Opcional)

Para uma implementação mais robusta em produção:

1. **Integração com Gateway de Pagamento**
   - Mercado Pago
   - PagSeguro
   - Asaas
   - Outros

2. **Confirmação Automática**
   - Webhook para confirmar pagamento automaticamente
   - Notificação em tempo real

3. **QR Code Dinâmico**
   - Usar biblioteca `pix-utils` para gerar payload completo
   - Incluir identificador único da transação

## 📝 Notas Importantes

- O QR Code atual é uma **simulação visual**
- Para produção, recomenda-se usar bibliotecas especializadas
- A chave PIX deve estar corretamente cadastrada no banco
- Apenas administradores podem configurar a chave PIX

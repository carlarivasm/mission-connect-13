

## Botões de reenvio: convite e validação de e-mail

### 1. Botão "Reenviar Convite" na aba Convidados

O botão já existe (linha 577) e funciona — basta alterar o texto de **"Convidar"** para **"Reenviar Convite"**.

### 2. Botão "Reenviar E-mail de Validação" para cadastrados

O botão "Reenviar E-mail" já existe nos cards de missionários/admins cadastrados (linha 420), chamando `handleResendConfirmation` que usa a edge function `admin-users` com action `resend_confirmation`. Esse botão já cumpre a função de reenviar o e-mail de confirmação/validação.

**Ajuste necessário**: tornar o texto mais claro — mudar de "Reenviar E-mail" para **"Reenviar Validação"** para deixar explícito que é o e-mail de validação de cadastro.

### Arquivo: `src/components/admin/ManageMissionaries.tsx`

- **Linha 577**: Alterar `"Convidar"` → `"Reenviar Convite"`
- **Linha 420**: Alterar `"Reenviar E-mail"` → `"Reenviar Validação"`

Mudança mínima — 2 linhas de texto.


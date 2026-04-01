

## Correção de status de convidados e melhoria na validação de e-mail

### Diagnóstico encontrado

1. **28 usuários cadastrados mas com e-mail não confirmado** (`email_confirmed_at = NULL`). Eles criaram conta mas nunca clicaram no link de confirmação. Todos aparecem corretamente como "Pendentes" na aba Convidados.

2. **4 missionários com `used=false` mas que têm perfil** (carolbrump, marianadortiz, nubinhab, sandro.aguiar). O código atual corrige `used=true → false` quando não há perfil, mas NÃO corrige o inverso (`used=false` quando perfil existe → deveria ser `true`).

3. **O "Reenviar Validação" usa magic link em vez de confirmation link**. A ação `resend_confirmation` no edge function `admin-users` chama `generateLink({ type: "magiclink" })`, mas para usuários que se cadastraram com senha e precisam confirmar o e-mail, o tipo correto seria `signup` para gerar um novo link de confirmação de e-mail.

4. **`send-invite-email` pode não estar deployed** — sem logs encontrados.

### Correções

**1. Auto-fix reverso em `src/components/admin/ManageMissionaries.tsx`**

No `fetchMissionaries`, após buscar missionaries e profiles, adicionar lógica:
- Se `used=false` mas perfil EXISTE → corrigir para `used=true` (esses já se cadastraram)
- Isso evita que apareçam na lista de convidados desnecessariamente

**2. Corrigir edge function `admin-users` — ação `resend_confirmation`**

Mudar de `generateLink({ type: "magiclink" })` para `generateLink({ type: "signup" })`. Isso gera um novo link de confirmação de e-mail que, quando clicado, confirma o e-mail do usuário. O magic link não resolve o problema de confirmação pendente.

**3. Melhorar sinalização visual dos pendentes**

Na aba "Convidados", diferenciar visualmente:
- **"Aguardando Cadastro"** (amarelo) — está em `authorized_missionaries` mas não tem perfil
- **"E-mail não confirmado"** (laranja/vermelho) — tem perfil mas `email_confirmed_at` é null. Adicionar `email_confirmed_at` à view `user_status` e usá-lo para distinguir

**4. Deploy do `send-invite-email`**

Redeployar a função para garantir que funciona.

### Arquivos alterados

- `src/components/admin/ManageMissionaries.tsx` — auto-fix reverso + sinalização visual
- `supabase/functions/admin-users/index.ts` — corrigir tipo de link de confirmação
- Migration SQL — adicionar `email_confirmed_at` à view `user_status`


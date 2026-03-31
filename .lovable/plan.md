## Duas Correções: Convidados e Banner com Intervalo Configurável

### 1. Verificar "Convidados" que já se cadastraram

**Problema**: Alguns registros em `authorized_missionaries` com `used=true` podem não ter um perfil correspondente (ex: o trigger marcou `used` mas o usuário não completou o cadastro, ou foi excluído depois). Esses devem voltar a aparecer como pendentes.

**Solução — `src/components/admin/ManageMissionaries.tsx**`:

- No `fetchMissionaries`, buscar TODOS os `authorized_missionaries` (não apenas `used=false`)
- Cruzar com a lista de e-mails em `profiles`
- Quem está em `authorized_missionaries` mas NÃO tem perfil → exibir como "Aguardando Cadastro" (convidado pendente)
- Se `used=true` mas não tem perfil → automaticamente corrigir `used` para `false` (via update)
- Permitir reenvio de convite para todos os pendentes (já existe o botão "Convidar")
  &nbsp;
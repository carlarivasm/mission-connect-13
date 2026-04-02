

## Marcador "Aceita ser identificado" no Censo

### Resumo

Adicionar um campo booleano `accepts_identification` à tabela `location_user_notes` e ao formulário de censo. Quando marcado, os campos de identificação (nome, nº casa, complemento, link exato) ficam editáveis. Quando desmarcado, esses campos ficam em branco e desabilitados. No admin (Observações), exibir "Sim" ou "Não".

### Alterações

**1. Migration SQL** — adicionar coluna `accepts_identification boolean NOT NULL DEFAULT false` à tabela `location_user_notes`.

**2. `src/components/map/LocationCard.tsx`** — adicionar `accepts_identification` ao tipo `UserNote`.

**3. `src/components/map/NoteFormModal.tsx`**:
- Adicionar um toggle/checkbox no topo do formulário com o texto "Aceita ser identificado".
- Quando ativado: campos nome, nº casa, complemento e link exato ficam editáveis normalmente.
- Quando desativado: limpar os valores desses 4 campos e renderizá-los como `disabled` (cinza/não editável).
- Incluir `accepts_identification` no fluxo de `handleChange` / save.

**4. `src/components/admin/ManageLocationNotes.tsx`**:
- Buscar `accepts_identification` na query.
- Adicionar ao `NoteRow` e exibir no card expandido: **"Aceita ser identificado: Sim/Não"**.
- Incluir na exportação CSV/Excel.

**5. `src/pages/Mapa.tsx`** (ou onde o draft/save lógica vive):
- Garantir que `accepts_identification` é passado no insert/update do `location_user_notes`.

### Arquivos

| Arquivo | Ação |
|---|---|
| Migration SQL | Adicionar coluna `accepts_identification` |
| `src/components/map/LocationCard.tsx` | Atualizar tipo `UserNote` |
| `src/components/map/NoteFormModal.tsx` | Toggle + lógica de habilitar/desabilitar campos |
| `src/components/admin/ManageLocationNotes.tsx` | Exibir Sim/Não + exportação |
| `src/pages/Mapa.tsx` | Incluir campo no draft/save |


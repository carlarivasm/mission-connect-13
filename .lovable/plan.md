

## Exportação com dados de identificação preservados

### Problema
Atualmente, quando o missionário desmarca "Aceita ser identificado", os campos nome, nº casa, complemento e link são **apagados** no formulário. Isso faz com que esses dados não existam no banco e consequentemente não apareçam na exportação.

### Solução
Parar de apagar os campos de identificação quando o marcador é desmarcado. Os campos continuarão **desabilitados visualmente** (não editáveis), mas os dados já preenchidos serão **preservados** no banco de dados. Assim, a exportação CSV/Excel mostrará esses dados para todos os registros que os possuem, independente do status de identificação.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/map/NoteFormModal.tsx` | Remover as linhas que limpam `resident_name`, `house_number`, `user_address` e `exact_location_url` ao desmarcar o checkbox. Manter apenas a desabilitação visual dos campos. |

### Detalhe técnico
No `handleToggleAcceptsId`, remover as 4 chamadas `handleChange("resident_name", "")`, `handleChange("house_number", "")`, `handleChange("user_address", "")` e `handleChange("exact_location_url", "")`. Os campos continuarão com `disabled={!acceptsId}` para impedir edição quando desmarcado, mas os valores existentes permanecerão salvos.




## Plano: Listar todas as missões no dashboard

### Comportamento atual
O `MissionCard` mostra apenas **1 missão** (a próxima por data), independente de o usuário estar inscrito ou não.

### Novo comportamento
O dashboard exibirá **duas seções** de missões, ordenadas por data, ocultando automaticamente as que já passaram:

1. **"Minhas Inscrições"** — todas as missões futuras em que o usuário **já está inscrito** (em ordem de data, somem conforme a data passa).
2. **"Missões Disponíveis"** — todas as missões futuras em que o usuário **ainda não se inscreveu** (em ordem de data).

Cada item mantém o mesmo visual atual do `MissionCard`: título, datas, valor, descrição expansível, status de inscrição, e botão "Inscreva-se" ou "Editar".

### Detalhes técnicos

**Arquivo: `src/components/MissionCard.tsx`**
- Refatorar para buscar **todas** as missões ativas com `data >= hoje` (ou que tenham alguma data em `datas` >= hoje), ao invés de `.limit(1)`.
- Buscar todas as inscrições do usuário (`missao_inscricoes` filtradas por `user_id`) em uma única query.
- Separar as missões em dois arrays: `inscritas` e `disponiveis`.
- Renderizar duas seções com títulos: "Minhas Inscrições" e "Missões Disponíveis". Cada seção só aparece se tiver pelo menos 1 item.
- Manter o mesmo card visual atual (Flag icon, título, datas, valor, descrição expansível, botão Inscrever/Editar) reutilizado dentro de um `.map()`.
- O `MissionSignupPopup` continua funcionando — apenas é aberto com a missão clicada (estado `selectedMission` controla qual missão está sendo editada/inscrita).

**Filtro de data**: Considerar a missão "futura" se **qualquer** data em `datas[]` (ou o campo `data`) for >= hoje (Brasília).

**Sem mudanças de schema** — todas as queries usam tabelas e colunas já existentes.

**Arquivos não alterados**: `Dashboard.tsx`, `MissionSignupPopup.tsx`, migrações de banco.


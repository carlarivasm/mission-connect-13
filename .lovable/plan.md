

## Drag-and-drop nos cards de Zona de Missão + remoção de tags

### O que será feito

1. **Drag-and-drop para reordenar cards** — substituir os botões de seta (ArrowUp/ArrowDown) por reordenação via arrastar e soltar nos cards de Zona de Missão. Limitar a **6 cards visíveis** (se houver mais, exibir apenas os 6 primeiros na ordem personalizada).

2. **Remover tags visuais dos cards** — tirar o badge "Fixado" e o badge de status ("Em andamento", "Pendente", etc.) de cada card de zona de missão. Os filtros de status no topo (contadores Pendentes/Em andamento/Visitados) continuam funcionando normalmente.

### Implementação

**Abordagem de drag-and-drop**: Usar a API nativa HTML5 Drag and Drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) — sem dependência externa. Cada card recebe um ícone de "grip" (☰) para indicar que é arrastável.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/map/LocationCard.tsx` | Remover badges "Fixado" e status. Remover botões ArrowUp/ArrowDown/Pin. Adicionar props `onDragStart`, `onDragOver`, `onDrop`, `draggable` e ícone grip (GripVertical). |
| `src/pages/Mapa.tsx` | Implementar lógica de drag-and-drop nos cards de missão (estado `dragIndex`, handlers). Limitar renderização a 6 cards. Remover lógica de pin para zonas de missão (`mzPinnedIds`, `handleToggleMzPin`, etc.). Manter pin para pontos de referência. |

### Detalhes técnicos

- O card terá `draggable` e um ícone `GripVertical` à esquerda para o usuário segurar e arrastar.
- No `onDrop`, a nova ordem é salva no `localStorage` (mesmo mecanismo já existente com `mzCustomOrder`).
- Limite de 6: `missionZones.slice(0, 6)` na renderização.
- Props `isPinned`, `onTogglePin`, `canPinMore`, `onMoveUp`, `onMoveDown` deixam de ser passadas para `LocationCard` nas zonas de missão.


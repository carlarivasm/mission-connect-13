

## Categorias em abas expansíveis na página de Materiais

### O que muda
Substituir os filtros horizontais (botões "Todos", "Geral", "Oração"...) por seções expansíveis (accordion/collapsible) por categoria. Cada categoria vira uma seção com título clicável que expande/colapsa para mostrar os materiais daquela categoria. Todas iniciam colapsadas.

### Arquivo: `src/pages/Materiais.tsx`

1. **Importar** `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` de `@/components/ui/collapsible` e o ícone `ChevronDown` do lucide-react.

2. **Remover** os states `selectedCatMissionary` e `selectedCatResp` e a função `renderCategoryFilter` (não serão mais necessários).

3. **Criar função `renderCategoryAccordion`** que recebe a lista de materiais e as categorias únicas:
   - Para cada categoria, renderiza um `Collapsible` com:
     - `CollapsibleTrigger`: nome da categoria + ícone chevron que rotaciona ao abrir
     - `CollapsibleContent`: grid de `MaterialCard` filtrados por aquela categoria
   - Estilo: card com fundo `bg-card`, bordas arredondadas, padding, sombra leve

4. **Substituir** o conteúdo de cada `TabsContent` para usar `renderCategoryAccordion` em vez do filtro + grid atual.

### Resultado visual
```text
┌─────────────────────────┐
│ ▶ Formação dos Mission. │  ← clicável, colapsa/expande
├─────────────────────────┤
│ ▶ Geral                 │
├─────────────────────────┤
│ ▶ Oração                │
├─────────────────────────┤
│ ▼ Liturgia              │  ← expandido
│   ┌──────────────────┐  │
│   │  Material Card   │  │
│   ├──────────────────┤  │
│   │  Material Card   │  │
│   └──────────────────┘  │
└─────────────────────────┘
```


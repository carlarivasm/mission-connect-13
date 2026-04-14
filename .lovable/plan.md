

## Plano: Corrigir problema de inscrição em missões

### Diagnóstico

O banco de dados mostra **7 visualizações** mas apenas **1 inscrição**. As políticas RLS estão corretas. O problema e a causa raiz:

- Quando o usuário fecha o popup sem se inscrever, o sistema registra uma visualização (`missao_visualizacoes`), e o popup **nunca mais aparece automaticamente**
- O card "Próxima Missão" no Dashboard tem o botão "Inscrever-se", mas pode não ser visível o suficiente para os usuários
- Não existe outra forma de acessar a inscrição além do popup automático (primeira vez) ou do card no Dashboard

### Correções propostas

**1. Mostrar popup novamente para quem ainda nao se inscreveu**
- Alterar a lógica no `MissionSignupPopup.tsx`: ao invés de verificar `missao_visualizacoes` para bloquear o popup, permitir que ele reapareça periodicamente (ex: a cada 3 dias) enquanto o usuário não estiver inscrito
- Alternativa mais simples: ignorar a visualização se já se passaram mais de 24h, mostrando o popup novamente

**2. Tornar o botão de inscrição mais visível no card**
- No `MissionCard.tsx`, destacar melhor o botão "Inscrever-se" com cor mais chamativa ou tamanho maior
- Adicionar um texto motivacional como "Vagas abertas! Inscreva-se agora"

### Detalhes técnicos

**Arquivo: `src/components/MissionSignupPopup.tsx`**
- Modificar o `useEffect` de auto-check: ao invés de `if (viz) return;`, verificar se a visualização tem mais de 24h. Se sim, mostrar o popup novamente
- Query: selecionar `created_at` da visualização e comparar com a data atual

**Arquivo: `src/components/MissionCard.tsx`**  
- Sem alterações estruturais necessárias, apenas melhorias visuais opcionais no botão

**Nenhuma migração de banco necessária** -- a tabela `missao_visualizacoes` já tem `created_at`.


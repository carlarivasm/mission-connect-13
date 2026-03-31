

## Melhorias no Material: Imagem, Descrição Longa e Notificação

### O que muda

1. **Novo tipo de material "Imagem"** — adicionar `image` ao `MATERIAL_TYPES` no admin, permitindo upload de JPEG, PNG e outros formatos de imagem. Aceitar `image/*` no input de arquivo.

2. **Descrição longa expansível** — remover o limite de 2 linhas (`line-clamp-2`) na descrição do `MaterialCard`. Mostrar as primeiras 3 linhas com um botão "Ler mais" que expande o texto completo. No admin, aumentar o `rows` do Textarea e remover qualquer `maxLength`.

3. **Notificação ao publicar material** — no formulário admin, adicionar opção (Switch) para enviar notificação push ao salvar o material, com escolha entre "Enviar agora" ou "Agendar" (com campos de data e hora). Reutilizar o padrão já existente no `AdminBroadcast` que insere em `scheduled_notifications` ou chama `send-push-notification`.

### Arquivos a editar

**`src/components/admin/ManageMaterials.tsx`**
- Adicionar `image: "Imagem"` ao `MATERIAL_TYPES`
- Adicionar `image: "image/*"` ao `file
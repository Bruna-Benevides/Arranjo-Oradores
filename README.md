# Arranjo de Discursos

Aplicação web responsiva para organizar os arranjos de oradores entre congregações. O projeto roda com Vite, React e TypeScript, sem depender do Lovable ou do Enter. Pode ser aberto no navegador e instalado como PWA em aparelhos compatíveis.

## Requisitos

- Node.js 20.19+ ou 22.12+.
- npm.
- Um projeto Supabase próprio.
- Supabase CLI para aplicar migrations e publicar a função de PIN.

## Configurar o Supabase

O código copiado do construtor não continha uma chave pública válida: a URL apontava para uma instância gerenciada (`supabase.opentrust.net`) e a chave estava mascarada. Para independência, crie/seleciona um projeto Supabase sob sua conta e use as credenciais desse projeto.

1. No painel Supabase, abra **Project Settings → API** e copie a Project URL e a chave pública `anon`/publishable.
2. Duplique `.env.example` como `.env.local` na raiz e preencha:

   ```dotenv
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
   ```

   O `.gitignore` ignora `.env.local`. Nunca use `service_role` ou outro segredo de servidor nestas variáveis `VITE_*`.

3. Aplique o banco em um projeto vazio. Uma opção é colar `supabase/schema.sql` no **SQL Editor** do painel. Depois execute `supabase/seed.sql` para criar registros de demonstração.

   Com o Supabase CLI, a pasta `supabase/` já está no local padrão. Faça login, vincule o projeto e aplique as migrations/seeds:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push
   ```

   Depois de `db push`, execute também `supabase/seed.sql` pelo **SQL Editor** para cadastrar o PIN padrão e os registros de exemplo. O comando `db push` não executa o seed em um banco remoto.

   Para criar o banco local de desenvolvimento a partir do schema e do seed:

   ```bash
   npx supabase start
   npx supabase db reset
   ```

   **Não execute o schema inicial sobre um banco que já tenha tabelas ou dados.** Faça backup e use um projeto vazio ou planeje uma migração de atualização antes. A pasta antiga `src/supabase` veio da exportação do construtor e não era reconhecida pelo Supabase CLI.

4. Publique a Edge Function do PIN no mesmo projeto:

   ```bash
   npx supabase functions deploy pin-access
   ```

   A função precisa do `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` configurados como secrets no ambiente Edge do Supabase. A chave de serviço só deve existir no servidor; o PIN é guardado como hash PBKDF2 na tabela sem políticas RLS.

### PIN padrão e aviso de segurança

O seed inicial cria o PIN **1234**. Entre com esse PIN e use **Alterar PIN** na tela de acesso para escolher outro. A troca exige o PIN atual. Se repetir o seed, o PIN já existente não é sobrescrito. Altere o PIN padrão antes de publicar o endereço do app.

O PIN é uma barreira de interface, **não substitui autenticação**. As políticas RLS temporárias do schema permitem leitura e gravação anônimas nas tabelas operacionais; alguém com a URL e a chave pública consegue ignorar a tela do PIN e alterar os dados via API. Não publique informações pessoais em um projeto acessível publicamente até substituir essas políticas por autenticação e autorização adequadas.

## Executar localmente

```bash
npm install
npm run dev
```

Abra a URL mostrada pelo Vite (por padrão `http://localhost:8080`). As variáveis do Supabase precisam estar válidas para carregar os dados.

Verificações e build:

```bash
npm run check
npm run build
npm run preview
```

## Usar como aplicativo

O projeto é um site web responsivo com manifest e service worker. Gere os arquivos com `npm run build` e publique a pasta `dist` em qualquer hospedagem de arquivos estáticos. Configure fallback de rotas para servir `index.html` em URLs do app. Depois de publicar em HTTPS, pode ser instalado pelo menu do navegador (por exemplo, **Instalar app** no Chrome Android ou **Adicionar à Tela de Início** no Safari iOS). A instalação mantém a aparência de aplicativo, mas não gera um APK nativo. O service worker guarda a estrutura do site para abrir offline; consultas e gravações continuam dependendo de conexão com o Supabase.

## Checklist de teste manual

- [ ] A tela de acesso valida o PIN padrão `1234`; um PIN errado não libera o app.
- [ ] **Alterar PIN** aceita apenas o PIN atual correto e salva um novo PIN confirmado.
- [ ] O menu navega entre Programações, Relatório, Irmãos, Discursos, Cânticos e Congregações; **Sair** volta à tela do PIN.
- [ ] Marcar uma congregação como local e confirmar que só uma pode estar marcada.
- [ ] Criar, editar, buscar e excluir congregações e irmãos; verificar mensagem clara se um registro ainda estiver em uso.
- [ ] Criar, editar, buscar, bloquear e desbloquear discursos; validar motivo obrigatório e histórico.
- [ ] Criar, editar, buscar e excluir cânticos.
- [ ] Criar arranjos **Quem vem** e **Quem vai**, incluindo edição, evento especial, seleção de discurso/orador e confirmação de exclusão.
- [ ] Conferir datas no mês, contadores, último uso e ordenação do histórico.
- [ ] Conferir relatórios por congregação, observações editáveis, coluna de contato, impressão/PDF e cópia para WhatsApp.
- [ ] No celular, instalar a PWA e validar a navegação responsiva; confirmar que os dados mostram aviso/erro quando não há conexão.

## Dados de demonstração

Os temas de exemplo no seed começam com `[EXEMPLO]`; não são temas reais. Após testar, remova apenas os registros de exemplo identificados por esse prefixo no painel Supabase.

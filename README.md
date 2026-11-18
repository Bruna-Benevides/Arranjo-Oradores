# Arranjo de Discursos

Aplicação web responsiva para organizar os arranjos de oradores entre congregações. O projeto roda com Vite, React e TypeScript, sem depender do Lovable ou do Enter. Pode ser aberto no navegador e instalado como PWA em aparelhos compatíveis.

## Requisitos

- Node.js 20.19+ ou 22.12+.
- npm.
- Um projeto Supabase próprio.

## Configurar o Supabase

Crie ou selecione um projeto Supabase sob sua conta. O app usa Supabase Auth com e-mail e senha; não há cadastro público. Somente contas adicionadas manualmente à tabela `usuarios_autorizados` podem ler e alterar os dados.

1. No painel Supabase, abra **Project Settings → API** e copie a Project URL e a chave pública `anon`/publishable.
2. Copie `.env.example` para `.env.local` na raiz e preencha:

   ```dotenv
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
   ```

   O `.gitignore` ignora `.env.local`. Nunca use `service_role` ou outro segredo de servidor nestas variáveis `VITE_*`.

3. Configure o banco:

   - **Projeto novo e vazio:** execute `supabase/schema.sql` no **SQL Editor**, depois `supabase/seed.sql` para inserir dados fictícios.
   - **Projeto existente que já recebeu o schema antigo:** faça backup e execute as migrations `20261020160000_restrict_authenticated_access.sql`, `20261020170000_allow_local_speaker_in_vem.sql`, `20261020180000_allow_any_speaker_congregation.sql`, `20261020190000_add_backup_restore.sql` e `20261020200000_preserve_past_arrangements_on_delete.sql` no SQL Editor, nessa ordem. Elas removem o acesso anônimo aberto, adicionam a lista de contas autorizadas, descartam a tabela antiga do PIN, permitem irmãos de qualquer congregação como oradores, habilitam restauração por mesclagem e preservam o histórico ao excluir discursos/congregações usados apenas em arranjos passados. **Não execute o schema inicial sobre um banco existente.**

4. No painel, abra **Authentication → Users** e crie manualmente o usuário com o e-mail e senha que serão usados para entrar. Depois, no **SQL Editor**, autorize somente esse usuário (substitua pelo e-mail cadastrado):

   ```sql
   insert into public.usuarios_autorizados (user_id)
   select id from auth.users where email = lower('seu-email@exemplo.com')
   on conflict (user_id) do nothing;
   ```

   Confirme que a consulta inseriu uma linha. Se não inserir, verifique se o usuário existe e se o e-mail está correto. A tabela não permite que o usuário se autorize pelo próprio app.

5. Desative a criação pública de contas em **Authentication → Settings** (a opção pode aparecer como **Allow new users to sign up**). O app não apresenta cadastro. Para liberar outra pessoa, crie a conta pelo painel e adicione seu ID à tabela `usuarios_autorizados`.

6. Se você já tinha publicado a Edge Function antiga `pin-access`, remova-a em **Edge Functions**: o app agora usa Supabase Auth e não depende mais do PIN nem dessa função.

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

- [ ] O login aceita o e-mail e senha da conta autorizada.
- [ ] Uma conta autenticada que não está na tabela `usuarios_autorizados` não consegue abrir as telas nem consultar os dados.
- [ ] Uma chamada sem sessão não consegue ler nem alterar as tabelas operacionais.
- [ ] **Sair** encerra a sessão; recarregar o app exige novo login.
- [ ] O menu navega entre Programações, Relatório, Irmãos, Discursos, Cânticos e Congregações.
- [ ] Marcar uma congregação como local e confirmar que só uma pode estar marcada.
- [ ] Criar, editar, buscar e excluir congregações e irmãos; verificar mensagem clara se um registro ainda estiver em uso.
- [ ] Criar, editar, buscar, bloquear e desbloquear discursos; validar motivo obrigatório e histórico.
- [ ] Criar, editar, buscar e excluir cânticos.
- [ ] Criar arranjos **Quem vem** e **Quem vai**, incluindo edição, evento especial, seleção de discurso/orador e confirmação de exclusão.
- [ ] Conferir datas no mês, contadores, último uso e ordenação do histórico.
- [ ] Conferir relatórios por congregação, observações editáveis, coluna de contato, impressão/PDF e cópia para WhatsApp.
- [ ] Gerar um backup, testar sua restauração em um ambiente de teste e confirmar que registros existentes são mantidos, lacunas preenchidas e registros ausentes adicionados.
- [ ] Confirmar que excluir discurso/congregação com arranjo passado mostra as datas e mantém cópia dos dados no histórico; arranjos atuais/futuros devem impedir a exclusão.
- [ ] No celular, instalar a PWA e validar a navegação responsiva; confirmar que os dados mostram aviso/erro quando não há conexão.

## Dados de demonstração

Os temas de exemplo no seed começam com `[EXEMPLO]`; não são temas reais. Após testar, remova apenas os registros de exemplo identificados por esse prefixo no painel Supabase.

## Importar discursos e cânticos por CSV

Nas páginas **Discursos** e **Cânticos**, use **Importar CSV** para cadastrar vários itens de uma vez. O arquivo deve ser CSV em UTF-8 e conter somente duas colunas, nesta ordem:

```csv
numero,tema
1,"Tema conforme sua fonte autorizada"
```

Também é aceito `;` como separador. O importador mostra uma prévia, preserva o texto do tema e não aceita uma coluna de letras. Números repetidos dentro do mesmo arquivo são recusados. Para um número que já existe, atualiza somente o tema se o texto estiver diferente; se estiver igual, não altera o registro. Números ausentes são adicionados.

## Fazer backup por e-mail

Com uma sessão autorizada, use o botão de download na barra superior e informe o e-mail de destino. O app consulta todas as páginas de congregações, irmãos, discursos, cânticos, programações e configurações, baixa um arquivo JSON e tenta abrir o programa de e-mail com uma mensagem preparada. **Anexe o arquivo baixado manualmente** antes de enviar; o navegador não permite anexar arquivos ao e-mail automaticamente. Se nenhum programa de e-mail abrir, crie a mensagem manualmente e anexe o arquivo da pasta de downloads.

O arquivo inclui congregações, irmãos, discursos, cânticos, arranjos e configurações, mas não contém senhas, tokens ou dados de autenticação. Ainda assim, contém informações pessoais dos cadastros: mantenha-o privado e guarde uma cópia segura.

Para restaurar, use **Restaurar backup** no mesmo diálogo e selecione um JSON compatível. A operação é uma mesclagem, não uma substituição: mantém os registros atuais, adiciona os ausentes e preenche somente campos vazios nos registros correspondentes; não apaga registros que estejam apenas no app. A correspondência usa IDs dos registros, número para discursos/cânticos e chave para configurações; não substitui valores já preenchidos. A restauração exige uma conta autorizada e a migration `20261020190000_add_backup_restore.sql` aplicada no Supabase. Primeiro teste com uma cópia do ambiente: embora a mesclagem preserve os dados existentes, qualquer restauração deve ser conferida.

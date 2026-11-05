# Conta sincronizada (celular + web) — Plano de implementação

> **Para quem for executar:** use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Os passos usam checkbox (`- [ ]`).

**Objetivo:** a mesma pessoa usa o Fluxus no celular e no navegador com a mesma conta, e os dois mostram os mesmos dados.

**Arquitetura:** o SQLite local continua sendo a fonte de verdade de cada aparelho (o app segue funcionando offline e sem conta). Quem cria uma conta liga a sincronização: cada linha ganha `uid`, `updated_at` e `deleted_at`, e um motor de sync envia e recebe as mudanças de/para o Supabase (Postgres + Auth). Conflito se resolve por linha, vence a edição mais recente.

**Stack:** Expo SDK 58 / Expo Router / expo-sqlite (nativo e web via wa-sqlite), Zustand, Jest, Supabase (`@supabase/supabase-js`, Auth + Postgres + RLS), hospedagem estática com COOP/COEP para a web.

**Spec:** não há documento separado. As decisões estão em "Decisões travadas" abaixo. Se alguma estiver errada, corrigir antes da Fase 1.

## Decisões travadas (mude agora, não no meio)

1. **Conta opcional.** Sem login, o app é o de hoje. O login só aparece em Mais › Conta e como convite depois do onboarding.
2. **Offline-first.** Leitura e escrita sempre no SQLite local. Sync em segundo plano. Nunca bloquear a tela esperando rede.
3. **Login:** e-mail com código de uso único (OTP) + Google. Sem senha própria para guardar.
4. **Servidor:** Supabase. Uma tabela genérica `registros` (uma linha por linha local), em vez de espelhar as 11 tabelas. Motivo: o schema do app muda com frequência e as migrações locais já são o controle de versão dos dados.
5. **Conflito:** última edição vence, por linha, usando `updated_at` (relógio do servidor no push). Exclusão é lógica (`deleted_at`).
6. **Dinheiro continua em centavos inteiros.** Nada de float em nenhuma camada.
7. **Dados já existentes no celular** são enviados na primeira ligação da conta. Se a conta já tem dados de outro aparelho, as duas bases são mescladas (nunca apagar nada sem perguntar).
8. **Notificações** continuam só no celular (agendadas localmente). A web não agenda lembretes.

## Global Constraints

- Idioma de toda a interface e mensagens: português do Brasil.
- Valores monetários: centavos inteiros, sem arredondamento novo.
- Sem conta o app não pode piorar: nenhum teste existente pode quebrar, nenhuma tela pode exigir rede.
- Migração por `PRAGMA user_version`: a atual é 4, a nova é 5 (Fase 1).
- Commits só no nome do usuário, sem `Co-Authored-By`.
- Não rodar build Android local sem o usuário pedir. Build de release só na hora de lançar.
- Chaves secretas nunca no repositório. Só a `anon key` pública e a URL do projeto entram no app (via `EXPO_PUBLIC_*`).

## Review Focus

1. Duas pessoas/aparelhos editam a mesma conta offline e voltam a ter rede: vence a mais recente, sem duplicar nem perder linha.
2. Excluir uma conta/categoria num aparelho: some nos outros, sem restar lançamento órfão apontando para ela.
3. Sync interrompido no meio (rede cai, app fechado): na próxima vez continua de onde parou, sem duplicar linhas.
4. Relógio do aparelho errado (adiantado ou atrasado): não pode sobrescrever dados mais novos de outro aparelho.
5. Sair da conta: os dados locais continuam no aparelho e o app segue funcionando; entrar em outra conta nunca mistura dados das duas.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/db/migrations.ts` (editar) | migração v5: `uid`, `updated_at`, `deleted_at` nas tabelas sincronizadas + tabelas `sync_estado` e `sync_pendencias` |
| `src/db/repositorios/*.ts` (editar) | gravar `uid`/`updated_at`, trocar `DELETE` por exclusão lógica, filtrar `deleted_at IS NULL` nas leituras |
| `src/domain/sync/mescla.ts` (novo) | função pura: decide o que vence entre registro local e remoto |
| `src/domain/sync/registro.ts` (novo) | tipos e (de)serialização linha local ⇄ `RegistroSync`, tradução de chaves estrangeiras por `uid` |
| `src/services/sync/motor.ts` (novo) | push, pull, ordem por dependência, retomada |
| `src/services/sync/supabase.ts` (novo) | cliente Supabase e chamadas de rede (única camada que conhece o Supabase) |
| `src/services/conta.ts` (novo) | login, logout, sessão, primeira ligação |
| `src/store/useContaStore.ts` (novo) | estado: deslogado / logado / sincronizando / erro |
| `app/conta.tsx` (novo) | tela de login e da conta |
| `src/domain/tamanhoDaTela.ts` + `src/hooks/useTamanhoDaTela.ts` (novos) | compacto / médio / largo por largura da janela (só web) |
| `src/components/ui/Dialogo.tsx` + `src/utils/avisar.ts` (novos) | substituto de `Alert.alert` que funciona na web |
| `supabase/` (novo) | SQL da tabela `registros`, RLS e instruções de setup |
| `metro.config.js` (manter) | suporte ao `.wasm` na web |

---

## Fase 0 — Base web (sem conta)

Entrega: o app roda no navegador com tudo que já funciona no celular, menos lembretes. Detalhes do estudo estão na conversa de 2026-11-05.

### Tarefa 0.1: Diálogos que funcionam na web

**Files:**
- Create: `src/utils/avisar.ts`, `src/components/ui/Dialogo.tsx`, `src/utils/avisar.test.ts`
- Modify: os 12 arquivos que usam `Alert.alert` (app/pessoas.tsx, app/rendas/index.tsx, src/services/permissaoLembretes.ts, app/backup.tsx, app/reserva.tsx, app/boas-vindas.tsx, app/acertos.tsx, app/gasto-rapido.tsx, app/categorias.tsx, app/(tabs)/index.tsx, app/conta/[id].tsx, app/conta/nova.tsx)

**Interfaces:**
- Produces: `avisar(titulo: string, mensagem?: string, botoes?: BotaoAviso[]): void` com `BotaoAviso = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }` (mesma forma do `Alert.alert`, para troca direta). No celular chama `Alert.alert`; na web abre `Dialogo`.

- [ ] **Passo 1: teste** `avisar.test.ts`: com `Platform.OS = 'web'`, `avisar('Excluir?', 'x', [{text:'Excluir', onPress}])` publica um pedido no controlador de diálogos; acionar o botão chama `onPress` uma vez e fecha o diálogo.
- [ ] **Passo 2:** rodar `npx jest src/utils/avisar.test.ts`, esperar FALHA.
- [ ] **Passo 3:** implementar `avisar` e um controlador mínimo (lista de pedidos em Zustand); `Dialogo` lê o controlador e renderiza um `Modal` no tema do app. Montar `<Dialogo />` uma vez em `app/_layout.tsx`.
- [ ] **Passo 4:** rodar o teste, esperar PASSA.
- [ ] **Passo 5:** trocar todos os `Alert.alert(` por `avisar(` nos 12 arquivos. Verificar: `grep -rn "Alert.alert" app src` não retorna nada fora de `avisar.ts`.
- [ ] **Passo 6:** `npx tsc --noEmit && npx jest` passam. Commit `feat: diálogos que funcionam também no navegador`.

### Tarefa 0.2: Proteções de plataforma e abertura na web

**Files:**
- Modify: `src/components/Inicializacao.tsx`, `src/services/notificacoes.ts`, `src/services/permissaoLembretes.ts`, `app/configuracoes.tsx`, `app/boas-vindas.tsx`, `app.json`
- Keep: `metro.config.js` (commitar)

**Interfaces:**
- Produces: `lembretesDisponiveis: boolean` exportado de `src/services/notificacoes.ts` (`Platform.OS !== 'web'`). Quando falso, nenhuma chamada de `expo-notifications` é feita e as telas escondem a seção de lembretes.

- [ ] **Passo 1:** em `Inicializacao.tsx`, proteger `Appearance.setColorScheme` (`typeof === 'function'`) e só usar `useLastNotificationResponse` quando `lembretesDisponiveis`.
- [ ] **Passo 2:** `reagendarLembretes` e `permissaoLembretes` retornam cedo quando `!lembretesDisponiveis`. Esconder a seção "Lembretes" em Configurações e a pergunta de lembretes no onboarding na web.
- [ ] **Passo 3:** trocar `Linking.openSettings()` por no-op protegido na web.
- [ ] **Passo 4:** `app.json` → `web.output: "single"`; confirmar que `npx expo export -p web` termina sem erro.
- [ ] **Passo 5:** verificação manual: servir `dist` com os cabeçalhos `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp`, abrir, passar o onboarding e criar um gasto rápido. Esperado: sem erro no console além de avisos do React Native Web.
- [ ] **Passo 6:** commit `feat(web): abrir o app no navegador`.

### Tarefa 0.3: Backup na web, aba única e layout

**Files:**
- Modify: `src/services/backup.ts`, `app/backup.tsx`, `src/components/Inicializacao.tsx` (ou o componente da tela de erro de abertura), `app/_layout.tsx`
- Test: `src/services/backup.test.ts`

**Interfaces:**
- Produces: `baixarArquivo(nome: string, conteudo: string): Promise<void>` e `escolherArquivoTexto(): Promise<string | null>` em `src/services/backup.ts`, com versão web (Blob + `<a download>` e `<input type=file>`) e versão nativa (as de hoje).

- [ ] **Passo 1: teste** no ambiente web simulado: `baixarArquivo('x.json','{}')` cria um link com `download="x.json"` e o aciona. Esperado inicialmente: FALHA.
- [ ] **Passo 2:** implementar as duas funções por plataforma; `app/backup.tsx` passa a usá-las.
- [ ] **Passo 3:** a tela de erro de abertura reconhece o erro `createSyncAccessHandle` e mostra "O Fluxus já está aberto em outra aba. Feche a outra e tente de novo." em vez da mensagem técnica.
- [ ] **Passo 4:** em `app/_layout.tsx`, na web, limitar a largura do conteúdo a 480 px centralizado sobre o fundo do tema.
- [ ] **Passo 5:** `npx tsc --noEmit && npx jest` passam. Commit `feat(web): backup, aviso de aba duplicada e largura limitada`.

### Tarefa 0.4: Publicar a web (estática)

**Files:**
- Create: `public/_headers` (ou equivalente do host), `docs/web.md`

- [ ] **Passo 1:** escolher o host (decidido: Netlify, grátis; lê `public/_headers` e `public/_redirects`, e o build está no `netlify.toml`) e configurar build `npx expo export -p web`, saída `dist`.
- [ ] **Passo 2:** `_headers` com `COOP: same-origin` e `COEP: require-corp` para `/*`.
- [ ] **Passo 3:** verificação: abrir a URL publicada e confirmar que o SQLite abre e os dados persistem após recarregar.
- [ ] **Passo 4:** documentar no `docs/web.md` e no README. Commit `docs: como publicar a versão web`.

---

## Fase 0.5 — Layout para tablet e desktop (só web)

Entrega: no navegador o app se adapta à largura da janela, em vez de uma coluna fixa de 480 px. O celular (app e navegador) continua exatamente como está.

**Decisões desta fase**
- Três tamanhos, por largura da janela: `compacto` (< 600 px, celular), `medio` (600–1023 px, tablet) e `largo` (≥ 1024 px, desktop).
- `compacto`: igual a hoje, com abas embaixo.
- `medio`: abas embaixo, conteúdo centralizado com largura máxima de 720 px e cartões de resumo em grade.
- `largo`: menu lateral à esquerda no lugar das abas, conteúdo com largura máxima de 1100 px e Início e Contas em duas colunas.
- O app nativo (Android) nunca entra nos modos `medio` e `largo`: o tamanho só é calculado quando `Platform.OS === 'web'`.

### Tarefa 0.5.1: Tamanho da tela e contêiner responsivo

**Files:**
- Create: `src/domain/tamanhoDaTela.ts`, `src/hooks/useTamanhoDaTela.ts`, `__tests__/tamanhoDaTela.test.ts`
- Modify: `src/components/ColunaWeb.tsx` (passa a usar o tamanho, sem o 480 fixo)

**Interfaces:**
- Produces: `type TamanhoDaTela = 'compacto' | 'medio' | 'largo'`, `tamanhoDaTela(largura: number): TamanhoDaTela` e `LARGURA_MAXIMA: Record<TamanhoDaTela, number>` (`compacto: 480`, `medio: 720`, `largo: 1100`). `useTamanhoDaTela(): TamanhoDaTela` devolve sempre `'compacto'` fora da web.

- [ ] **Passo 1: teste:** `tamanhoDaTela(599)` → `'compacto'`; `tamanhoDaTela(600)` → `'medio'`; `tamanhoDaTela(1023)` → `'medio'`; `tamanhoDaTela(1024)` → `'largo'`; largura 0 ou negativa → `'compacto'`.
- [ ] **Passo 2:** `npx jest __tests__/tamanhoDaTela.test.ts`, esperar FALHA.
- [ ] **Passo 3:** implementar a função pura e o hook (`useWindowDimensions().width`, só na web). `ColunaWeb` usa `LARGURA_MAXIMA[tamanho]` e mantém o fundo cinza dos lados.
- [ ] **Passo 4:** esperar PASSA. Commit `feat(web): tamanho da tela e contêiner responsivo`.

### Tarefa 0.5.2: Menu lateral no desktop

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Test: verificação visual (Tarefa 0.5.5)

**Interfaces:**
- Consumes: `useTamanhoDaTela(): TamanhoDaTela`.

- [ ] **Passo 1:** em `largo`, as abas passam para a esquerda (`tabBarPosition: 'left'` do React Navigation, conferir na versão instalada; se não existir, rodapé vira barra lateral própria com os mesmos 5 itens e os mesmos ícones). Em `compacto` e `medio` nada muda.
- [ ] **Passo 2:** o menu lateral mostra ícone e nome de cada aba, destaca a ativa e tem largura fixa de 200 px; a largura do conteúdo (1100 px) é calculada descontando o menu.
- [ ] **Passo 3:** `npx tsc --noEmit && npx jest` passam. Commit `feat(web): menu lateral no desktop`.

### Tarefa 0.5.3: Início e Contas em várias colunas

**Files:**
- Modify: `app/(tabs)/index.tsx`, `app/(tabs)/contas.tsx` (e os componentes de `src/components/home/` que o precisarem)
- Create: `src/components/ui/DuasColunas.tsx`

**Interfaces:**
- Consumes: `useTamanhoDaTela`.
- Produces: `DuasColunas({ esquerda: ReactNode; direita: ReactNode }): JSX.Element` — em `largo` põe as duas lado a lado (esquerda 40%, direita 60%); em `compacto` e `medio` empilha, esquerda primeiro.

- [ ] **Passo 1:** Início: resumo do mês, entradas e totais na coluna esquerda; próximos vencimentos e gastos por categoria na direita. Em `medio`, os três cartões (Total mês, Já pago, Falta pagar) ficam em linha, como já estão.
- [ ] **Passo 2:** Contas: filtros e busca na esquerda, lista na direita (em `largo`); lista cheia em `medio`.
- [ ] **Passo 3:** o botão flutuante "+" fica dentro da área do conteúdo, não colado na borda da janela.
- [ ] **Passo 4:** `npx tsc --noEmit && npx jest` passam. Commit `feat(web): Início e Contas em duas colunas no desktop`.

### Tarefa 0.5.4: Demais telas, formulários e janelas

**Files:**
- Modify: `app/(tabs)/calendario.tsx`, `app/(tabs)/planejar.tsx`, `app/(tabs)/mais.tsx`, `src/components/ui/Dialogo.tsx`, os modais de `app/categorias.tsx`, `app/rendas/index.tsx` e `src/components/home/MenuAdicionar.tsx`

- [ ] **Passo 1:** Calendário e Planejar: usam a largura disponível (calendário com células maiores em `largo`; gráfico de Planejar sem esticar demais, máximo 720 px).
- [ ] **Passo 2:** telas de formulário (nova conta, gasto rápido, rendas, categorias, configurações, backup, boas-vindas): conteúdo com largura máxima de 560 px, centralizado, mesmo em `largo`.
- [ ] **Passo 3:** janelas (`Modal` de exclusão de categoria, valor recebido, menu do "+"): largura máxima de 440 px, centralizadas; o menu do "+" deixa de ocupar a tela toda em `medio` e `largo`.
- [ ] **Passo 4:** `npx tsc --noEmit && npx eslint . && npx jest` passam. Commit `feat(web): telas e janelas ajustadas para tablet e desktop`.

### Tarefa 0.5.5: Verificação nos três tamanhos

- [ ] **Passo 1:** exportar a web e, no Chrome, tirar capturas de Início, Contas, Calendário, Planejar, Mais e Gasto rápido em 390×844 (celular), 820×1180 (tablet) e 1280×800 (desktop).
- [ ] **Passo 2:** conferir: sem rolagem horizontal, nada cortado (principalmente rótulos das abas e o botão "+"), texto legível, nenhum elemento esticado além do máximo da largura.
- [ ] **Passo 3:** a 390 px a aparência deve ser idêntica à da Fase 0. Se algo mudou, é defeito.
- [ ] **Passo 4:** registrar em `docs/web.md` os três tamanhos. Commit `docs: tamanhos de tela da versão web`.

---

## Fase 1 — Dados prontos para sincronizar

Entrega: toda linha tem identidade global e data de mudança, e o banco registra sozinho o que mudou e o que foi excluído. Sem rede, sem Supabase ainda. **Feita no branch `feat/sync-fase-1`.**

> **Mudança em relação ao plano original (ruling):** em vez de trocar todo `DELETE` por exclusão lógica (`excluido_em`) em 7 repositórios e filtrar dezenas de consultas, a migração 5 usa **gatilhos do SQLite**. Eles preenchem `uid` e `atualizado_em`, anotam a linha em `sync_pendencias` e, ao excluir, gravam `sync_exclusoes(tabela, uid, excluido_em)` (inclusive nas exclusões em cascata). Os repositórios não mudam. Custo se estiver errado: o motor da Fase 3 lê a tabela de exclusões em vez de uma coluna.

### Regras que a Fase 3 deve respeitar
- **Linha aplicada pelo sync** deve ser gravada já com `uid` e `atualizado_em` (no `INSERT`) ou alterando `atualizado_em` no mesmo `UPDATE`. Assim os gatilhos não a marcam como pendência.
- **`configuracoes`** não tem `uid`: a chave identifica a linha. As chaves `notificacoesAtivas`, `notificacaoHora` e `notificacaoDiasAntes` são do aparelho e nunca sincronizam (`CONFIGURACOES_DO_APARELHO`).
- **Categorias de fábrica e a pessoa "Eu"** têm `uid` fixo (`padrao:categoria:<nome>`, `padrao:pessoa:eu`), para não duplicarem ao juntar aparelhos. A Tarefa 4.2(d) não precisa casar por nome.
- Dentro de gatilhos não se usa `OR REPLACE`/`OR IGNORE`: o SQLite os ignora quando a instrução que dispara tem o próprio tratamento de conflito (upsert). Usar `ON CONFLICT ... DO NOTHING/UPDATE`.
- **Importar backup** apaga tudo e reinsere: as linhas antigas viram exclusões e as novas ganham `uid` novo e entram como pendências. As categorias de fábrica e o "Eu" recuperam o `uid` fixo (`atribuirUidsFixos`), e uma linha que volta com o mesmo `uid` deixa de constar em `sync_exclusoes`.
- **Formato do backup** continua na versão 4 (`VERSAO_BACKUP`), então o app 1.1.0 ainda importa backups do app novo. Só subir essa versão se as colunas exportadas mudarem.

### Pendências de desenho para a Fase 3 (achadas na revisão da Fase 1)
- **Linhas geradas pelo próprio app em dois aparelhos** (`lancamentos` criados por `garantirMes`, `lancamentos_ignorados`, `rendas_recebidas`) saem com `uid` diferente em cada aparelho. O motor precisa **casar pela chave natural** (conta + mês; renda + mês) antes de inserir, ou os meses duplicam ou batem na restrição única. Tarefa 3.2 deve incluir esse casamento e um teste "dois aparelhos criam o mesmo mês".
- **Escrita do sync com a mesma data que a linha já tem** faz o gatilho de edição achar que foi a pessoa e marcar pendência, o que pode gerar um vai-e-volta. O motor deve ignorar linhas remotas com `atualizado_em` igual ou mais antigo (a regra de mescla já devolve `ja-igual`) e, se for preciso, usar uma marca `aplicando_remoto` em `sync_estado` checada pelos gatilhos.
- **`configuracoes`** não registra exclusão de chave (a importação de backup apaga e reinsere). Inofensivo hoje; tratar se alguma chave puder ser removida.

### Adiado (menor)
- Importar backup grande é ~2x mais lento com os gatilhos, e `sync_exclusoes` cresce a cada importação: limpar exclusões já enviadas ao servidor na Fase 3.
- A cópia automática antes de migrar pertence à Tarefa 4.2 (primeira ligação da conta), não à migração local.
- Testes que faltam: banco v4 com dados sujos (categoria padrão duplicada, "Eu" ausente), cascata em dois níveis, o mesmo SQL no wa-sqlite dentro do Jest.

### Tarefa 1.1: Migração v5 com rastreio por gatilhos — **feita**
`src/db/rastreioDeMudancas.ts` (`aplicarRastreioDeMudancas`, `TABELAS_COM_UID`, `CONFIGURACOES_DO_APARELHO`), `src/db/migrations.ts` (`VERSAO_BANCO = 5`), testes em `__tests__/rastreioDeMudancas.test.ts` (12 casos).

### Tarefa 1.2: Repositórios — **não precisou**
Só `pessoasRepo` passou a listar `id, nome` em vez de `SELECT *`, para não vazar as colunas novas.

---

## Fase 2 — Servidor (Supabase)

### Tarefa 2.1: Projeto, tabela e regras de acesso — arquivos prontos, falta aplicar

**Files:** `supabase/schema.sql`, `supabase/teste_isolamento.sql`, `supabase/README.md`, `.env.example`.

> **Ajuste em relação ao desenho anterior (ruling):** cada linha tem **duas horas**: `atualizado_em` (quando a pessoa mexeu, hora do aparelho limitada à hora do servidor; decide quem vence) e `recebido_em` (hora do servidor; é o marcador de novidades). Uma só hora não resolvia: usar a do servidor para decidir quem vence faria um aparelho offline por dias sobrescrever edições mais novas só por sincronizar depois. O relógio adiantado de um aparelho continua coberto, porque `atualizado_em` nunca passa de `now()`.

**Interfaces (o que a Fase 3 consome):**
- Tabela `registros(usuario_id, tabela, uid, dados jsonb, atualizado_em, excluido_em, recebido_em)`; só leitura das próprias linhas, nenhuma escrita direta.
- `enviar_registros(lote jsonb) returns jsonb` com `{ recebido_em, aplicados }`. Lote de até 500 itens `{ tabela, uid, dados | null, atualizado_em, excluido_em | null }`; só vale quando é mais novo que o do servidor.
- `buscar_registros(desde timestamptz, desde_tabela text, desde_uid text, limite int) returns setof registros`, em ordem `(recebido_em, tabela, uid)`; o marcador é a trinca da última linha recebida. O aparelho volta alguns segundos antes do marcador ao buscar (a mescla é idempotente).
- `excluir_meus_dados() returns integer`.

- [x] **Passo 1:** projeto criado pelo usuário (`skccrxynthlvdeuaomch`, São Paulo, plano grátis).
- [ ] **Passo 2:** o usuário cola `schema.sql` e depois `teste_isolamento.sql` no SQL Editor; o esperado é a mensagem `OK: todas as verificações passaram`.
- [ ] **Passo 3:** Auth por e-mail (código) e URLs de redirecionamento (`https://fluxus-financas.netlify.app`); Google fica para depois.
- [x] **Passo 4:** commit `feat(sync): schema do servidor`.

---

## Fase 3 — Motor de sincronização

### Tarefa 3.1: Regra de mescla (pura)

**Files:**
- Create: `src/domain/sync/mescla.ts`, `src/domain/sync/mescla.test.ts`

**Interfaces:**
- Produces: `decidir(local: MetaLinha | null, remoto: MetaLinha): 'aplicar-remoto' | 'manter-local' | 'ja-igual'` com `MetaLinha = { atualizadoEm: string; excluidoEm: string | null }`.

- [ ] **Passo 1: testes:** remoto mais novo → `aplicar-remoto`; local mais novo e ainda pendente → `manter-local`; iguais → `ja-igual`; local ausente → `aplicar-remoto`; remoto excluído e local editado depois → `manter-local` (edição vence exclusão mais antiga); empate de data → desempata pelo `uid` para os dois aparelhos chegarem ao mesmo resultado.
- [ ] **Passo 2:** rodar, FALHA. **Passo 3:** implementar. **Passo 4:** PASSA. Commit `feat(sync): regra de mescla`.

### Tarefa 3.2: Conversão linha ⇄ registro

**Files:**
- Create: `src/domain/sync/registro.ts`, `src/domain/sync/registro.test.ts`

**Interfaces:**
- Produces: `TABELAS_SYNC: readonly TabelaSync[]` na ordem de dependência (categorias, pessoas, contas, lancamentos, rendas, rendas_recebidas, divisoes, lancamentos_ignorados, reserva_meta, reserva_aportes, configuracoes), `paraRegistro(tabela, linha, mapaUid): RegistroSync` e `paraLinha(tabela, registro, resolverId): LinhaLocal`. Chaves estrangeiras (`categoria_id`, `conta_id`, `pessoa_id`...) viajam como `*_uid`.

- [ ] **Passo 1: testes:** ida e volta de cada tabela devolve a linha original (exceto `id` local); uma FK cujo pai ainda não existe localmente sinaliza `PaiAusente` em vez de gravar `NULL`; chaves de `configuracoes` fora da lista permitida são recusadas.
- [ ] **Passo 2:** FALHA → implementar → PASSA. Commit `feat(sync): conversão de registros`.

### Tarefa 3.3: Push, pull e retomada

**Files:**
- Create: `src/services/sync/supabase.ts`, `src/services/sync/motor.ts`, `src/services/sync/motor.test.ts`
- Test doubles: `src/services/sync/rede.fake.ts`

**Interfaces:**
- Consumes: `decidir`, `paraRegistro`, `paraLinha`, `TABELAS_SYNC`.
- Produces: `interface Rede { enviar(lote: RegistroSync[]): Promise<string>; buscar(desde: string | null, limite: number): Promise<RegistroSync[]> }` (implementada por `supabase.ts` e por `rede.fake.ts`) e `sincronizar(db, rede): Promise<ResultadoSync>` com `ResultadoSync = { enviados: number; recebidos: number; erro: string | null }`. Guarda o marcador de pull em `sync_estado('ultimo_pull')`.

- [ ] **Passo 1: testes com rede falsa** (cada um cobre uma linha do Review Focus):
  - dois bancos A e B, A cria conta, `sincronizar` nos dois → B tem a conta, e `sincronizar` de novo não duplica;
  - A e B editam a mesma conta offline, B depois de A → ambos terminam com a edição de B;
  - A exclui uma conta → B perde a conta e o total do mês bate nos dois;
  - rede falha na metade do push → pendências não enviadas continuam em `sync_pendencias` e a próxima chamada termina sem duplicar;
  - relógio local adiantado em A não faz A vencer a edição mais nova de B (vale o tempo devolvido pelo servidor);
  - pull com pai ausente adia o filho para o fim da rodada e não perde dado.
- [ ] **Passo 2:** rodar, FALHA.
- [ ] **Passo 3:** implementar. Ordem: push das pendências (em lotes de 200, por `TABELAS_SYNC`), depois pull paginado a partir de `ultimo_pull`, aplicando em transação por lote e avançando o marcador só depois do commit.
- [ ] **Passo 4:** PASSA. `supabase.ts` implementa `Rede` com as RPCs da Tarefa 2.1 (verificação manual com um projeto real: criar conta no celular de teste, ver no outro).
- [ ] **Passo 5:** commit `feat(sync): motor de sincronização`.

### Tarefa 3.4: Quando sincronizar

**Files:**
- Modify: `src/components/Inicializacao.tsx`, `src/store/useMesStore.ts`
- Create: `src/store/useContaStore.ts`
- Test: `src/store/useContaStore.test.ts`

**Interfaces:**
- Produces: `useContaStore` com `estado: 'deslogado' | 'logado' | 'sincronizando' | 'erro'`, `ultimaSync: string | null`, `sincronizarAgora(): Promise<void>`. Gatilhos: ao abrir o app, ao voltar ao primeiro plano, 3 s depois da última mudança (debounce) e a cada 60 s com o app aberto. Nunca em paralelo (uma rodada por vez).

- [ ] **Passo 1: testes:** duas chamadas seguidas viram uma rodada; sem sessão não faz nada; erro de rede muda o estado para `erro` sem lançar exceção para a tela.
- [ ] **Passo 2:** FALHA → implementar → PASSA. Depois de cada rodada que recebeu dados, chamar `carregarMes` e reagendar lembretes (só no celular). Commit `feat(sync): gatilhos de sincronização`.

---

## Fase 4 — Conta e telas

### Tarefa 4.1: Login e sessão

**Files:**
- Create: `src/services/conta.ts`, `src/services/conta.test.ts`, `app/conta.tsx`
- Modify: `app/(tabs)/mais.tsx` (item "Conta"), `.env.example`

**Interfaces:**
- Produces: `entrarComEmail(email: string): Promise<void>` (envia o código), `confirmarCodigo(email: string, codigo: string): Promise<void>`, `entrarComGoogle(): Promise<void>`, `sair(): Promise<void>`, `usuarioAtual(): Promise<{ id: string; email: string } | null>`. Sessão persistida em `expo-secure-store` no celular e em `localStorage` na web.

- [ ] **Passo 1: testes (com cliente Supabase simulado):** e-mail inválido é recusado antes de chamar a rede; código errado mostra "Código incorreto" e não muda o estado; `sair` limpa a sessão mas não toca nas tabelas locais.
- [ ] **Passo 2:** FALHA → implementar → PASSA.
- [ ] **Passo 3:** tela `app/conta.tsx`: deslogado mostra os benefícios em uma frase e os botões; logado mostra e-mail, "Última sincronização", "Sincronizar agora", "Sair" e "Excluir minha conta e dados da nuvem".
- [ ] **Passo 4:** commit `feat(conta): login por e-mail e Google`.

### Tarefa 4.2: Primeira ligação da conta

**Files:**
- Modify: `src/services/conta.ts`, `src/services/sync/motor.ts`
- Test: `src/services/sync/primeiraLigacao.test.ts`

**Interfaces:**
- Produces: `ligarConta(db, rede, usuarioId): Promise<'novo' | 'mesclado'>`. Marca todas as linhas locais como pendentes (`sync_pendencias`) e roda `sincronizar`. Grava `sync_estado('usuario_id')`.

- [ ] **Passo 1: testes:** (a) conta vazia na nuvem → tudo local sobe, resultado `novo`; (b) conta com dados de outro aparelho → os dois conjuntos aparecem juntos, nada some, resultado `mesclado`; (c) entrar com **outro** usuário num aparelho que já ligou um usuário diferente → recusa e orienta "Este aparelho já está ligado a outra conta" (Review Focus 5); (d) categorias padrão iguais nos dois lados não duplicam (casar por `nome` das categorias do app antes de criar `uid` novo).
- [ ] **Passo 2:** FALHA → implementar → PASSA.
- [ ] **Passo 3:** antes da primeira ligação, gerar automaticamente um backup local (função de `backup.ts`) e avisar "Fizemos uma cópia de segurança". Commit `feat(conta): primeira ligação com mescla segura`.

---

## Fase 5 — Lançamento

### Tarefa 5.1: Testes de ponta a ponta e segurança

- [ ] **Passo 1:** roteiro manual com dois aparelhos reais (celular + navegador): criar conta no navegador, ver no celular em até 1 min; editar nos dois offline e reconectar; excluir uma categoria com contas; sair e entrar de novo.
- [ ] **Passo 2:** revisão de RLS: tentar ler dados de outro usuário com a `anon key` e um token de outra conta (esperado: 0 linhas).
- [ ] **Passo 3:** política de privacidade curta (o que vai para a nuvem: contas, rendas, valores, nome; nada de dados bancários) e fluxo de exclusão da conta (apaga `registros` do usuário e o usuário no Auth).
- [ ] **Passo 4:** `npx tsc --noEmit && npx eslint . && npx jest` passam.

### Tarefa 5.2: Versão e release

- [ ] **Passo 1:** subir para 1.2.0 / versionCode 10 em `app.json`; atualizar README (seção Conta e Web) e `docs/web.md`.
- [ ] **Passo 2:** publicar a web (Tarefa 0.4) apontando para o projeto Supabase de produção.
- [ ] **Passo 3:** build do APK **somente quando o usuário pedir** (regra de memória), de preferência na nuvem. Release `v1.2.0` com o APK; manter a chave de assinatura (`~/fluxus-chave/fluxus-release.jks`) com cópia fora do PC.

---

## Ordem e entregas

| Fase | Entrega | Vale sozinha? |
|---|---|---|
| 0 | Fluxus no navegador, sem conta | Sim |
| 0.5 | Layout para tablet e desktop | Sim |
| 1 | Dados prontos para sync, app igual | Sim (invisível) |
| 2 | Servidor seguro | Não |
| 3 | Motor testado com rede falsa | Não |
| 4 | Login e ligação da conta | **Sim: a mesma conta funciona** |
| 5 | Teste real e release | Sim |

## Riscos conhecidos

- **Migração v5 mexe em todas as tabelas.** Mitigação: teste com backup real do usuário e cópia automática antes de migrar.
- **Duas fontes de verdade nas categorias padrão.** Mitigação: casar por nome na primeira ligação (Tarefa 4.2d).
- **Aba única na web** continua valendo; a sync não resolve isso.
- **Custo:** o plano grátis do Supabase basta para uso pessoal/familiar. Projetos gratuitos pausam por inatividade — se for abrir para outras pessoas, considerar o plano pago.
- **Esforço total:** Fase 0 pequena; Fases 1–3 são o miolo e a parte mais arriscada; Fase 4 média.

## Autoavaliação

- Cobertura: login, mesma conta nos dois lados, offline, conflito, exclusão, dados antigos, web e release têm tarefa.
- Review Focus 1–5 têm teste nas Tarefas 3.3, 4.2 e 5.1.
- Tipos conferidos entre tarefas: `MetaLinha`, `RegistroSync`, `Rede`, `TABELAS_SYNC`, `marcarMudanca`.

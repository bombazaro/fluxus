# Fluxus - Plano de Execução

App mobile de controle de contas a pagar. 100% offline, dados no próprio celular (SQLite), instalação via APK em dois celulares Android.

**Stack:** Expo, TypeScript, Expo Router, expo-sqlite, Zustand, expo-notifications, react-native-svg.

> **Mudança no caminho:** o plano previa `react-native-gifted-charts`, mas os gráficos acabaram feitos com `View`s simples e `react-native-svg`. Ficou mais leve, segue o tema sem configuração e evitou uma dependência a mais. A biblioteca foi removida.

---

## 1. Visão geral

### O que o app faz

O usuário cadastra contas e rendas. O app calcula sozinho: total do mês, o que já foi pago, o que falta e quanto sobra da renda.

### Princípios do projeto

- **Simples primeiro:** cada etapa entrega algo que já funciona no celular.
- **Offline de verdade:** nada de servidor, login ou internet.
- **Dinheiro em centavos:** valores guardados como número inteiro (R$ 10,50 vira 1050). Isso evita erros de arredondamento.
- **Cálculo em um lugar só:** todas as contas de somar, comparar e prever ficam em `src/domain/`, longe das telas. Assim dá para testar.
- **Sem nuvem, com backup manual:** não há sincronização. Para não perder dados ao desinstalar ou trocar de celular, o usuário exporta um arquivo de backup (Mais > Backup dos dados) e importa quando precisar. O aviso de que os dados ficam só no celular aparece nessa tela.

### Ordem de construção

| Etapa | Entrega                                  |
| ----- | ---------------------------------------- |
| 0     | Projeto criado e rodando no celular      |
| 1     | Design base e menu inferior              |
| 2     | Banco de dados                           |
| 3     | Cadastro de contas e cálculo do mês      |
| 4     | Rendas                                   |
| 5     | Calendário de vencimentos                |
| 6     | Aviso de aperto e notificações           |
| 7     | Comparação com o mês anterior e previsão |
| 8     | Reserva de emergência                    |
| 9     | Simulador de parcelas                    |
| 10    | Contas compartilhadas                    |
| 11    | Acabamento e qualidade                   |
| 12    | APK nos celulares e portfólio            |

### Padrão de commits (Conventional Commits)

**Formato:**

```
tipo(escopo): descrição curta no imperativo
```

Regras simples:

- O **tipo** fica em inglês (é o padrão mundial). A **descrição** fica em português, em letra minúscula, sem ponto final, com até 72 caracteres.
- O **escopo** é opcional e diz a área mexida: `db`, `ui`, `nav`, `tema`, `store`, `domain`, `home`, `contas`, `rendas`, `calendario`, `notificacoes`, `config`, `graficos`, `planejar`, `reserva`, `simulador`, `pessoas`, `acertos`, `onboarding`, `a11y`, `release`, `build`.
- Escrever no imperativo: "adicionar", "corrigir", "criar" (e não "adicionei" ou "adicionando").
- **Um commit = uma ideia.** Se a frase precisa de "e" para explicar, provavelmente são dois commits.

| Tipo       | Quando usar                                   | Exemplo                                                      |
| ---------- | --------------------------------------------- | ------------------------------------------------------------ |
| `feat`     | Funcionalidade nova que o usuário percebe     | `feat(contas): marcar conta como paga`                       |
| `fix`      | Correção de erro                              | `fix(domain): usar último dia do mês quando vencimento é 31` |
| `refactor` | Reorganizar código sem mudar o comportamento  | `refactor(contas): extrair item da lista para componente`    |
| `test`     | Criar ou ajustar testes                       | `test(domain): cobrir resumo do mês com renda zero`          |
| `docs`     | README, plano, comentários                    | `docs: adicionar prints ao README`                           |
| `style`    | Só formatação ou visual do código, sem lógica | `style: aplicar prettier nos arquivos`                       |
| `perf`     | Melhorar desempenho                           | `perf(contas): usar FlatList com índice por mês`             |
| `chore`    | Configuração, dependências, ferramentas       | `chore: instalar expo-sqlite`                                |
| `build`    | Mudanças de build e APK                       | `build: adicionar perfil preview no eas.json`                |

**Mudança que quebra o que existia** (ex.: trocar a estrutura do banco): colocar `!` depois do tipo.
`feat(db)!: separar contas e lançamentos em tabelas distintas`

### Quando fazer commit

Faça commit **sempre que uma pequena parte funcionar**, e nunca com o app quebrado. Na prática:

1. **Antes de commitar:** o app abre, `npx tsc --noEmit` não dá erro, `npm run lint` não dá erro e (a partir da Etapa 3) `npm test` passa.
2. **Depois de cada passo concluído** do plano (cada tópico de "Passos" costuma ser um commit).
3. **Antes de começar algo arriscado** (migração do banco, mudar o cálculo do resumo): commite o que está funcionando, para poder voltar.
4. **Fim do dia:** commite e dê `git push`, mesmo que a etapa não tenha terminado (use o último commit que funciona; trabalho pela metade fica em uma branch).
5. **Migrações do banco ficam em commit separado**, sempre antes da tela que usa a tabela nova.
6. **Função de cálculo e o teste dela** podem ir no mesmo commit ou em dois seguidos (`feat` e `test`).
7. **Não misturar** ajuste de formatação com mudança de lógica no mesmo commit.

**Comandos do dia a dia:**

```bash
git status                      # ver o que mudou
git add src/domain/resumoDoMes.ts __tests__/resumoDoMes.test.ts
git commit -m "feat(domain): calcular resumo do mês"
git push
```

Evite `git add .` sem olhar o `git status`: é assim que arquivos como a chave de assinatura (keystore) ou o `.env` vão parar no GitHub.

**Branches (opcional, mas bom para portfólio):** uma branch por etapa (`etapa-3-contas`), depois unir na `main` com `git merge`. Se preferir ficar só na `main`, tudo bem para projeto individual.

**Tags de versão** ao fim de marcos importantes:

```bash
git tag -a v0.1.0 -m "Etapa 3: cadastro de contas e resumo do mês"
git push --tags
```

Marcos sugeridos: `v0.1.0` (Etapa 3), `v0.2.0` (Etapa 6), `v0.3.0` (Etapa 9), `v1.0.0` (Etapa 12).

---

## 2. Design e experiência de uso

### 2.1 Menu inferior (Expo Router Tabs)

Cinco abas, no máximo. Mais que isso fica apertado no celular.

| Aba        | Ícone       | Conteúdo                              |
| ---------- | ----------- | ------------------------------------- |
| Início     | casa        | Resumo do mês, gráfico, avisos        |
| Contas     | lista       | Todas as contas do mês, filtros       |
| Calendário | calendário  | Vencimentos por dia                   |
| Planejar   | gráfico     | Previsão, simulador, reserva          |
| Mais       | três pontos | Rendas, compartilhadas, configurações |

Regras do menu:

- Ícones com texto embaixo (nunca só ícone).
- Aba ativa com cor de destaque e ícone preenchido.
- Altura mínima de 56 dp e respeitar a área segura do aparelho (`react-native-safe-area-context`).
- **Botão flutuante "+"** (FAB) nas telas Início e Contas para cadastrar conta rápido, no canto inferior direito, acima do menu.

### 2.2 Identidade visual

- **Cor principal:** um verde-azulado (ex.: `#0F766E`) para transmitir calma e dinheiro sob controle.
- **Semântica de cores (sempre as mesmas em todo o app):**
  - Verde: pago, sobra, positivo
  - Amarelo: vence em breve
  - Vermelho: atrasado, aperto, negativo
  - Cinza: neutro, desativado
- **Modo claro e escuro:** seguir o tema do celular (`useColorScheme`). Criar as cores em um arquivo só (`src/theme/colors.ts`) com os dois temas.
- **Tipografia:** uma fonte só (Inter via `@expo-google-fonts/inter`). Tamanhos: título 24, subtítulo 18, texto 16, legenda 13. Valores em dinheiro em negrito.
- **Espaçamento:** escala fixa de 4 (4, 8, 12, 16, 24, 32). Nada de números soltos no código.
- **Cantos arredondados:** cartões com raio 16, botões com raio 12.

### 2.3 Boas práticas de interação

- **Alvos de toque** com no mínimo 48x48 dp.
- **Marcar como pago com um toque** direto na lista (checkbox grande ou deslizar), com vibração leve (`expo-haptics`).
- **Desfazer:** ao excluir ou marcar pago, mostrar aviso "Desfazer" por 5 segundos.
- **Estados vazios amigáveis:** tela sem contas mostra ilustração simples + frase + botão "Cadastrar primeira conta".
- **Carregamento:** esqueleto cinza (skeleton) em vez de tela em branco.
- **Formulários:**
  - Teclado numérico para valores, com máscara de moeda (R$ 1.234,56).
  - Seletor de data nativo (`@react-native-community/datetimepicker`).
  - Erros embaixo do campo, em vermelho, com texto claro ("Informe um valor maior que zero").
  - Botão salvar fixo embaixo, desativado até o formulário estar válido.
  - `KeyboardAvoidingView` para o teclado não cobrir o campo.
- **Confirmação** só para ações destrutivas (excluir conta, apagar tudo).
- **Acessibilidade:** `accessibilityLabel` em ícones e botões, contraste mínimo 4.5:1, não depender só de cor (usar também ícone/texto: "Pago", "Atrasado").
- **Feedback visual:** animações curtas (150 a 250 ms) com `react-native-reanimated` só onde ajudam (barra de progresso, troca de aba).
- **Formatação brasileira:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` e datas dd/mm/aaaa. Criar funções `formatarMoeda` e `formatarData` em `src/utils/`.

### 2.4 Tela Início (a mais importante)

De cima para baixo:

1. Seletor de mês (setas < Maio 2026 >).
2. **Cartão grande:** "Sobra do mês" com o valor e uma barra de progresso (renda usada).
3. **Três cartões pequenos:** Total do mês | Já pago | Falta pagar.
4. **Aviso de aperto** (se houver), em faixa vermelha clicável.
5. **Próximos vencimentos** (3 a 5 contas).
6. Gráfico de rosca ou barras por categoria.
7. FAB "+".

---

## 3. Etapa 0 - Preparar o projeto

**Objetivo:** projeto vazio rodando no celular.

Passos:

1. Instalar Node.js (versão LTS) e Android Studio (para o `adb` e o SDK).
2. Criar o projeto:
   ```bash
   npx create-expo-app@latest fluxus --template tabs
   cd fluxus
   ```
3. Ativar o modo de desenvolvedor e a **depuração USB** nos dois celulares.
4. Rodar no celular: `npx expo run:android` (cria um "development build").
   > Usar development build e **não** o Expo Go, porque as notificações (`expo-notifications`) não funcionam direito no Expo Go no Android.
5. Instalar as bibliotecas:
   ```bash
   npx expo install expo-sqlite expo-notifications expo-haptics expo-font \
     react-native-svg expo-linear-gradient react-native-reanimated \
     react-native-safe-area-context @react-native-community/datetimepicker
   npm install zustand react-native-gifted-charts
   npm install @expo-google-fonts/inter
   ```
6. Conferir o `tsconfig.json` com `"strict": true`.
7. Configurar ESLint e Prettier.
8. Iniciar o Git e fazer o primeiro commit. Criar o repositório no GitHub (importante para o portfólio).
9. Remover as telas de exemplo do template.

**Pronto quando:** app abre no celular com as abas vazias.

**Commits desta etapa:**

| Quando                                                                    | Mensagem                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------------------- |
| Logo após criar o projeto (passo 2), antes de mexer em qualquer coisa     | `chore: criar projeto Expo com template de abas`          |
| Depois de instalar as bibliotecas (passo 5)                               | `chore: instalar dependências do projeto`                 |
| Depois de configurar TypeScript estrito, ESLint e Prettier (passos 6 e 7) | `chore: configurar typescript estrito, eslint e prettier` |
| Depois de remover as telas de exemplo (passo 9)                           | `refactor: remover telas de exemplo do template`          |

---

## 4. Etapa 1 - Design base e navegação

**Objetivo:** esqueleto bonito, sem dados ainda.

Passos:

1. Criar a estrutura de pastas (seção 16 deste documento).
2. Criar `src/theme/` com `colors.ts` (claro e escuro), `spacing.ts`, `typography.ts`.
3. Criar o hook `useTema()` que devolve as cores do tema atual.
4. Carregar a fonte Inter em `app/_layout.tsx` e segurar a tela de abertura (`SplashScreen`) até carregar.
5. Configurar as 5 abas em `app/(tabs)/_layout.tsx` com ícones (`@expo/vector-icons`, conjunto Ionicons).
6. Criar telas vazias para cada aba, só com o título.
7. Criar os **componentes base** em `src/components/ui/`:
   - `Cartao` (caixa com sombra leve e cantos arredondados)
   - `Botao` (variações: principal, secundário, perigo)
   - `CampoTexto` e `CampoMoeda`
   - `Etiqueta` (selo colorido: Pago, Atrasado, Fixa...)
   - `EstadoVazio`
   - `BarraProgresso`
   - `Fab` (botão flutuante)
8. Criar a rota de cadastro como **modal** (`app/conta/nova.tsx` com `presentation: 'modal'`).
9. Conferir tudo nos dois temas (claro e escuro).

**Pronto quando:** dá para navegar entre as abas, abrir o modal do "+" e tudo parece um app de verdade.

**Commits desta etapa:**

| Quando                                                                                       | Mensagem                                                               |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Depois de criar `colors.ts`, `spacing.ts`, `typography.ts` e o hook `useTema` (passos 2 e 3) | `feat(tema): adicionar cores, espaçamento e tipografia`                |
| Depois de carregar a fonte Inter e segurar a splash (passo 4)                                | `feat(tema): carregar fonte Inter e splash screen`                     |
| Depois de criar as 5 abas com ícones e telas vazias (passos 5 e 6)                           | `feat(nav): criar menu inferior com cinco abas`                        |
| Depois de `Cartao`, `Botao`, `CampoTexto`, `CampoMoeda`, `Etiqueta`                          | `feat(ui): criar componentes base de cartão, botão, campos e etiqueta` |
| Depois de `EstadoVazio`, `BarraProgresso`, `Fab`                                             | `feat(ui): criar estado vazio, barra de progresso e botão flutuante`   |
| Depois de criar a rota modal de cadastro (passo 8)                                           | `feat(nav): criar modal de cadastro de conta`                          |

---

## 5. Etapa 2 - Banco de dados (SQLite)

**Objetivo:** salvar e ler dados no celular.

### 5.1 Tabelas

```
rendas
  id, nome, valor_centavos, dia_recebimento (1-31),
  tipo ('fixa' | 'variavel' | 'pontual'), mes_ref (só para 'pontual'),
  ativa, criado_em

rendas_recebidas       (uma linha por renda em cada mês em que caiu)
  id, renda_id, mes_ref, valor_centavos, recebida_em
  UNIQUE (renda_id, mes_ref)

contas
  id, nome, categoria_id, tipo, valor_centavos,
  dia_vencimento (1-31), data_unica (só para tipo 'unica'),
  parcelas_total, data_inicio, data_fim (opcional), ativa,
  compartilhada, sem_vencimento (0/1), criado_em

lancamentos            (uma linha por conta em cada mês)
  id, conta_id, mes_ref ('2026-05'), vencimento ('2026-05-10'),
  valor_centavos, pago (0/1), pago_em, parcela_numero

lancamentos_ignorados  (meses excluídos com "só este mês" em contas fixas/variáveis)
  conta_id, mes_ref     PRIMARY KEY (conta_id, mes_ref)

categorias
  id, nome, cor, icone

reserva_meta
  id, valor_meta_centavos, tipo_meta ('fixo' | 'meses_gastos'), meses_gastos

reserva_aportes
  id, valor_centavos, data, observacao

pessoas                (para contas compartilhadas)
  id, nome

divisoes
  id, lancamento_id, pessoa_id, valor_centavos, pago
```

`tipo` da conta: `unica`, `fixa`, `parcelada`, `variavel`.

> **Versões do banco:** a versão 1 (`user_version = 1`) já cria todas as tabelas acima, inclusive as de reserva, pessoas e divisões, para as etapas 8 e 10 não precisarem de migração. A versão 2 adiciona `rendas.mes_ref`, a restrição única em `rendas_recebidas` e a tabela `lancamentos_ignorados`. A versão 3 adiciona `contas.sem_vencimento`. Daqui em diante, **toda** mudança no banco é uma nova versão em `migrations.ts` (nunca editar o `SCHEMA_V1`, porque quem já instalou o app não roda ele de novo).

### 5.2 Por que existe a tabela `lancamentos`

A **conta** é o cadastro ("Internet, R$ 100, todo dia 10"). O **lançamento** é a cobrança de um mês específico ("Internet de maio, R$ 100, não paga"). Assim cada mês tem seu valor e seu "pago", e a conta variável pode ter valor diferente a cada mês.

### 5.3 Passos

1. Criar `src/db/schema.ts` com os comandos `CREATE TABLE`.
2. Criar `src/db/migrations.ts` usando `PRAGMA user_version` para controlar a versão do banco. Cada mudança futura vira uma nova migração (importante: sem backup, **nunca** apagar e recriar o banco numa atualização do app).
3. Abrir o banco com `SQLiteProvider` no `app/_layout.tsx` e rodar as migrações na inicialização.
4. Ativar chaves estrangeiras: `PRAGMA foreign_keys = ON`.
5. Criar **repositórios** em `src/db/repositorios/`: `contasRepo.ts`, `lancamentosRepo.ts`, `rendasRepo.ts`, `categoriasRepo.ts`, `reservaRepo.ts`, `pessoasRepo.ts`, `divisoesRepo.ts`. Só eles falam com o SQL. As telas e o `src/domain/` nunca escrevem SQL.
6. Inserir as categorias padrão (Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Assinaturas, Outros) na primeira abertura.
7. Testar: criar uma conta de teste, fechar o app, abrir de novo e ver se continua lá.

**Pronto quando:** os dados sobrevivem a fechar o app.

**Commits desta etapa:**

| Quando                                                                           | Mensagem                                                                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Depois de escrever as tabelas e a migração com `user_version` (passos 1 e 2)     | `feat(db): criar schema e migrações com user_version`                                                                          |
| Depois de abrir o banco com `SQLiteProvider` e rodar as migrações (passos 3 e 4) | `feat(db): abrir banco no início do app e ativar chaves estrangeiras`                                                          |
| Depois de cada repositório funcionando                                           | `feat(db): criar repositório de contas`, `feat(db): criar repositório de lançamentos`, `feat(db): criar repositório de rendas` |
| Depois de inserir as categorias padrão (passo 6)                                 | `feat(db): inserir categorias padrão na primeira abertura`                                                                     |

---

## 6. Etapa 3 - Cadastro de contas e cálculo do mês (primeira entrega do portfólio)

**Objetivo:** o coração do app.

### 6.1 Tipos de conta e como se comportam

| Tipo        | Exemplo     | Regra                                                       |
| ----------- | ----------- | ----------------------------------------------------------- |
| Única       | IPVA        | Gera 1 lançamento na data escolhida                         |
| Fixa mensal | Aluguel     | Gera 1 lançamento por mês, mesmo valor, até ser desativada  |
| Parcelada   | Celular 10x | Gera N lançamentos (um por mês), com "parcela 3/10"         |
| Variável    | Luz, água   | Gera 1 por mês; valor sugerido pela média dos últimos meses |

### 6.2 Geração dos lançamentos

- Criar `src/domain/gerarLancamentos.ts` (funções puras: datas, dia 31, lista de lançamentos de uma conta nova).
- Ao cadastrar uma conta parcelada, já gerar todas as parcelas. Salvar a conta e os lançamentos numa **transação** (ou tudo, ou nada).
- Para fixas e variáveis, gerar o lançamento do mês **quando o mês é aberto** (função `garantirMes('2026-05')` em `lancamentosRepo`, porque ela usa o banco; chamada ao abrir o app e ao trocar de mês). Ela só cria o que ainda não existe, então pode rodar quantas vezes quiser sem duplicar.
- `garantirMes` **não recria** meses excluídos com "só este mês" (tabela `lancamentos_ignorados`) e, em conta compartilhada, copia a divisão do último lançamento da conta.
- Dia 31 em mês com 30 dias (ou fevereiro): usar o último dia do mês.
- **Conta sem data de vencimento** (`sem_vencimento = 1`): o lançamento fica no último dia do mês, aparece na seção "Sem vencimento" e só vira atrasada se o mês acabar sem pagar. Não gera lembrete (Etapa 6) nem pontinho no calendário.

### 6.3 Conta variável com sugestão

- Criar `src/domain/sugerirValor.ts`: média (pura) dos últimos 3 meses (ou 6, configurável) dos lançamentos **pagos** daquela conta. A busca no banco fica no repositório (`lancamentosRepo.listarPagosDaConta`).
- Ao abrir o lançamento do mês, mostrar "Sugestão: R$ 187,40 (média dos últimos 3 meses)" com um botão "Usar".
- Se não houver histórico, pedir o valor manualmente.

### 6.4 Cálculo do mês

Criar `src/domain/resumoDoMes.ts` com uma função pura:

```ts
resumoDoMes(lancamentos, rendas) => {
  totalContas,      // soma de todos os lançamentos do mês
  totalPago,        // soma dos pagos
  faltaPagar,       // totalContas - totalPago
  rendaTotal,       // soma das rendas ativas
  sobra,            // rendaTotal - totalContas
  sobraAtual,       // rendaTotal - totalPago (quanto ainda tem em mãos)
  percentualUsado   // totalContas / rendaTotal (0 se não houver renda nem contas)
}
```

Escrever **testes** para essa função. Todo o resto do app depende dela. Instalar `jest` e `jest-expo` **nesta etapa** (é a primeira que tem testes); a Etapa 11 só completa os casos de borda.

### 6.5 Telas e passos

1. **Estado (Zustand):** `src/store/useMesStore.ts` guarda o mês selecionado, os lançamentos e o resumo. Ações: `trocarMes`, `carregar`, `marcarPago`, `desmarcarPago`.
2. **Formulário** (`app/conta/nova.tsx`):
   - Escolher o tipo primeiro (4 botões grandes com ícone e explicação curta).
   - Campos mudam conforme o tipo (parcelada pede número de parcelas; única pede data; fixa e variável pedem dia do vencimento).
   - Categoria em lista horizontal de "chips" coloridos.
   - Validação com mensagens claras.
3. **Lista de contas** (aba Contas):
   - Agrupada por situação: "Atrasadas", "Esta semana", "Mais adiante", "Pagas".
   - Cada item: ícone da categoria, nome, vencimento, valor, etiqueta de situação, botão de pago.
   - Filtros no topo: Todas | Pendentes | Pagas | por categoria.
   - Busca por nome.
4. **Detalhe da conta** (`app/conta/[id].tsx`): editar, desativar, excluir; histórico de valores (para as variáveis).
5. **Tela Início** com os cartões do resumo (seção 2.4).
6. **Editar/excluir:** perguntar o escopo - "só este mês" ou "este e os próximos".
   - Excluir "só este mês": apaga o lançamento e registra em `lancamentos_ignorados` (senão o `garantirMes` recria).
   - Excluir "este e os próximos": encerra a conta (`data_fim` no fim do mês anterior) e apaga os lançamentos **não pagos** a partir deste mês. O histórico pago fica, para os meses passados não mudarem. Se não sobrar nenhum lançamento, apaga a conta.
   - Editar valor "este e os próximos": atualiza a conta e também os lançamentos não pagos já gerados dos meses seguintes.
7. **Conta atrasada:** vencimento anterior a hoje e não paga. Marcar com etiqueta vermelha.

**Pronto quando:** cadastra os 4 tipos, marca como pago, e os números do Início atualizam na hora e batem com uma conta feita na mão.

**Commits desta etapa** (nesta ordem: primeiro o cálculo com teste, depois a tela):

| Quando                                                          | Mensagem                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Função `resumoDoMes` escrita                                    | `feat(domain): calcular resumo do mês`                                 |
| Teste dela passando                                             | `test(domain): cobrir resumo do mês`                                   |
| `gerarLancamentos` e `garantirMes` prontos, com teste do dia 31 | `feat(domain): gerar lançamentos de contas únicas, fixas e parceladas` |
| `sugerirValor` pronto                                           | `feat(domain): sugerir valor de conta variável pela média`             |
| Store do mês criada                                             | `feat(store): criar store do mês com Zustand`                          |
| Formulário funcionando para os 4 tipos                          | `feat(contas): criar formulário de cadastro por tipo`                  |
| Lista agrupada por situação, com filtros e busca                | `feat(contas): listar contas agrupadas por situação`                   |
| Botão de pago com vibração e "desfazer"                         | `feat(contas): marcar conta como paga`                                 |
| Editar e excluir com escolha de escopo                          | `feat(contas): editar e excluir conta`                                 |
| Detalhe da conta                                                | `feat(contas): criar tela de detalhe da conta`                         |
| Cartões do resumo na tela Início                                | `feat(home): mostrar resumo do mês`                                    |
| Algum erro achado no uso real                                   | `fix(escopo): descrever o erro corrigido`                              |
| README inicial escrito                                          | `docs: adicionar README inicial`                                       |

Ao terminar: `git tag -a v0.1.0 -m "Etapa 3: cadastro de contas e resumo do mês"`

> Neste ponto, gerar um APK e instalar nos dois celulares (Etapa 12). Usar de verdade por uma semana revela problemas que testes não pegam.

---

## 7. Etapa 4 - Rendas

**Objetivo:** mais de uma fonte de renda, com a data em que cai.

Passos:

1. Migração v2 (commit separado): `rendas.mes_ref`, `UNIQUE (renda_id, mes_ref)` em `rendas_recebidas` e a tabela `lancamentos_ignorados`.
2. Tela "Rendas" (`app/rendas/index.tsx`), aberta pela aba Mais: lista + botão adicionar.
3. Campos: nome (Salário, Freela...), valor, dia do recebimento, ativa/inativa.
4. Opção de renda **variável** (valor pode mudar mês a mês: ao marcar como recebida, informar o valor real) e **pontual** (13º, bônus: vale só no mês escolhido, guardado em `mes_ref`).
5. Criar `src/domain/rendasDoMes.ts` (função pura, com teste): quais rendas valem no mês e com que valor. Fixa e variável valem a partir do mês em que foram criadas; pontual só no seu mês; se a renda foi marcada como recebida, vale o valor recebido. O `resumoDoMes` e o `saldoPorDia` recebem essa lista.
6. Mostrar no Início "Entradas do mês" com a lista e datas.
7. Marcar como "recebida" quando cair (para calcular o saldo real do dia).
8. **Saldo ao longo do mês:** com as datas de renda e de vencimento, mostrar a linha do tempo do saldo (útil para ver que o dia 5 aperta porque o salário cai dia 10). Função `saldoPorDia.ts` em `src/domain/`.

**Pronto quando:** o app mostra em qual dia do mês o saldo fica mais baixo.

**Commits desta etapa:**

| Quando                                                                | Mensagem                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Migração v2 (commit separado, antes das telas)                        | `feat(db): criar migração v2 de rendas e lançamentos ignorados` |
| Tela de lista e formulário de rendas                                  | `feat(rendas): cadastrar e listar rendas`                       |
| Renda variável e pontual                                              | `feat(rendas): suportar renda variável e pontual`               |
| `rendasDoMes` e resumo do mês somando só as rendas do mês (com teste) | `feat(domain): somar rendas ativas no resumo do mês`            |
| Marcar renda como recebida                                            | `feat(rendas): marcar renda como recebida`                      |
| `saldoPorDia` pronto, com teste                                       | `feat(domain): calcular saldo por dia do mês`                   |
| Linha do tempo na tela Início                                         | `feat(home): mostrar dia de menor saldo`                        |

---

## 8. Etapa 5 - Calendário de vencimentos

**Objetivo:** ver o mês de relance.

Passos:

1. Criar o calendário em `src/components/calendario/` (grade própria, é simples e dá controle total do visual; ou usar `react-native-calendars`). O bottom sheet pode ser um `Modal` com `animationType="slide"`, sem biblioteca extra.
2. Cada dia mostra pontinhos coloridos: vermelho (atrasada), amarelo (pendente), verde (paga), azul (renda). A montagem dos dias fica numa função pura `src/domain/montarCalendario.ts`, com teste (semana começando no domingo, dias do mês anterior em branco).
3. Tocar em um dia abre uma lista embaixo (bottom sheet) com as contas do dia e o total.
4. Destacar o dia de hoje.
5. Setas para trocar de mês; deslizar para o lado também troca.
6. Botão "Hoje" para voltar rápido.
7. No bottom sheet, dar para marcar como pago direto.

**Pronto quando:** dá para ver, num olhar, as semanas mais pesadas.

**Commits desta etapa:**

| Quando                                                | Mensagem                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Grade do mês com troca de mês e dia de hoje destacado | `feat(calendario): criar grade mensal`                            |
| Pontinhos coloridos por situação                      | `feat(calendario): marcar vencimentos e rendas por cor`           |
| Lista do dia em bottom sheet                          | `feat(calendario): listar contas do dia em bottom sheet`          |
| Marcar pago dentro do bottom sheet                    | `feat(calendario): marcar conta como paga pelo dia`               |
| Botão "Hoje" e gesto de deslizar                      | `feat(calendario): adicionar botão hoje e troca de mês por gesto` |

---

## 9. Etapa 6 - Aviso de aperto e notificações

### 9.1 Aviso de aperto

- Função `avaliarAperto.ts` com 3 níveis:
  - **Atenção (amarelo):** contas passam de 80% da renda.
  - **Aperto (vermelho):** contas passam da renda.
  - **Crítico:** saldo do mês negativo antes de a próxima renda cair (usar o `menorSaldoCentavos` do `saldoPorDia`).
- Já existe uma primeira versão de `avaliarAperto` (feita junto com a tela Início, na Etapa 3). Nesta etapa, trocar o "crítico" de "sem renda cadastrada" para a regra acima e cobrir com teste.
- Faixa no topo do Início, com texto claro: "Faltam R$ 320 para fechar o mês". Tocar leva à lista de contas, ordenada pelas maiores.
- Percentuais configuráveis na tela de configurações.

### 9.2 Notificações locais (`expo-notifications`)

Passos:

1. Pedir permissão de notificação (Android 13 ou superior exige) com uma tela explicando por que, antes do pedido do sistema.
2. Criar o **canal** "Vencimentos" no Android.
3. Agendar lembrete por conta: 1 dia antes e no dia, às 9h (horário configurável).
4. Quando uma conta é marcada como paga, **cancelar** a notificação dela.
5. Quando uma conta é editada ou excluída, reagendar ou cancelar.
6. Ao abrir o app, rodar uma rotina que reagenda o que faltar (o Android pode apagar agendamentos em alguns aparelhos).
7. Tocar na notificação abre direto o detalhe da conta (`Linking` com Expo Router).
8. Configurações: ligar/desligar, escolher antecedência e horário.

> Em celulares com economia de bateria agressiva (Xiaomi, Samsung), o lembrete pode atrasar. Colocar uma dica na tela de configurações para liberar o app da otimização de bateria.

**Pronto quando:** a notificação chega no horário certo e some depois de pagar.

**Commits desta etapa:**

| Quando                                           | Mensagem                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `avaliarAperto` pronto, com teste                | `feat(domain): avaliar nível de aperto do mês`                        |
| Faixa de aviso na tela Início                    | `feat(home): exibir faixa de aviso de aperto`                         |
| Permissão e canal Android funcionando            | `feat(notificacoes): pedir permissão e criar canal Android`           |
| Lembretes agendados (1 dia antes e no dia)       | `feat(notificacoes): agendar lembretes de vencimento`                 |
| Cancelar e reagendar ao pagar, editar ou excluir | `feat(notificacoes): cancelar e reagendar lembretes ao alterar conta` |
| Rotina de reagendamento ao abrir o app           | `feat(notificacoes): reagendar lembretes ao abrir o app`              |
| Tocar na notificação abre o detalhe              | `feat(notificacoes): abrir detalhe da conta ao tocar no lembrete`     |
| Tela de configurações                            | `feat(config): criar tela de configurações de avisos`                 |

Ao terminar: `git tag -a v0.2.0 -m "Etapa 6: avisos e notificações"`

---

## 10. Etapa 7 - Comparação e previsão

### 10.1 Comparação com o mês anterior

1. Criar `compararMeses.ts`: devolve, por categoria e no total, a diferença em R$ e em %.
2. Cartão no Início: "Você gastou 12% a mais que em abril" com seta (vermelha para cima, verde para baixo).
3. Tela com barras lado a lado por categoria (feita com `View`s, ver a nota no topo sobre o `react-native-gifted-charts`).
4. Destacar a categoria que mais subiu.

### 10.2 Previsão do saldo

1. Criar `preverSaldo.ts` para os próximos 6 meses:
   - Rendas ativas (valor esperado).
   - Contas fixas (valor cadastrado).
   - Parcelas já cadastradas (que terminam e liberam dinheiro).
   - Contas variáveis (média dos últimos meses).
   - Contas únicas já cadastradas.
2. Gráfico de linha ou barras (`LineChart`) com a sobra de cada mês. Meses negativos em vermelho.
3. Mostrar "quando termina" cada parcelamento: ajuda a ver o alívio futuro.
4. Deixar claro na tela que é uma **estimativa**.

**Pronto quando:** o gráfico dos próximos meses muda assim que uma parcela nova é cadastrada.

**Commits desta etapa:**

| Quando                              | Mensagem                                                   |
| ----------------------------------- | ---------------------------------------------------------- |
| `compararMeses` pronto, com teste   | `feat(domain): comparar gastos com o mês anterior`         |
| Cartão no Início                    | `feat(home): mostrar comparação com o mês anterior`        |
| Barras lado a lado por categoria    | `feat(graficos): comparar categorias entre dois meses`     |
| `preverSaldo` pronto, com teste     | `feat(domain): prever saldo dos próximos meses`            |
| Gráfico de previsão na aba Planejar | `feat(planejar): exibir gráfico de previsão de saldo`      |
| Aviso de término de parcelamentos   | `feat(planejar): mostrar quando cada parcelamento termina` |

---

## 11. Etapa 8 - Reserva de emergência

Passos:

1. Tela "Reserva" na aba Planejar.
2. Definir a **meta**: um valor fixo ou "X meses de gastos" (calculado pela média das contas mensais).
3. Registrar **aportes** (valor, data, observação) e **retiradas**.
4. Mostrar um grande anel de progresso (guardado / meta) com o percentual.
5. Mostrar "Faltam R$ X" e "Nesse ritmo, você chega à meta em N meses" (média dos aportes dos últimos meses).
6. Histórico de aportes em lista.
7. Opção: ao ver a sobra do mês, botão "Guardar na reserva" que já preenche o aporte.
8. Comemorar a meta batida (animação curta e mensagem).

**Pronto quando:** aportes atualizam o anel e a estimativa de data.

**Commits desta etapa:**

| Quando                                       | Mensagem                                                     |
| -------------------------------------------- | ------------------------------------------------------------ |
| Definir meta (valor fixo ou meses de gastos) | `feat(reserva): definir meta da reserva`                     |
| Registrar aportes e retiradas                | `feat(reserva): registrar aportes e retiradas`               |
| Anel de progresso e estimativa de conclusão  | `feat(reserva): mostrar progresso e estimativa de conclusão` |
| Botão "Guardar na reserva" a partir da sobra | `feat(reserva): sugerir aporte a partir da sobra do mês`     |

---

## 12. Etapa 9 - Simulador de parcelas

**Objetivo:** "e se eu comprar isso parcelado?"

Passos:

1. Tela com campos: valor total, número de parcelas, juros por mês (opcional, 0 por padrão), mês da primeira parcela.
2. Calcular o valor da parcela (com e sem juros) em `simularParcelas.ts`.
3. **Impacto nos próximos meses:** reaproveitar `preverSaldo.ts`, somando a parcela simulada em cada mês. Mostrar dois gráficos ou duas linhas: "Sem a compra" e "Com a compra".
4. Mostrar o **pior mês**: "Em agosto sua sobra cai para R$ 45".
5. Veredito simples em palavras: "Cabe com folga", "Cabe, mas aperta", "Não cabe".
6. Botão "Cadastrar como conta parcelada" que leva ao formulário já preenchido.
7. **Nada é salvo no banco** durante a simulação. Só vira conta se o usuário confirmar.

**Pronto quando:** simular uma compra mostra o impacto sem alterar os dados reais.

**Commits desta etapa:**

| Quando                                                        | Mensagem                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `simularParcelas` pronto, com teste de juros zero e com juros | `feat(domain): simular parcelas com e sem juros`          |
| Tela com campos e valor da parcela                            | `feat(simulador): criar tela do simulador`                |
| Gráfico "sem a compra" e "com a compra" e pior mês            | `feat(simulador): mostrar impacto nos próximos meses`     |
| Veredito em palavras                                          | `feat(simulador): exibir veredito da simulação`           |
| Botão que leva ao formulário preenchido                       | `feat(simulador): converter simulação em conta parcelada` |

Ao terminar: `git tag -a v0.3.0 -m "Etapa 9: previsão, reserva e simulador"`

---

## 13. Etapa 10 - Contas compartilhadas

### Realidade do projeto

O app é offline e cada celular tem seu próprio banco. Então **não há sincronização**: a divisão é um **registro feito dentro do app**, em cada celular, não uma troca de dados entre os dois. Deixar isso claro na tela, para ninguém esperar que o outro celular atualize sozinho.

Passos:

1. Cadastro de **pessoas** (nome) em Mais > Pessoas. "Eu" já é criado pela migração v1 (não deixar excluir nem renomear).
2. No formulário da conta, ligar "Conta compartilhada".
3. Escolher a divisão: **igual**, **por porcentagem** ou **por valor**. Validar que a soma fecha 100% do valor.
4. Guardar em `divisoes` quanto cabe a cada pessoa em cada lançamento (o `garantirMes` já copia a divisão para os meses novos das contas fixas e variáveis).
5. Na lista de contas, mostrar "Sua parte: R$ 60 de R$ 120".
6. **Importante para o cálculo:** em `resumoDoMes`, contar só a **parte do usuário** nas contas compartilhadas (opção "contar valor inteiro" ou "só minha parte" nas configurações).
7. Tela "Acertos": quanto cada pessoa deve ou tem a receber, com botão "Marcar como acertado".
8. Opção de **compartilhar um resumo em texto** pelo WhatsApp (`Share` do React Native), para a outra pessoa conferir. Isso dá um pouco de troca sem precisar de servidor.

**Pronto quando:** dividir uma conta em 2 ou 3 pessoas e ver quanto cada um deve.

**Commits desta etapa:**

| Quando                                                | Mensagem                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Cadastro de pessoas                                   | `feat(pessoas): cadastrar pessoas`                                        |
| `dividirConta` pronto, com teste (soma fecha o valor) | `feat(domain): dividir conta por igual, porcentagem ou valor`             |
| Chave "Conta compartilhada" no formulário             | `feat(contas): marcar conta como compartilhada`                           |
| Resumo conta só a parte do usuário                    | `feat(domain): considerar só a parte do usuário em contas compartilhadas` |
| Tela de acertos                                       | `feat(acertos): mostrar quanto cada pessoa deve`                          |
| Marcar acerto como feito                              | `feat(acertos): marcar divisão como acertada`                             |
| Compartilhar resumo por texto                         | `feat(acertos): compartilhar resumo pelo WhatsApp`                        |

---

## 14. Etapa 11 - Acabamento e qualidade

### 14.1 Testes

- `jest` e `jest-expo` já foram instalados na Etapa 3.
- Testar todas as funções de `src/domain/` (resumo, geração de lançamentos, média, previsão, divisão, aperto).
- Casos de borda: mês com 28 dias, conta no dia 31, renda zero (evitar divisão por zero), parcela única, valores com centavos.

### 14.2 Qualidade de uso

- Tela de **primeira abertura** (onboarding) com 3 passos: boas-vindas, cadastrar renda, cadastrar primeira conta.
- Tela de **Configurações:** tema, notificações, limites de aviso, sugestão pela média (3 ou 6 meses).
- Aviso permanente e honesto: "Seus dados ficam só neste celular. Se desinstalar o app, eles serão perdidos." (já está na tela de backup).
- Erros do banco já mostram mensagem amigável (`ErrorBoundary` em `app/_layout.tsx` e faixa no Início).
- Testar com muitos dados (200 contas) para ver se a lista continua fluida; usar `FlatList` ou `FlashList`.
- Revisar acessibilidade com o leitor de tela (TalkBack).
- Ícone do app e tela de abertura (splash) próprios, configurados no `app.json`.

### 14.3 Idioma e formato

- Tudo em português do Brasil.
- Moeda e data sempre pelas funções de formatação.

**Commits desta etapa:**

| Quando                                                                                         | Mensagem                                                          |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Testes dos casos de borda passando                                                             | `test(domain): cobrir casos de borda de datas e valores`          |
| Onboarding de 3 passos                                                                         | `feat(onboarding): criar tela de boas-vindas`                     |
| Tela de configurações completa                                                                 | `feat(config): adicionar tema, limites de aviso e média de meses` |
| Aviso de que os dados ficam só no celular (já existe na tela de backup; repetir no onboarding) | `feat(config): avisar que os dados ficam só neste celular`        |
| Teste com 200 contas e ajuste de lista                                                         | `perf(contas): otimizar lista com muitos itens`                   |
| Ajustes de TalkBack                                                                            | `fix(a11y): adicionar rótulos de acessibilidade nos botões`       |
| Ícone e splash próprios                                                                        | `chore: adicionar ícone e splash do app`                          |
| Prettier em tudo, sem mudar lógica                                                             | `style: aplicar prettier nos arquivos`                            |
| README final com prints e GIF                                                                  | `docs: completar README com prints e decisões do projeto`         |

---

## 15. Etapa 12 - Gerar o APK e instalar nos celulares

### Assinatura (já configurada)

- A chave própria do app fica em `~/fluxus-chave/` (fora do repositório) e as senhas em `~/.gradle/gradle.properties`.
- O plugin `plugins/withAssinaturaRelease.js` aplica a assinatura a cada `expo prebuild`.
- **Fazer backup da pasta `~/fluxus-chave/`** fora do computador. Sem ela, não dá para atualizar o app sem desinstalar.
- A cada versão nova, aumentar `android.versionCode` no `app.json`.

### Opção A: build local, direto por USB (recomendada para este projeto)

1. Conferir no `app.json`: `name`, `slug`, `android.package` (já definido como `com.bernardo.fluxus`; **nunca mudar**, senão vira outro app e os dados não passam), `version`, ícone.
2. Conectar o celular por USB com depuração ativa. Conferir com `adb devices`.
3. Instalar a versão de produção:
   ```bash
   npx expo run:android --variant release
   ```
   Esse comando compila e instala direto no celular conectado.
4. Repetir para o segundo celular.

### Opção B: gerar o arquivo APK

1. Criar `eas.json` com um perfil `preview` com `"android": { "buildType": "apk" }`.
2. Rodar `eas build -p android --profile preview` (usa a nuvem da Expo, precisa de conta gratuita) e baixar o `.apk`.
3. Instalar por USB: `adb install -r fluxus.apk`.

### Atenção ao atualizar o app

- Instalar uma versão nova **por cima** (`adb install -r`) mantém os dados.
- **Desinstalar apaga o banco.** Por isso as migrações (Etapa 2) nunca devem recriar tabelas existentes.
- Usar sempre a **mesma chave de assinatura** nas atualizações; com uma chave diferente o Android obriga a desinstalar antes.
- Guardar o arquivo da chave (keystore) em local seguro, fora do repositório.

**Commits desta etapa:**

| Quando                                                  | Mensagem                                         |
| ------------------------------------------------------- | ------------------------------------------------ |
| `app.json` com nome, pacote Android, versão e ícone     | `build: configurar app.json para Android`        |
| `eas.json` com perfil `preview` (se usar a Opção B)     | `build: adicionar perfil preview no eas.json`    |
| Keystore e `.env` no `.gitignore`                       | `chore: ignorar keystore e arquivos de ambiente` |
| Versão final instalada nos dois celulares e funcionando | `chore(release): preparar versão 1.0.0`          |

Ao terminar: `git tag -a v1.0.0 -m "Fluxus 1.0.0"`, `git push --tags` e anexar o APK na seção Releases do GitHub.

---

## 16. Estrutura de pastas sugerida

```
fluxus/
├── app/                          # telas (Expo Router)
│   ├── _layout.tsx               # tema, fontes, banco
│   ├── (tabs)/
│   │   ├── _layout.tsx           # menu inferior
│   │   ├── index.tsx             # Início
│   │   ├── contas.tsx
│   │   ├── calendario.tsx
│   │   ├── planejar.tsx
│   │   └── mais.tsx
│   ├── conta/
│   │   ├── nova.tsx              # modal de cadastro
│   │   └── [id].tsx              # detalhe
│   ├── rendas/
│   │   └── index.tsx             # lista e cadastro de rendas
│   ├── reserva/
│   ├── backup.tsx                # exportar e importar dados
│   ├── simulador.tsx
│   └── configuracoes.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Cartao, Botao, Campo, Etiqueta...
│   │   ├── contas/               # ItemConta, SeletorCategoria
│   │   ├── home/                 # seções da tela Início
│   │   ├── calendario/
│   │   └── graficos/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   └── repositorios/
│   ├── domain/                   # todos os cálculos (puros e testados)
│   │   ├── resumoDoMes.ts
│   │   ├── rendasDoMes.ts
│   │   ├── saldoPorDia.ts
│   │   ├── classificarSituacao.ts
│   │   ├── montarCalendario.ts
│   │   ├── gerarLancamentos.ts
│   │   ├── sugerirValor.ts
│   │   ├── avaliarAperto.ts
│   │   ├── compararMeses.ts
│   │   ├── preverSaldo.ts
│   │   ├── simularParcelas.ts
│   │   └── dividirConta.ts
│   ├── store/                    # Zustand
│   ├── services/
│   │   ├── backup.ts             # arquivo, compartilhar e escolher arquivo
│   │   └── notificacoes.ts
│   ├── theme/
│   ├── utils/                    # formatadores.ts (formatarMoeda, formatarData...)
│   └── types/
└── __tests__/
    └── helpers/bancoEmMemoria.ts # SQLite em memória para testar repositórios
```

**Regra de ouro das camadas:**
`tela` chama `store` → `store` chama `repositório` (banco) e `domain` (cálculo) → `tela` só mostra.

---

## 17. Checklist de portfólio

- [ ] README com: o que é, prints das telas, stack, como rodar, decisões (por que offline, por que centavos).
- [ ] GIF ou vídeo curto de uso (cadastrar conta, marcar pago, ver o resumo).
- [x] Prints em modo claro e escuro.
- [ ] Seção "Desafios e aprendizados" (ex.: contas recorrentes, dia 31, notificações no Android).
- [ ] Diagrama simples do banco de dados.
- [x] Testes rodando (`npm test`) e mencionados no README, com GitHub Actions.
- [x] APK publicado na seção Releases do GitHub.
- [ ] Histórico de commits seguindo Conventional Commits (tipo, escopo, descrição), com tags de versão (`v0.1.0` até `v1.0.0`).

---

## 18. Riscos e cuidados

| Risco                                     | O que fazer                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Perder dados ao atualizar                 | Migrações seguras, instalar por cima, nunca desinstalar                      |
| Erro de arredondamento em dinheiro        | Tudo em centavos inteiros                                                    |
| Notificações não chegando                 | Development build, canal Android, reagendar ao abrir, orientar sobre bateria |
| Contas duplicadas em fixas                | `garantirMes` só cria o que não existe                                       |
| Mês excluído de conta fixa voltar sozinho | `garantirMes` respeita `lancamentos_ignorados`                               |
| Renda pontual contando todo mês           | `rendasDoMes` filtra pelo `mes_ref` da renda                                 |
| Dia 29, 30, 31 em meses curtos            | Usar o último dia do mês                                                     |
| Telas lentas com muitos dados             | `FlatList`, consultas com índice em `mes_ref` e `conta_id`                   |
| Querer fazer tudo de uma vez              | Seguir as etapas; cada uma termina com algo usável                           |

---

## 19. Ordem diária sugerida de trabalho

1. Abrir a etapa do dia neste plano.
2. Fazer primeiro a função de cálculo (`domain`) e o teste dela.
3. Depois o repositório (banco).
4. Por último a tela.
5. Testar no celular real.
6. Commit, seguindo o padrão da seção "Padrão de commits" (um commit por passo concluído) e `git push` no fim do dia.

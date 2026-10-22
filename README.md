# Fluxus

[![CI](https://github.com/bombazaro/fluxus/actions/workflows/ci.yml/badge.svg)](https://github.com/bombazaro/fluxus/actions/workflows/ci.yml)

App Android de controle de contas a pagar. Você cadastra contas e rendas e o app calcula sozinho o total do mês, o que já foi pago, o que falta e quanto sobra da renda.

**100% offline:** sem servidor, sem login e sem internet. Os dados ficam no próprio celular (SQLite).

## Funcionalidades

- **Contas de 4 tipos:** única (IPVA), fixa mensal (aluguel), parcelada (celular 10x) e variável (luz, água), com sugestão de valor pela média dos últimos meses.
- **Resumo do mês:** sobra estimada, quanto tem em mãos, renda comprometida, total, pago e a pagar.
- **Lista de contas** agrupada em atrasadas, esta semana, mais adiante e pagas, com filtros e busca. Marca como paga com um toque e permite desfazer.
- **Conta sem data de vencimento** (ex.: mercado do mês): só fica atrasada se o mês acabar sem pagar.
- **Editar e excluir com escopo:** "só este mês" ou "este e os próximos", sem mexer no histórico já pago.
- **Rendas** fixas, variáveis (informa quanto caiu de verdade) e pontuais (13º, bônus).
- **Saldo ao longo do mês:** mostra o dia em que o saldo fica mais baixo (ex.: o aluguel vence dia 5 e o salário só cai dia 10).
- **Calendário** de vencimentos com cores por situação, lista do dia e troca de mês deslizando.
- **Sobra do mês anterior:** o que sobrou entra como saldo inicial, então quem recebe dia 30 e paga dia 10 não vê o mês "no vermelho" à toa.
- **Aviso de aperto:** avisa quando as contas passam do dinheiro do mês, quando o saldo fica negativo em algum dia ou quando passam do limite escolhido (80% por padrão).
- **Lembretes de vencimento:** notificação alguns dias antes e no dia, no horário escolhido. Tocar no lembrete abre a conta.
- **Comparação com o mês anterior:** quanto gastou a mais ou a menos, por categoria, e qual subiu mais.
- **Previsão dos próximos 6 meses** e quando cada parcelamento termina.
- **Reserva de emergência:** meta em meses de gasto ou valor fixo, aportes e retiradas, e em quanto tempo chega na meta.
- **Simulador de parcelas:** mostra se a compra cabe nos próximos meses, com ou sem juros, sem gravar nada.
- **Contas compartilhadas:** divide por igual, por porcentagem ou por valor; o resumo conta só a sua parte, e a tela Acertos mostra quanto cada pessoa deve, com resumo para mandar no WhatsApp.
- **Backup:** exporta todos os dados em um arquivo e importa de volta. Também serve para passar os dados para outro celular.
- **Configurações:** tema, lembretes, limite do aviso, meses da média e o que entra no resumo. Na primeira vez, uma tela de boas-vindas explica o app.
- Datas no formato brasileiro (DD/MM/AAAA), modo claro e escuro e rótulos para leitor de tela.

## Stack

Expo (development build) · TypeScript estrito · Expo Router · expo-sqlite · Zustand · expo-notifications · react-native-svg · Jest

Os gráficos são desenhados com `View`s simples (e um SVG para o anel da reserva), sem biblioteca de gráficos: fica mais leve e segue o tema claro/escuro sem configuração extra.

## Arquitetura

```
tela (app/)  →  store (src/store, Zustand)  →  repositórios (src/db) + cálculos (src/domain)
```

- `src/domain/`: só funções puras (resumo do mês, rendas do mês, saldo por dia, calendário, divisão de contas...). Não acessam o banco e são todas testadas.
- `src/db/repositorios/`: o único lugar com SQL.
- `src/db/migrations.ts`: versão do banco com `PRAGMA user_version`. Cada mudança é uma migração nova, nunca recriar tabelas, porque não há backup automático.

## Decisões do projeto

- **Dinheiro em centavos inteiros:** R$ 10,50 é guardado como `1050`. Isso evita erros de arredondamento com números decimais.
- **Conta × lançamento:** a _conta_ é o cadastro ("Internet, R$ 100, todo dia 10") e o _lançamento_ é a cobrança de um mês ("Internet de maio, não paga"). Assim cada mês tem seu próprio valor e seu "pago".
- **Contas fixas geradas sob demanda:** o lançamento do mês é criado quando o mês é aberto (`garantirMes`), sem duplicar. Os meses excluídos com "só este mês" ficam registrados para não voltarem.
- **Dia 31 em mês curto:** usa o último dia do mês (28/02, 30/04...).
- **Offline e sem nuvem:** a privacidade e a simplicidade valem mais que a sincronização. Para não perder dados, existe o backup manual em arquivo.

## Como rodar

Requisitos: Node.js 22.13 ou mais novo, Android SDK (`ANDROID_HOME` configurado) e um celular Android com a depuração USB ativa.

```bash
npm install
adb devices              # o celular deve aparecer como "device"
npx expo run:android     # compila e instala o development build
```

Nas próximas vezes, basta `npx expo start` com o app aberto no celular. O app de desenvolvimento precisa desse servidor para carregar.

> **Máquina com 8 GB de RAM ou menos:** compile só a arquitetura do celular e com menos paralelismo, colocando no `~/.gradle/gradle.properties` (sem isso, o build pode travar o computador):
>
> ```properties
> reactNativeArchitectures=arm64-v8a
> org.gradle.parallel=false
> org.gradle.workers.max=1
> org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
> kotlin.compiler.execution.strategy=in-process
> ```
>
> E rode o build com prioridade baixa: `nice -n 19 ionice -c3 ./gradlew assembleRelease`. Leva uns 20 minutos.

## Versão de produção (APK)

O app de desenvolvimento precisa do computador ligado. Para usar no dia a dia, gere a versão release, que roda sozinha:

```bash
npx expo prebuild -p android        # aplica o pacote e o plugin de assinatura
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

A assinatura usa uma chave própria lida de `~/.gradle/gradle.properties` (`FLUXUS_UPLOAD_*`; veja `plugins/withAssinaturaRelease.js`). A chave nunca vai para o repositório. Use sempre a mesma chave e aumente `android.versionCode` no `app.json` a cada versão: assim o `adb install -r` atualiza o app sem apagar os dados.

## Testes

```bash
npm test            # cálculos, repositórios e migrações
npm run typecheck   # TypeScript
npm run lint        # ESLint
```

- Os cálculos de `src/domain` são testados como funções puras.
- Os repositórios e as migrações são testados contra um **SQLite de verdade em memória** (`better-sqlite3`), com um adaptador que imita a API do `expo-sqlite` (`__tests__/helpers/bancoEmMemoria.ts`).
- O GitHub Actions roda as três verificações a cada push.

## Andamento

O plano completo está em [`plano.md`](plano.md).

- [x] Etapas 0 a 3: projeto, design base, banco de dados, cadastro de contas e resumo do mês
- [x] Etapa 4: rendas e saldo por dia
- [x] Etapa 5: calendário de vencimentos
- [x] Etapa 6: aviso de aperto e notificações
- [x] Etapa 7: comparação com o mês anterior e previsão
- [x] Etapas 8 a 10: reserva de emergência, simulador de parcelas, contas compartilhadas completas
- [x] Etapa 11: acabamento (configurações, boas-vindas, ícone, acessibilidade, testes de borda)
- [x] Etapa 12: APK de produção assinado e instalado no celular
- [ ] Portfólio: prints, GIF de uso e APK na seção Releases do GitHub

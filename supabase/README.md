# Servidor da conta (Supabase)

Projeto: `https://skccrxynthlvdeuaomch.supabase.co` (região São Paulo, plano gratuito).

## Aplicar o servidor (uma vez)

1. No painel do Supabase, abra **SQL Editor** › **New query**.
2. Cole o conteúdo de `schema.sql` e clique em **Run**. Deve aparecer "Success. No rows returned".
   Pode rodar de novo quando o arquivo mudar: ele é seguro para repetir.
3. Para conferir a segurança, abra outra query, cole `teste_isolamento.sql` e clique em **Run**.
   O resultado esperado é uma mensagem **`OK: todas as verificações passaram (nada foi gravado)`**.
   Ela aparece como erro de propósito, porque é assim que o teste desfaz tudo o que criou.
   Qualquer outra mensagem diz qual verificação falhou.

## Como funciona

- Tabela `registros`: uma linha para cada linha do app (conta, lançamento...), com o conteúdo em
  `dados` (JSON). Exclusões ficam como linhas com `excluido_em`.
- O app **não** lê nem grava a tabela direto. Usa só estas funções, que sempre filtram pelo
  usuário logado:
  - `enviar_registros(lote)`: grava até 500 linhas. A edição mais recente vence, e uma data no
    futuro é limitada à hora do servidor.
  - `buscar_registros(desde, desde_tabela, desde_uid, limite)`: o que chegou depois do marcador.
  - `excluir_meus_dados()`: apaga tudo o que a pessoa guardou na nuvem.
- Duas horas diferentes por linha: `atualizado_em` (quando a pessoa mexeu, decide quem vence) e
  `recebido_em` (quando o servidor recebeu, é o marcador de novidades).
- Ao buscar, o aparelho deve voltar alguns segundos antes do último marcador: duas gravações
  quase simultâneas podem terminar em ordem diferente da hora em que começaram. Como a mescla é
  idempotente, repetir linhas não causa problema.

## Chaves

- Só a **URL** e a **chave pública** (`sb_publishable_...`) entram no app. Ficam em `.env`
  (veja `.env.example`) e nas variáveis de ambiente do Netlify.
- A chave **secret / service_role** e a senha do banco nunca entram no repositório nem no app.

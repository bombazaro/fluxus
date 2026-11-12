# Privacidade do Fluxus

O Fluxus funciona sem conta: nesse caso, nada sai do seu aparelho.

## Se você entrar na conta

**O que vai para a nuvem** (servidor Supabase, região São Paulo): suas contas a pagar, lançamentos,
rendas, valores, categorias, pessoas e divisões, reserva de emergência e as configurações do app
(tema, nome, avisos). Também ficam guardados o seu e-mail e a hora das últimas mudanças.

**O que não vai:** dados bancários, senhas, CPF, localização, contatos, e as configurações de
lembrete de cada aparelho (hora e dias de aviso).

**Quem lê:** só você. O servidor aplica uma regra por usuário: cada conta enxerga apenas as
próprias linhas, e o app nunca grava direto na tabela, só por funções que filtram pelo usuário
logado. O desenvolvedor tem acesso técnico ao painel do projeto, mas não usa os seus dados.

**Entrar:** por código de uso único enviado ao e-mail, ou com a conta do Google. Não há senha para guardar.

## IA no cadastro (opcional, só com a conta)

Quando você usa a sugestão de categoria ou o cadastro por texto livre, o **texto que você digita**
(nome do gasto ou a frase) e os **nomes das suas categorias** são enviados, pela função do
Fluxus no Supabase, à Groq (empresa de IA, servidores nos EUA) apenas para gerar a resposta. O
Fluxus **não guarda** esse texto: guarda só um contador de usos por dia (limite de 50). Nenhum
valor, conta ou data já salvos é enviado.

Segundo a Groq, por padrão ela não retém os dados de inferência; registros de confiabilidade e
abuso podem ficar até 30 dias. Mesmo assim, não escreva dados pessoais sensíveis nesses campos. A
IA nunca salva nada sozinha: ela só preenche o formulário, e você confere e salva. Sem conta ou
sem internet, o cadastro manual continua igual.

## Seus controles

- **Sair da conta** (Mais › Conta e sincronização): os dados continuam neste aparelho.
- **Apagar meus dados da nuvem:** apaga tudo o que a conta guardou, em todos os aparelhos. Os dados
  do aparelho continuam. O e-mail de acesso permanece cadastrado; para removê-lo, peça ao
  responsável pelo projeto.
- **Backup em arquivo:** continua disponível e independente da conta.

## Cuidados

Os dados do servidor não são criptografados de ponta a ponta: ficam protegidos por login e regras
de acesso, como em qualquer serviço comum. Não coloque no app informações que você não gostaria
de guardar em um serviço online.

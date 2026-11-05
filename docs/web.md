# Fluxus na web

A versão web é o mesmo app rodando no navegador. Os dados ficam no próprio navegador (SQLite
guardado no armazenamento do site), **sem ligação com o celular**. Para passar dados de um para o
outro, use Mais › Backup dos dados.

O que não existe na web: lembretes de vencimento (só no celular).
Só uma aba por vez pode usar os dados; a segunda mostra um aviso.

## Tamanhos de tela

O layout muda com a largura da janela (só na web; o app do celular não muda):

| Tamanho | Largura | Como fica |
|---|---|---|
| Compacto | abaixo de 600 px | Abas embaixo, igual ao celular. |
| Médio (tablet) | 600 a 1023 px | Abas embaixo, conteúdo centralizado de até 720 px. |
| Largo (desktop) | 1024 px ou mais | Menu lateral, Início e Contas em duas colunas. |

Formulários e configurações ficam em 560 px de largura, e as janelas em 440 px.
As regras estão em `src/domain/tamanhoDaTela.ts` e `src/utils/layout.ts`.

## Rodar e testar

```bash
npx expo start --web      # desenvolvimento
npx expo export -p web    # gera a pasta dist/ (site estático)
```

## Publicar (Netlify, grátis)

1. No Netlify, escolha "Add new site" › "Import an existing project" e ligue o repositório
   `bombazaro/fluxus`.
2. O `netlify.toml` já define o build (`npx expo export -p web`) e a pasta de saída (`dist`).
3. Pronto: `public/_headers` e `public/_redirects` são copiados para `dist/` e o Netlify os lê.

Os cabeçalhos são obrigatórios. Sem eles o SQLite do navegador não abre:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`public/_redirects` manda qualquer endereço para o `index.html` (o app é de página única).
Em outro host (Cloudflare Pages usa os mesmos arquivos; Vercel usa `vercel.json`), configure os dois cabeçalhos e o redirecionamento.

## Como conferir depois de publicar

1. Abra o site, passe as boas-vindas e crie um gasto rápido.
2. Recarregue a página: o gasto continua lá.
3. Abra uma segunda aba: deve aparecer "O Fluxus já está aberto em outra aba."

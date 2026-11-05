# Fluxus na web

A versão web é o mesmo app rodando no navegador. Os dados ficam no próprio navegador (SQLite
guardado no armazenamento do site), **sem ligação com o celular**. Para passar dados de um para o
outro, use Mais › Backup dos dados.

O que não existe na web: lembretes de vencimento (só no celular).
Só uma aba por vez pode usar os dados; a segunda mostra um aviso.

## Rodar e testar

```bash
npx expo start --web      # desenvolvimento
npx expo export -p web    # gera a pasta dist/ (site estático)
```

## Publicar (Cloudflare Pages, grátis)

1. Crie um projeto em Cloudflare Pages ligado ao repositório `bombazaro/fluxus`.
2. Comando de build: `npx expo export -p web` · Pasta de saída: `dist`.
3. Pronto: o arquivo `public/_headers` já é copiado para `dist/` e manda os cabeçalhos abaixo.

Os cabeçalhos são obrigatórios. Sem eles o SQLite do navegador não abre:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`public/_redirects` manda qualquer endereço para o `index.html` (o app é de página única).
O mesmo funciona no Netlify. Em outro host, configure os dois cabeçalhos e o redirecionamento.

## Como conferir depois de publicar

1. Abra o site, passe as boas-vindas e crie um gasto rápido.
2. Recarregue a página: o gasto continua lá.
3. Abra uma segunda aba: deve aparecer "O Fluxus já está aberto em outra aba."

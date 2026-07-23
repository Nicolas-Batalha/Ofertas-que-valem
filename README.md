# Ofertas que Valem

Site editorial de guias de compra e comparação, preparado para receber links de lojas depois da verificação do catálogo.

## Como ativar uma oferta

Edite o produto correspondente em `assets/data/produtos.json`:

```json
{
  "loja": "Nome da loja",
  "urlOferta": "https://endereco-da-oferta"
}
```

Quando `urlOferta` estiver preenchido:

- o botão da página inicial muda de **Ver guia** para **Ver oferta em [loja]**;
- a página do guia ativa o botão da loja;
- o comparador passa a exibir a oferta;
- o link abre em nova aba com `rel="sponsored nofollow noopener noreferrer"`;
- o evento `clique_oferta` é enviado para `dataLayer` e também dispara o evento do navegador `ofertas-que-valem:clique-oferta`.

Depois que preços e históricos forem reais, altere no topo de `assets/data/produtos.json`:

```json
{
  "demonstrativo": false,
  "atualizadoEm": "AAAA-MM-DDTHH:MM:SS-03:00",
  "fonte": "Nome da fonte ou integração"
}
```

Não desative o modo demonstrativo enquanto os valores forem exemplos.

## Estrutura

- `index.html` e demais arquivos `.html` da raiz: páginas públicas com URLs estáveis.
- `guias/`: páginas editoriais de cada categoria de produto.
- `assets/css/`: estilos globais e das páginas internas.
- `assets/js/`: navegação, busca, comparação e comportamento dos guias.
- `assets/data/produtos.json`: catálogo, preços e futuros links de lojas.
- `imagens/otimizadas/`: imagens usadas pelo site.
- `imagens/originais/`: arquivos-fonte preservados para futuras edições.
- `imagens/social/`: imagem de compartilhamento do site.
- `docs/referencias/`: referências visuais de desenvolvimento.
- `sitemap.xml`, `robots.txt`, `site.webmanifest` e `vercel.json`: SEO e configuração de publicação.

Os arquivos temporários de prévia local são ignorados pelo Git para manter a raiz limpa.

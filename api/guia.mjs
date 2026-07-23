import {
  buscarDocumento,
  criarSlug,
  escaparHtml,
  listarDocumentos,
  numero,
  urlSegura
} from "./_firestore.mjs";

const DOMINIO = "https://www.ofertasquevalem.shop";
const LOJAS = {
  Amazon: { slug: "amazon", logo: "/imagens/logo/amazon-color-svgrepo-com.svg" },
  "Mercado Livre": { slug: "mercado-livre", logo: "/imagens/logo/mercado-libre-svgrepo-com.svg" },
  Shopee: { slug: "shopee", logo: "/imagens/logo/shopee.png" },
  "Casas Bahia": { slug: "casas-bahia", sigla: "CB" }
};

function dinheiro(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(numero(valor));
}

function identidadeLoja(loja) {
  const identidade = LOJAS[loja] || { slug: "loja-parceira", sigla: String(loja).slice(0, 2).toUpperCase() };
  const marca = identidade.logo
    ? `<span class="marca-loja"><img class="logo-loja logo-loja-${identidade.slug}" src="${identidade.logo}" alt="" width="38" height="28"></span>`
    : `<span class="sigla-loja" aria-hidden="true">${escaparHtml(identidade.sigla)}</span>`;
  return {
    slug: identidade.slug,
    html: `<span class="identidade-loja">${marca}<strong>${escaparHtml(loja)}</strong></span>`
  };
}

function ofertasProduto(produto, ofertas) {
  const ativas = ofertas
    .filter((oferta) => oferta.produto_id === produto.id && oferta.ativo && oferta.url)
    .sort((a, b) => {
      const ordem = Object.keys(LOJAS);
      return ordem.indexOf(a.loja) - ordem.indexOf(b.loja);
    });

  if (!ativas.length) {
    return `<div class="ofertas-produto-ranking"><p class="estado-ofertas-ranking">Links das lojas em breve</p></div>`;
  }

  const botoes = ativas.map((oferta) => {
    const identidade = identidadeLoja(oferta.loja);
    const url = urlSegura(oferta.url, "");
    if (!url) return "";
    const detalhe = numero(oferta.preco) > 0 ? dinheiro(oferta.preco) : "Ver oferta";
    return `<a class="botao-loja-ranking" data-loja="${identidade.slug}" href="${escaparHtml(url)}" target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label="Ver ${escaparHtml(produto.nome)} na ${escaparHtml(oferta.loja)}">${identidade.html}<small>${escaparHtml(detalhe)}</small></a>`;
  }).join("");

  return `<div class="ofertas-produto-ranking"><p class="titulo-ofertas-ranking">Comprar em</p><div class="lista-lojas-ranking">${botoes}</div></div>`;
}

function listaItens(itens = []) {
  return itens.map((item) => `<li>${escaparHtml(item)}</li>`).join("");
}

function cartaoProduto(produto, indice, ofertas) {
  const imagem = urlSegura(produto.imagem);
  const posicao = numero(produto.posicao, indice + 1);
  const destaque = posicao === 1 ? " produto-ranking-destaque" : "";
  const selo = produto.perfil || (posicao === 1 ? "Melhor escolha do guia" : "Opção recomendada");
  const especificacoes = Array.isArray(produto.especificacoes) ? produto.especificacoes : [];
  const pros = Array.isArray(produto.pros) ? produto.pros : [];
  const contras = Array.isArray(produto.contras) ? produto.contras : [];
  const nota = numero(produto.nota).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return `
    <article class="produto-ranking${destaque}" id="${escaparHtml(produto.id)}">
      <span class="numero-produto-ranking" aria-label="${posicao}ª posição">${posicao}</span>
      <a class="imagem-produto-ranking" href="#detalhes-${escaparHtml(produto.id)}" aria-label="Ver prós e pontos de atenção de ${escaparHtml(produto.nome)}">
        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(produto.alt || produto.nome)}" width="500" height="500" loading="${posicao <= 2 ? "eager" : "lazy"}">
      </a>
      <div class="dados-produto-ranking">
        <span class="selo-produto-ranking">${escaparHtml(selo)}</span>
        <h2>${escaparHtml(produto.nome)}</h2>
        ${produto.marca ? `<p class="meta-ranking-air-fryer"><strong>Marca:</strong> ${escaparHtml(produto.marca)} · <strong>Nota:</strong> ${nota}</p>` : `<p class="meta-ranking-air-fryer"><strong>Nota editorial:</strong> ${nota}</p>`}
        <ul class="ficha-produto-ranking">${listaItens(especificacoes)}</ul>
      </div>
      <div class="acoes-produto-ranking">
        <label class="botao-comparar-ranking">
          <input type="checkbox" data-comparar-guia data-produto="${escaparHtml(produto.id)}" data-nome="${escaparHtml(produto.nome)}" data-imagem="${escaparHtml(imagem)}">
          <span>Adicionar ao comparador</span>
        </label>
        ${ofertasProduto(produto, ofertas)}
      </div>
      <details class="detalhes-produto-ranking" id="detalhes-${escaparHtml(produto.id)}">
        <summary>Ver prós e pontos de atenção</summary>
        <div class="grade-pros-contras-ranking">
          <section class="lista-pros-ranking"><h3>Prós</h3><ul>${listaItens(pros)}</ul></section>
          <section class="lista-contras-ranking"><h3>Pontos de atenção</h3><ul>${listaItens(contras)}</ul></section>
        </div>
      </details>
    </article>`;
}

function paginaErro(status, titulo, mensagem) {
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${escaparHtml(titulo)} | Ofertas que Valem</title><link rel="stylesheet" href="/assets/css/estilos.css"><link rel="stylesheet" href="/assets/css/paginas.css"><body class="pagina-interna"><main class="pagina-conteudo"><section class="estado-vazio-pagina"><h1>${escaparHtml(titulo)}</h1><p>${escaparHtml(mensagem)}</p><a class="botao-pagina" href="/guias.html">Ver todos os guias</a></section></main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const slug = criarSlug(url.searchParams.get("slug") || "");
  if (!slug) return paginaErro(404, "Guia não encontrado", "Confira o endereço ou veja todos os nossos guias.");

  try {
    const [guia, todosProdutos, todasOfertas] = await Promise.all([
      buscarDocumento("guias", slug),
      listarDocumentos("produtos"),
      listarDocumentos("ofertas")
    ]);
    if (!guia || guia.publicado === false) {
      return paginaErro(404, "Guia ainda não publicado", "Este guia está em preparação.");
    }

    const produtos = todosProdutos
      .filter((produto) => produto.publicado !== false && (produto.guiaSlug || produto.guia_slug) === slug)
      .sort((a, b) => numero(a.posicao, 999) - numero(b.posicao, 999));
    const canonical = `${DOMINIO}/guia/${slug}`;
    const imagem = urlSegura(guia.imagem);
    const titulo = guia.titulo || `Guia de ${guia.categoria}`;
    const descricao = guia.descricao || `Compare os melhores produtos de ${guia.categoria}.`;
    const atualizado = guia.updated_at ? new Date(guia.updated_at).toLocaleDateString("pt-BR") : "conteúdo em atualização";
    const schema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: titulo,
      description: descricao,
      url: canonical,
      numberOfItems: produtos.length,
      itemListElement: produtos.map((produto, indice) => ({
        "@type": "ListItem",
        position: indice + 1,
        name: produto.nome,
        url: `${canonical}#${produto.id}`
      }))
    }).replace(/</g, "\\u003c");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escaparHtml(descricao)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#00293b">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Ofertas que Valem">
  <meta property="og:title" content="${escaparHtml(titulo)} | Ofertas que Valem">
  <meta property="og:description" content="${escaparHtml(descricao)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escaparHtml(imagem.startsWith("/") ? DOMINIO + imagem : imagem)}">
  <meta name="twitter:card" content="summary_large_image">
  <title>${escaparHtml(titulo)} | Ofertas que Valem</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/estilos.css">
  <link rel="stylesheet" href="/assets/css/paginas.css">
  <script src="/assets/js/navegacao.js" defer></script>
  <script type="application/ld+json">${schema}</script>
</head>
<body class="pagina-interna pagina-ranking-air-fryer" data-guia-id="${escaparHtml(slug)}">
  <a class="pular-conteudo" href="#conteudo-principal">Pular para o conteúdo</a>
  <header class="cabecalho">
    <div class="limite cabecalho-conteudo">
      <a class="marca" href="/" aria-label="Ofertas que Valem — início"><span class="marca-simbolo" aria-hidden="true"><span>✓</span></span><span class="marca-texto">Ofertas <small>que Valem</small></span></a>
      <button class="botao-menu" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-principal"><span></span><span></span><span></span></button>
      <nav class="menu-principal" id="menu-principal" aria-label="Navegação principal"><a href="/categorias.html">Categorias</a><a href="/comparar.html">Comparar</a><a href="/busca.html">Produtos</a><a href="/guias.html">Guias</a></nav>
      <form class="busca-cabecalho" role="search" action="/busca.html" method="get"><label class="somente-leitor" for="busca-interna">Buscar produto</label><input id="busca-interna" name="busca" type="search" placeholder="O que você quer comparar?"><button type="submit" aria-label="Pesquisar"><span class="icone-lupa" aria-hidden="true"></span></button></form>
    </div>
  </header>
  <main class="pagina-ranking-air-fryer" id="conteudo-principal">
    <article class="artigo-ranking-air-fryer">
      <nav class="breadcrumb" aria-label="Navegação estrutural"><a href="/">Início</a><span>›</span><a href="/guias.html">Guias</a><span>›</span><span aria-current="page">${escaparHtml(titulo)}</span></nav>
      <header class="cabecalho-ranking-air-fryer">
        <span class="rotulo-pagina">${escaparHtml(guia.categoria || "Guia de compra")}</span>
        <h1>${escaparHtml(titulo)}</h1>
        <p class="meta-ranking-air-fryer"><strong>${produtos.length} ${produtos.length === 1 ? "modelo comparado" : "modelos comparados"}</strong> · Atualizado em ${escaparHtml(atualizado)}</p>
        <p class="transparencia-ranking-air-fryer">Ranking editorial. Os links das lojas são identificados e podem gerar comissão sem aumentar o preço para você.</p>
      </header>
      <section class="introducao-ranking-air-fryer">
        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(titulo)}" width="500" height="500">
        <div><h2>Compare antes de escolher</h2><p>${escaparHtml(descricao)}</p><p>Use as fichas, os prós e os pontos de atenção para encontrar o modelo mais adequado ao seu perfil.</p></div>
      </section>
      <section class="lista-produtos-ranking" aria-label="Ranking de produtos">
        ${produtos.length ? produtos.map((produto, indice) => cartaoProduto(produto, indice, todasOfertas)).join("") : `<div class="estado-vazio-pagina"><h2>Produtos em preparação</h2><p>O guia foi criado e os primeiros modelos serão publicados em breve.</p></div>`}
      </section>
      <section class="fontes-ranking-air-fryer"><h2>Como este guia funciona</h2><p>A ordem é definida no painel editorial. Preços e links são exibidos apenas quando cadastrados nas lojas parceiras.</p></section>
    </article>
  </main>
  <aside class="comparador-flutuante-guia" id="comparador-guia" aria-label="Produtos selecionados para comparar" hidden><div class="miniaturas-comparador-guia" id="miniaturas-comparador-guia" aria-hidden="true"></div><p id="texto-comparador-guia">Nenhum produto selecionado</p><a id="ir-comparador-guia" href="/comparar.html" aria-disabled="true">Comparar agora</a></aside>
  <footer class="rodape"><div class="limite rodape-conteudo"><div><p><strong>Ofertas que Valem</strong> — Compare antes de escolher.</p><p>Conteúdo editorial independente com ofertas identificadas.</p></div><nav class="rodape-links" aria-label="Informações do site"><a href="/sobre.html">Sobre</a><a href="/metodologia.html">Metodologia</a><a href="/politica-editorial.html">Política editorial</a><a href="/privacidade.html">Privacidade</a><a href="/termos.html">Termos</a></nav></div></footer>
  <script type="module" src="/assets/js/guia.js"></script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return paginaErro(503, "Guia temporariamente indisponível", "Tente novamente em alguns instantes.");
  }
}

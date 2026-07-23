import { carregarCatalogo as carregarCatalogoFirestore } from "./firebase-ofertas.js";

(() => {
  "use strict";

  const conteudo = document.querySelector("#conteudo-comparador-pagina");
  const vazio = document.querySelector("#comparacao-vazia");
  const resumo = document.querySelector("#resumo-comparacao-pagina");
  const compartilhar = document.querySelector("#compartilhar-comparacao-pagina");
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const LOJAS_PREFERIDAS = ["Amazon", "Mercado Livre", "Shopee", "Casas Bahia"];
  let catalogo = [];

  function carregarCatalogo() {
    return carregarCatalogoFirestore();
  }

  function ofertasDoProduto(produto) {
    const cadastradas = Array.isArray(produto?.ofertas) ? produto.ofertas : [];
    const ofertas = cadastradas.filter((oferta) => oferta?.url);
    if (produto?.urlOferta && !ofertas.some((oferta) => oferta.url === produto.urlOferta)) {
      ofertas.push({
        loja: produto.loja || "Loja parceira",
        url: produto.urlOferta,
        preco: Number(produto.precoAtual) || 0
      });
    }
    return ofertas.sort((a, b) => {
      const ordemA = LOJAS_PREFERIDAS.indexOf(a.loja);
      const ordemB = LOJAS_PREFERIDAS.indexOf(b.loja);
      return (ordemA < 0 ? 99 : ordemA) - (ordemB < 0 ? 99 : ordemB);
    });
  }

  function precoPrincipal(produto) {
    const precos = [
      Number(produto.precoAtual) || 0,
      ...ofertasDoProduto(produto).map((oferta) => Number(oferta.preco) || 0)
    ].filter((valor) => valor > 0);
    return precos.length ? Math.min(...precos) : 0;
  }

  function registrarCliqueOferta(produto, oferta) {
    const detalhe = {
      produto: produto.id,
      loja: oferta.loja || "Loja parceira",
      preco: Number(oferta.preco || produto.precoAtual) || null,
      destino: oferta.url
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "clique_oferta", ...detalhe });
    window.dispatchEvent(new CustomEvent("ofertas-que-valem:clique-oferta", { detail: detalhe }));
  }

  function idsSelecionados() {
    return (new URLSearchParams(window.location.search).get("produtos") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  function criarElemento(nome, classe, texto) {
    const elemento = document.createElement(nome);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
  }

  function atualizarUrl(ids) {
    const url = new URL(window.location.href);
    if (ids.length) url.searchParams.set("produtos", ids.join(","));
    else url.searchParams.delete("produtos");
    history.replaceState({}, "", url);
  }

  function removerProduto(id) {
    const ids = idsSelecionados().filter((item) => item !== id);
    atualizarUrl(ids);
    renderizar();
  }

  function criarCartao(produto, menorPreco, maiorNota) {
    const cartao = criarElemento("article", "cartao-comparacao-pagina");
    const remover = criarElemento("button", "remover-comparacao-pagina", "×");
    remover.type = "button";
    remover.setAttribute("aria-label", `Remover ${produto.nome} da comparação`);
    remover.addEventListener("click", () => removerProduto(produto.id));

    const imagem = document.createElement("img");
    imagem.src = produto.imagem;
    imagem.alt = produto.alt || produto.nome;
    imagem.width = 640;
    imagem.height = 640;

    const categoria = criarElemento("span", "comparacao-categoria", produto.categoria);
    const titulo = criarElemento("h2", "", produto.nome);
    const perfil = criarElemento("p", "comparacao-perfil", produto.perfil || "Perfil versátil");

    const nota = criarElemento("p", "linha-dado-comparacao");
    nota.append(criarElemento("span", "", "Nota editorial"), criarElemento("strong", Number(produto.nota || 0) === maiorNota ? "melhor-comparacao" : "", Number(produto.nota || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1 })));

    const precoValor = precoPrincipal(produto);
    const preco = criarElemento("p", "linha-dado-comparacao");
    preco.append(
      criarElemento("span", "", "Preço"),
      criarElemento("strong", precoValor > 0 && precoValor === menorPreco ? "melhor-comparacao" : "", precoValor > 0 ? moeda.format(precoValor) : "Ofertas em breve")
    );

    const especificacoes = criarElemento("ul", "lista-comparacao-pagina");
    (produto.especificacoes || []).forEach((item) => especificacoes.append(criarElemento("li", "", item)));
    const pros = criarElemento("p", "comparacao-perfil", `Prós: ${(produto.pros || ["Veja a ficha do modelo"]).join("; ")}.`);
    const contras = criarElemento("p", "comparacao-perfil", `Atenção: ${(produto.contras || ["Confira as medidas antes de escolher"]).join("; ")}.`);

    const ofertas = criarElemento("div", "ofertas-comparacao-pagina");
    const tituloOfertas = criarElemento("p", "titulo-ofertas-ranking", "Comprar em");
    const listaOfertas = criarElemento("div", "lista-lojas-ranking");
    const ofertasAtivas = ofertasDoProduto(produto);

    if (ofertasAtivas.length) {
      ofertasAtivas.forEach((oferta) => {
        const link = criarElemento("a", "botao-loja-ranking");
        link.href = oferta.url;
        link.target = "_blank";
        link.rel = "sponsored nofollow noopener noreferrer";
        link.setAttribute("aria-label", `Ver ${produto.nome} na ${oferta.loja}`);
        link.append(
          criarElemento("strong", "", oferta.loja),
          criarElemento("small", "", Number(oferta.preco) > 0 ? moeda.format(Number(oferta.preco)) : "Ver oferta")
        );
        link.addEventListener("click", () => registrarCliqueOferta(produto, oferta));
        listaOfertas.append(link);
      });
      ofertas.append(tituloOfertas, listaOfertas);
    } else {
      ofertas.append(criarElemento("p", "estado-ofertas-ranking", "Links das lojas em breve"));
    }

    const guia = criarElemento("a", "botao-pagina", "Ver guia completo");
    guia.href = `/${produto.slugGuia}`;

    cartao.append(remover, imagem, categoria, titulo, perfil, nota, preco, especificacoes, pros, contras, ofertas, guia);
    return cartao;
  }

  function renderizar() {
    const ids = idsSelecionados();
    const produtos = ids.map((id) => catalogo.find((produto) => produto.id === id)).filter(Boolean);
    conteudo.replaceChildren();

    if (produtos.length < 2) {
      vazio.hidden = false;
      conteudo.hidden = true;
      resumo.textContent = "Selecione pelo menos dois produtos para comparar.";
      compartilhar.disabled = true;
      return;
    }

    vazio.hidden = true;
    conteudo.hidden = false;
    compartilhar.disabled = false;
    const precosDisponiveis = produtos.map(precoPrincipal).filter((valor) => valor > 0);
    const menorPreco = precosDisponiveis.length ? Math.min(...precosDisponiveis) : Infinity;
    const maiorNota = Math.max(...produtos.map((produto) => Number(produto.nota) || 0));
    resumo.textContent = precosDisponiveis.length
      ? `${produtos.length} produtos comparados. Os melhores valores estão destacados em verde.`
      : `${produtos.length} produtos comparados por nota, especificações, prós e pontos de atenção.`;
    conteudo.append(...produtos.map((produto) => criarCartao(produto, menorPreco, maiorNota)));
  }

  compartilhar?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      compartilhar.textContent = "Link copiado";
      window.setTimeout(() => { compartilhar.textContent = "Copiar comparação"; }, 1800);
    } catch {
      resumo.textContent = "O link da comparação está disponível na barra de endereço.";
    }
  });

  carregarCatalogo()
    .then((dados) => {
      catalogo = Array.isArray(dados.produtos)
        ? dados.produtos.filter((produto) => produto.publicado !== false)
        : [];
      renderizar();
    })
    .catch(() => {
      resumo.textContent = "Não foi possível carregar o catálogo agora.";
      vazio.hidden = false;
    });
})();

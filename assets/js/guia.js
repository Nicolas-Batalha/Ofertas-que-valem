import { carregarCatalogo as carregarCatalogoFirestore } from "./firebase-ofertas.js";

(() => {
  "use strict";
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const LOJAS_PREFERIDAS = ["Amazon", "Mercado Livre", "Shopee", "Casas Bahia"];

  function carregarCatalogo() {
    return carregarCatalogoFirestore();
  }

  function ofertasDoProduto(produto) {
    const cadastradas = Array.isArray(produto?.ofertas) ? produto.ofertas : [];
    const porLoja = new Map(cadastradas.map((oferta) => [oferta.loja, oferta]));

    if (produto?.urlOferta) {
      const lojaLegada = produto.loja || "Loja parceira";
      const atual = porLoja.get(lojaLegada);
      if (!atual?.url) {
        porLoja.set(lojaLegada, {
          loja: lojaLegada,
          url: produto.urlOferta,
          preco: Number(produto.precoAtual) || 0
        });
      }
    }

    const preferidas = LOJAS_PREFERIDAS.map((loja) => ({
      loja,
      url: porLoja.get(loja)?.url || "",
      preco: Number(porLoja.get(loja)?.preco) || 0
    }));
    const extras = [...porLoja.values()].filter((oferta) => !LOJAS_PREFERIDAS.includes(oferta.loja) && oferta.url);
    return [...preferidas, ...extras];
  }

  function registrarCliqueOferta(produto, oferta) {
    const detalhe = {
      produto: produto.id,
      loja: oferta.loja || produto.loja || "Loja parceira",
      preco: Number(oferta.preco || produto.precoAtual) || null,
      destino: oferta.url || produto.urlOferta
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "clique_oferta", ...detalhe });
    window.dispatchEvent(new CustomEvent("ofertas-que-valem:clique-oferta", { detail: detalhe }));
  }

  const CHAVE_GUIAS = "ofertas-que-valem:guias-salvos";
  const botaoSalvar = document.querySelector("[data-salvar-guia]");
  const guiaId = document.body.dataset.guiaId || document.body.dataset.produto;
  let guiasSalvos = new Set();

  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_GUIAS) || "[]");
    guiasSalvos = new Set(Array.isArray(salvos) ? salvos : []);
  } catch {
    guiasSalvos = new Set();
  }

  function atualizarBotaoSalvar() {
    if (!botaoSalvar || !guiaId) return;
    const salvo = guiasSalvos.has(guiaId);
    botaoSalvar.setAttribute("aria-pressed", String(salvo));
    botaoSalvar.textContent = salvo ? "Guia salvo ✓" : "Salvar este guia";
  }

  botaoSalvar?.addEventListener("click", () => {
    if (!guiaId) return;
    if (guiasSalvos.has(guiaId)) guiasSalvos.delete(guiaId);
    else guiasSalvos.add(guiaId);
    try {
      localStorage.setItem(CHAVE_GUIAS, JSON.stringify([...guiasSalvos]));
    } catch {
      return;
    }
    atualizarBotaoSalvar();
  });
  atualizarBotaoSalvar();

  const caixasComparadorGuia = [...document.querySelectorAll("[data-comparar-guia]")];
  const barraComparadorGuia = document.querySelector("#comparador-guia");
  const textoComparadorGuia = document.querySelector("#texto-comparador-guia");
  const miniaturasComparadorGuia = document.querySelector("#miniaturas-comparador-guia");
  const linkComparadorGuia = document.querySelector("#ir-comparador-guia");

  function selecionadosNoGuia() {
    return caixasComparadorGuia.filter((caixa) => caixa.checked);
  }

  function atualizarComparadorGuia(mensagemTemporaria = "") {
    if (!barraComparadorGuia || !textoComparadorGuia || !linkComparadorGuia) return;
    const selecionados = selecionadosNoGuia();
    const ids = selecionados.map((caixa) => caixa.dataset.produto).filter(Boolean);

    barraComparadorGuia.hidden = selecionados.length === 0;
    textoComparadorGuia.textContent = mensagemTemporaria || (
      selecionados.length < 2
        ? "1 produto selecionado — escolha mais um"
        : `${selecionados.length} produtos prontos para comparar`
    );

    miniaturasComparadorGuia?.replaceChildren(...selecionados.map((caixa) => {
      const imagem = document.createElement("img");
      imagem.src = caixa.dataset.imagem;
      imagem.alt = "";
      imagem.width = 42;
      imagem.height = 42;
      return imagem;
    }));

    linkComparadorGuia.href = selecionados.length >= 2
      ? `/comparar.html?produtos=${ids.join(",")}`
      : "/comparar.html";
    linkComparadorGuia.setAttribute("aria-disabled", String(selecionados.length < 2));

    const url = new URL(window.location.href);
    if (ids.length) url.searchParams.set("comparar", ids.join(","));
    else url.searchParams.delete("comparar");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (caixasComparadorGuia.length) {
    const idsIniciais = (new URLSearchParams(window.location.search).get("comparar") || "")
      .split(",")
      .filter(Boolean)
      .slice(0, 3);
    caixasComparadorGuia.forEach((caixa) => {
      caixa.checked = idsIniciais.includes(caixa.dataset.produto);
      caixa.addEventListener("change", () => {
        if (caixa.checked && selecionadosNoGuia().length > 3) {
          caixa.checked = false;
          atualizarComparadorGuia("Você pode comparar até 3 produtos.");
          window.setTimeout(() => atualizarComparadorGuia(), 1800);
          return;
        }
        atualizarComparadorGuia();
      });
    });

    linkComparadorGuia?.addEventListener("click", (evento) => {
      if (selecionadosNoGuia().length >= 2) return;
      evento.preventDefault();
      atualizarComparadorGuia("Selecione pelo menos 2 produtos.");
    });
    atualizarComparadorGuia();
  }

  const recipientesOfertas = [...document.querySelectorAll("[data-ofertas-produto]")];
  if (recipientesOfertas.length) {
    carregarCatalogo()
      .then((catalogo) => {
        recipientesOfertas.forEach((recipiente) => {
          const produto = catalogo.produtos?.find((item) => item.id === recipiente.dataset.ofertasProduto);
          if (!produto) {
            recipiente.textContent = "Produto não encontrado no catálogo.";
            return;
          }

          const titulo = document.createElement("p");
          titulo.className = "titulo-ofertas-ranking";
          titulo.textContent = "Comprar em";

          const lista = document.createElement("div");
          lista.className = "lista-lojas-ranking";

          ofertasDoProduto(produto).forEach((oferta) => {
            const elemento = document.createElement(oferta.url ? "a" : "span");
            elemento.className = oferta.url
              ? "botao-loja-ranking"
              : "botao-loja-ranking botao-loja-ranking-pendente";

            const nome = document.createElement("strong");
            nome.textContent = oferta.loja;
            const detalhe = document.createElement("small");
            detalhe.textContent = oferta.url
              ? (oferta.preco > 0 ? moeda.format(oferta.preco) : "Ver oferta")
              : "Link pendente";
            elemento.append(nome, detalhe);

            if (oferta.url) {
              elemento.href = oferta.url;
              elemento.target = "_blank";
              elemento.rel = "sponsored nofollow noopener noreferrer";
              elemento.setAttribute("aria-label", `Ver ${produto.nome} na ${oferta.loja}`);
              elemento.addEventListener("click", () => registrarCliqueOferta(produto, oferta));
            } else {
              elemento.setAttribute("aria-disabled", "true");
            }

            lista.append(elemento);
          });

          recipiente.replaceChildren(titulo, lista);
        });
      })
      .catch(() => {
        recipientesOfertas.forEach((recipiente) => {
          recipiente.textContent = "As lojas serão publicadas após a verificação dos links.";
        });
      });
  }

  const produtoId = document.body.dataset.produto;
  const botao = document.querySelector("[data-guia-oferta]");
  const status = document.querySelector("[data-status-guia]");
  const preco = document.querySelector("[data-preco-guia]");
  if (!produtoId || !botao) return;

  carregarCatalogo()
    .then((catalogo) => {
      const produto = catalogo.produtos?.find((item) => item.id === produtoId);
      if (!produto?.urlOferta) return;
      botao.href = produto.urlOferta;
      botao.target = "_blank";
      botao.rel = "sponsored nofollow noopener noreferrer";
      botao.className = "botao-pagina";
      botao.removeAttribute("aria-disabled");
      botao.removeAttribute("tabindex");
      botao.textContent = "Ver oferta" + (produto.loja ? " em " + produto.loja : "");
      if (status) status.textContent = "Oferta cadastrada e pronta para consulta na loja.";
      if (preco) {
        preco.hidden = false;
        preco.textContent = "Preço cadastrado: " + moeda.format(Number(produto.precoAtual));
      }
      botao.addEventListener("click", () => registrarCliqueOferta(produto, {
        loja: produto.loja,
        preco: produto.precoAtual,
        url: produto.urlOferta
      }));
    })
    .catch(() => {
      if (status) status.textContent = "As lojas serão publicadas após a verificação do catálogo.";
    });
})();

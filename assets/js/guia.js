(() => {
  "use strict";
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

  const produtoId = document.body.dataset.produto;
  const botao = document.querySelector("[data-guia-oferta]");
  const status = document.querySelector("[data-status-guia]");
  const preco = document.querySelector("[data-preco-guia]");
  if (!produtoId || !botao) return;

  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function registrar(produto) {
    const detalhe = {
      produto: produto.id,
      loja: produto.loja || "Loja parceira",
      preco: Number(produto.precoAtual) || null,
      destino: produto.urlOferta
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "clique_oferta", ...detalhe });
    window.dispatchEvent(new CustomEvent("ofertas-que-valem:clique-oferta", { detail: detalhe }));
  }

  fetch("/assets/data/produtos.json", { cache: "no-store" })
    .then((resposta) => {
      if (!resposta.ok) throw new Error("Catálogo indisponível");
      return resposta.json();
    })
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
      botao.addEventListener("click", () => registrar(produto));
    })
    .catch(() => {
      if (status) status.textContent = "As lojas serão publicadas após a verificação do catálogo.";
    });
})();

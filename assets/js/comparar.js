(() => {
  "use strict";

  const conteudo = document.querySelector("#conteudo-comparador-pagina");
  const vazio = document.querySelector("#comparacao-vazia");
  const resumo = document.querySelector("#resumo-comparacao-pagina");
  const compartilhar = document.querySelector("#compartilhar-comparacao-pagina");
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  let catalogo = [];

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

    const preco = criarElemento("p", "linha-dado-comparacao");
    preco.append(criarElemento("span", "", "Preço demonstrativo"), criarElemento("strong", Number(produto.precoAtual) === menorPreco ? "melhor-comparacao" : "", moeda.format(Number(produto.precoAtual) || 0)));

    const especificacoes = criarElemento("ul", "lista-comparacao-pagina");
    (produto.especificacoes || []).forEach((item) => especificacoes.append(criarElemento("li", "", item)));

    const guia = criarElemento("a", "botao-pagina", "Ver guia completo");
    guia.href = `/${produto.slugGuia}`;

    cartao.append(remover, imagem, categoria, titulo, perfil, nota, preco, especificacoes, guia);
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
    resumo.textContent = `${produtos.length} produtos comparados. Os melhores valores estão destacados em verde.`;
    const menorPreco = Math.min(...produtos.map((produto) => Number(produto.precoAtual) || Infinity));
    const maiorNota = Math.max(...produtos.map((produto) => Number(produto.nota) || 0));
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

  fetch("/assets/data/produtos.json", { cache: "no-store" })
    .then((resposta) => {
      if (!resposta.ok) throw new Error("Catálogo indisponível");
      return resposta.json();
    })
    .then((dados) => {
      catalogo = Array.isArray(dados.produtos) ? dados.produtos : [];
      renderizar();
    })
    .catch(() => {
      resumo.textContent = "Não foi possível carregar o catálogo agora.";
      vazio.hidden = false;
    });
})();

import { carregarCatalogo as carregarCatalogoFirebase } from "./firebase-ofertas.js";

(() => {
  "use strict";

  const campo = document.querySelector("#busca-pagina");
  const filtroCategoria = document.querySelector("#filtro-categoria");
  const filtroPreco = document.querySelector("#filtro-preco");
  const filtroNota = document.querySelector("#filtro-nota");
  const filtroPerfil = document.querySelector("#filtro-perfil");
  const ordenacao = document.querySelector("#ordenacao-busca");
  const grade = document.querySelector("#resultados-produtos");
  const resumo = document.querySelector("#resumo-resultados");
  const vazio = document.querySelector("#busca-vazia");
  const limpar = document.querySelector("#limpar-filtros");
  const comparador = document.querySelector("#comparador-busca");
  const textoComparador = document.querySelector("#texto-comparador-busca");
  const linkComparar = document.querySelector("#ir-comparador");
  const listaSugestoes = document.querySelector("#sugestoes-busca-pagina");
  const CHAVE_FAVORITOS = "ofertas-que-valem:favoritos";

  let produtos = [];
  let favoritos = new Set();
  let selecionados = new Set();

  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const normalizar = (valor = "") => valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS) || "[]");
    favoritos = new Set(Array.isArray(salvos) ? salvos : []);
  } catch {
    favoritos = new Set();
  }

  function salvarFavoritos() {
    try {
      localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify([...favoritos]));
    } catch {
      // A busca continua funcionando quando o armazenamento está bloqueado.
    }
  }

  function correspondePreco(produto, faixa) {
    const preco = Number(produto.precoAtual) || 0;
    if (!faixa) return true;
    if (preco <= 0) return false;
    if (faixa === "ate-300") return preco <= 300;
    if (faixa === "300-700") return preco > 300 && preco <= 700;
    if (faixa === "700-1200") return preco > 700 && preco <= 1200;
    if (faixa === "1200-mais") return preco > 1200;
    return true;
  }

  function correspondeTexto(produto, consulta) {
    const termo = normalizar(consulta);
    if (!termo) return true;
    const palavras = termo.split(/\s+/).filter(Boolean);
    const conteudo = normalizar([
      produto.nome,
      produto.categoria,
      produto.perfil,
      produto.termos,
      ...(produto.especificacoes || [])
    ].join(" "));
    return palavras.every((palavra) => conteudo.includes(palavra));
  }

  function criarElemento(nome, classe, texto) {
    const elemento = document.createElement(nome);
    if (classe) elemento.className = classe;
    if (texto) elemento.textContent = texto;
    return elemento;
  }

  function atualizarComparador() {
    if (!comparador || !textoComparador || !linkComparar) return;
    comparador.hidden = selecionados.size === 0;
    textoComparador.textContent = `${selecionados.size} ${selecionados.size === 1 ? "produto selecionado" : "produtos selecionados"}`;
    const ids = [...selecionados].join(",");
    linkComparar.href = `/comparar.html?produtos=${encodeURIComponent(ids)}`;
    linkComparar.setAttribute("aria-disabled", String(selecionados.size < 2));
  }

  function alternarComparacao(produto, caixa) {
    if (caixa.checked && selecionados.size >= 3) {
      caixa.checked = false;
      resumo.textContent = "Você pode comparar até três produtos por vez.";
      return;
    }
    if (caixa.checked) selecionados.add(produto.id);
    else selecionados.delete(produto.id);
    atualizarComparador();
  }

  function criarCartao(produto) {
    const cartao = criarElemento("article", "resultado-produto");
    cartao.dataset.produto = produto.id;

    const topo = criarElemento("div", "resultado-produto-topo");
    const categoria = criarElemento("span", "resultado-categoria", produto.categoria);
    const favoritar = criarElemento("button", "favoritar-resultado", favoritos.has(produto.id) ? "♥" : "♡");
    favoritar.type = "button";
    favoritar.setAttribute("aria-pressed", String(favoritos.has(produto.id)));
    favoritar.setAttribute("aria-label", `${favoritos.has(produto.id) ? "Remover dos" : "Adicionar aos"} favoritos: ${produto.nome}`);
    favoritar.addEventListener("click", () => {
      if (favoritos.has(produto.id)) favoritos.delete(produto.id);
      else favoritos.add(produto.id);
      salvarFavoritos();
      favoritar.textContent = favoritos.has(produto.id) ? "♥" : "♡";
      favoritar.setAttribute("aria-pressed", String(favoritos.has(produto.id)));
      favoritar.setAttribute("aria-label", `${favoritos.has(produto.id) ? "Remover dos" : "Adicionar aos"} favoritos: ${produto.nome}`);
    });
    topo.append(categoria, favoritar);

    const visual = criarElemento("div", "resultado-produto-visual");
    const imagem = document.createElement("img");
    imagem.src = produto.imagem;
    imagem.alt = produto.alt || produto.nome;
    imagem.width = 640;
    imagem.height = 640;
    imagem.loading = "lazy";
    visual.append(imagem);

    const conteudo = criarElemento("div", "resultado-produto-conteudo");
    const titulo = criarElemento("h2", "", produto.nome);
    const perfil = criarElemento("p", "resultado-perfil", produto.perfil || "Perfil versátil");
    const dados = criarElemento("div", "resultado-dados");
    const preco = Number(produto.precoAtual) || 0;
    dados.append(
      criarElemento("strong", "resultado-nota", `Nota ${Number(produto.nota || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1 })}`),
      criarElemento("strong", "resultado-preco", preco > 0 ? `A partir de ${moeda.format(preco)}` : "Consultar oferta")
    );

    const lista = criarElemento("ul", "resultado-especificacoes");
    (produto.especificacoes || []).slice(0, 3).forEach((item) => lista.append(criarElemento("li", "", item)));

    const acoes = criarElemento("div", "resultado-acoes");
    const comparar = criarElemento("label", "controle-comparar-resultado");
    const caixa = document.createElement("input");
    caixa.type = "checkbox";
    caixa.value = produto.id;
    caixa.checked = selecionados.has(produto.id);
    caixa.addEventListener("change", () => alternarComparacao(produto, caixa));
    comparar.append(caixa, document.createTextNode(" Comparar"));

    const guia = criarElemento("a", "botao-resultado", "Ver guia");
    guia.href = `/${produto.slugGuia}`;
    acoes.append(comparar, guia);
    conteudo.append(titulo, perfil, dados, lista, acoes);
    cartao.append(topo, visual, conteudo);
    return cartao;
  }

  function atualizarUrl() {
    const url = new URL(window.location.href);
    const parametros = {
      busca: campo.value.trim(),
      categoria: filtroCategoria.value,
      preco: filtroPreco.value,
      nota: filtroNota.value,
      perfil: filtroPerfil.value,
      ordem: ordenacao.value
    };
    Object.entries(parametros).forEach(([chave, valor]) => {
      if (valor) url.searchParams.set(chave, valor);
      else url.searchParams.delete(chave);
    });
    history.replaceState({}, "", url);
  }

  function aplicarFiltros() {
    const consulta = campo.value;
    const categoria = filtroCategoria.value;
    const perfil = filtroPerfil.value;
    const notaMinima = Number(filtroNota.value) || 0;

    const encontrados = produtos.filter((produto) =>
      correspondeTexto(produto, consulta)
      && (!categoria || produto.categoria === categoria)
      && (!perfil || produto.perfil === perfil)
      && correspondePreco(produto, filtroPreco.value)
      && Number(produto.nota || 0) >= notaMinima
    );

    encontrados.sort((a, b) => {
      if (ordenacao.value === "menor-preco") {
        const precoA = Number(a.precoAtual) > 0 ? Number(a.precoAtual) : Number.POSITIVE_INFINITY;
        const precoB = Number(b.precoAtual) > 0 ? Number(b.precoAtual) : Number.POSITIVE_INFINITY;
        return precoA - precoB;
      }
      if (ordenacao.value === "maior-nota") return Number(b.nota) - Number(a.nota);
      if (ordenacao.value === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      const consultaNormalizada = normalizar(consulta);
      const aComeca = normalizar(a.nome).startsWith(consultaNormalizada) ? 1 : 0;
      const bComeca = normalizar(b.nome).startsWith(consultaNormalizada) ? 1 : 0;
      return bComeca - aComeca || Number(b.nota) - Number(a.nota);
    });

    grade.replaceChildren(...encontrados.map(criarCartao));
    vazio.hidden = encontrados.length > 0;
    resumo.textContent = `${encontrados.length} ${encontrados.length === 1 ? "produto encontrado" : "produtos encontrados"}${consulta.trim() ? ` para “${consulta.trim()}”` : ""}.`;
    atualizarUrl();
  }

  function preencherOpcoes() {
    const categorias = [...new Set(produtos.map((produto) => produto.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    categorias.forEach((item) => {
      const opcao = document.createElement("option");
      opcao.value = item;
      opcao.textContent = item;
      filtroCategoria.append(opcao);
    });

    const perfis = [...new Set(produtos.map((produto) => produto.perfil).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    perfis.forEach((item) => {
      const opcao = document.createElement("option");
      opcao.value = item;
      opcao.textContent = item;
      filtroPerfil.append(opcao);
    });

    const sugestoes = new Set();
    produtos.forEach((produto) => {
      sugestoes.add(produto.nome);
      sugestoes.add(produto.categoria);
    });
    [...sugestoes].forEach((item) => {
      const opcao = document.createElement("option");
      opcao.value = item;
      listaSugestoes.append(opcao);
    });
  }

  function aplicarParametros() {
    const parametros = new URLSearchParams(window.location.search);
    campo.value = parametros.get("busca") || "";
    filtroCategoria.value = parametros.get("categoria") || "";
    filtroPreco.value = parametros.get("preco") || "";
    filtroNota.value = parametros.get("nota") || "";
    filtroPerfil.value = parametros.get("perfil") || "";
    ordenacao.value = parametros.get("ordem") || "relevancia";
  }

  [campo, filtroCategoria, filtroPreco, filtroNota, filtroPerfil, ordenacao].forEach((controle) => {
    controle?.addEventListener(controle === campo ? "input" : "change", aplicarFiltros);
  });

  limpar?.addEventListener("click", () => {
    campo.value = "";
    filtroCategoria.value = "";
    filtroPreco.value = "";
    filtroNota.value = "";
    filtroPerfil.value = "";
    ordenacao.value = "relevancia";
    aplicarFiltros();
    campo.focus();
  });

  carregarCatalogoFirebase()
    .then((catalogo) => {
      produtos = Array.isArray(catalogo.produtos)
        ? catalogo.produtos.filter((produto) => produto.publicado !== false)
        : [];
      preencherOpcoes();
      aplicarParametros();
      aplicarFiltros();
      atualizarComparador();
    })
    .catch(() => {
      resumo.textContent = "Não foi possível carregar o catálogo agora.";
      vazio.hidden = false;
    });
})();

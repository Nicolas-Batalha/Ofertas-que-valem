(() => {
  "use strict";

  const selecionar = (seletor, contexto = document) => contexto.querySelector(seletor);
  const selecionarTodos = (seletor, contexto = document) => [...contexto.querySelectorAll(seletor)];
  const normalizar = (valor = "") => valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const aviso = selecionar("#aviso-interface");
  let temporizadorAviso;

  function mostrarAviso(mensagem) {
    if (!aviso) return;
    aviso.textContent = mensagem;
    aviso.classList.add("visivel");
    window.clearTimeout(temporizadorAviso);
    temporizadorAviso = window.setTimeout(() => aviso.classList.remove("visivel"), 2800);
  }

  const botaoMenu = selecionar(".botao-menu");
  const menu = selecionar("#menu-principal");

  function fecharMenu() {
    if (!botaoMenu || !menu) return;
    botaoMenu.setAttribute("aria-expanded", "false");
    botaoMenu.setAttribute("aria-label", "Abrir menu");
    menu.classList.remove("menu-aberto");
  }

  botaoMenu?.addEventListener("click", () => {
    const abrir = botaoMenu.getAttribute("aria-expanded") !== "true";
    botaoMenu.setAttribute("aria-expanded", String(abrir));
    botaoMenu.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
    menu?.classList.toggle("menu-aberto", abrir);
  });

  selecionarTodos("#menu-principal a").forEach((link) => link.addEventListener("click", fecharMenu));
  document.addEventListener("click", (evento) => {
    if (menu?.classList.contains("menu-aberto") && !selecionar(".cabecalho-conteudo")?.contains(evento.target)) {
      fecharMenu();
    }
  });

  const botaoMetodologia = selecionar(".link-metodologia");
  const detalhesMetodologia = selecionar("#detalhes-metodologia");

  botaoMetodologia?.addEventListener("click", () => {
    const abrir = botaoMetodologia.getAttribute("aria-expanded") !== "true";
    botaoMetodologia.setAttribute("aria-expanded", String(abrir));
    if (detalhesMetodologia) detalhesMetodologia.hidden = !abrir;
  });

  const gradeRankings = selecionar(".grade-rankings");
  const cartoesRanking = selecionarTodos(".cartao-ranking");
  const cartoesOferta = selecionarTodos(".cartao-oferta");
  const cartoesCategoria = selecionarTodos(".cartao-categoria");
  const botoesFiltro = selecionarTodos(".filtro-ranking");
  const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
  const formatadorData = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  function calcularDesconto(precoReferencia, precoAtual) {
    if (!Number.isFinite(precoReferencia) || !Number.isFinite(precoAtual) || precoReferencia <= 0) return 0;
    return Math.max(0, Math.floor((1 - precoAtual / precoReferencia) * 100));
  }

  function criarElementoSvg(nome) {
    return document.createElementNS("http://www.w3.org/2000/svg", nome);
  }

  function criarGraficoPreco(elemento, historico, nomeProduto) {
    const pontosValidos = historico.filter((item) => Number.isFinite(item.preco));
    if (!elemento || pontosValidos.length < 2) return;

    const largura = 240;
    const altura = 34;
    const margemX = 3;
    const margemY = 4;
    const valores = pontosValidos.map((item) => item.preco);
    const menor = Math.min(...valores);
    const maior = Math.max(...valores);
    const intervalo = maior - menor || 1;
    const coordenadas = pontosValidos.map((item, indice) => ({
      x: margemX + (indice / (pontosValidos.length - 1)) * (largura - margemX * 2),
      y: margemY + ((maior - item.preco) / intervalo) * (altura - margemY * 2),
      ...item
    }));

    const svg = criarElementoSvg("svg");
    svg.classList.add("grafico-preco-svg");
    svg.setAttribute("viewBox", `0 0 ${largura} ${altura}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Histórico de preço de ${nomeProduto} nos últimos 90 dias`);

    const area = criarElementoSvg("polygon");
    const pontosArea = `${margemX},${altura} ${coordenadas.map((ponto) => `${ponto.x.toFixed(2)},${ponto.y.toFixed(2)}`).join(" ")} ${largura - margemX},${altura}`;
    area.setAttribute("points", pontosArea);
    area.classList.add("area-grafico-preco");

    const linha = criarElementoSvg("polyline");
    linha.setAttribute("points", coordenadas.map((ponto) => `${ponto.x.toFixed(2)},${ponto.y.toFixed(2)}`).join(" "));
    linha.classList.add("linha-grafico-preco");

    svg.append(area, linha);
    coordenadas.forEach((ponto, indice) => {
      const circulo = criarElementoSvg("circle");
      circulo.setAttribute("cx", ponto.x.toFixed(2));
      circulo.setAttribute("cy", ponto.y.toFixed(2));
      circulo.setAttribute("r", indice === coordenadas.length - 1 ? "2.8" : "1.8");
      circulo.classList.add("ponto-grafico-preco");
      if (indice === coordenadas.length - 1) circulo.classList.add("ponto-atual");
      const titulo = criarElementoSvg("title");
      titulo.textContent = `${formatadorData.format(new Date(`${ponto.data}T12:00:00`))}: ${formatadorMoeda.format(ponto.preco)}`;
      circulo.append(titulo);
      svg.append(circulo);
    });

    elemento.replaceChildren(svg);
  }

  const catalogoPorId = new Map();

  function atualizarProdutoNaPagina(produto, catalogo) {
    catalogoPorId.set(produto.id, produto);
    const demonstrativo = catalogo.demonstrativo !== false;
    const precoReferencia = Number(produto.precoReferencia);
    const precoAtual = Number(produto.precoAtual);
    const desconto = calcularDesconto(precoReferencia, precoAtual);
    const historico = Array.isArray(produto.historico) ? produto.historico : [];
    const precosHistoricos = historico.map((item) => Number(item.preco)).filter(Number.isFinite);
    const menorPreco = precosHistoricos.length ? Math.min(...precosHistoricos) : precoAtual;
    const cartao = selecionar(`.cartao-oferta[data-produto="${produto.id}"]`);

    if (cartao) {
      const nome = selecionar('[data-campo="nome"]', cartao);
      const imagem = selecionar('[data-campo="imagem"]', cartao);
      const referencia = selecionar('[data-campo="preco-referencia"]', cartao);
      const atual = selecionar('[data-campo="preco-atual"]', cartao);
      const selo = selecionar('[data-campo="desconto"]', cartao);
      const resumo = selecionar('[data-campo="resumo-historico"]', cartao);
      const grafico = selecionar("[data-grafico-preco]", cartao);
      const link = selecionar("[data-link-oferta]", cartao);

      if (nome) nome.textContent = produto.nome;
      if (imagem) {
        imagem.src = produto.imagem;
        imagem.alt = produto.alt || produto.nome;
      }
      if (referencia) referencia.textContent = formatadorMoeda.format(precoReferencia);
      if (atual) atual.textContent = formatadorMoeda.format(precoAtual);
      if (selo) selo.textContent = `-${desconto}%`;
      if (resumo) {
        if (demonstrativo) {
          resumo.textContent = "Histórico demonstrativo";
        } else {
          const diferenca = precoAtual - menorPreco;
          resumo.textContent = diferenca <= 0.009
            ? "Menor preço em 90 dias"
            : `${formatadorMoeda.format(diferenca)} acima do menor preço`;
        }
      }
      if (grafico) criarGraficoPreco(grafico, historico, produto.nome);

      if (link && produto.urlOferta) {
        const icone = document.createElement("span");
        icone.className = "icone-carrinho";
        icone.setAttribute("aria-hidden", "true");
        link.replaceChildren(icone, document.createTextNode(` Ver oferta${produto.loja ? ` em ${produto.loja}` : ""}`));
        link.href = produto.urlOferta;
        link.target = "_blank";
        link.rel = "sponsored nofollow noopener noreferrer";
        link.dataset.linkReal = "true";
        link.dataset.produto = produto.id;
        link.dataset.loja = produto.loja || "Loja parceira";
        link.dataset.preco = String(precoAtual);
        cartao.dataset.urlOferta = produto.urlOferta;
        cartao.dataset.loja = produto.loja || "Loja parceira";
      } else if (link && produto.slugGuia) {
        link.href = produto.slugGuia;
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.dataset.linkReal = "guide";
      }

      cartao.classList.toggle("dados-demonstrativos", demonstrativo);
      cartao.title = demonstrativo
        ? "Dados demonstrativos — links de loja ainda não conectados"
        : `Preço atualizado em ${formatadorData.format(new Date(catalogo.atualizadoEm))} · ${catalogo.fonte}`;
    }

    selecionarTodos(`[data-desconto-produto="${produto.id}"]`).forEach((selo) => {
      selo.textContent = `-${desconto}%`;
    });
    selecionarTodos(`[data-preco-produto="${produto.id}"]`).forEach((preco) => {
      preco.textContent = formatadorMoeda.format(precoAtual).replace(",00", "");
    });
  }

  async function carregarCatalogoPrecos() {
    try {
      const resposta = await fetch("/assets/data/produtos.json", { cache: "no-store" });
      if (!resposta.ok) throw new Error(`Falha ao carregar preços: ${resposta.status}`);
      const catalogo = await resposta.json();
      if (!Array.isArray(catalogo.produtos)) throw new Error("Catálogo de preços inválido");
      catalogo.produtos.forEach((produto) => atualizarProdutoNaPagina(produto, catalogo));
      document.documentElement.dataset.precos = catalogo.demonstrativo !== false ? "demonstrativos" : "verificados";
    } catch (erro) {
      document.documentElement.dataset.precos = "reserva";
      console.warn("Os dados de reserva do HTML foram mantidos.", erro);
    }
  }

  carregarCatalogoPrecos();

  function atualizarPosicoes() {
    selecionarTodos(".cartao-ranking", gradeRankings).forEach((cartao, indice) => {
      const posicao = selecionar(".posicao", cartao);
      if (!posicao) return;
      posicao.classList.remove("posicao-primeira", "posicao-segunda", "posicao-terceira");
      posicao.classList.add(["posicao-primeira", "posicao-segunda", "posicao-terceira"][indice] || "posicao-segunda");
      posicao.replaceChildren(document.createTextNode(`${indice + 1}º `));
      const complemento = document.createElement("small");
      complemento.textContent = "lugar";
      posicao.append(complemento);
    });
  }

  const metricas = {
    popularidade: "popularidade",
    custo: "custo",
    avaliacao: "nota",
    oferta: "desconto"
  };

  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", () => {
      const metrica = metricas[botao.dataset.filtro] || "popularidade";
      const ordenados = [...cartoesRanking].sort((a, b) => Number(b.dataset[metrica]) - Number(a.dataset[metrica]));
      ordenados.forEach((cartao) => gradeRankings?.append(cartao));
      botoesFiltro.forEach((item) => {
        const ativo = item === botao;
        item.classList.toggle("filtro-ativo", ativo);
        item.setAttribute("aria-pressed", String(ativo));
      });
      atualizarPosicoes();
      mostrarAviso(`Ranking ordenado por ${botao.textContent.trim().toLowerCase()}.`);
    });
  });

  const formularioBusca = selecionar(".busca-cabecalho");
  const campoBusca = selecionar("#busca-produto");
  const resultadoBusca = selecionar("#resultado-busca");
  const palavrasIgnoradas = new Set(["a", "as", "o", "os", "e", "de", "do", "da", "em", "para"]);

  function correspondeBusca(elemento, consulta) {
    const palavras = normalizar(consulta).split(/\s+/).filter((palavra) => palavra.length > 1 && !palavrasIgnoradas.has(palavra));
    const conteudo = normalizar(`${elemento.dataset.termos || ""} ${elemento.textContent}`);
    return palavras.length > 0 && palavras.every((palavra) => conteudo.includes(palavra));
  }

  function limparBusca() {
    [...cartoesRanking, ...cartoesOferta].forEach((cartao) => {
      cartao.classList.remove("oculto-busca", "cartao-encontrado");
    });
    cartoesCategoria.forEach((cartao) => cartao.classList.remove("categoria-encontrada"));
    if (resultadoBusca) resultadoBusca.textContent = "";
  }

  function desativarFiltroFavoritos() {
    const botaoFavoritos = selecionar(".botao-favoritos");
    botaoFavoritos?.setAttribute("aria-pressed", "false");
    cartoesRanking.forEach((cartao) => cartao.classList.remove("oculto-favorito"));
  }

  function executarBusca(consulta = campoBusca?.value || "") {
    const termo = consulta.trim();
    limparBusca();
    desativarFiltroFavoritos();

    if (!termo) {
      mostrarAviso("Digite o nome de um produto ou categoria.");
      campoBusca?.focus();
      return;
    }

    const rankingsEncontrados = cartoesRanking.filter((cartao) => correspondeBusca(cartao, termo));
    const ofertasEncontradas = cartoesOferta.filter((cartao) => correspondeBusca(cartao, termo));
    const categoriasEncontradas = cartoesCategoria.filter((cartao) => correspondeBusca(cartao, termo));

    if (rankingsEncontrados.length || ofertasEncontradas.length) {
      cartoesRanking.forEach((cartao) => cartao.classList.toggle("oculto-busca", !rankingsEncontrados.includes(cartao)));
      cartoesOferta.forEach((cartao) => cartao.classList.toggle("oculto-busca", !ofertasEncontradas.includes(cartao)));
      [...rankingsEncontrados, ...ofertasEncontradas].forEach((cartao) => cartao.classList.add("cartao-encontrado"));

      const produtos = new Set([...rankingsEncontrados, ...ofertasEncontradas].map((cartao) => cartao.dataset.produto));
      const total = produtos.size;
      if (resultadoBusca) resultadoBusca.textContent = `${total} ${total === 1 ? "produto encontrado" : "produtos encontrados"} para “${termo}”.`;
      (rankingsEncontrados[0] ? selecionar("#rankings") : selecionar("#ofertas"))?.scrollIntoView({ behavior: "smooth", block: "start" });
      mostrarAviso(`${total} ${total === 1 ? "resultado encontrado" : "resultados encontrados"}.`);
      return;
    }

    if (categoriasEncontradas.length) {
      categoriasEncontradas.forEach((cartao) => cartao.classList.add("categoria-encontrada"));
      selecionar("#categorias")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (resultadoBusca) resultadoBusca.textContent = "";
      mostrarAviso("Categoria encontrada. Novos rankings serão adicionados em breve.");
      return;
    }

    if (resultadoBusca) resultadoBusca.textContent = `Nenhum produto encontrado para “${termo}”. Tente outro nome.`;
    selecionar("#rankings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    mostrarAviso("Nenhum produto encontrado. Tente outro termo.");
  }

  formularioBusca?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const termo = campoBusca?.value.trim() || "";
    if (!termo) {
      mostrarAviso("Digite o nome de um produto ou categoria.");
      campoBusca?.focus();
      return;
    }
    window.location.href = `/busca.html?busca=${encodeURIComponent(termo)}`;
  });

  campoBusca?.addEventListener("input", () => {
    if (!campoBusca.value.trim()) limparBusca();
  });

  const buscaInicial = new URLSearchParams(window.location.search).get("busca");
  if (buscaInicial && campoBusca) {
    campoBusca.value = buscaInicial;
    executarBusca(buscaInicial);
  }

  const CHAVE_FAVORITOS = "ofertas-que-valem:favoritos";
  const botaoFavoritos = selecionar(".botao-favoritos");
  const contadorFavoritos = selecionar(".contador-favoritos");
  let favoritos = new Set();

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
      // A interface continua funcionando mesmo quando o navegador bloqueia o armazenamento.
    }
  }

  function atualizarFavoritos() {
    cartoesRanking.forEach((cartao) => {
      const favoritado = favoritos.has(cartao.dataset.produto);
      const botao = selecionar(".favoritar-cartao", cartao);
      if (!botao) return;
      botao.classList.toggle("ativo", favoritado);
      botao.setAttribute("aria-pressed", String(favoritado));
      botao.textContent = favoritado ? "♥" : "♡";
      botao.setAttribute("aria-label", `${favoritado ? "Remover dos" : "Adicionar aos"} favoritos: ${selecionar("h3", cartao)?.textContent || "produto"}`);
    });

    if (contadorFavoritos) {
      contadorFavoritos.textContent = String(favoritos.size);
      contadorFavoritos.dataset.total = String(favoritos.size);
      contadorFavoritos.setAttribute("aria-label", `${favoritos.size} favoritos`);
    }

    if (botaoFavoritos?.getAttribute("aria-pressed") === "true") {
      cartoesRanking.forEach((cartao) => cartao.classList.toggle("oculto-favorito", !favoritos.has(cartao.dataset.produto)));
      if (!favoritos.size) desativarFiltroFavoritos();
    }
  }

  selecionarTodos(".favoritar-cartao").forEach((botao) => {
    botao.addEventListener("click", () => {
      const cartao = botao.closest(".cartao-ranking");
      const produto = cartao?.dataset.produto;
      if (!produto) return;
      const adicionar = !favoritos.has(produto);
      if (adicionar) favoritos.add(produto);
      else favoritos.delete(produto);
      salvarFavoritos();
      atualizarFavoritos();
      mostrarAviso(adicionar ? "Produto adicionado aos favoritos." : "Produto removido dos favoritos.");
    });
  });

  botaoFavoritos?.addEventListener("click", () => {
    if (!favoritos.size) {
      mostrarAviso("Você ainda não adicionou produtos aos favoritos.");
      return;
    }
    limparBusca();
    const ativar = botaoFavoritos.getAttribute("aria-pressed") !== "true";
    botaoFavoritos.setAttribute("aria-pressed", String(ativar));
    cartoesRanking.forEach((cartao) => cartao.classList.toggle("oculto-favorito", ativar && !favoritos.has(cartao.dataset.produto)));
    selecionar("#rankings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    mostrarAviso(ativar ? "Mostrando somente seus favoritos." : "Mostrando todos os rankings.");
  });

  atualizarFavoritos();

  const caixasComparacao = selecionarTodos('input[name="comparar"]');
  const comparador = selecionar("#comparador");
  const miniaturasComparador = selecionar("#comparador-miniaturas");
  const textoComparador = selecionar("#texto-comparador");
  const botaoComparar = selecionar("#botao-comparar");
  const botaoCompartilharComparacao = selecionar("#compartilhar-comparacao");
  const modalComparacao = selecionar("#modal-comparacao");
  const conteudoComparacao = selecionar("#conteudo-comparacao");
  const botaoFecharComparacao = selecionar(".fechar-comparacao");

  function caixasSelecionadas() {
    return caixasComparacao.filter((caixa) => caixa.checked);
  }

  function atualizarComparador() {
    const selecionadas = caixasSelecionadas();
    const ids = selecionadas.map((caixa) => caixa.dataset.produto).filter(Boolean);
    if (comparador) comparador.hidden = selecionadas.length === 0;
    if (miniaturasComparador) miniaturasComparador.replaceChildren();

    selecionadas.forEach((caixa) => {
      const miniatura = document.createElement("span");
      miniatura.className = "miniatura-selecionada";

      const remover = document.createElement("button");
      remover.type = "button";
      remover.dataset.produto = caixa.dataset.produto;
      remover.setAttribute("aria-label", `Remover ${caixa.dataset.nome} da comparação`);
      remover.textContent = "×";

      const imagem = document.createElement("img");
      imagem.src = caixa.dataset.imagem;
      imagem.alt = `${caixa.dataset.nome} selecionado para comparação`;
      imagem.width = 640;
      imagem.height = 640;

      miniatura.append(remover, imagem);
      miniaturasComparador?.append(miniatura);
    });

    if (textoComparador) {
      textoComparador.textContent = `${selecionadas.length} ${selecionadas.length === 1 ? "produto selecionado" : "produtos selecionados"}`;
    }
    botaoComparar?.setAttribute("aria-disabled", String(selecionadas.length < 2));
    botaoCompartilharComparacao?.toggleAttribute("disabled", selecionadas.length < 2);

    if (botaoComparar) {
      botaoComparar.href = selecionadas.length >= 2
        ? `/comparar.html?produtos=${encodeURIComponent(ids.join(","))}`
        : "/comparar.html";
    }

    const urlAtual = new URL(window.location.href);
    if (ids.length) urlAtual.searchParams.set("comparar", ids.join(","));
    else urlAtual.searchParams.delete("comparar");
    window.history.replaceState({}, "", `${urlAtual.pathname}${urlAtual.search}${urlAtual.hash}`);
  }

  caixasComparacao.forEach((caixa) => {
    caixa.addEventListener("change", () => {
      if (caixa.checked && caixasSelecionadas().length > 3) {
        caixa.checked = false;
        mostrarAviso("Você pode comparar até 3 produtos por vez.");
      }
      atualizarComparador();
    });
  });

  miniaturasComparador?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-produto]");
    if (!botao) return;
    const caixa = caixasComparacao.find((item) => item.dataset.produto === botao.dataset.produto);
    if (caixa) caixa.checked = false;
    atualizarComparador();
    mostrarAviso("Produto removido da comparação.");
  });

  function adicionarLinhaComparacao(cartao, rotulo, seletor, classe = "") {
    const linha = document.createElement("p");
    linha.className = "linha-comparacao";
    const nome = document.createElement("span");
    nome.textContent = rotulo;
    const valor = document.createElement("strong");
    valor.textContent = selecionar(seletor, cartao)?.textContent.trim() || "—";
    if (classe) valor.classList.add(classe);
    linha.append(nome, valor);
    return linha;
  }

  function abrirComparacao(evento) {
    evento?.preventDefault();
    const selecionadas = caixasSelecionadas();
    if (selecionadas.length < 2) {
      mostrarAviso("Selecione pelo menos 2 produtos para comparar.");
      return;
    }

    conteudoComparacao?.replaceChildren();
    selecionadas.forEach((caixa) => {
      const cartao = selecionar(`.cartao-ranking[data-produto="${caixa.dataset.produto}"]`);
      if (!cartao) return;
      const produto = catalogoPorId.get(caixa.dataset.produto);
      const item = document.createElement("article");
      item.className = "item-comparacao";
      item.dataset.nota = String(produto?.nota || 0);
      item.dataset.preco = String(produto?.precoAtual || 0);
      const imagem = selecionar(".imagem-ranking-produto", cartao)?.cloneNode(true);
      const titulo = document.createElement("h3");
      titulo.textContent = selecionar("h3", cartao)?.textContent.trim() || caixa.dataset.nome;
      const acoes = document.createElement("div");
      acoes.className = "acoes-item-comparacao";

      const guia = document.createElement("a");
      guia.href = produto?.slugGuia || "guias.html";
      guia.textContent = "Ver guia completo";
      guia.className = "acao-secundaria-comparacao";
      acoes.append(guia);

      if (produto?.urlOferta) {
        const oferta = document.createElement("a");
        oferta.href = produto.urlOferta;
        oferta.target = "_blank";
        oferta.rel = "sponsored nofollow noopener noreferrer";
        oferta.textContent = `Ver oferta${produto.loja ? ` em ${produto.loja}` : ""}`;
        oferta.className = "acao-principal-comparacao";
        oferta.dataset.linkOferta = "";
        oferta.dataset.linkReal = "true";
        oferta.dataset.produto = produto.id;
        oferta.dataset.loja = produto.loja || "Loja parceira";
        oferta.dataset.preco = String(produto.precoAtual || "");
        oferta.addEventListener("click", () => registrarCliqueOferta(oferta));
        acoes.append(oferta);
      }

      if (imagem) item.append(imagem);
      item.append(
        titulo,
        adicionarLinhaComparacao(cartao, "Nota editorial", ".nota-produto", "valor-nota"),
        adicionarLinhaComparacao(cartao, "Preço de exemplo", ".preco-inicial strong", "valor-preco"),
        adicionarLinhaComparacao(cartao, "Ponto forte", ".positivo"),
        adicionarLinhaComparacao(cartao, "Atenção", ".negativo"),
        acoes
      );
      conteudoComparacao?.append(item);
    });

    const itens = selecionarTodos(".item-comparacao", conteudoComparacao);
    const maiorNota = Math.max(...itens.map((item) => Number(item.dataset.nota) || 0));
    const precos = itens.map((item) => Number(item.dataset.preco) || 0).filter((valor) => valor > 0);
    const menorPreco = precos.length ? Math.min(...precos) : 0;
    itens.forEach((item) => {
      selecionar(".valor-nota", item)?.classList.toggle("melhor-comparacao", Number(item.dataset.nota) === maiorNota);
      selecionar(".valor-preco", item)?.classList.toggle(
        "melhor-comparacao",
        menorPreco > 0 && Number(item.dataset.preco) === menorPreco
      );
    });

    if (typeof modalComparacao?.showModal === "function") modalComparacao.showModal();
    else modalComparacao?.setAttribute("open", "");
  }

  botaoComparar?.addEventListener("click", abrirComparacao);
  botaoCompartilharComparacao?.addEventListener("click", async () => {
    const ids = caixasSelecionadas().map((caixa) => caixa.dataset.produto).filter(Boolean);
    if (ids.length < 2) {
      mostrarAviso("Selecione pelo menos 2 produtos para compartilhar.");
      return;
    }
    const destino = new URL("/comparar.html", window.location.origin);
    destino.searchParams.set("produtos", ids.join(","));
    try {
      await navigator.clipboard.writeText(destino.href);
      mostrarAviso("Link da comparação copiado.");
    } catch {
      window.prompt("Copie o link da comparação:", destino.href);
    }
  });
  botaoFecharComparacao?.addEventListener("click", () => modalComparacao?.close());
  modalComparacao?.addEventListener("click", (evento) => {
    if (evento.target === modalComparacao) modalComparacao.close();
  });

  const compararInicial = new URLSearchParams(window.location.search).get("comparar");
  if (compararInicial) {
    const idsIniciais = compararInicial.split(",").slice(0, 3);
    caixasComparacao.forEach((caixa) => {
      caixa.checked = idsIniciais.includes(caixa.dataset.produto);
    });
  }
  atualizarComparador();

  selecionar("#ver-todas-ofertas")?.addEventListener("click", () => {
    if (campoBusca) campoBusca.value = "";
    limparBusca();
    desativarFiltroFavoritos();
    mostrarAviso("Mostrando todas as ofertas disponíveis.");
  });

  function registrarCliqueOferta(link) {
    const detalhe = {
      produto: link.dataset.produto || "",
      loja: link.dataset.loja || "",
      preco: Number(link.dataset.preco) || null,
      destino: link.href
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "clique_oferta", ...detalhe });
    window.dispatchEvent(new CustomEvent("ofertas-que-valem:clique-oferta", { detail: detalhe }));
  }

  selecionarTodos("[data-link-oferta]").forEach((link) => {
    link.addEventListener("click", (evento) => {
      if (link.dataset.linkReal === "true") {
        registrarCliqueOferta(link);
        return;
      }
      if (link.dataset.linkReal === "guide" || !link.getAttribute("href")?.startsWith("#")) return;
      evento.preventDefault();
      mostrarAviso("As lojas serão conectadas antes do lançamento.");
    });
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    fecharMenu();
    if (!modalComparacao?.open && campoBusca?.value) {
      campoBusca.value = "";
      limparBusca();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) fecharMenu();
  }, { passive: true });
})();

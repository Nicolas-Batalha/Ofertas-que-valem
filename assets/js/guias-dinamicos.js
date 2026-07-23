import { carregarGuiasPublicados } from "./firebase-ofertas.js";

function criarCartaoGuia(guia) {
  const artigo = document.createElement("article");
  artigo.className = "cartao-guia";
  artigo.dataset.guiaDinamico = guia.slug;

  const visual = document.createElement("div");
  visual.className = "cartao-guia-imagem";
  const imagem = document.createElement("img");
  imagem.src = guia.imagem;
  imagem.alt = guia.titulo;
  imagem.loading = "lazy";
  imagem.width = 640;
  imagem.height = 640;
  visual.append(imagem);

  const conteudo = document.createElement("div");
  conteudo.className = "cartao-guia-conteudo";
  const categoria = document.createElement("small");
  categoria.textContent = guia.categoria || "Guia de compra";
  const titulo = document.createElement("h2");
  titulo.textContent = guia.titulo;
  const descricao = document.createElement("p");
  descricao.textContent = guia.descricao;
  const link = document.createElement("a");
  link.href = `/guia/${guia.slug}`;
  link.textContent = "Ver ranking completo →";
  conteudo.append(categoria, titulo, descricao, link);

  artigo.append(visual, conteudo);
  return artigo;
}

function adicionarNaPaginaGuias(guias) {
  const grade = document.querySelector("#grade-guias-publicados");
  if (!grade) return;
  const destinosAtuais = new Set(
    [...grade.querySelectorAll("a[href]")]
      .map((link) => new URL(link.href, window.location.origin).pathname)
  );
  const novos = guias
    .filter((guia) => !destinosAtuais.has(`/guia/${guia.slug}`))
    .map(criarCartaoGuia);
  grade.append(...novos);
}

function criarCategoria(guia) {
  const secao = document.createElement("section");
  secao.className = "categoria-bloco";
  secao.id = guia.categoriaSlug;
  secao.dataset.categoriaDinamica = "true";

  const topo = document.createElement("div");
  topo.className = "categoria-topo";
  const imagem = document.createElement("img");
  imagem.src = guia.imagem;
  imagem.alt = "";
  imagem.loading = "lazy";
  imagem.width = 260;
  imagem.height = 260;
  const texto = document.createElement("div");
  const titulo = document.createElement("h2");
  titulo.textContent = guia.categoria;
  const descricao = document.createElement("p");
  descricao.textContent = `Guias e rankings de ${guia.categoria.toLowerCase()} para comparar antes de escolher.`;
  texto.append(titulo, descricao);
  topo.append(imagem, texto);

  const links = document.createElement("div");
  links.className = "links-categoria";
  secao.append(topo, links);
  return secao;
}

function adicionarNasCategorias(guias) {
  const lista = document.querySelector("#lista-categorias-publicadas, .lista-categorias");
  if (!lista) return;

  guias.forEach((guia) => {
    let secao = document.getElementById(guia.categoriaSlug);
    if (!secao) {
      secao = criarCategoria(guia);
      lista.append(secao);
    }
    const links = secao.querySelector(".links-categoria");
    const destino = `/guia/${guia.slug}`;
    const jaExiste = [...links.querySelectorAll("a[href]")]
      .some((link) => new URL(link.href, window.location.origin).pathname === destino);
    if (jaExiste) return;
    links.querySelector(".categoria-status")?.remove();
    const link = document.createElement("a");
    link.href = destino;
    link.textContent = guia.titulo;
    links.append(link);
  });
}

carregarGuiasPublicados()
  .then((guias) => {
    adicionarNaPaginaGuias(guias);
    adicionarNasCategorias(guias);
  })
  .catch(() => {
    // As páginas estáticas continuam disponíveis se o Firebase estiver temporariamente indisponível.
  });

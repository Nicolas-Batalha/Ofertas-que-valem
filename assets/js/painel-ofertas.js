import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref as referenciaStorage,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";
import { firebaseConfig, firebaseConfigurado } from "./firebase-config.js";

const LOJAS = ["Amazon", "Mercado Livre", "Shopee", "Casas Bahia"];
const $ = (seletor) => document.querySelector(seletor);

const elementos = {
  avisoConfiguracao: $("#aviso-configuracao-painel"),
  areaLogin: $("#area-login-painel"),
  areaAdministracao: $("#area-administracao-painel"),
  formularioLogin: $("#formulario-login-painel"),
  formularioOfertas: $("#formulario-ofertas-painel"),
  formularioGuia: $("#formulario-guia-painel"),
  formularioProduto: $("#formulario-produto-painel"),
  statusLogin: $("#status-login-painel"),
  statusOfertas: $("#status-ofertas-painel"),
  statusGuia: $("#status-guia-painel"),
  statusProduto: $("#status-produto-cadastro-painel"),
  seletorPasta: $("#pasta-painel"),
  seletorProduto: $("#produto-painel"),
  buscaProduto: $("#busca-produto-painel"),
  resumoPasta: $("#resumo-pasta-painel"),
  gradeLojas: $("#grade-lojas-painel"),
  botaoSalvarOferta: $("#salvar-ofertas-painel"),
  produtoSelecionado: $("#produto-selecionado-painel"),
  imagemProduto: $("#imagem-produto-painel"),
  nomeProduto: $("#nome-produto-painel"),
  idProduto: $("#id-produto-painel"),
  pastaProduto: $("#pasta-produto-painel"),
  usuario: $("#usuario-painel"),
  botaoSair: $("#sair-painel"),
  listaGuias: $("#lista-guias-painel"),
  quantidadeGuias: $("#quantidade-guias-painel"),
  listaProdutos: $("#lista-produtos-painel"),
  quantidadeProdutos: $("#quantidade-produtos-painel"),
  seletorGuiaProduto: $("#guia-produto-painel"),
  filtroGuiaProdutos: $("#filtro-guia-produtos-painel")
};

let autenticacao;
let banco;
let armazenamento;
let usuarioAtual;
let catalogoEstatico = [];
let produtosRemotos = [];
let produtos = [];
let ofertas = [];
let guias = [];
let carregandoSessao = false;
let slugGuiaAlteradoManualmente = false;
let codigoProdutoAlteradoManualmente = false;

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function criarSlug(valor = "") {
  return normalizarTexto(valor)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function linhas(valor = "") {
  return String(valor)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function definirStatus(elemento, mensagem, tipo = "") {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.dataset.tipo = tipo;
}

function mensagemErro(erro, fallback) {
  if (erro?.code === "permission-denied" || erro?.code === "storage/unauthorized") {
    return "O Firebase ainda não liberou esta área. Atualize as regras do banco e do armazenamento.";
  }
  if (erro?.code === "storage/retry-limit-exceeded") {
    return "A imagem demorou para enviar. Tente novamente.";
  }
  return erro?.message || fallback;
}

function validarLink(valor) {
  if (!valor) return "";
  const url = new URL(valor);
  if (url.protocol !== "https:") throw new Error("Use links completos começando com https://");
  return url.href;
}

function validarImagem(valor) {
  if (!valor) return "";
  if (valor.startsWith("/")) return valor;
  return validarLink(valor);
}

function validarArquivo(arquivo) {
  if (!arquivo) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
    throw new Error("Envie uma imagem JPG, PNG ou WebP.");
  }
  if (arquivo.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
}

async function enviarImagem(arquivo, caminho) {
  validarArquivo(arquivo);
  const extensao = (arquivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const destino = `${caminho}/${Date.now()}-${criarSlug(arquivo.name.replace(/\.[^.]+$/, "")) || "imagem"}.${extensao}`;
  const referencia = referenciaStorage(armazenamento, destino);
  await uploadBytes(referencia, arquivo, {
    contentType: arquivo.type,
    cacheControl: "public,max-age=31536000,immutable"
  });
  return getDownloadURL(referencia);
}

function idDocumentoOferta(produtoId, loja) {
  return `${produtoId}__${criarSlug(loja)}`;
}

function obterGuia(slug) {
  return guias.find((guia) => guia.slug === slug);
}

function caminhoGuia(guia) {
  return guia?.slug ? `/guia/${guia.slug}` : "/guias.html";
}

function dadosPastaProduto(produto) {
  const guiaSlug = produto.guiaSlug
    || (produto.slugGuia || "").split("/").pop()?.replace(/\.html$/i, "")
    || criarSlug(produto.categoria);
  const guia = obterGuia(guiaSlug);
  const partesImagem = (produto.imagem || "").split("/").filter(Boolean);
  partesImagem.pop();
  return {
    id: guiaSlug || "outros",
    nome: guia?.titulo || guiaSlug.split("-").filter(Boolean).map((parte) => parte[0].toUpperCase() + parte.slice(1)).join(" ") || "Outros produtos",
    caminho: guia ? `catálogo/${guia.categoriaSlug}/${guia.slug}/` : (partesImagem.length ? `/${partesImagem.join("/")}/` : "/imagens/")
  };
}

function produtoNormalizado(documento) {
  const dados = documento.data();
  return {
    ...dados,
    id: dados.id || documento.id,
    guiaSlug: dados.guiaSlug || dados.guia_slug || "",
    slugGuia: dados.slugGuia || (dados.guiaSlug ? `guia/${dados.guiaSlug}` : ""),
    fonte: "firebase"
  };
}

function guiaNormalizado(documento) {
  const dados = documento.data();
  return {
    ...dados,
    slug: dados.slug || documento.id,
    categoriaSlug: dados.categoriaSlug || criarSlug(dados.categoria)
  };
}

async function carregarColecao(nome) {
  try {
    const resultado = await getDocs(collection(banco, nome));
    return resultado.docs;
  } catch (erro) {
    if (nome === "ofertas") throw erro;
    return [];
  }
}

async function carregarDados() {
  const [respostaCatalogo, documentosGuias, documentosProdutos, documentosOfertas] = await Promise.all([
    fetch("/assets/data/produtos.json", { cache: "no-store" }),
    carregarColecao("guias"),
    carregarColecao("produtos"),
    carregarColecao("ofertas")
  ]);

  if (!respostaCatalogo.ok) throw new Error("Não foi possível carregar o catálogo.");
  const catalogo = await respostaCatalogo.json();
  catalogoEstatico = Array.isArray(catalogo.produtos)
    ? catalogo.produtos.map((produto) => ({ ...produto, fonte: "catalogo" }))
    : [];
  guias = documentosGuias.map(guiaNormalizado).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  produtosRemotos = documentosProdutos.map(produtoNormalizado);
  ofertas = documentosOfertas.map((documento) => documento.data());

  const porId = new Map(catalogoEstatico.map((produto) => [produto.id, produto]));
  produtosRemotos.forEach((produto) => porId.set(produto.id, produto));
  produtos = [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function campoLoja(loja) {
  const grupo = document.createElement("fieldset");
  grupo.className = "loja-painel";
  grupo.dataset.loja = loja;

  const legenda = document.createElement("legend");
  legenda.textContent = loja;

  const campoLink = document.createElement("label");
  campoLink.className = "campo-painel";
  const rotuloLink = document.createElement("span");
  rotuloLink.textContent = "Link da oferta";
  const inputLink = document.createElement("input");
  inputLink.type = "url";
  inputLink.placeholder = "https://...";
  inputLink.inputMode = "url";
  inputLink.autocomplete = "off";
  inputLink.dataset.campo = "url";
  campoLink.append(rotuloLink, inputLink);

  const campoPreco = document.createElement("label");
  campoPreco.className = "campo-painel";
  const rotuloPreco = document.createElement("span");
  rotuloPreco.textContent = "Preço opcional";
  const inputPreco = document.createElement("input");
  inputPreco.type = "number";
  inputPreco.min = "0";
  inputPreco.step = "0.01";
  inputPreco.placeholder = "0,00";
  inputPreco.inputMode = "decimal";
  inputPreco.dataset.campo = "preco";
  campoPreco.append(rotuloPreco, inputPreco);

  grupo.append(legenda, campoLink, campoPreco);
  return grupo;
}

function ofertaAtual(produtoId, loja) {
  return ofertas.find((oferta) => oferta.produto_id === produtoId && oferta.loja === loja);
}

function atualizarProdutoSelecionado() {
  const produto = produtos.find((item) => item.id === elementos.seletorProduto.value);
  if (!produto) {
    elementos.produtoSelecionado.hidden = true;
    elementos.botaoSalvarOferta.disabled = true;
    return;
  }

  const pasta = dadosPastaProduto(produto);
  elementos.produtoSelecionado.hidden = false;
  elementos.botaoSalvarOferta.disabled = false;
  elementos.imagemProduto.src = produto.imagem;
  elementos.imagemProduto.alt = produto.alt || produto.nome;
  elementos.nomeProduto.textContent = produto.nome;
  elementos.pastaProduto.textContent = pasta.nome;
  elementos.idProduto.textContent = `Código: ${produto.id}`;

  [...elementos.gradeLojas.querySelectorAll("[data-loja]")].forEach((grupo) => {
    const oferta = ofertaAtual(produto.id, grupo.dataset.loja);
    grupo.querySelector('[data-campo="url"]').value = oferta?.url || "";
    grupo.querySelector('[data-campo="preco"]').value = Number(oferta?.preco) > 0 ? oferta.preco : "";
  });
  definirStatus(elementos.statusOfertas, "");
}

function produtosDaPasta() {
  return produtos.filter((produto) => dadosPastaProduto(produto).id === elementos.seletorPasta.value);
}

function atualizarListaProdutosOferta() {
  const palavras = normalizarTexto(elementos.buscaProduto.value).split(/\s+/).filter(Boolean);
  const produtosPasta = produtosDaPasta();
  const encontrados = produtosPasta.filter((produto) => {
    const conteudo = normalizarTexto([
      produto.nome,
      produto.marca,
      produto.perfil,
      produto.termos,
      ...(produto.especificacoes || [])
    ].join(" "));
    return palavras.every((palavra) => conteudo.includes(palavra));
  });
  const selecaoAnterior = elementos.seletorProduto.value;

  if (!encontrados.length) {
    const opcao = new Option("Nenhum produto encontrado", "");
    elementos.seletorProduto.replaceChildren(opcao);
    elementos.seletorProduto.disabled = true;
  } else {
    elementos.seletorProduto.disabled = false;
    elementos.seletorProduto.replaceChildren(...encontrados.map((produto) => new Option(produto.nome, produto.id)));
    if (encontrados.some((produto) => produto.id === selecaoAnterior)) {
      elementos.seletorProduto.value = selecaoAnterior;
    }
  }

  const pasta = produtosPasta[0] ? dadosPastaProduto(produtosPasta[0]) : null;
  elementos.resumoPasta.textContent = pasta
    ? `${produtosPasta.length} ${produtosPasta.length === 1 ? "produto" : "produtos"} nesta pasta · ${pasta.caminho}`
    : "Esta pasta ainda não possui produtos.";
  atualizarProdutoSelecionado();
}

function montarPastasOferta() {
  const pastas = new Map();
  produtos.forEach((produto) => {
    const pasta = dadosPastaProduto(produto);
    if (!pastas.has(pasta.id)) pastas.set(pasta.id, { ...pasta, quantidade: 0 });
    pastas.get(pasta.id).quantidade += 1;
  });
  const opcoes = [...pastas.values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((pasta) => new Option(`${pasta.nome} (${pasta.quantidade})`, pasta.id));
  elementos.seletorPasta.replaceChildren(...opcoes);
  atualizarListaProdutosOferta();
}

function montarSeletoresGuias() {
  const opcoes = guias.map((guia) => new Option(`${guia.titulo} · ${guia.categoria}`, guia.slug));
  elementos.seletorGuiaProduto.replaceChildren(
    new Option(guias.length ? "Selecione um guia" : "Crie um guia primeiro", ""),
    ...opcoes.map((opcao) => opcao.cloneNode(true))
  );
  elementos.filtroGuiaProdutos.replaceChildren(
    new Option("Todos os guias", ""),
    ...opcoes.map((opcao) => opcao.cloneNode(true))
  );
}

function itemEditor({ imagem, titulo, detalhe, id, tipo }) {
  const item = document.createElement("article");
  item.className = "item-editor-painel";
  const foto = document.createElement("img");
  foto.src = imagem || "/imagens/social/og-ofertas-que-valem.png";
  foto.alt = "";
  foto.loading = "lazy";
  const texto = document.createElement("div");
  const nome = document.createElement("strong");
  nome.textContent = titulo;
  const resumo = document.createElement("small");
  resumo.textContent = detalhe;
  texto.append(nome, resumo);
  const editar = document.createElement("button");
  editar.className = "editar-item-painel";
  editar.type = "button";
  editar.textContent = "Editar";
  editar.dataset.editar = tipo;
  editar.dataset.id = id;
  item.append(foto, texto, editar);
  return item;
}

function renderizarGuias() {
  elementos.quantidadeGuias.textContent = String(guias.length);
  if (!guias.length) {
    const vazio = document.createElement("p");
    vazio.className = "item-vazio-painel";
    vazio.textContent = "Nenhum guia automático cadastrado ainda.";
    elementos.listaGuias.replaceChildren(vazio);
    return;
  }
  elementos.listaGuias.replaceChildren(...guias.map((guia) => itemEditor({
    imagem: guia.imagem,
    titulo: guia.titulo,
    detalhe: `${guia.categoria} · ${guia.publicado === false ? "Rascunho" : "Publicado"}`,
    id: guia.slug,
    tipo: "guia"
  })));
}

function renderizarProdutos() {
  const filtro = elementos.filtroGuiaProdutos.value;
  const exibidos = produtosRemotos
    .filter((produto) => !filtro || produto.guiaSlug === filtro)
    .sort((a, b) => Number(a.posicao || 999) - Number(b.posicao || 999) || a.nome.localeCompare(b.nome, "pt-BR"));
  elementos.quantidadeProdutos.textContent = String(produtosRemotos.length);
  if (!exibidos.length) {
    const vazio = document.createElement("p");
    vazio.className = "item-vazio-painel";
    vazio.textContent = "Nenhum produto automático neste guia.";
    elementos.listaProdutos.replaceChildren(vazio);
    return;
  }
  elementos.listaProdutos.replaceChildren(...exibidos.map((produto) => itemEditor({
    imagem: produto.imagem,
    titulo: `${produto.posicao || "—"}º · ${produto.nome}`,
    detalhe: `${obterGuia(produto.guiaSlug)?.titulo || produto.categoria} · ${produto.publicado === false ? "Rascunho" : "Publicado"}`,
    id: produto.id,
    tipo: "produto"
  })));
}

function atualizarInterface() {
  montarPastasOferta();
  montarSeletoresGuias();
  renderizarGuias();
  renderizarProdutos();
}

function ativarAba(nome) {
  document.querySelectorAll("[data-aba]").forEach((botao) => {
    const ativa = botao.dataset.aba === nome;
    botao.classList.toggle("ativa", ativa);
    botao.setAttribute("aria-selected", String(ativa));
  });
  document.querySelectorAll("[data-secao]").forEach((secao) => {
    const ativa = secao.dataset.secao === nome;
    secao.classList.toggle("ativa", ativa);
    secao.hidden = !ativa;
  });
}

function limparFormularioGuia() {
  elementos.formularioGuia.reset();
  $("#guia-id-original-painel").value = "";
  $("#publicado-guia-painel").checked = true;
  $("#slug-guia-painel").readOnly = false;
  $("#titulo-introducao-guia-painel").value = "Compare antes de escolher";
  $("#texto-apoio-guia-painel").value = "Use as fichas, os prós e os pontos de atenção para encontrar o modelo mais adequado ao seu perfil.";
  $("#titulo-metodologia-guia-painel").value = "Como este guia funciona";
  $("#texto-metodologia-guia-painel").value = "A ordem é definida no painel editorial. Preços e links são exibidos apenas quando cadastrados nas lojas parceiras.";
  slugGuiaAlteradoManualmente = false;
  definirStatus(elementos.statusGuia, "");
}

function editarGuia(slug) {
  const guia = obterGuia(slug);
  if (!guia) return;
  $("#guia-id-original-painel").value = guia.slug;
  $("#categoria-guia-painel").value = guia.categoria || "";
  $("#titulo-guia-painel").value = guia.titulo || "";
  $("#slug-guia-painel").value = guia.slug;
  $("#slug-guia-painel").readOnly = true;
  $("#descricao-guia-painel").value = guia.descricao || "";
  $("#titulo-introducao-guia-painel").value = guia.tituloIntroducao ?? "Compare antes de escolher";
  $("#texto-apoio-guia-painel").value = guia.textoApoio ?? "Use as fichas, os prós e os pontos de atenção para encontrar o modelo mais adequado ao seu perfil.";
  $("#titulo-metodologia-guia-painel").value = guia.tituloMetodologia ?? "Como este guia funciona";
  $("#texto-metodologia-guia-painel").value = guia.textoMetodologia ?? "A ordem é definida no painel editorial. Preços e links são exibidos apenas quando cadastrados nas lojas parceiras.";
  $("#imagem-guia-painel").value = guia.imagem?.startsWith("http") ? guia.imagem : "";
  $("#publicado-guia-painel").checked = guia.publicado !== false;
  slugGuiaAlteradoManualmente = true;
  definirStatus(elementos.statusGuia, "Editando guia existente.");
  elementos.formularioGuia.scrollIntoView({ behavior: "smooth", block: "start" });
}

function limparFormularioProduto() {
  elementos.formularioProduto.reset();
  $("#produto-id-original-painel").value = "";
  $("#codigo-produto-painel").readOnly = false;
  $("#posicao-produto-painel").value = "1";
  $("#nota-produto-painel").value = "8.0";
  $("#publicado-produto-painel").checked = true;
  codigoProdutoAlteradoManualmente = false;
  definirStatus(elementos.statusProduto, "");
}

function editarProduto(id) {
  const produto = produtosRemotos.find((item) => item.id === id);
  if (!produto) return;
  $("#produto-id-original-painel").value = produto.id;
  elementos.seletorGuiaProduto.value = produto.guiaSlug || "";
  $("#nome-cadastro-produto-painel").value = produto.nome || "";
  $("#marca-produto-painel").value = produto.marca || "";
  $("#codigo-produto-painel").value = produto.id;
  $("#codigo-produto-painel").readOnly = true;
  $("#posicao-produto-painel").value = String(produto.posicao || 1);
  $("#nota-produto-painel").value = String(produto.nota || 8);
  $("#perfil-produto-painel").value = produto.perfil || "";
  $("#imagem-cadastro-produto-painel").value = produto.imagem?.startsWith("http") ? produto.imagem : "";
  $("#especificacoes-produto-painel").value = (produto.especificacoes || []).join("\n");
  $("#pros-produto-painel").value = (produto.pros || []).join("\n");
  $("#contras-produto-painel").value = (produto.contras || []).join("\n");
  $("#publicado-produto-painel").checked = produto.publicado !== false;
  codigoProdutoAlteradoManualmente = true;
  definirStatus(elementos.statusProduto, "Editando produto existente.");
  elementos.formularioProduto.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function carregarAdministracao(usuario) {
  if (usuario.uid !== firebaseConfig.adminUid) {
    throw new Error("Usuário sem permissão de administrador.");
  }
  usuarioAtual = usuario;
  definirStatus(elementos.statusLogin, "Carregando painel...");
  await carregarDados();
  elementos.usuario.textContent = usuario.email?.split("@")[0] || "administrador";
  elementos.gradeLojas.replaceChildren(...LOJAS.map(campoLoja));
  atualizarInterface();
  elementos.areaLogin.hidden = true;
  elementos.areaAdministracao.hidden = false;
  definirStatus(elementos.statusLogin, "");
}

async function atualizarSessao(usuario) {
  if (carregandoSessao) return;
  if (!usuario) {
    usuarioAtual = null;
    elementos.areaLogin.hidden = false;
    elementos.areaAdministracao.hidden = true;
    return;
  }
  carregandoSessao = true;
  try {
    await carregarAdministracao(usuario);
  } catch (erro) {
    elementos.areaLogin.hidden = false;
    elementos.areaAdministracao.hidden = true;
    definirStatus(elementos.statusLogin, mensagemErro(erro, "Não foi possível abrir o painel."), "erro");
  } finally {
    carregandoSessao = false;
  }
}

elementos.formularioLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = elementos.formularioLogin.querySelector('button[type="submit"]');
  botao.disabled = true;
  definirStatus(elementos.statusLogin, "Entrando...");
  try {
    await signInWithEmailAndPassword(
      autenticacao,
      $("#email-painel").value.trim(),
      $("#senha-painel").value
    );
  } catch {
    definirStatus(elementos.statusLogin, "E-mail, senha ou permissão inválidos.", "erro");
  } finally {
    botao.disabled = false;
  }
});

document.querySelectorAll("[data-aba]").forEach((botao) => {
  botao.addEventListener("click", () => ativarAba(botao.dataset.aba));
});

elementos.seletorPasta.addEventListener("change", () => {
  elementos.buscaProduto.value = "";
  atualizarListaProdutosOferta();
});
elementos.buscaProduto.addEventListener("input", atualizarListaProdutosOferta);
elementos.seletorProduto.addEventListener("change", atualizarProdutoSelecionado);
elementos.filtroGuiaProdutos.addEventListener("change", renderizarProdutos);

elementos.formularioOfertas.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const produtoId = elementos.seletorProduto.value;
  elementos.botaoSalvarOferta.disabled = true;
  definirStatus(elementos.statusOfertas, "Salvando ofertas...");
  try {
    const registros = [...elementos.gradeLojas.querySelectorAll("[data-loja]")].map((grupo) => {
      const url = validarLink(grupo.querySelector('[data-campo="url"]').value.trim());
      const preco = Number(grupo.querySelector('[data-campo="preco"]').value) || 0;
      return {
        produto_id: produtoId,
        loja: grupo.dataset.loja,
        url,
        preco,
        ativo: Boolean(url),
        updated_at: serverTimestamp()
      };
    });
    const lote = writeBatch(banco);
    registros.forEach((registro) => lote.set(
      doc(banco, "ofertas", idDocumentoOferta(produtoId, registro.loja)),
      registro
    ));
    await lote.commit();
    ofertas = ofertas.filter((oferta) => oferta.produto_id !== produtoId).concat(
      registros.map((registro) => ({ ...registro, updated_at: new Date() }))
    );
    definirStatus(elementos.statusOfertas, "Ofertas publicadas com sucesso.", "sucesso");
  } catch (erro) {
    definirStatus(elementos.statusOfertas, mensagemErro(erro, "Não foi possível salvar as ofertas."), "erro");
  } finally {
    elementos.botaoSalvarOferta.disabled = false;
  }
});

$("#titulo-guia-painel").addEventListener("input", (evento) => {
  if (!slugGuiaAlteradoManualmente) $("#slug-guia-painel").value = criarSlug(evento.target.value);
});
$("#slug-guia-painel").addEventListener("input", (evento) => {
  slugGuiaAlteradoManualmente = true;
  evento.target.value = criarSlug(evento.target.value);
});

elementos.formularioGuia.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = elementos.formularioGuia.querySelector('button[type="submit"]');
  botao.disabled = true;
  definirStatus(elementos.statusGuia, "Criando a página...");
  try {
    const original = $("#guia-id-original-painel").value;
    const slug = criarSlug($("#slug-guia-painel").value);
    if (!slug) throw new Error("Informe um endereço válido para o guia.");
    if (original && original !== slug) throw new Error("O endereço de um guia publicado não pode ser alterado.");
    if (!original && guias.some((guia) => guia.slug === slug)) throw new Error("Este endereço já está sendo usado.");

    const categoria = $("#categoria-guia-painel").value.trim();
    const categoriaSlug = criarSlug(categoria);
    const arquivo = $("#arquivo-guia-painel").files[0];
    const existente = obterGuia(original || slug);
    let imagem = validarImagem($("#imagem-guia-painel").value.trim()) || existente?.imagem || "";
    if (arquivo) imagem = await enviarImagem(arquivo, `catalogo/${categoriaSlug}/${slug}/capa`);
    if (!imagem) throw new Error("Adicione uma imagem por URL ou envie um arquivo.");

    const dados = {
      slug,
      categoria,
      categoriaSlug,
      titulo: $("#titulo-guia-painel").value.trim(),
      descricao: $("#descricao-guia-painel").value.trim(),
      tituloIntroducao: $("#titulo-introducao-guia-painel").value.trim(),
      textoApoio: $("#texto-apoio-guia-painel").value.trim(),
      tituloMetodologia: $("#titulo-metodologia-guia-painel").value.trim(),
      textoMetodologia: $("#texto-metodologia-guia-painel").value.trim(),
      imagem,
      publicado: $("#publicado-guia-painel").checked,
      updated_at: serverTimestamp()
    };
    await setDoc(doc(banco, "guias", slug), dados, { merge: true });
    await carregarDados();
    atualizarInterface();
    limparFormularioGuia();
    definirStatus(elementos.statusGuia, `Guia salvo. Página: ${caminhoGuia(dados)}`, "sucesso");
  } catch (erro) {
    definirStatus(elementos.statusGuia, mensagemErro(erro, "Não foi possível salvar o guia."), "erro");
  } finally {
    botao.disabled = false;
  }
});

$("#nome-cadastro-produto-painel").addEventListener("input", (evento) => {
  if (!codigoProdutoAlteradoManualmente) $("#codigo-produto-painel").value = criarSlug(evento.target.value);
});
$("#codigo-produto-painel").addEventListener("input", (evento) => {
  codigoProdutoAlteradoManualmente = true;
  evento.target.value = criarSlug(evento.target.value);
});

elementos.formularioProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = elementos.formularioProduto.querySelector('button[type="submit"]');
  botao.disabled = true;
  definirStatus(elementos.statusProduto, "Salvando produto e organizando a pasta...");
  try {
    const original = $("#produto-id-original-painel").value;
    const id = criarSlug($("#codigo-produto-painel").value);
    if (!id) throw new Error("Informe um código válido.");
    if (original && original !== id) throw new Error("O código de um produto publicado não pode ser alterado.");
    if (!original && produtos.some((produto) => produto.id === id)) throw new Error("Este código já pertence a outro produto.");

    const guiaSlug = elementos.seletorGuiaProduto.value;
    const guia = obterGuia(guiaSlug);
    if (!guia) throw new Error("Crie ou selecione um guia antes de cadastrar o produto.");

    const arquivo = $("#arquivo-produto-painel").files[0];
    const existente = produtosRemotos.find((produto) => produto.id === (original || id));
    let imagem = validarImagem($("#imagem-cadastro-produto-painel").value.trim()) || existente?.imagem || "";
    if (arquivo) imagem = await enviarImagem(arquivo, `catalogo/${guia.categoriaSlug}/${guia.slug}/${id}`);
    if (!imagem) throw new Error("Adicione uma imagem por URL ou envie um arquivo.");

    const nome = $("#nome-cadastro-produto-painel").value.trim();
    const marca = $("#marca-produto-painel").value.trim();
    const especificacoes = linhas($("#especificacoes-produto-painel").value);
    const pros = linhas($("#pros-produto-painel").value);
    const contras = linhas($("#contras-produto-painel").value);
    if (!especificacoes.length || !pros.length || !contras.length) {
      throw new Error("Preencha especificações, prós e pontos de atenção.");
    }

    const dados = {
      id,
      guiaSlug,
      categoria: guia.categoria,
      categoriaSlug: guia.categoriaSlug,
      slugGuia: `guia/${guia.slug}`,
      nome,
      marca,
      imagem,
      alt: `${nome}${marca && !nome.toLowerCase().includes(marca.toLowerCase()) ? ` da marca ${marca}` : ""}`,
      nota: Number($("#nota-produto-painel").value) || 0,
      perfil: $("#perfil-produto-painel").value.trim(),
      termos: [nome, marca, guia.categoria, guia.titulo, ...especificacoes].join(" "),
      posicao: Number($("#posicao-produto-painel").value) || 1,
      especificacoes,
      pros,
      contras,
      publicado: $("#publicado-produto-painel").checked,
      precoAtual: 0,
      precoReferencia: 0,
      updated_at: serverTimestamp()
    };
    await setDoc(doc(banco, "produtos", id), dados, { merge: true });
    await carregarDados();
    atualizarInterface();
    limparFormularioProduto();
    definirStatus(elementos.statusProduto, "Produto salvo e conectado ao guia, à busca e ao comparador.", "sucesso");
  } catch (erro) {
    definirStatus(elementos.statusProduto, mensagemErro(erro, "Não foi possível salvar o produto."), "erro");
  } finally {
    botao.disabled = false;
  }
});

elementos.listaGuias.addEventListener("click", (evento) => {
  const botao = evento.target.closest('[data-editar="guia"]');
  if (botao) editarGuia(botao.dataset.id);
});
elementos.listaProdutos.addEventListener("click", (evento) => {
  const botao = evento.target.closest('[data-editar="produto"]');
  if (botao) editarProduto(botao.dataset.id);
});

$("#novo-guia-painel").addEventListener("click", () => {
  limparFormularioGuia();
  elementos.formularioGuia.scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#limpar-textos-guia-painel").addEventListener("click", () => {
  $("#titulo-introducao-guia-painel").value = "";
  $("#texto-apoio-guia-painel").value = "";
  $("#titulo-metodologia-guia-painel").value = "";
  $("#texto-metodologia-guia-painel").value = "";
  definirStatus(elementos.statusGuia, "Textos opcionais removidos. Clique em salvar para publicar a alteração.");
});
$("#novo-produto-painel").addEventListener("click", () => {
  limparFormularioProduto();
  elementos.formularioProduto.scrollIntoView({ behavior: "smooth", block: "start" });
});

elementos.botaoSair.addEventListener("click", async () => {
  await signOut(autenticacao);
  definirStatus(elementos.statusLogin, "Sessão encerrada.");
});

function iniciar() {
  if (!firebaseConfigurado()) {
    elementos.avisoConfiguracao.hidden = false;
    elementos.formularioLogin.querySelectorAll("input, button").forEach((elemento) => {
      elemento.disabled = true;
    });
    definirStatus(elementos.statusLogin, "Conecte o Firebase para liberar o painel.", "erro");
    return;
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  autenticacao = getAuth(app);
  banco = getFirestore(app);
  armazenamento = getStorage(app);
  onAuthStateChanged(autenticacao, atualizarSessao);
}

limparFormularioGuia();
iniciar();

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
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { firebaseConfig, firebaseConfigurado } from "./firebase-config.js";

const LOJAS = ["Amazon", "Mercado Livre", "Shopee", "Casas Bahia"];
const avisoConfiguracao = document.querySelector("#aviso-configuracao-painel");
const areaLogin = document.querySelector("#area-login-painel");
const areaAdministracao = document.querySelector("#area-administracao-painel");
const formularioLogin = document.querySelector("#formulario-login-painel");
const formularioOfertas = document.querySelector("#formulario-ofertas-painel");
const statusLogin = document.querySelector("#status-login-painel");
const statusOfertas = document.querySelector("#status-ofertas-painel");
const seletorPasta = document.querySelector("#pasta-painel");
const seletorProduto = document.querySelector("#produto-painel");
const buscaProduto = document.querySelector("#busca-produto-painel");
const resumoPasta = document.querySelector("#resumo-pasta-painel");
const gradeLojas = document.querySelector("#grade-lojas-painel");
const botaoSalvar = document.querySelector("#salvar-ofertas-painel");
const produtoSelecionado = document.querySelector("#produto-selecionado-painel");
const imagemProduto = document.querySelector("#imagem-produto-painel");
const nomeProduto = document.querySelector("#nome-produto-painel");
const idProduto = document.querySelector("#id-produto-painel");
const pastaProdutoSelecionado = document.querySelector("#pasta-produto-painel");
const usuarioPainel = document.querySelector("#usuario-painel");
const botaoSair = document.querySelector("#sair-painel");
const voltarGuia = document.querySelector("#voltar-guia-painel");

let autenticacao;
let banco;
let produtos = [];
let ofertas = [];
let carregandoSessao = false;

const NOMES_PASTAS = {
  "air-fryer": "Air Fryers",
  cafeteira: "Cafeteiras elétricas",
  "robo-aspirador": "Robôs aspiradores",
  "fone-bluetooth": "Fones Bluetooth"
};

function normalizarTexto(valor = "") {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dadosPastaProduto(produto) {
  const arquivoGuia = (produto.slugGuia || "")
    .split("/")
    .pop()
    ?.replace(/\.html$/i, "");
  const identificador = arquivoGuia || normalizarTexto(produto.categoria).replace(/[^a-z0-9]+/g, "-");
  const nomeAutomatico = identificador
    .split("-")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
  const partesImagem = (produto.imagem || "").split("/").filter(Boolean);
  partesImagem.pop();

  return {
    id: identificador,
    nome: NOMES_PASTAS[identificador] || nomeAutomatico || "Outros produtos",
    caminho: partesImagem.length ? `/${partesImagem.join("/")}/` : "/imagens/"
  };
}

function definirStatus(elemento, mensagem, tipo = "") {
  elemento.textContent = mensagem;
  elemento.dataset.tipo = tipo;
}

function validarLink(valor) {
  if (!valor) return "";
  const url = new URL(valor);
  if (url.protocol !== "https:") throw new Error("Use links completos começando com https://");
  return url.href;
}

function idDocumento(produtoId, loja) {
  const lojaNormalizada = loja
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${produtoId}__${lojaNormalizada}`;
}

function campoLoja(loja) {
  const identificador = loja.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  const grupo = document.createElement("fieldset");
  grupo.className = "loja-painel";
  grupo.dataset.loja = loja;

  const legenda = document.createElement("legend");
  legenda.textContent = loja;

  const campoLink = document.createElement("label");
  campoLink.className = "campo-painel";
  const rotuloLink = document.createElement("span");
  rotuloLink.textContent = "Link de afiliado";
  const inputLink = document.createElement("input");
  inputLink.type = "url";
  inputLink.id = `link-${identificador}`;
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
  inputPreco.id = `preco-${identificador}`;
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
  const produto = produtos.find((item) => item.id === seletorProduto.value);
  if (!produto) {
    produtoSelecionado.hidden = true;
    botaoSalvar.disabled = true;
    voltarGuia.setAttribute("aria-disabled", "true");
    return;
  }

  const pasta = dadosPastaProduto(produto);
  produtoSelecionado.hidden = false;
  botaoSalvar.disabled = false;
  imagemProduto.src = produto.imagem;
  imagemProduto.alt = produto.alt || produto.nome;
  nomeProduto.textContent = produto.nome;
  pastaProdutoSelecionado.textContent = pasta.nome;
  idProduto.textContent = `Código: ${produto.id}`;
  voltarGuia.href = `/${produto.slugGuia}`;
  voltarGuia.removeAttribute("aria-disabled");

  [...gradeLojas.querySelectorAll("[data-loja]")].forEach((grupo) => {
    const oferta = ofertaAtual(produto.id, grupo.dataset.loja);
    grupo.querySelector('[data-campo="url"]').value = oferta?.url || "";
    grupo.querySelector('[data-campo="preco"]').value = Number(oferta?.preco) > 0 ? oferta.preco : "";
  });
  definirStatus(statusOfertas, "");
}

function produtosDaPasta() {
  return produtos.filter((produto) => dadosPastaProduto(produto).id === seletorPasta.value);
}

function atualizarListaProdutos() {
  const termo = normalizarTexto(buscaProduto.value);
  const palavras = termo.split(/\s+/).filter(Boolean);
  const produtosPasta = produtosDaPasta();
  const encontrados = produtosPasta.filter((produto) => {
    const conteudo = normalizarTexto([
      produto.nome,
      produto.perfil,
      produto.termos,
      ...(produto.especificacoes || [])
    ].join(" "));
    return palavras.every((palavra) => conteudo.includes(palavra));
  });
  const selecaoAnterior = seletorProduto.value;

  if (!encontrados.length) {
    const opcaoVazia = document.createElement("option");
    opcaoVazia.value = "";
    opcaoVazia.textContent = "Nenhum produto encontrado";
    seletorProduto.replaceChildren(opcaoVazia);
    seletorProduto.disabled = true;
  } else {
    seletorProduto.disabled = false;
    seletorProduto.replaceChildren(...encontrados.map((produto) => {
      const opcao = document.createElement("option");
      opcao.value = produto.id;
      opcao.textContent = produto.nome;
      return opcao;
    }));
    if (encontrados.some((produto) => produto.id === selecaoAnterior)) {
      seletorProduto.value = selecaoAnterior;
    }
  }

  const pastaAtual = produtosPasta[0] ? dadosPastaProduto(produtosPasta[0]) : null;
  resumoPasta.textContent = pastaAtual
    ? `${produtosPasta.length} ${produtosPasta.length === 1 ? "produto" : "produtos"} nesta pasta · Imagens em ${pastaAtual.caminho}`
    : "Esta pasta ainda não possui produtos.";
  atualizarProdutoSelecionado();
}

function montarPastas() {
  const pastas = new Map();
  produtos.forEach((produto) => {
    const pasta = dadosPastaProduto(produto);
    if (!pastas.has(pasta.id)) pastas.set(pasta.id, { ...pasta, quantidade: 0 });
    pastas.get(pasta.id).quantidade += 1;
  });

  const opcoes = [...pastas.values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((pasta) => {
      const opcao = document.createElement("option");
      opcao.value = pasta.id;
      opcao.textContent = `${pasta.nome} (${pasta.quantidade})`;
      return opcao;
    });
  seletorPasta.replaceChildren(...opcoes);
}

function montarProdutos() {
  gradeLojas.replaceChildren(...LOJAS.map(campoLoja));
  montarPastas();
  atualizarListaProdutos();
}

async function carregarAdministracao(usuario) {
  if (usuario.uid !== firebaseConfig.adminUid) {
    throw new Error("Usuário sem permissão de administrador.");
  }

  const respostaCatalogo = await fetch("/assets/data/produtos.json", { cache: "no-store" });
  if (!respostaCatalogo.ok) throw new Error("Não foi possível carregar o catálogo.");
  const catalogo = await respostaCatalogo.json();
  produtos = Array.isArray(catalogo.produtos)
    ? catalogo.produtos
        .filter((produto) => produto.publicado !== false)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [];

  const resultado = await getDocs(collection(banco, "ofertas"));
  ofertas = resultado.docs.map((documento) => documento.data());

  usuarioPainel.textContent = usuario.email || "Administrador";
  montarProdutos();
  areaLogin.hidden = true;
  areaAdministracao.hidden = false;
}

async function atualizarSessao(usuario) {
  if (carregandoSessao) return;
  if (!usuario) {
    areaLogin.hidden = false;
    areaAdministracao.hidden = true;
    return;
  }

  carregandoSessao = true;
  try {
    definirStatus(statusLogin, "Carregando painel...");
    await carregarAdministracao(usuario);
    definirStatus(statusLogin, "");
  } catch {
    areaLogin.hidden = false;
    areaAdministracao.hidden = true;
    definirStatus(statusLogin, "Seu usuário não tem permissão para acessar as ofertas.", "erro");
  } finally {
    carregandoSessao = false;
  }
}

formularioLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = formularioLogin.querySelector('button[type="submit"]');
  botao.disabled = true;
  definirStatus(statusLogin, "Entrando...");

  try {
    const credencial = await signInWithEmailAndPassword(
      autenticacao,
      document.querySelector("#email-painel").value.trim(),
      document.querySelector("#senha-painel").value
    );
    await atualizarSessao(credencial.user);
  } catch {
    definirStatus(statusLogin, "E-mail, senha ou permissão inválidos.", "erro");
  } finally {
    botao.disabled = false;
  }
});

seletorPasta.addEventListener("change", () => {
  buscaProduto.value = "";
  atualizarListaProdutos();
});
buscaProduto.addEventListener("input", atualizarListaProdutos);
seletorProduto.addEventListener("change", atualizarProdutoSelecionado);

formularioOfertas.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const produtoId = seletorProduto.value;
  botaoSalvar.disabled = true;
  definirStatus(statusOfertas, "Salvando ofertas...");

  try {
    const registros = [...gradeLojas.querySelectorAll("[data-loja]")].map((grupo) => {
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
    registros.forEach((registro) => {
      lote.set(doc(banco, "ofertas", idDocumento(produtoId, registro.loja)), registro);
    });
    await lote.commit();

    ofertas = ofertas
      .filter((oferta) => oferta.produto_id !== produtoId)
      .concat(registros.map((registro) => ({ ...registro, updated_at: new Date() })));
    definirStatus(statusOfertas, "Ofertas publicadas com sucesso.", "sucesso");
  } catch (erro) {
    definirStatus(statusOfertas, erro.message || "Não foi possível salvar as ofertas.", "erro");
  } finally {
    botaoSalvar.disabled = false;
  }
});

botaoSair.addEventListener("click", async () => {
  await signOut(autenticacao);
  definirStatus(statusLogin, "Sessão encerrada.");
});

function iniciar() {
  if (!firebaseConfigurado()) {
    avisoConfiguracao.hidden = false;
    formularioLogin.querySelectorAll("input, button").forEach((elemento) => {
      elemento.disabled = true;
    });
    definirStatus(statusLogin, "Conecte o Firebase para liberar o painel.", "erro");
    return;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  autenticacao = getAuth(app);
  banco = getFirestore(app);
  onAuthStateChanged(autenticacao, atualizarSessao);
}

iniciar();

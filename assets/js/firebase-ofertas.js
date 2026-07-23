import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { collection, getDocs, getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { firebaseConfig, firebaseConfigurado } from "./firebase-config.js";

function obterBanco() {
  if (!firebaseConfigurado()) return null;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

export async function carregarRegistros() {
  const banco = obterBanco();
  if (!banco) return [];
  const resultado = await getDocs(collection(banco, "ofertas"));
  return resultado.docs.map((documento) => documento.data());
}

export async function carregarProdutosRemotos() {
  const banco = obterBanco();
  if (!banco) return [];
  const resultado = await getDocs(collection(banco, "produtos"));
  return resultado.docs.map((documento) => ({
    ...documento.data(),
    id: documento.data().id || documento.id,
    guiaSlug: documento.data().guiaSlug || documento.data().guia_slug || "",
    slugGuia: documento.data().slugGuia
      || (documento.data().guiaSlug ? `guia/${documento.data().guiaSlug}` : "")
  }));
}

export async function carregarGuiasPublicados() {
  const banco = obterBanco();
  if (!banco) return [];
  const resultado = await getDocs(collection(banco, "guias"));
  return resultado.docs
    .map((documento) => ({
      ...documento.data(),
      slug: documento.data().slug || documento.id
    }))
    .filter((guia) => guia.publicado !== false)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
}

export function mesclarCatalogo(catalogo, registros) {
  if (!Array.isArray(catalogo?.produtos) || !Array.isArray(registros)) return catalogo;
  const porProduto = new Map();

  registros.forEach((registro) => {
    if (!registro?.produto_id || !registro?.loja) return;
    if (!porProduto.has(registro.produto_id)) porProduto.set(registro.produto_id, []);
    porProduto.get(registro.produto_id).push(registro);
  });

  return {
    ...catalogo,
    produtos: catalogo.produtos.map((produto) => {
      const remotas = porProduto.get(produto.id);
      const ofertas = Array.isArray(produto.ofertas)
        ? produto.ofertas.map((oferta) => ({ ...oferta }))
        : [];
      const indicePorLoja = new Map(ofertas.map((oferta, indice) => [oferta.loja, indice]));

      (remotas || []).forEach((remota) => {
        const oferta = {
          loja: remota.loja,
          url: remota.ativo && remota.url ? remota.url : "",
          preco: Number(remota.preco) || 0
        };
        const indice = indicePorLoja.get(remota.loja);
        if (indice === undefined) {
          indicePorLoja.set(remota.loja, ofertas.length);
          ofertas.push(oferta);
        } else {
          ofertas[indice] = oferta;
        }
      });

      const ativas = ofertas.filter((oferta) => oferta.url);
      const comPreco = ativas
        .filter((oferta) => Number(oferta.preco) > 0)
        .sort((a, b) => Number(a.preco) - Number(b.preco));
      const principal = comPreco[0] || ativas[0];

      return {
        ...produto,
        ofertas,
        precoAtual: principal && Number(principal.preco) > 0 ? Number(principal.preco) : 0,
        precoReferencia: 0,
        urlOferta: principal?.url || "",
        loja: principal?.loja || ""
      };
    })
  };
}

export async function carregarCatalogo(caminho = "/assets/data/produtos.json") {
  const resposta = await fetch(caminho, { cache: "no-store" });
  if (!resposta.ok) throw new Error("Catálogo indisponível");
  const catalogo = await resposta.json();
  if (!firebaseConfigurado()) return catalogo;

  try {
    const [resultadoRegistros, resultadoRemotos] = await Promise.allSettled([
      carregarRegistros(),
      carregarProdutosRemotos()
    ]);
    const registros = resultadoRegistros.status === "fulfilled" ? resultadoRegistros.value : [];
    const remotos = resultadoRemotos.status === "fulfilled" ? resultadoRemotos.value : [];
    const porId = new Map(catalogo.produtos.map((produto) => [produto.id, produto]));
    remotos.forEach((produto) => porId.set(produto.id, {
      precoAtual: 0,
      precoReferencia: 0,
      urlOferta: "",
      loja: "",
      historico: [],
      ...produto
    }));
    return mesclarCatalogo({
      ...catalogo,
      produtos: [...porId.values()]
    }, registros);
  } catch {
    return catalogo;
  }
}

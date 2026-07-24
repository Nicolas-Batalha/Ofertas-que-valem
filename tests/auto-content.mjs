import assert from "node:assert/strict";
import { GET as gerarGuia } from "../api/guia.mjs";
import { GET as gerarSitemap } from "../api/sitemap.mjs";

function valor(dado) {
  if (Array.isArray(dado)) return { arrayValue: { values: dado.map(valor) } };
  if (typeof dado === "boolean") return { booleanValue: dado };
  if (typeof dado === "number") {
    return Number.isInteger(dado)
      ? { integerValue: String(dado) }
      : { doubleValue: dado };
  }
  return { stringValue: String(dado) };
}

function documento(colecao, id, dados) {
  return {
    name: `projects/ofertas-que-valem/databases/(default)/documents/${colecao}/${id}`,
    fields: Object.fromEntries(Object.entries(dados).map(([chave, dado]) => [chave, valor(dado)]))
  };
}

const guia = documento("guias", "teste-guia", {
  slug: "teste-guia",
  categoria: "Cozinha",
  categoriaSlug: "cozinha",
  titulo: "Melhores produtos de teste",
  descricao: "Compare modelos reais antes de escolher.",
  tituloIntroducao: "Escolha com clareza",
  textoApoio: "Veja os detalhes antes da compra.",
  tituloMetodologia: "Nosso critério",
  textoMetodologia: "A seleção considera desempenho e custo-benefício.",
  imagem: "https://example.com/capa.webp",
  publicado: true
});
const produto = documento("produtos", "produto-teste", {
  id: "produto-teste",
  guiaSlug: "teste-guia",
  nome: "Produto Teste 500",
  marca: "Marca",
  imagem: "https://example.com/produto.webp",
  alt: "Produto de teste",
  nota: 9.2,
  perfil: "Melhor escolha",
  posicao: 1,
  especificacoes: ["500 W", "Jarra removível"],
  pros: ["Fácil de usar"],
  contras: ["Ocupa espaço"],
  publicado: true
});
const oferta = documento("ofertas", "produto-teste__amazon", {
  produto_id: "produto-teste",
  loja: "Amazon",
  url: "https://example.com/oferta",
  preco: 199.9,
  ativo: true
});

const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (entrada) => {
  const url = String(entrada);
  if (url.includes("/documents/guias/teste-guia")) {
    return new Response(JSON.stringify(guia), { status: 200 });
  }
  if (url.includes("/documents/guias?")) {
    return new Response(JSON.stringify({ documents: [guia] }), { status: 200 });
  }
  if (url.includes("/documents/produtos?")) {
    return new Response(JSON.stringify({ documents: [produto] }), { status: 200 });
  }
  if (url.includes("/documents/ofertas?")) {
    return new Response(JSON.stringify({ documents: [oferta] }), { status: 200 });
  }
  return new Response("{}", { status: 404 });
};

try {
  const respostaGuia = await gerarGuia(new Request("https://www.ofertasquevalem.shop/api/guia?slug=teste-guia"));
  assert.equal(respostaGuia.status, 200);
  const html = await respostaGuia.text();
  assert.match(html, /Melhores produtos de teste/);
  assert.match(html, /Escolha com clareza/);
  assert.match(html, /Nosso critério/);
  assert.match(html, /Produto Teste 500/);
  assert.match(html, /data-loja="amazon"/);
  assert.match(html, /https:\/\/www\.ofertasquevalem\.shop\/guia\/teste-guia/);

  const respostaSitemap = await gerarSitemap();
  assert.equal(respostaSitemap.status, 200);
  const xml = await respostaSitemap.text();
  assert.match(xml, /\/guia\/teste-guia/);
  assert.match(xml, /<urlset/);
  process.stdout.write("Conteúdo automático validado.\n");
} finally {
  globalThis.fetch = fetchOriginal;
}

import { listarDocumentos } from "./_firestore.mjs";

const DOMINIO = "https://www.ofertasquevalem.shop";
const PAGINAS_ESTATICAS = [
  "/",
  "/guias.html",
  "/categorias.html",
  "/busca.html",
  "/comparar.html",
  "/guias/air-fryer.html",
  "/guias/robo-aspirador.html",
  "/guias/fone-bluetooth.html",
  "/guias/cafeteira.html",
  "/sobre.html",
  "/metodologia.html",
  "/politica-editorial.html",
  "/privacidade.html",
  "/termos.html"
];

function escaparXml(valor = "") {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function dataIso(valor) {
  const data = valor ? new Date(valor) : new Date();
  return Number.isNaN(data.getTime())
    ? new Date().toISOString().slice(0, 10)
    : data.toISOString().slice(0, 10);
}

export async function GET() {
  let guias = [];
  try {
    guias = (await listarDocumentos("guias"))
      .filter((guia) => guia.publicado !== false && guia.slug);
  } catch {
    // O sitemap estático continua sendo entregue mesmo durante uma indisponibilidade do Firebase.
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const urls = [
    ...PAGINAS_ESTATICAS.map((caminho) => ({
      local: `${DOMINIO}${caminho}`,
      modificado: hoje
    })),
    ...guias.map((guia) => ({
      local: `${DOMINIO}/guia/${guia.slug}`,
      modificado: dataIso(guia.updated_at)
    }))
  ];
  const unicas = [...new Map(urls.map((item) => [item.local, item])).values()];
  const corpo = unicas
    .map((item) => `  <url><loc>${escaparXml(item.local)}</loc><lastmod>${item.modificado}</lastmod></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex"
    }
  });
}

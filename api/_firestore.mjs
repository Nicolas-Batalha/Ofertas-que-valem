const PROJECT_ID = "ofertas-que-valem";
const API_KEY = "AIzaSyA1h3JPTR6QsX_8yLVICxODbNs6tGTwR2g";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function valorFirestore(valor) {
  if (!valor || typeof valor !== "object") return null;
  if ("stringValue" in valor) return valor.stringValue;
  if ("booleanValue" in valor) return valor.booleanValue;
  if ("integerValue" in valor) return Number(valor.integerValue);
  if ("doubleValue" in valor) return Number(valor.doubleValue);
  if ("timestampValue" in valor) return valor.timestampValue;
  if ("nullValue" in valor) return null;
  if ("arrayValue" in valor) return (valor.arrayValue.values || []).map(valorFirestore);
  if ("mapValue" in valor) return camposFirestore(valor.mapValue.fields || {});
  return null;
}

function camposFirestore(campos = {}) {
  return Object.fromEntries(
    Object.entries(campos).map(([chave, valor]) => [chave, valorFirestore(valor)])
  );
}

export function documentoFirestore(documento) {
  const id = documento.name?.split("/").pop() || "";
  return { id, ...camposFirestore(documento.fields || {}) };
}

export async function buscarDocumento(colecao, id) {
  const url = `${BASE_URL}/${encodeURIComponent(colecao)}/${encodeURIComponent(id)}?key=${API_KEY}`;
  const resposta = await fetch(url, { headers: { Accept: "application/json" } });
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new Error(`Firestore respondeu ${resposta.status}`);
  return documentoFirestore(await resposta.json());
}

export async function listarDocumentos(colecao, limite = 500) {
  const url = `${BASE_URL}/${encodeURIComponent(colecao)}?pageSize=${limite}&key=${API_KEY}`;
  const resposta = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resposta.ok) throw new Error(`Firestore respondeu ${resposta.status}`);
  const dados = await resposta.json();
  return (dados.documents || []).map(documentoFirestore);
}

export function escaparHtml(valor = "") {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function urlSegura(valor = "", fallback = "/imagens/social/og-ofertas-que-valem.png") {
  try {
    if (String(valor).startsWith("/")) return String(valor);
    const url = new URL(String(valor));
    return url.protocol === "https:" ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export function criarSlug(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function numero(valor, fallback = 0) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : fallback;
}

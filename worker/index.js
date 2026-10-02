// Worker do site: os arquivos de marca_coorte/site são servidos como assets;
// só /api/* e /atlas/data/* passam por aqui (run_worker_first em wrangler.jsonc).
// POST /api/contato envia o formulário por e-mail via Email Routing do coorte.io.
// GET /atlas/data/* serve os dados do Atlas da APS do bucket R2 (publicados pelo pipeline no zen).
// POST /api/atlas-alert avisa por e-mail quando o pipeline falha (token em ATLAS_ALERT_TOKEN).
import { EmailMessage } from "cloudflare:email";

const FROM = "site@coorte.io";
const TO = "paulosuen@gmail.com"; // precisa ser um destino verificado no Email Routing
const TIPOS = ["Secretaria de saúde", "Hospital ou laboratório", "Grupo de pesquisa", "Indústria", "Outro"];
const LIM = { nome: 120, email: 200, instituicao: 200, mensagem: 5000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

// cabeçalho em UTF-8 (RFC 2047) e corpo em base64: acentos chegam intactos
const b64 = (s) => {
  const u = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192));
  return btoa(bin);
};
const enc = (s) => `=?UTF-8?B?${b64(s)}?=`;
const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();

const mail = (subject, corpo, replyTo) => [
  `From: ${enc("Site Coorte")} <${FROM}>`,
  `To: <${TO}>`,
  ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
  `Subject: ${enc(subject)}`,
  `Message-ID: <${crypto.randomUUID()}@coorte.io>`,
  `Date: ${new Date().toUTCString()}`,
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: base64",
  "",
  b64(corpo).replace(/.{76}/g, "$&\r\n"),
].join("\r\n");

// dados do atlas: o pipeline grava os objetos já em gzip; versões imutáveis em v/, current.json com cache curto
async function atlasData(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });
  const key = url.pathname.slice("/atlas/data/".length);
  if (!/^(current\.json|v\/[\w.-]+\/(br|uf\/\d{2})\.json)$/.test(key)) return new Response("não encontrado", { status: 404 });
  const obj = await env.ATLAS.get(key);
  if (!obj) return new Response("não encontrado", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  if (!h.has("cache-control")) h.set("cache-control", "public, max-age=300");
  // corpo já comprimido: encodeBody "manual" evita recomprimir e mantém o Content-Encoding: gzip
  return new Response(request.method === "HEAD" ? null : obj.body, { headers: h, encodeBody: "manual" });
}

async function atlasAlert(request, env) {
  if (request.method !== "POST") return json(405, { ok: false });
  const tok = env.ATLAS_ALERT_TOKEN;
  if (!tok || request.headers.get("authorization") !== `Bearer ${tok}`) return json(401, { ok: false });
  let d;
  try { d = await request.json(); } catch { return json(400, { ok: false }); }
  const assunto = oneLine(d.assunto).slice(0, 200) || "Atlas da APS";
  const texto = String(d.texto ?? "").slice(-20000);
  try {
    await env.CONTATO.send(new EmailMessage(FROM, TO, mail(`[atlas] ${assunto}`, texto || "(sem log)")));
  } catch (e) {
    console.error("alerta falhou", e);
    return json(502, { ok: false });
  }
  return json(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/atlas/data/")) return atlasData(request, env, url);
    if (url.pathname === "/api/atlas-alert") return atlasAlert(request, env);
    if (url.pathname !== "/api/contato") return json(404, { ok: false });
    if (request.method !== "POST") return json(405, { ok: false });

    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== url.host) return json(403, { ok: false });

    let d;
    try { d = await request.json(); } catch { return json(400, { ok: false, erro: "formato" }); }

    // campo-isca: invisível para pessoas, preenchido por robôs
    if (d.site) return json(200, { ok: true });

    const nome = oneLine(d.nome), email = oneLine(d.email), instituicao = oneLine(d.instituicao);
    const tipo = TIPOS.includes(d.tipo) ? d.tipo : "Outro";
    const mensagem = String(d.mensagem ?? "").trim();
    if (!nome || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return json(400, { ok: false, erro: "campos" });
    if (nome.length > LIM.nome || email.length > LIM.email || instituicao.length > LIM.instituicao || mensagem.length > LIM.mensagem)
      return json(400, { ok: false, erro: "tamanho" });

    const corpo = [
      `Nome: ${nome}`,
      `E-mail: ${email}`,
      `Instituição: ${instituicao || "não informada"}`,
      `Tipo: ${tipo}`,
      "",
      mensagem || "(sem mensagem)",
      "",
      "Enviado pelo formulário de coorte.io",
    ].join("\r\n");

    const raw = mail(`[coorte.io] ${nome} · ${tipo}`, corpo, `${enc(nome)} <${email}>`);

    try {
      await env.CONTATO.send(new EmailMessage(FROM, TO, raw));
    } catch (e) {
      console.error("envio falhou", e);
      return json(502, { ok: false, erro: "envio" });
    }
    return json(200, { ok: true });
  },
};

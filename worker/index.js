// Worker do site: os arquivos de marca_coorte/site são servidos como assets;
// só /api/* passa por aqui (run_worker_first em wrangler.jsonc).
// POST /api/contato envia o formulário por e-mail via Email Routing do coorte.io.
import { EmailMessage } from "cloudflare:email";

const FROM = "site@coorte.io";
const TO = "paulosuen@gmail.com"; // precisa ser um destino verificado no Email Routing
const TIPOS = ["Secretaria de saúde", "Hospital ou laboratório", "Grupo de pesquisa", "Indústria", "Outro"];
const LIM = { nome: 120, email: 200, instituicao: 200, mensagem: 5000 };

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

// cabeçalho em UTF-8 (RFC 2047) e corpo em base64: acentos chegam intactos
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const enc = (s) => `=?UTF-8?B?${b64(s)}?=`;
const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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

    const raw = [
      `From: ${enc("Site Coorte")} <${FROM}>`,
      `To: <${TO}>`,
      `Reply-To: ${enc(nome)} <${email}>`,
      `Subject: ${enc(`[coorte.io] ${nome} · ${tipo}`)}`,
      `Message-ID: <${crypto.randomUUID()}@coorte.io>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(corpo).replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");

    try {
      await env.CONTATO.send(new EmailMessage(FROM, TO, raw));
    } catch (e) {
      console.error("envio falhou", e);
      return json(502, { ok: false, erro: "envio" });
    }
    return json(200, { ok: true });
  },
};

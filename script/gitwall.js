// GitWall iOS — iPhone 11
// Scriptable (iOS) + Atalhos. Resolução 828x1792. Sem iCloud.
// Os quadrados refletem as contribuições públicas do perfil no GitHub.
// Troque abaixo pelo seu username público do GitHub
const USUARIO = "palomagl";
const LARGURA = 828, ALTURA = 1792;
const COLUNAS = 15, PASSO = 36, QUADRADO = 31, INICIO_Y = 550;
const NIVEL = ["#415b7e", "#35aa6e", "#4acb79", "#70e78b", "#b6f69e"];
const FUTURO = "#4b6281";

function atr(tag, nome) {
  const re = new RegExp("\\b" + nome + "\\s*=\\s*[\"']([^\"']+)[\"']", "i");
  const m = re.exec(tag);
  return m ? m[1] : null;
}
function diasDoAno(ano) {
  return Math.round((Date.UTC(ano + 1, 0, 1) - Date.UTC(ano, 0, 1)) / 86400000);
}
function dataISO(ano, indice) {
  return new Date(Date.UTC(ano, 0, 1 + indice)).toISOString().slice(0, 10);
}
function extrairContribuicoes(html, ano) {
  const dias = {}, ids = {};
  const tags = html.match(/<td\b[^>]*class=["'][^"']*ContributionCalendar-day[^"']*["'][^>]*>/gi) || [];
  for (const tag of tags) {
    const data = atr(tag, "data-date");
    const nivel = Number(atr(tag, "data-level"));
    if (!data || data.slice(0, 4) !== String(ano) || !Number.isFinite(nivel)) continue;
    dias[data] = { nivel: Math.min(4, Math.max(0, nivel)), quantidade: nivel === 0 ? 0 : null };
    const id = atr(tag, "id");
    if (id) ids[id] = data;
  }
  if (Object.keys(dias).length < 1) {
    throw new Error("Não foi possível ler o calendário público do GitHub. O wallpaper anterior foi preservado.");
  }
  const tooltips = /<tool-tip\b[^>]*\bfor=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tool-tip>/gi;
  let tip;
  while ((tip = tooltips.exec(html)) !== null) {
    const data = ids[tip[1]];
    if (!data || !dias[data]) continue;
    const texto = tip[2].replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
    const qtd = texto.match(/^([\d.,]+)\s+(?:contribution|contribuições|contribuição|commits?)/i);
    if (qtd) {
      const n = Number(qtd[1].replace(/[,\.]/g, ""));
      if (Number.isFinite(n)) dias[data].quantidade = n;
    }
  }
  const presentes = Object.values(dias);
  const preciso = presentes.every(d => d.quantidade !== null);
  const total = preciso ? presentes.reduce((n, d) => n + d.quantidade, 0) : null;
  return { dias, total };
}
async function baixarDados(ano) {
  const url = `https://github.com/users/${encodeURIComponent(USUARIO)}/contributions?from=${ano}-01-01&to=${ano}-12-31`;
  const req = new Request(url);
  req.headers = { "User-Agent": "Mozilla/5.0", "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9" };
  req.timeoutInterval = 25;
  const html = await req.loadString();
  if (req.response && req.response.statusCode !== 200) throw new Error("GitHub retornou HTTP " + req.response.statusCode);
  return extrairContribuicoes(html, ano);
}
function misturarHex(a, b, t) {
  const aa = a.replace("#", ""), bb = b.replace("#", "");
  return "#" + [0, 2, 4].map(i => {
    const x = parseInt(aa.slice(i, i + 2), 16), y = parseInt(bb.slice(i, i + 2), 16);
    return Math.round(x * (1 - t) + y * t).toString(16).padStart(2, "0");
  }).join("");
}
function quadrado(ctx, x, y, cor) {
  ctx.setFillColor(new Color(cor));
  const p = new Path();
  p.addRoundedRect(new Rect(x, y, QUADRADO, QUADRADO), 6, 6);
  ctx.addPath(p);
  ctx.fillPath();
}
function desenhar(ano, atividades) {
  const ctx = new DrawContext();
  ctx.size = new Size(LARGURA, ALTURA);
  ctx.opaque = true;
  ctx.respectScreenScale = false;
  for (let y = 0; y < ALTURA; y += 8) {
    const t = y / ALTURA;
    const cor = t < 0.48
      ? misturarHex("#344b73", "#2e527c", t / 0.48)
      : misturarHex("#2e527c", "#335d89", (t - 0.48) / 0.52);
    ctx.setFillColor(new Color(cor));
    ctx.fillRect(new Rect(0, y, LARGURA, 9));
  }
  const agora = new Date();
  const hojeISO = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,"0")}-${String(agora.getDate()).padStart(2,"0")}`;
  const x0 = Math.round((LARGURA - COLUNAS * PASSO) / 2);
  const ajuste = Math.round((PASSO - QUADRADO) / 2);
  for (let i = 0; i < diasDoAno(ano); i++) {
    const data = dataISO(ano, i);
    const r = Math.floor(i / COLUNAS), c = i % COLUNAS;
    const nivel = data > hojeISO ? -1 : (atividades.dias[data] ? atividades.dias[data].nivel : 0);
    quadrado(ctx, x0 + c * PASSO + ajuste, INICIO_Y + r * PASSO + ajuste,
             nivel < 0 ? FUTURO : NIVEL[nivel]);
  }
  const primeiro = atividades.total == null ? "Contribuições" : `${atividades.total} contribuições`;
  const segundo = "este ano";
  const largura1 = primeiro.length * 13.1, largura2 = segundo.length * 12.7;
  const x = (LARGURA - largura1 - largura2 - 12) / 2;
  ctx.setTextAlignedLeft();
  ctx.setFont(Font.boldSystemFont(24));
  ctx.setTextColor(new Color("#b6f69e"));
  ctx.drawTextInRect(primeiro, new Rect(x, 1498, largura1 + 12, 40));
  ctx.setFont(Font.systemFont(24));
  ctx.setTextColor(new Color("#d1d9e7"));
  ctx.drawTextInRect(segundo, new Rect(x + largura1 + 12, 1498, largura2 + 12, 40));
  return ctx.getImage();
}
async function executar() {
  const ano = new Date().getFullYear();
  const dados = await baixarDados(ano);
  const imagem = desenhar(ano, dados);
  // Envia a imagem em Base64 para o app Atalhos, sem usar o iCloud.
  const dadosPNG = Data.fromPNG(imagem);
  Script.setShortcutOutput(dadosPNG.toBase64String());
  if (config.runsInApp) await QuickLook.present(imagem);
}
try { await executar(); }
catch (erro) {
  console.error(String(erro));
  if (config.runsInApp) {
    const aviso = new Alert();
    aviso.title = "Não foi possível atualizar";
    aviso.message = String(erro);
    aviso.addAction("OK");
    await aviso.present();
  }
  throw erro;
}
Script.complete();
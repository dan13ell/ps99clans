// ==========================================================
// POČÍTADLO STAŽENÍ pro stránku /programs/  (doplněk do Cloudflare workeru rough-pine-d90f)
// ==========================================================
// JAK NASADIT (Cloudflare → Workers → rough-pine-d90f → Edit code):
//
// 1) Celý blok mezi "ZAČÁTEK" a "KONEC" níže vlož do worker.js NAD řádek
//      // HLAVNÍ HANDLER
//    (tedy nad blok s "export default {").
//
// 2) Ve funkci fetch() najdi řádek
//      if (request.method !== "GET") return reply({ status: "error", message: "Method not allowed" }, 0, 405);
//    a TĚSNĚ NAD něj vlož:
//      if (p === "/api/downloads/hit" && request.method === "POST") return handleDownloadHit(request, env);
//
// 3) Ve stejné funkci v bloku try { ... } (kde je "/api/collector-status") přidej řádek:
//      if (p === "/api/downloads") return await handleDownloadCounts(env);
//
// 4) Deploy. Tabulky v D1 (dl_count, dl_seen) se vytvoří samy při prvním dotazu.
//
// Kontrola: https://rough-pine-d90f.dan13el.workers.dev/api/downloads  → {"status":"ok","counts":{}}
// Dokud to nasazené není, stránka Programs počty prostě neukazuje (nic se nerozbije).
//
// Ochrana proti spamu:
//  - web pošle klik jen jednou na prohlížeč a program (localStorage)
//  - worker každou IP započítá u každého programu jen jednou (ukládá jen SHA-256 hash, ne IP)
//  - max. DL_MAX_IDS různých programů, ať nikdo nenaplní databázi vymyšlenými id
// Cena v D1: 1–2 zápisy za nové stažení, 0 za opakovaný klik.

// ----------------------------- ZAČÁTEK -----------------------------
const DL_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const DL_MAX_IDS = 200;
let dlReady = false;

async function dlSchema(env) {
  if (dlReady) return;
  await env.DB.batch([
    "CREATE TABLE IF NOT EXISTS dl_count (id TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID",
    "CREATE TABLE IF NOT EXISTS dl_seen (k TEXT PRIMARY KEY) WITHOUT ROWID",
  ].map(s => env.DB.prepare(s)));
  dlReady = true;
}

// GET /api/downloads → { status: "ok", counts: { "program-1": 123, ... } }
async function handleDownloadCounts(env) {
  await dlSchema(env);
  const counts = {};
  for (const r of (await env.DB.prepare("SELECT id, n FROM dl_count").all()).results) counts[r.id] = r.n;
  return reply({ status: "ok", counts }, 30);
}

// POST /api/downloads/hit, tělo = id programu (text/plain)
async function handleDownloadHit(request, env) {
  try {
    const id = (await request.text()).trim().toLowerCase().slice(0, 60);
    if (!DL_ID.test(id)) return reply({ status: "error", message: "Bad id" }, 0, 400);
    await dlSchema(env);

    const known = await env.DB.prepare("SELECT 1 AS x FROM dl_count WHERE id = ?").bind(id).first();
    if (!known) {
      const c = await env.DB.prepare("SELECT COUNT(*) AS c FROM dl_count").first();
      if ((c && c.c) >= DL_MAX_IDS) return reply({ status: "ok", counted: false });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ps99dl|" + id + "|" + ip));
    const key = [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");

    const r = await env.DB.prepare("INSERT INTO dl_seen(k) VALUES(?) ON CONFLICT(k) DO NOTHING").bind(key).run();
    if (!(r.meta && r.meta.changes > 0)) return reply({ status: "ok", counted: false });   // tahle IP už se počítala

    await env.DB.prepare("INSERT INTO dl_count(id, n) VALUES(?, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1").bind(id).run();
    return reply({ status: "ok", counted: true });
  } catch (e) {
    console.error("download hit", e);
    return reply({ status: "error" }, 0, 500);
  }
}
// ------------------------------ KONEC ------------------------------

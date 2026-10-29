/* Spolehlivé načítání Roblox profilovek (clan-detail, league-detail, people)
 *
 *  - cache v localStorage (3 dny) → při další návštěvě jsou profilovky hned
 *  - dávky po 100 (limit Roblox API), max. 2 požadavky současně
 *  - opakování s prodlevou, když API vrátí chybu / 429 nebo "Pending"
 *  - záloha přes roproxy, když worker selže
 *  - rozbitý obrázek → smaže se z cache a zkusí se znovu stáhnout
 *  - obrázky se doplňují rovnou do <img data-avatar-uid="...">, bez překreslování seznamu
 */
(function () {
    "use strict";

    const WORKER_URL = "https://rough-pine-d90f.ps99clans.workers.dev";
    const SOURCES = [
        WORKER_URL + "/roblox/avatars",
        "https://thumbnails.roproxy.com/v1/users/avatar-headshot"
    ];
    const KEY = "ps99Avatars_v1";
    const TTL = 3 * 24 * 3600 * 1000;      // platnost uložené adresy
    const TTL_BAD = 2 * 3600 * 1000;       // blokovaný / neexistující avatar zkusíme znovu za 2 h
    const MAX_ITEMS = 4000;
    const CHUNK = 100;
    const RETRY_MS = [700, 1600, 3200, 6000, 10000];

    const svg = (body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">${body}</svg>`);
    // během načítání: jemná šedá silueta; když se to fakt nepovede: stejná, jen tmavší
    const LOADING = svg(`<rect width="150" height="150" fill="#E9EDF5"/><circle cx="75" cy="60" r="26" fill="#D3D9E6"/><path d="M28 140c4-30 24-44 47-44s43 14 47 44z" fill="#D3D9E6"/>`);
    const FAILED = svg(`<rect width="150" height="150" fill="#FFFFFF"/><circle cx="75" cy="60" r="26" fill="#B9C0CF"/><path d="M28 140c4-30 24-44 47-44s43 14 47 44z" fill="#B9C0CF"/>`);

    // ---------- cache ----------
    let store = {};
    try { store = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { store = {}; }
    let saveTimer = null;
    function save() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try {
                const keys = Object.keys(store);
                if (keys.length > MAX_ITEMS) {
                    keys.sort((a, b) => store[a][1] - store[b][1]);
                    keys.slice(0, keys.length - MAX_ITEMS).forEach(k => delete store[k]);
                }
                localStorage.setItem(KEY, JSON.stringify(store));
            } catch (e) {
                try { localStorage.removeItem(KEY); } catch (e2) {}
            }
        }, 400);
    }
    const ck = (id, o) => `${o.size}|${o.circular ? 1 : 0}|${id}`;
    function opts(o) { o = o || {}; return { size: o.size || "150x150", circular: !!o.circular }; }

    // vrátí: url (string) | "" (avatar neexistuje / je blokovaný) | null (neznáme)
    function get(id, o) {
        o = opts(o);
        const e = store[ck(id, o)];
        if (!e) return null;
        const age = Date.now() - e[1];
        if (e[0] ? age > TTL : age > TTL_BAD) { delete store[ck(id, o)]; return null; }
        return e[0];
    }
    function put(id, o, url) { store[ck(id, o)] = [url, Date.now()]; save(); }

    // ---------- stahování ----------
    const inflight = new Map();             // klíč -> Promise
    let active = 0; const waiters = [];
    const slot = () => active < 2 ? (active++, Promise.resolve()) : new Promise(r => waiters.push(r));
    const release = () => { const w = waiters.shift(); if (w) w(); else active--; };
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function fetchJson(url) {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const t = ctrl ? setTimeout(() => ctrl.abort(), 9000) : null;
        try {
            const r = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
            if (!r.ok) throw new Error("HTTP " + r.status);
            const j = await r.json();
            if (!j || !Array.isArray(j.data)) throw new Error("bad json");
            return j.data;
        } finally { if (t) clearTimeout(t); }
    }

    // stáhne jednu dávku, opakuje jen ta ID, která ještě nemáme
    async function loadChunk(ids, o) {
        const result = {};
        let todo = ids.slice();
        for (let attempt = 0; attempt <= RETRY_MS.length && todo.length; attempt++) {
            if (attempt) await sleep(RETRY_MS[attempt - 1] + Math.random() * 300);
            // 1. a 2. pokus přes worker, pak střídavě i záloha
            const src = SOURCES[attempt < 2 ? 0 : attempt % SOURCES.length];
            const q = `?userIds=${todo.join(",")}&size=${o.size}&format=Png&isCircular=${o.circular}`;
            let data;
            await slot();
            try { data = await fetchJson(src + q); }
            catch (e) { data = null; }
            finally { release(); }
            if (!data) continue;
            const pending = [];
            const seen = new Set();
            data.forEach(it => {
                if (!it || it.targetId == null) return;
                const id = String(it.targetId);
                seen.add(id);
                if (it.imageUrl && (!it.state || it.state === "Completed")) { result[id] = it.imageUrl; put(id, o, it.imageUrl); }
                else if (it.state === "Pending" || it.state === "TemporarilyUnavailable" || !it.state) pending.push(id);
                else { result[id] = ""; put(id, o, ""); }           // Blocked / Error / InReview
            });
            // ID, která v odpovědi chybí, zkusíme znovu
            todo = todo.filter(id => !seen.has(id)).concat(pending);
        }
        todo.forEach(id => { result[id] = ""; });               // nepovedlo se – zobrazí se náhradní obrázek (necachujeme)
        return result;
    }

    // načte avatary pro seznam ID, vrátí { id: url | "" }
    function load(ids, o) {
        o = opts(o);
        const out = {}, need = [];
        const waits = [];
        [...new Set(ids.map(String).filter(id => /^\d+$/.test(id) && id !== "0"))].forEach(id => {
            const c = get(id, o);
            if (c !== null) { out[id] = c; return; }
            const k = ck(id, o);
            if (inflight.has(k)) waits.push(inflight.get(k).then(u => { out[id] = u; }));
            else need.push(id);
        });
        for (let i = 0; i < need.length; i += CHUNK) {
            const part = need.slice(i, i + CHUNK);
            const p = loadChunk(part, o);
            part.forEach(id => {
                const k = ck(id, o);
                const one = p.then(r => r[id] || "");
                inflight.set(k, one);
                one.finally(() => inflight.delete(k));
                waits.push(one.then(u => { out[id] = u; }));
            });
        }
        return Promise.all(waits).then(() => out);
    }

    // ---------- napojení na <img> ----------
    function setImg(img, url) {
        const want = url || FAILED;
        if (img.getAttribute("src") !== want) img.src = want;
        img.classList.toggle("avatar-missing", !url);
    }

    // doplní všechny <img data-avatar-uid> uvnitř root
    function fill(root, o) {
        o = opts(o);
        root = root || document;
        const imgs = [...root.querySelectorAll("img[data-avatar-uid]")];
        const ids = [];
        imgs.forEach(img => {
            const id = img.dataset.avatarUid;
            const c = get(id, o);
            if (c !== null) setImg(img, c);
            else { if (!img.getAttribute("src")) img.src = LOADING; ids.push(id); }
        });
        if (!ids.length) return Promise.resolve();
        return load(ids, o).then(map => {
            // seznam se mezitím mohl překreslit – hledáme obrázky znovu
            root.querySelectorAll("img[data-avatar-uid]").forEach(img => {
                const id = img.dataset.avatarUid;
                if (id in map) setImg(img, map[id]);
            });
        });
    }

    // počáteční src pro šablonu
    function src(id, o) { const c = get(id, o); return c === null ? LOADING : (c || FAILED); }

    // obrázek z CDN se nenačetl → smazat z cache a zkusit jednou znovu
    const retried = new Set();
    function broken(img, o) {
        o = opts(o);
        const id = img && img.dataset ? img.dataset.avatarUid : null;
        if (!id) { img.onerror = null; img.src = FAILED; return; }
        delete store[ck(id, o)]; save();
        img.src = LOADING;
        if (retried.has(ck(id, o))) { setImg(img, ""); return; }
        retried.add(ck(id, o));
        load([id], o).then(m => setImg(img, m[id] || ""));
    }

    window.Avatars = { get, load, fill, src, broken, LOADING, FAILED };
})();

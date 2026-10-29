// Sdílené načítání profilovek (clan-detail, league-detail, people)
//  - trvalá cache v localStorage (12 h), takže se už viděné profilovky neptají znovu
//  - dávky po 40 ID, ať jedna chyba neshodí všechno
//  - chybějící se na pozadí zkusí znovu (1.5 s, 3 s, 6 s, 12 s)
//
// PS99Avatars.load(ids, { worker, size, circular, onUpdate(mapNových), onDone(mapVšech, chybějící) })
// vrací Promise s mapou { userId: imageUrl } (cache + první průchod); opakování běží na pozadí.
(function () {
    const TTL = 12 * 3600 * 1000;
    const BATCH = 40;
    const MAX_ENTRIES = 3000;
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const keyOf = (size, circ) => `ps99av:v1:${size}:${circ ? 1 : 0}`;

    function readStore(size, circ) {
        try { return JSON.parse(localStorage.getItem(keyOf(size, circ))) || {}; }
        catch (e) { return {}; }
    }

    function writeStore(size, circ, store) {
        try {
            const now = Date.now();
            let ids = Object.keys(store).filter(id => now - store[id][1] < TTL);
            if (ids.length > MAX_ENTRIES) {
                ids.sort((a, b) => store[b][1] - store[a][1]);
                ids = ids.slice(0, MAX_ENTRIES);
            }
            const out = {};
            ids.forEach(id => { out[id] = store[id]; });
            localStorage.setItem(keyOf(size, circ), JSON.stringify(out));
        } catch (e) {}
    }

    async function fetchBatch(worker, ids, size, circ, fresh) {
        try {
            const url = `${worker}/roblox/avatars?userIds=${ids.join(",")}&size=${size}&format=Png&isCircular=${circ ? "true" : "false"}`;
            const r = await fetch(url, fresh ? { cache: "no-store" } : undefined);
            if (!r.ok) return {};
            const j = await r.json();
            const out = {};
            (j && j.data || []).forEach(i => { if (i && i.targetId && i.imageUrl) out[i.targetId] = i.imageUrl; });
            return out;
        } catch (e) { return {}; }
    }

    async function load(ids, opt) {
        opt = opt || {};
        const size = opt.size || "150x150";
        const circ = !!opt.circular;
        const worker = opt.worker;
        const onUpdate = opt.onUpdate || function () {};
        const onDone = opt.onDone || function () {};

        const result = {};
        const store = readStore(size, circ);
        const now = Date.now();
        let need = [];

        [...new Set((ids || []).map(Number).filter(n => n > 0))].forEach(id => {
            const e = store[id];
            if (e && now - e[1] < TTL) result[id] = e[0];
            else need.push(id);
        });

        // jeden průchod přes všechna chybějící ID (po dávkách, max. 2 souběžně)
        async function pass(list, fresh) {
            const batches = [];
            for (let i = 0; i < list.length; i += BATCH) batches.push(list.slice(i, i + BATCH));
            const found = {};
            let k = 0;
            await Promise.all([0, 1].map(async () => {
                while (k < batches.length) {
                    const b = batches[k++];
                    Object.assign(found, await fetchBatch(worker, b, size, circ, fresh));
                }
            }));
            const t = Date.now();
            Object.keys(found).forEach(id => { store[id] = [found[id], t]; result[id] = found[id]; });
            if (Object.keys(found).length) writeStore(size, circ, store);
            return found;
        }

        if (need.length) await pass(need, false);
        need = need.filter(id => !result[id]);

        if (!need.length) { onDone(result, []); return result; }

        // opakování chybějících na pozadí
        (async () => {
            for (let round = 0; round < 4 && need.length; round++) {
                await sleep(1500 * Math.pow(2, round));
                const got = await pass(need, true);
                if (Object.keys(got).length) onUpdate(got);
                need = need.filter(id => !result[id]);
            }
            onDone(result, need);
        })();

        return result;
    }

    window.PS99Avatars = { load };
})();

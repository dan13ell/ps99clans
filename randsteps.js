/* Náhodné skoky bodů (Compare, Live tracker, OBS overlay, Live Top 500)
 *
 * Přírůstek z API se nerozdělí na stejné díly, ale na několik náhodně velkých kousků
 * (většina menších, občas velký skok) v náhodných časech, rozprostřených do doby,
 * než nejspíš přijdou další data. Součet vždy přesně sedí.
 *
 *   const cancel = RandSteps.run(delta, spanMs, (part, isLast, isBig) => { ... }, opts)
 *   opts: { minGap: 1600, minTicks: 7, maxTicks: 16, firstNow: true }
 *
 *   const iv = RandSteps.interval();  iv.mark();  iv.get()   // měření, jak často API přináší nové body
 */
(function () {
    "use strict";

    function parts(total, n) {
        const w = [];
        for (let i = 0; i < n; i++) w.push(Math.pow(-Math.log(1 - Math.random() * 0.999), 1.7) + 0.05);
        const sum = w.reduce((a, b) => a + b, 0);
        const p = w.map((x) => Math.floor(total * x / sum));
        p[p.length - 1] += total - p.reduce((a, b) => a + b, 0);
        return p.filter((x) => x > 0);
    }

    function run(delta, span, onTick, opts) {
        opts = opts || {};
        const minGap = opts.minGap || 1600, minT = opts.minTicks || 7, maxT = opts.maxTicks || 16;
        delta = Math.round(delta);
        if (delta <= 0) { onTick(Math.max(0, delta), true, false); return function () {}; }
        span = Math.max(minGap, span * 0.92);
        let n = Math.round(minT + Math.random() * (maxT - minT));
        n = Math.max(1, Math.min(n, Math.floor(span / minGap), delta));
        const ps = parts(delta, n);
        const avg = delta / ps.length;
        const times = [opts.firstNow === false ? Math.random() * span * 0.5 : 0];   // firstNow:false = i první skok v náhodný čas
        for (let i = 1; i < ps.length; i++) times.push(Math.random() * span);
        times.sort((a, b) => a - b);
        for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] < minGap) times[i] = times[i - 1] + minGap;
        let alive = true;
        const timers = ps.map((p, i) => setTimeout(() => {
            if (alive) onTick(p, i === ps.length - 1, p > avg * 2.2);
        }, times[i]));
        return function cancel() { alive = false; timers.forEach(clearTimeout); };
    }

    // průměrná doba mezi změnami bodů (posledních 6 změn), výchozí 60 s
    function interval(def, min, max) {
        def = def || 60000; min = min || 15000; max = max || 90000;
        const h = [];
        return {
            mark() { h.push(Date.now()); if (h.length > 6) h.shift(); },
            reset() { h.length = 0; },
            get() {
                if (h.length < 2) return def;
                let s = 0;
                for (let i = 1; i < h.length; i++) s += h[i] - h[i - 1];
                return Math.max(min, Math.min(max, s / (h.length - 1)));
            }
        };
    }

    window.RandSteps = { run, interval, parts };
})();

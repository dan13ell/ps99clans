// Adsterra native reklamy v seznamech (Top Clans, Leagues).
// Stránka volá PS99Ads.park() těsně před přepsáním seznamu (list.innerHTML = …)
// a PS99Ads.place({ filtered, page }) po vykreslení.
//
// Jedna Native Banner zóna (layout 1:3) pošle do jednoho kontejneru 3 reklamy pod sebou.
// Kontejner je ve slotu za 3. kartou. 1. reklama tam zůstane, 2. a 3. se jen VIZUÁLNĚ
// posadí (position: absolute) na volná místa ("spacery") uprostřed a na konci seznamu.
// V DOM zůstávají pořád v kontejneru Adsterry → jejich měření zobrazení/kliků funguje.
(function () {
    const ZONE = { id: "397e914f0279aa3d22964f8659debbab", src: "https://bicea.org/21/397e914f0279aa3d22964f8659debbab" };
    const TOP_AFTER_ROW = 3;      // 1. reklama za 3. kartou
    const MIDDLE_MIN_ROWS = 20;   // 2. reklama (prostředek) jen když je karet aspoň tolik
    const BOTTOM_MIN_ROWS = 10;   // 3. reklama (níž v seznamu) jen když je karet aspoň tolik
    const BOTTOM_AT = 0.85;       // 3. reklama za 85 % seznamu (ze 100 karet za #85), ne úplně na konci

    let slot = null;
    const spacers = [];           // [prostřední, dolní]
    let filteredNow = false;

    function listEl() { return document.getElementById("clanCardsList"); }

    function newBox(loading) {
        const box = document.createElement("div");
        box.id = "container-" + ZONE.id;
        box.className = "ad-box" + (loading ? " ad-box-loading" : "");
        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("data-cfasync", "false");
        script.src = ZONE.src;
        // stejné pořadí jako v kódu od Adsterry: <script>, pak kontejner
        slot.appendChild(script);
        slot.appendChild(box);
        return box;
    }

    function createSlots() {
        const list = listEl();
        if (!list || slot) return;
        slot = document.createElement("div");
        slot.className = "ad-slot ad-parked";
        slot.id = "adSlot";
        list.parentNode.insertBefore(slot, list);
        newBox(false);
        for (let i = 0; i < 2; i++) {
            const sp = document.createElement("div");
            sp.className = "ad-spacer";
            spacers.push(sp);
        }
        watch();
    }

    // ---------- nová strana = nové reklamy ----------
    // Stará reklama zůstane vidět, nová se načítá skrytě vedle. Až Adsterra novou opravdu
    // vykreslí, staré se zbavíme. Když nic nepřijde, stará zůstane (nikdy nic nezmizí).
    const REFRESH_TIMEOUT = 8000;
    let pending = null;

    function refresh() {
        if (!slot || pending) return;
        const old = slot.querySelector(".ad-box:not(.ad-box-loading)");
        if (!old || !boxHasAd(old)) {               // nic tam není → prostě načíst znovu
            slot.textContent = "";
            newBox(false);
            return;
        }
        old.id = "container-" + ZONE.id + "-old";
        slot.querySelectorAll("script").forEach(sc => sc.remove());
        const box = newBox(true);
        pending = { old, box, timer: setTimeout(() => finishRefresh(false), REFRESH_TIMEOUT) };
    }

    function boxHasAd(box) {
        return !!box.querySelector(".ad-card") || [...box.querySelectorAll("*")].some(el =>
            !["SCRIPT", "STYLE", "LINK", "NOSCRIPT"].includes(el.tagName) &&
            (el.shadowRoot || el.tagName === "IFRAME" || (el.offsetWidth > 2 && el.offsetHeight > 2)));
    }

    function finishRefresh(gotNew) {
        if (!pending) return;
        const p = pending;
        pending = null;
        clearTimeout(p.timer);
        if (gotNew) {
            p.old.remove();
            p.box.classList.remove("ad-box-loading");
        } else {
            p.box.remove();
            p.old.id = "container-" + ZONE.id;
        }
        updateState();
    }

    // ---------- umístění ----------
    function park() {
        const list = listEl();
        if (!list || !slot) return;
        slot.classList.add("ad-parked");
        if (slot.parentNode === list) list.parentNode.insertBefore(slot, list);
        spacers.forEach(sp => sp.remove());
        layoutFloats();
    }

    let lastPage = null;

    function place(opts) {
        createSlots();
        const list = listEl();
        if (!list || !slot) return;
        const filtered = !!(opts && opts.filtered);
        const page = opts && opts.page !== undefined ? String(opts.page) : null;
        const rows = list.querySelectorAll(":scope > .clan-row");
        const n = rows.length;
        park();
        filteredNow = filtered;

        // jiná strana (bez hledání) → zkusit načíst nové reklamy
        if (!filtered && page !== null) {
            if (lastPage !== null && page !== lastPage) refresh();
            lastPage = page;
        }

        if (!n) return;   // žádné výsledky → žádná reklama (a nikdy ne nad první kartou)

        // 1. reklama: za 3. kartou, při hledání/málo výsledcích za poslední kartou
        const topAt = Math.min(TOP_AFTER_ROW, n);
        rows[topAt - 1].insertAdjacentElement("afterend", slot);
        slot.classList.remove("ad-parked");

        // při hledání / filtru jen jedna reklama
        if (!filtered) {
            const midAt = Math.round(n / 2);
            const midOn = n >= MIDDLE_MIN_ROWS && midAt > topAt;
            if (midOn) rows[midAt - 1].insertAdjacentElement("afterend", spacers[0]);
            const botAt = Math.round(n * BOTTOM_AT);
            if (n >= BOTTOM_MIN_ROWS && botAt > topAt && (!midOn || botAt > midAt)) rows[botAt - 1].insertAdjacentElement("afterend", spacers[1]);
        }
        layoutFloats();
    }

    // 2. a 3. reklamu posadí na místa spacerů; přebytečné (nebo při hledání) schová
    function layoutFloats() {
        if (!slot) return;
        const list = listEl();
        const shown = slot.querySelector(".ad-box:not(.ad-box-loading)");
        const cards = shown ? [...shown.querySelectorAll(".ad-card")].filter(c => !c.parentElement.closest(".ad-card")) : [];
        const free = spacers.filter(sp => sp.parentNode === list && !slot.classList.contains("ad-parked"));
        spacers.forEach(sp => sp.classList.remove("ad-spacer-on"));

        cards.forEach((card, i) => {
            card.classList.remove("ad-card-float", "ad-card-hidden");
            card.style.removeProperty("top");
            if (i === 0) return;
            const sp = free[i - 1];
            if (!sp || filteredNow) { card.classList.add("ad-card-hidden"); return; }
            sp.classList.add("ad-spacer-on");
            card.classList.add("ad-card-float");
            card.style.setProperty("top", sp.offsetTop + "px", "important");
        });
    }

    // ---------- rozpoznání a úprava reklamy ----------
    function ownText(el) {
        let t = "";
        el.childNodes.forEach(n => { if (n.nodeType === 3) t += n.textContent; });
        return t.replace(/\s+/g, " ").trim();
    }
    function hasBgImage(el) {
        const bg = getComputedStyle(el).backgroundImage;
        return bg && bg !== "none" && bg.includes("url(");
    }
    function cls(el) { return typeof el.className === "string" ? el.className : ""; }

    // texty ovládání reklamy (menu "Report Ad", "Cancel", křížek…) – nikdy nejsou nadpis ani podnadpis
    const AD_UI_TEXT = /^(cancel|report( this)?( ad)?|close|hide( ad)?|ad|ads|advert|advertisement|sponsored|why this ad\??|x|×|✕|✖|i|ⓘ|\.{3}|…|submit|send|ok|back)$/i;
    const AD_UI_CLASS = /report|menu|close|popup|modal|overlay|option|feedback|cancel|dots|complain|abuse|dialog/i;
    const AD_TITLE_CLASS = /title|head|name|caption/i;
    const AD_DESC_CLASS = /desc|text|body|sub|brand|domain|site|content|summary/i;

    function isAdUi(el, item) {
        if (AD_UI_TEXT.test(ownText(el))) return true;
        for (let p = el; p && p !== item; p = p.parentElement) if (AD_UI_CLASS.test(cls(p))) return true;
        return false;
    }
    function textEls(item) {
        return [...item.querySelectorAll("*")].filter(el =>
            el.tagName !== "STYLE" && el.tagName !== "SCRIPT" && !el.classList.contains("ad-card-own") && ownText(el).length > 0);
    }
    function goodTextEls(item) { return textEls(item).filter(el => !isAdUi(el, item)); }

    // velikost obrázku pro výběr hlavního (nenačtený <img> bereme jako skutečný obrázek, pixel 1×1 ne)
    function picArea(el) {
        if (el.tagName === "IMG") {
            if (el.complete && el.naturalWidth) return el.naturalWidth * el.naturalHeight;
            const w = +el.getAttribute("width") || 0, h = +el.getAttribute("height") || 0;
            if ((w && w <= 2) || (h && h <= 2)) return 1;
            return 10000;
        }
        return (el.offsetWidth * el.offsetHeight) || 1;
    }

    function markImageReady(pic) {
        if (pic.tagName !== "IMG") { pic.classList.add("ad-img-ready"); return; }
        if (pic.complete && pic.naturalWidth) { pic.classList.add("ad-img-ready"); return; }
        pic.classList.remove("ad-img-ready");
        pic.loading = "eager";
        if (!pic.dataset.adWait) {
            pic.dataset.adWait = "1";
            pic.addEventListener("load", () => { pic.classList.add("ad-img-ready"); delete pic.dataset.adWait; }, { once: true });
            pic.addEventListener("error", () => { pic.classList.add("ad-img-ready"); delete pic.dataset.adWait; }, { once: true });
        }
    }

    function styleItems(slot) {
        slot.querySelectorAll(".ad-box").forEach(styleBox);
    }

    function styleBox(box) {
        const pics = [...box.querySelectorAll("img")].concat(
            [...box.querySelectorAll("div, span, a, i")].filter(el => !el.querySelector("img") && hasBgImage(el)));

        // nejmenší předek obrázku, který obsahuje skutečný text reklamy = jedna reklama
        const items = new Map();
        pics.forEach(pic => {
            let item = pic.parentElement;
            while (item && item !== box && !goodTextEls(item).length) item = item.parentElement;
            if (!item || item === box) return;
            if (!items.has(item)) items.set(item, []);
            items.get(item).push(pic);
        });

        items.forEach((itemPics, item) => {
            if (item.parentElement && item.parentElement.closest(".ad-card")) return; // vnořené ne
            item.classList.add("ad-card");

            // hlavní obrázek = největší (ne měřicí pixel ani ikonka)
            itemPics.forEach(p => p.classList.remove("ad-card-img"));
            const mainPic = itemPics.sort((a, b) => picArea(b) - picArea(a))[0];
            mainPic.classList.add("ad-card-img");
            markImageReady(mainPic);

            if (item.dataset.adStyled) return;
            item.dataset.adStyled = "1";

            const good = goodTextEls(item);
            const unrelated = (a, b) => a !== b && !a.contains(b) && !b.contains(a);
            const title = good.find(el => AD_TITLE_CLASS.test(cls(el))) || good[0];
            const desc = good.find(el => title && unrelated(el, title) && AD_DESC_CLASS.test(cls(el)))
                      || good.find(el => title && unrelated(el, title));

            textEls(item).forEach(el => {
                if (el === title) el.classList.add("ad-card-title");
                else if (el === desc) el.classList.add("ad-card-desc");
                else if (!(title && (title.contains(el) || el.contains(title))) &&
                         !(desc && (desc.contains(el) || el.contains(desc)))) el.classList.add("ad-card-extra");
            });

            // reklama nemá podnadpis → neutrální text, aby karta nebyla prázdná
            if (!desc) {
                const own = document.createElement("span");
                own.className = "ad-card-desc ad-card-own";
                own.textContent = "Sponsored · Click to learn more";
                item.appendChild(own);
            }
            if (!item.title && title) item.title = ownText(title);

            // když je karta <div> s odkazem uvnitř, klik kamkoli na kartu otevře reklamní odkaz
            if (item.tagName !== "A") {
                item.addEventListener("click", (e) => {
                    if (e.target.closest("a")) return;
                    const link = (title && title.closest("a[href]")) || mainPic.closest("a[href]") ||
                        [...item.querySelectorAll("a[href]")].find(a => !isAdUi(a, item));
                    if (link) link.click();
                });
            }
        });
    }

    function updateState() {
        if (!slot) return;
        styleItems(slot);
        if (pending && boxHasAd(pending.box)) { finishRefresh(true); return; }
        const shown = slot.querySelector(".ad-box:not(.ad-box-loading)");
        slot.classList.toggle("ad-filled", !!shown && boxHasAd(shown));
        slot.classList.toggle("ad-styled", !!shown && !!shown.querySelector(".ad-card"));
        layoutFloats();
    }

    function watch() {
        let busy = false;
        const run = () => {
            if (busy) return;
            busy = true;
            setTimeout(() => { busy = false; updateState(); }, 60);
        };
        // jen změny od Adsterry (naše vlastní třídy a "top" u plovoucích karet ignorujeme)
        new MutationObserver(run).observe(slot, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
        slot.addEventListener("load", run, true);
        setTimeout(run, 3000);
        setTimeout(run, 8000);
    }

    // Ladění: v konzoli prohlížeče napiš  adDebug()  a výsledek pošli.
    window.adDebug = function () {
        const walk = (el, d) => {
            let line = "  ".repeat(d) + "<" + el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
                (cls(el).trim() ? "." + cls(el).trim().split(/\s+/).join(".") : "") +
                (el.shadowRoot ? " [shadow]" : "") + (el.src ? " src=" + String(el.src).slice(0, 60) : "") +
                " " + el.offsetWidth + "x" + el.offsetHeight + ">" +
                (el.childElementCount ? "" : " " + (el.textContent || "").trim().slice(0, 40)) + "\n";
            for (const ch of el.children) line += walk(ch, d + 1);
            if (el.shadowRoot) for (const ch of el.shadowRoot.children) line += walk(ch, d + 1);
            return line;
        };
        const out = (slot ? "parent: " + (slot.parentNode ? slot.parentNode.id : "-") + " | class: " + slot.className + "\n" + walk(slot, 0) : "no slot") +
            "\nspacers: " + spacers.map(sp => (sp.parentNode ? "in list @" + sp.offsetTop : "off") + (sp.classList.contains("ad-spacer-on") ? " on" : "")).join(", ") +
            "\nbody iframes: " + [...document.querySelectorAll("iframe")].map(f => f.src.slice(0, 60)).join(", ");
        console.log(out);
        return out;
    };

    window.PS99Ads = { park, place };

    // ads.js se načítá až za HTML seznamu, takže sloty jdou vytvořit hned
    if (listEl()) createSlots();
    else document.addEventListener("DOMContentLoaded", createSlots);
})();

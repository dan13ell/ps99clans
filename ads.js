// Adsterra native reklamy v seznamech (Top Clans, Leagues).
// Stránka volá PS99Ads.park() těsně před přepsáním seznamu (list.innerHTML = …)
// a PS99Ads.place({ filtered }) po vykreslení. Sloty se nikdy nemažou, jen přesouvají,
// takže reklama od Adsterry zůstane načtená a měření zobrazení/kliků je pořád jejich.
(function () {
    // Každá zóna = jedna reklama. Jedna zóna nejde na stránku dát dvakrát,
    // proto dolní reklama potřebuje vlastní (druhou) Native Banner zónu z Adsterry.
    const ZONES = [
        { id: "397e914f0279aa3d22964f8659debbab", src: "https://bicea.org/21/397e914f0279aa3d22964f8659debbab" },
        // { id: "…", src: "https://…/21/…" },   // ← druhá zóna (dolní reklama)
    ];
    const TOP_AFTER_ROW = 3;      // horní reklama za 3. kartou
    const BOTTOM_MIN_ROWS = 10;   // dolní reklama (na konci seznamu) jen když je karet aspoň tolik

    const slots = [];

    function listEl() { return document.getElementById("clanCardsList"); }

    function createSlots() {
        const list = listEl();
        if (!list || slots.length) return;
        ZONES.forEach((zone, i) => {
            const slot = document.createElement("div");
            slot.className = "ad-slot ad-parked";
            slot.id = i === 0 ? "adSlot" : "adSlot" + (i + 1);

            const script = document.createElement("script");
            script.async = true;
            script.setAttribute("data-cfasync", "false");
            script.src = zone.src;

            const box = document.createElement("div");
            box.id = "container-" + zone.id;
            box.className = "ad-box";

            // stejné pořadí jako v kódu od Adsterry: <script> a hned za ním kontejner
            slot.appendChild(box);
            slot.insertBefore(script, box);
            list.parentNode.insertBefore(slot, list);
            slots.push(slot);
            watch(slot);
        });
    }

    // ---------- umístění ----------
    function park() {
        const list = listEl();
        if (!list) return;
        slots.forEach(slot => {
            slot.classList.add("ad-parked");
            if (slot.parentNode === list) list.parentNode.insertBefore(slot, list);
        });
    }

    function place(opts) {
        createSlots();
        const list = listEl();
        if (!list) return;
        const filtered = !!(opts && opts.filtered);
        const rows = list.querySelectorAll(":scope > .clan-row");
        const n = rows.length;
        park();
        if (!n) return;   // žádné výsledky → žádná reklama (a nikdy ne nad první kartou)

        // horní: za 3. kartou, při hledání/málo výsledcích za poslední kartou
        const top = slots[0];
        if (top) {
            rows[Math.min(TOP_AFTER_ROW, n) - 1].insertAdjacentElement("afterend", top);
            top.classList.remove("ad-parked");
        }
        // dolní: na konci seznamu, jen bez hledání a s dost kartami
        const bottom = slots[1];
        if (bottom && !filtered && n >= BOTTOM_MIN_ROWS) {
            rows[n - 1].insertAdjacentElement("afterend", bottom);
            bottom.classList.remove("ad-parked");
        }
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
        const box = slot.querySelector(".ad-box");
        if (!box) return;
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

    function updateState(slot) {
        styleItems(slot);
        const box = slot.querySelector(".ad-box");
        const visible = !!box && [...box.querySelectorAll("*")].some(el =>
            !["SCRIPT", "STYLE", "LINK", "NOSCRIPT"].includes(el.tagName) &&
            (el.shadowRoot || el.tagName === "IFRAME" || (el.offsetWidth > 2 && el.offsetHeight > 2)));
        slot.classList.toggle("ad-filled", visible);
        slot.classList.toggle("ad-styled", !!slot.querySelector(".ad-card"));
    }

    function watch(slot) {
        let pending = false;
        const run = () => {
            if (pending) return;
            pending = true;
            setTimeout(() => { pending = false; updateState(slot); }, 60);
        };
        new MutationObserver(run).observe(slot, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "style"] });
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
        const out = slots.map(s => "parent: " + (s.parentNode ? s.parentNode.id : "-") + " | class: " + s.className + "\n" + walk(s, 0)).join("\n") +
            "\nbody iframes: " + [...document.querySelectorAll("iframe")].map(f => f.src.slice(0, 60)).join(", ");
        console.log(out);
        return out;
    };

    window.PS99Ads = { park, place };

    // ads.js se načítá až za HTML seznamu, takže sloty jdou vytvořit hned
    if (listEl()) createSlots();
    else document.addEventListener("DOMContentLoaded", createSlots);
})();

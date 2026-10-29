/* PS99 Clans – sdílené drobnosti pro obsah pod hlavním oknem
 *  - malé tlačítko „Guide & FAQ ↓", které zmizí po posunutí
 *  - reklamy na stránkách s daty (clan/league/player detail) se načtou až po úspěšném
 *    zobrazení dat – nikdy na prázdné / chybové obrazovce
 *  - živé údaje v textu (aktuální válka, top klany) z workeru
 */
(function () {
    "use strict";

    var WORKER_URL = "https://rough-pine-d90f.ps99clans.workers.dev";
    var ADS_CLIENT = "ca-pub-5302554896051137";
    var root = document.documentElement;

    // ---------------- reklamy ----------------
    var adsLoaded = !!document.querySelector('script[src*="adsbygoogle.js"]');
    function loadAds() {
        if (adsLoaded) return;
        adsLoaded = true;
        var s = document.createElement("script");
        s.async = true;
        s.crossOrigin = "anonymous";
        s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADS_CLIENT;
        document.head.appendChild(s);
    }
    // stránka s daty zavolá PS99Site.contentReady() po vykreslení, PS99Site.notFound() při chybě
    function contentReady() {
        if (root.getAttribute("data-ads") === "defer") loadAds();
    }
    function notFound() {
        var m = document.querySelector('meta[name="robots"]');
        if (!m) { m = document.createElement("meta"); m.name = "robots"; document.head.appendChild(m); }
        m.content = "noindex, follow";
    }

    // ---------------- nápověda „níž je návod" ----------------
    function addPeek() {
        if (!root.classList.contains("sc-page")) return;
        var target = document.getElementById("guide");
        if (!target) return;
        var a = document.createElement("a");
        a.className = "sc-peek";
        a.href = "#guide";
        a.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v10M3.5 7.8 8 12.3l4.5-4.5" fill="none" stroke="#000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span>' + (target.getAttribute("data-peek") || "Guide & FAQ") + '</span>';
        document.body.appendChild(a);
        var gone = false;
        function upd() {
            // schovat po posunutí, nebo když je text vidět už na první obrazovce (mobil)
            var g = (window.scrollY || window.pageYOffset || 0) > 80 ||
                target.getBoundingClientRect().top < window.innerHeight - 140;
            if (g !== gone) { gone = g; a.classList.toggle("is-gone", g); }
        }
        window.addEventListener("scroll", upd, { passive: true });
        window.addEventListener("resize", upd);
        upd();
    }

    // ---------------- živé údaje v textu ----------------
    function fmtTime(sec) {
        sec = Math.max(0, Math.floor(sec));
        var d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
        return (d ? d + "d " : "") + h + "h " + m + "m";
    }
    function prettyBattle(n) {
        return String(n || "").replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/\s+/g, " ").trim();
    }
    function short(n) {
        n = Number(n) || 0;
        var u = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
        for (var i = 0; i < u.length; i++) if (n >= u[i][0]) return (n / u[i][0]).toFixed(n / u[i][0] >= 100 ? 0 : 1) + u[i][1];
        return String(n);
    }
    function liveBits() {
        var bEls = document.querySelectorAll("[data-sc-battle]");
        if (bEls.length) {
            fetch(WORKER_URL + "/activeClanBattle").then(function (r) { return r.json(); }).then(function (j) {
                var d = j && j.data;
                if (!d || !d.configName) return;
                var now = Date.now() / 1000, txt;
                if (d.StartTime > now) txt = prettyBattle(d.configName) + " starts in " + fmtTime(d.StartTime - now);
                else if (d.FinishTime > now) txt = prettyBattle(d.configName) + " · ends in " + fmtTime(d.FinishTime - now);
                else txt = prettyBattle(d.configName) + " has ended";
                bEls.forEach(function (el) { el.textContent = txt; el.parentNode.hidden = false; });
            }).catch(function () {});
        }
        var tEl = document.querySelector("[data-sc-top]");
        if (tEl) {
            var n = parseInt(tEl.getAttribute("data-sc-top"), 10) || 5;
            fetch(WORKER_URL + "/clans?page=1&pageSize=" + n + "&sort=Points&sortOrder=desc").then(function (r) { return r.json(); }).then(function (j) {
                if (!j || !Array.isArray(j.data) || !j.data.length) return;
                tEl.innerHTML = "";
                j.data.slice(0, n).forEach(function (c) {
                    var li = document.createElement("li");
                    var a = document.createElement("a");
                    a.className = "nm";
                    a.href = "/clan-detail/?name=" + encodeURIComponent(c.Name);
                    a.textContent = "[" + c.Name + "]";
                    var p = document.createElement("span");
                    p.className = "pt";
                    p.textContent = short(c.Points) + " pts";
                    li.appendChild(a); li.appendChild(p);
                    tEl.appendChild(li);
                });
                tEl.parentNode.hidden = false;
            }).catch(function () {});
        }
    }

    // výška první obrazovky: mění se jen při změně šířky / otočení, ne když mobil schová lištu
    var lastW = 0;
    function setStage(force) {
        var w = window.innerWidth, h = window.innerHeight;
        if (!force && w === lastW && root.style.getPropertyValue("--sc-vh")) return;
        lastW = w;
        // stejné měřítko jako autoFitScreen() na stránkách (okno 1120 x 960, 92 %)
        var sc = w >= 1150 ? 1 : Math.min(w / 1120, h / 960) * 0.92;
        // na mobilu na výšku je okno malé -> první obrazovka jen tak vysoká, aby se okno i lišta vešly,
        // a text začíná hned pod ním (žádná prázdná modrá plocha)
        var need = Math.round(960 * sc + 70);
        root.style.setProperty("--sc-vh", Math.min(h, Math.max(need, 300)) + "px");
    }
    if (root.classList.contains("sc-page")) {
        setStage();
        window.addEventListener("resize", setStage);
        window.addEventListener("orientationchange", function () { setTimeout(function () { setStage(true); }, 250); });
    }

    function init() {
        addPeek();
        liveBits();
        var y = document.querySelectorAll("[data-sc-year]");
        for (var i = 0; i < y.length; i++) y[i].textContent = new Date().getFullYear();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();

    window.PS99Site = { loadAds: loadAds, contentReady: contentReady, notFound: notFound };
})();

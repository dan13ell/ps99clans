// Spodní lišta s tlačítky (hotbar) pod hlavním oknem – styl a animace podle PS99 HUD.
// Nové tlačítko = přidej jeden řádek do BUTTONS níže.
(function () {
  // ===================== TLAČÍTKA =====================
  // label  – popisek, který se ukáže nad ikonou při najetí myší
  // icon   – obrázek ikony (PNG s průhledným pozadím, ideálně ~200x200 px)
  // badge  – volitelný odznak vlevo nahoře: "NEW", "999+", "3" ...
  // href   – kam vede (nebo onClick: function () { ... })
  // newTab – true = otevře se v nové záložce
  const BUTTONS = [
    // activeOn – na kterých stránkách je tlačítko "aktivní" (zvětšené, klik nic nedělá)
    { id: "clans",   label: "Clans",   icon: "/images/hotbar/clans.png",  href: "/",
      activeOn: (p) => !p.startsWith("/compare/") && !p.startsWith("/live-placement/") && !p.startsWith("/overlays/") }, // všechny stránky klanů
    { id: "compare", label: "Compare", icon: "/images/hotbar/compare.png", href: "/compare/",
      activeOn: (p) => p.startsWith("/compare/") },
    { id: "live",    label: "Live Placement", icon: "/images/hotbar/live.png", href: "/live-placement/",
      activeOn: (p) => p.startsWith("/live-placement/") },
    { id: "obs",     label: "OBS Overlays", icon: "/images/hotbar/obs.png", href: "/overlays/",
      activeOn: (p) => p.startsWith("/overlays/") },
    // { id: "discord", label: "Discord", icon: "/images/hotbar/discord.png", badge: "NEW", href: "https://discord.gg/...", newTab: true },
  ];
  // ====================================================

  const SIZE = 94;            // výška ikon v px
  const HOVER_SCALE = 1.04;  // hover zvětšení (roste nahoru)
  const PRESS_SCALE = 0.95;  // stisk (zmenšení ke spodní hraně)
  const ACTIVE_SCALE = 1.10; // tlačítko aktuální stránky je trvale větší
  const ANIM = "transform 0.045s cubic-bezier(0.1, 0.9, 0.2, 1)"; // najetí i vyjetí

  const css = document.createElement("style");
  css.textContent = `
    /* hlavní okno trochu nahoru (na všech stránkách) */
    .game-window { transform: translateY(calc(var(--hb-lift, 0) * -1px)); }

    /* Lišta visí absolutně pod oknem -> hlavní okno se kvůli ní neposune */
    .ps-hotbar {
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      width: max-content;
      margin-top: 0;                 /* dopočítává se v lift() – stejná mezera nad i pod */
      padding: 30px 30px 30px;
      gap: 12px;
      z-index: 800;
    }
    .ps-hotbar:empty { display: none; }
    /* stránky bez hlavního okna (Live Placement): lišta je normálně v toku stránky */
    .ps-hotbar.ps-hb-inline {
      position: relative;
      left: auto;
      top: auto;
      transform: none;
      padding: 26px 30px 16px;
    }
    /* měkká bílá záře za řadou ikon */
    .ps-hotbar::before {
      content: "";
      position: absolute;
      inset: -30px -90px -30px;
      background: radial-gradient(closest-side at 50% 55%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%);
      pointer-events: none;
      z-index: -1;
    }

    .ps-hb-btn {
      text-decoration: none;
      position: relative;
      width: auto;                    /* všechny ikony mají stejnou výšku */
      height: ${SIZE}px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transform-origin: 50% 100%;     /* zvětšuje/zmenšuje se nahoru od spodní hrany */
      transition: ${ANIM};
      will-change: transform;
    }
    .ps-hb-btn.hb-hover { z-index: 2; }
    .ps-hb-btn.hb-active { cursor: default; }

    .ps-hb-icon {
      display: block;
      width: auto;
      height: 100%;
      pointer-events: none;
      -webkit-user-drag: none;
      /* jemný odraz pod ikonou */
      -webkit-box-reflect: below -4px linear-gradient(transparent 74%, rgba(255,255,255,0.13));
    }

    .ps-hb-label {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 1px);
      transform: translateX(-50%);
      white-space: nowrap;
      font-size: 17px;
      line-height: 1;
      font-weight: 700 !important;
      color: #1C2130;
      letter-spacing: 0.2px;
      pointer-events: none;
      visibility: hidden;             /* popisek se ukazuje okamžitě, bez fade */
    }
    .ps-hb-btn.hb-hover .ps-hb-label { visibility: visible; }

    .ps-hb-badge {
      position: absolute;
      left: -10px;
      top: -6px;
      min-width: 40px;
      height: 40px;
      padding: 0 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      background: radial-gradient(circle at 50% 35%, #FF4A6E 0%, #E8164A 70%);
      border: 3px solid #FFFFFF;
      box-shadow: 0 0 0 2.5px #1C2130, 0 2px 3px rgba(0,0,0,0.25);
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 800 !important;
      -webkit-text-stroke: 3px #1C2130;
      paint-order: stroke fill;
      pointer-events: none;
      z-index: 3;
    }
    .ps-hb-badge.is-pill { height: 26px; min-width: 0; top: 2px; padding: 0 7px; border-width: 2.5px; }

  `;
  document.head.appendChild(css);

  const items = []; // { el, active, hover, down }

  function isActive(b) {
    if (typeof b.activeOn === "function") return !!b.activeOn(location.pathname);
    const href = b.href;
    if (!href || /^https?:/i.test(href)) return false;
    const norm = (x) => x.replace(/index\.html$/, "").replace(/\/?$/, "/");
    const here = norm(location.pathname), target = norm(href);
    return target === "/" ? here === "/" : here.startsWith(target);
  }

  // Spočítá měřítko každého tlačítka a posun sousedů, aby se odsunuly v souladu s animací
  function layout(animate) {
    const scales = items.map((it) => {
      let s = it.active ? ACTIVE_SCALE : 1;
      if (it.down) s *= PRESS_SCALE;
      else if (it.hover) s *= HOVER_SCALE;
      return s;
    });
    const extra = items.map((it, i) => it.el.offsetWidth * (scales[i] - 1) / 2); // o kolik přesahuje na každou stranu
    items.forEach((it, k) => {
      let shift = 0;
      for (let j = 0; j < items.length; j++) {
        if (j < k) shift += extra[j];
        else if (j > k) shift -= extra[j];
      }
      it.el.style.transition = animate ? "" : "none";
      it.el.style.transform = `translateX(${shift.toFixed(2)}px) scale(${scales[k]})`;
    });
    if (!animate) {
      void document.body.offsetWidth;
      items.forEach((it) => (it.el.style.transition = ""));
    }
  }

  function wire(it, b) {
    const btn = it.el;
    const setHover = (v) => { it.hover = v; btn.classList.toggle("hb-hover", v); };

    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      setHover(true); layout(true);
    });
    btn.addEventListener("pointerleave", () => {
      setHover(false); it.down = false; layout(true);
    });
    btn.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      it.down = true;
      if (e.pointerType === "touch") setHover(true);
      layout(false);                   // stisk je okamžitý (jako v PS99)
    });
    const release = (e) => {
      if (!it.down) return;
      it.down = false;
      if (e && e.pointerType === "touch") setHover(false);
      layout(false);                   // puštění je okamžité
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);

    btn.addEventListener("click", (e) => {
      if (it.active) { e.preventDefault(); return; }   // už jsem na té stránce -> nic nedělat
      if (typeof b.onClick === "function") { e.preventDefault(); return b.onClick(); }
      // jinak normální odkaz (href)
    });
  }

  function build() {
    // .game-window = klasické stránky; .ps-hotbar-host = stránka bez hlavního okna
    const host = document.querySelector(".ps-hotbar-host");
    const win = document.querySelector(".game-window") || host;
    if (!win || win.querySelector(".ps-hotbar")) return;

    const bar = document.createElement("div");
    bar.className = "ps-hotbar" + (win === host ? " ps-hb-inline" : "");
    if (document.querySelector(".country-toggle-arrow")) bar.classList.add("ps-hb-has-arrow");

    BUTTONS.forEach((b) => {
      // skutečný odkaz (<a href>) – vyhledávače a čtečky vidí navigaci
      const btn = document.createElement(b.href ? "a" : "div");
      btn.className = "ps-hb-btn";
      if (b.id) btn.id = "hb-" + b.id;
      if (b.href) {
        btn.href = b.href;
        btn.style.display = "block";
        if (b.newTab) { btn.target = "_blank"; btn.rel = "noopener"; }
        btn.draggable = false;
      } else btn.setAttribute("role", "button");
      btn.setAttribute("aria-label", b.label || "");

      const img = document.createElement("img");
      img.className = "ps-hb-icon";
      img.src = b.icon;
      img.alt = "";
      img.draggable = false;
      img.addEventListener("load", () => layout(false));
      btn.appendChild(img);

      if (b.label) {
        const l = document.createElement("span");
        l.className = "ps-hb-label";
        l.textContent = b.label;
        btn.appendChild(l);
      }
      if (b.badge) {
        const d = document.createElement("span");
        d.className = "ps-hb-badge" + (/^[A-Za-z]{3,}$/.test(b.badge) ? " is-pill" : "");
        d.textContent = b.badge;
        btn.appendChild(d);
      }

      const it = { el: btn, active: isActive(b), hover: false, down: false };
      if (it.active) btn.classList.add("hb-active");
      items.push(it);
      wire(it, b);
      bar.appendChild(btn);
    });

    // Lišta je uvnitř okna (škáluje se s ním), ale absolutně pod ním
    win.appendChild(bar);
    layout(false);
  }

  // Hlavní okno zůstává přesně uprostřed a lišta je přesně v půlce mezi oknem a spodkem stránky.
  // Když na to není místo, okno se posune nahoru jen o tolik, kolik je potřeba (logo nesmí vyjet).
  const PAD_TOP = 30;   // horní padding lišty (místo pro popisek)
  function lift() {
    const win = document.querySelector(".game-window");
    const bg = win && win.querySelector(".menu-bg");
    const bar = win && win.querySelector(".ps-hotbar");
    if (!bg || !bar) return;
    // Stránka, která se scrolluje (např. Compare): lišta je prostě pod celým obsahem okna
    if (document.body.dataset.hotbar === "flow") {
      const tall0 = items.some((it) => it.active) ? ACTIVE_SCALE : 1;
      win.style.setProperty("--hb-lift", "0");
      bar.style.marginTop = (20 - PAD_TOP + SIZE * (tall0 - 1)).toFixed(1) + "px";
      return;
    }
    const scaler = document.getElementById("appScaler");
    const m = scaler && /scale\(([\d.]+)\)/.exec(scaler.style.transform || "");
    const s = m ? parseFloat(m[1]) : 1;
    const cur = parseFloat(win.style.getPropertyValue("--hb-lift")) || 0;
    const r = bg.getBoundingClientRect();
    const sy = window.scrollY || window.pageYOffset || 0;               // stránka se může posouvat (obsah pod oknem)
    const top0 = r.top + sy + cur * s, bottom0 = r.bottom + sy + cur * s; // okno bez posunu
    const room = Math.max(0, (top0 - 75 * s - 6) / s);                   // místo pro logo nad oknem
    // Top Clans na mobilu má hned pod oknem šipku filtru zemí -> větší minimální mezera
    const arrow = bar.classList.contains("ps-hb-has-arrow") && document.body.classList.contains("is-mobile");
    const minGap = (arrow ? 52 : 14) * s;
    const tall = items.some((it) => it.active) ? ACTIVE_SCALE : 1;      // aktivní tlačítko je vyšší (roste nahoru)
    const iconH = SIZE * tall * s;
    let gap = (window.innerHeight - bottom0 - iconH) / 2;                // stejná mezera nad i pod
    // na mobilu lišta hned pod oknem (jinak je moc daleko od main menu)
    if (s < 1 || document.body.classList.contains("is-mobile")) gap = Math.min(gap, minGap + 10 * s);
    let up = 0;
    if (gap < minGap) {
      up = Math.min(room, (bottom0 + minGap + iconH + minGap - window.innerHeight) / s);
      gap = minGap;
    }
    win.style.setProperty("--hb-lift", up.toFixed(1));
    bar.style.marginTop = (gap / s - PAD_TOP + SIZE * (tall - 1)).toFixed(1) + "px";
  }

  if (typeof window.autoFitScreen === "function") {
    const orig = window.autoFitScreen;
    window.autoFitScreen = function () { const r = orig.apply(this, arguments); lift(); return r; };
  }

  function init() { build(); lift(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("load", lift);
  window.addEventListener("resize", lift);
  window.addEventListener("orientationchange", lift);
})();

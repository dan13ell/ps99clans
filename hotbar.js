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
    { id: "clans",  label: "Clans", icon: "/images/hotbar/clans.png",  href: "/" },
    { id: "arrows", label: "Soon",  icon: "/images/hotbar/arrows.png" }, // zatím nikam nevede
    // { id: "discord", label: "Discord", icon: "/images/hotbar/discord.png", badge: "NEW", href: "https://discord.gg/...", newTab: true },
  ];
  // ====================================================

  const SIZE = 100;          // velikost ikony v px (jako v PS99 HUD)
  const HOVER_SCALE = 1.06;  // hover zvětšení
  const PRESS_SCALE = 0.93;  // stisk
  const HOVER_IN = "transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)"; // náběh s lehkým přestřelením

  const css = document.createElement("style");
  css.textContent = `
    /* Lišta visí absolutně pod oknem -> hlavní okno se neposune */
    .ps-hotbar {
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      width: max-content;
      margin-top: 2px;
      padding: 26px 30px 34px;
      gap: 10px;
      z-index: 800;
    }
    .ps-hotbar:empty { display: none; }
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
      position: relative;
      width: auto;               /* všechny ikony mají stejnou výšku */
      height: ${SIZE}px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transform-origin: 50% 55%;
      transform: scale(1);
      transition: none;              /* odjetí myší = okamžitý návrat */
    }
    .ps-hb-btn.hb-hover { transform: scale(${HOVER_SCALE}); transition: ${HOVER_IN}; z-index: 2; }
    .ps-hb-btn.hb-down  { transform: scale(${PRESS_SCALE}); transition: none; }
    .ps-hb-btn.hb-instant { transition: none !important; }

    .ps-hb-icon {
      display: block;
      width: auto;
      height: 100%;
      pointer-events: none;
      -webkit-user-drag: none;
      /* jemný odraz pod ikonou */
      -webkit-box-reflect: below -4px linear-gradient(transparent 62%, rgba(255,255,255,0.16));
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
      visibility: hidden;            /* popisek se ukazuje okamžitě, bez fade */
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

    /* Stránka Top Clans na mobilu má pod oknem šipku filtru zemí */
    body.is-mobile .ps-hotbar.ps-hb-has-arrow { margin-top: 36px; }
  `;
  document.head.appendChild(css);

  function wire(btn, b) {
    let over = false;
    const instant = (fn) => {
      btn.classList.add("hb-instant");
      fn();
      void btn.offsetWidth;            // vynutí okamžité překreslení
      btn.classList.remove("hb-instant");
    };

    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      over = true;
      btn.classList.add("hb-hover");
    });
    btn.addEventListener("pointerleave", () => {
      over = false;
      instant(() => btn.classList.remove("hb-hover", "hb-down"));
    });
    btn.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      btn.classList.add("hb-down");
      if (e.pointerType === "touch") btn.classList.add("hb-hover");
    });
    const release = (e) => {
      if (!btn.classList.contains("hb-down")) return;
      instant(() => {
        btn.classList.remove("hb-down");
        if (e && e.pointerType === "touch") btn.classList.remove("hb-hover");
        else if (over) btn.classList.add("hb-hover");
      });
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);

    btn.addEventListener("click", () => {
      if (typeof b.onClick === "function") return b.onClick();
      if (!b.href) return;
      if (b.newTab) window.open(b.href, "_blank");
      else location.href = b.href;
    });
  }

  function build() {
    const win = document.querySelector(".game-window");
    if (!win || win.querySelector(".ps-hotbar")) return;

    const bar = document.createElement("div");
    bar.className = "ps-hotbar";
    if (document.querySelector(".country-toggle-arrow")) bar.classList.add("ps-hb-has-arrow");

    BUTTONS.forEach((b) => {
      const btn = document.createElement("div");
      btn.className = "ps-hb-btn";
      if (b.id) btn.id = "hb-" + b.id;
      btn.setAttribute("role", "button");
      btn.setAttribute("aria-label", b.label || "");

      const img = document.createElement("img");
      img.className = "ps-hb-icon";
      img.src = b.icon;
      img.alt = "";
      img.draggable = false;
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

      wire(btn, b);
      bar.appendChild(btn);
    });

    // Lišta je uvnitř okna (škáluje se s ním), ale absolutně pod ním -> okno zůstává na místě
    win.appendChild(bar);
  }

  function init() { build(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

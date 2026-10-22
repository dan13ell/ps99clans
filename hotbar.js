// Spodní lišta s tlačítky (hotbar) pod hlavním oknem – sdílená pro všechny stránky.
// Nové tlačítko = přidej jeden řádek do BUTTONS níže.
(function () {
  // ===================== TLAČÍTKA =====================
  // label  – text pod ikonou
  // icon   – cesta k obrázku ("/images/neco.png") NEBO krátký text ("i", "?", "★")
  // color  – blue | pink | green | yellow | purple | orange | grey
  // href   – kam vede (nebo onClick: function () { ... })
  // newTab – true = otevře se v nové záložce
  const BUTTONS = [
    { id: "info", label: "Info", icon: "i", color: "blue", href: "/about/" },
    // { id: "discord", label: "Discord", icon: "/images/discord.png", color: "purple", href: "https://discord.gg/...", newTab: true },
  ];
  // ====================================================

  const COLORS = {
    blue:   ["#7FD0FF", "#2E9BF0", "#1F74C4"],
    pink:   ["#FF7FA8", "#F2386F", "#C21E50"],
    green:  ["#9CF27A", "#4CC93A", "#2F9426"],
    yellow: ["#FFE680", "#FFC226", "#D99611"],
    purple: ["#C99BFF", "#8F55F2", "#6A35C4"],
    orange: ["#FFB870", "#FF8424", "#D25E0E"],
    grey:   ["#D2D6E4", "#A6ABBE", "#80859A"],
  };

  // Stejné časování jako tvoje ostatní tlačítka (X, menu-btn)
  const EASE = "0.044s cubic-bezier(0.1, 0.9, 0.2, 1)";

  const css = document.createElement("style");
  css.textContent = `
    .ps-hotbar {
      position: relative;
      display: flex;
      width: fit-content;
      margin: 22px auto 0;
      padding: 12px 18px 14px;
      gap: 16px;
      background: linear-gradient(180deg, #FFFFFF 0%, #E9E9EC 100%);
      border: 6px solid #2A2B31;
      border-radius: 24px;
      filter: drop-shadow(0px 10px 20px rgba(0, 0, 0, 0.35));
      z-index: 800;
    }
    .ps-hotbar:empty { display: none; }

    .ps-hb-btn {
      position: relative;
      width: 76px;
      height: 76px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transform-origin: center center;
      transition: transform ${EASE};
    }
    .ps-hb-face {
      position: absolute;
      inset: 0;
      border: 4px solid #2A2B31;
      border-radius: 18px;
      background: linear-gradient(180deg, var(--c1) 0%, var(--c2) 100%);
      box-shadow:
        inset 0 -7px 0 var(--c3),
        inset 0 3px 0 rgba(255, 255, 255, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: box-shadow ${EASE}, background ${EASE};
    }
    .ps-hb-icon-img {
      width: 74%;
      height: 74%;
      object-fit: contain;
      margin-bottom: 8px;
      pointer-events: none;
      filter: drop-shadow(0px 2px 0px rgba(0, 0, 0, 0.25));
    }
    .ps-hb-icon-txt {
      margin-bottom: 10px;
      font-size: 40px;
      line-height: 1;
      font-weight: 800 !important;
      color: #FFFFFF;
      -webkit-text-stroke: 6px #2A2B31;
      paint-order: stroke fill;
      pointer-events: none;
    }
    .ps-hb-label {
      position: absolute;
      left: 50%;
      bottom: -9px;
      transform: translateX(-50%);
      white-space: nowrap;
      font-size: 17px;
      font-weight: 800 !important;
      color: #FFFFFF;
      -webkit-text-stroke: 5px #2A2B31;
      paint-order: stroke fill;
      pointer-events: none;
      z-index: 2;
    }

    /* HOVER – zvětšení jako u X (72 -> 76 px) */
    @media (hover: hover) {
      .ps-hb-btn:hover:not(:active) { transform: scale(1.055); z-index: 2; }
    }
    /* CLICK – zmáčknutí (72 -> 66 px) + "clicked" vzhled: nižší spodní hrana, tmavší */
    .ps-hb-btn:active { transform: scale(0.917); }
    .ps-hb-btn:active .ps-hb-face {
      background: linear-gradient(180deg, var(--c2) 0%, var(--c2) 100%);
      box-shadow:
        inset 0 -3px 0 var(--c3),
        inset 0 2px 0 rgba(255, 255, 255, 0.25);
    }

    /* Stránka Top Clans na mobilu má pod oknem šipku filtru zemí */
    body.is-mobile .ps-hotbar.ps-hb-has-arrow { margin-top: 56px; }
  `;
  document.head.appendChild(css);

  function build() {
    const win = document.querySelector(".game-window");
    if (!win || win.querySelector(".ps-hotbar")) return;

    const bar = document.createElement("div");
    bar.className = "ps-hotbar";
    if (document.querySelector(".country-toggle-arrow")) bar.classList.add("ps-hb-has-arrow");

    BUTTONS.forEach((b) => {
      const c = COLORS[b.color] || COLORS.grey;
      const btn = document.createElement("div");
      btn.className = "ps-hb-btn";
      if (b.id) btn.id = "hb-" + b.id;
      btn.style.setProperty("--c1", c[0]);
      btn.style.setProperty("--c2", c[1]);
      btn.style.setProperty("--c3", c[2]);
      btn.title = b.label || "";

      const face = document.createElement("div");
      face.className = "ps-hb-face";
      if (b.icon && /\.(png|gif|svg|webp|jpe?g)$/i.test(b.icon)) {
        const img = document.createElement("img");
        img.className = "ps-hb-icon-img";
        img.src = b.icon;
        img.draggable = false;
        face.appendChild(img);
      } else if (b.icon) {
        const t = document.createElement("span");
        t.className = "ps-hb-icon-txt";
        t.textContent = b.icon;
        face.appendChild(t);
      }
      btn.appendChild(face);

      if (b.label) {
        const l = document.createElement("span");
        l.className = "ps-hb-label";
        l.textContent = b.label;
        btn.appendChild(l);
      }

      btn.addEventListener("click", () => {
        if (typeof b.onClick === "function") return b.onClick();
        if (!b.href) return;
        if (b.newTab) window.open(b.href, "_blank");
        else location.href = b.href;
      });

      bar.appendChild(btn);
    });

    // Lišta je v toku pod obrázkem okna -> škáluje se a centruje spolu s oknem
    win.appendChild(bar);
  }

  // Doškálování, aby se okno + lišta vešly na výšku (i na desktopu)
  function fit() {
    const scaler = document.getElementById("appScaler");
    const win = document.querySelector(".game-window");
    if (!scaler || !win || !win.querySelector(".ps-hotbar")) return;
    const m = /scale\(([\d.]+)\)/.exec(scaler.style.transform || "");
    const s = m ? parseFloat(m[1]) : 1;
    const need = (win.offsetHeight + 90) * s; // +90 = logo nad oknem a rezerva
    const avail = window.innerHeight;
    if (need > avail) scaler.style.transform = `scale(${(s * avail) / need})`;
  }

  // Napojení na autoFitScreen dané stránky (spustí se vždy hned po něm)
  if (typeof window.autoFitScreen === "function") {
    const orig = window.autoFitScreen;
    window.autoFitScreen = function () {
      const r = orig.apply(this, arguments);
      fit();
      return r;
    };
  }

  function init() { build(); fit(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("load", fit);
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

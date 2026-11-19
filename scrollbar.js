// Vlastní scrollbar (jezdec vždy 15x29 px, jezdí po celé dráze) + rychlejší kolečko
(function () {
  const SPEED = 2.5; // rychlost kolečka, 1 = původn
  const SELECTORS = ".live-main-scroll-viewport, #leaderboardList, .about-scroll-container, #membersListContainer, #cmpScroll, #ovScroll";
  const W = 15, H = 29;

  const css = document.createElement("style");
  css.textContent = `
    .sb-hidden { scrollbar-width: none !important; }
    .sb-hidden::-webkit-scrollbar { display: none !important; width: 0 !important; }
    .sb-track { position: absolute; width: ${W}px; display: none; touch-action: none; }
    .sb-thumb {
      position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; cursor: pointer; touch-action: none;
      will-change: transform;
      background: url("/images/scroller.png") no-repeat center / ${W}px ${H}px;
      image-rendering: pixelated;
    }
    /* iPhone/Safari: hlavní seznamy ve vlastní vrstvě. Okno je na mobilu zmenšené transformem a bez
       vlastní vrstvy Safari scroll prstem po kousku zasekávalo (plynule jelo jen Top Clans). */
    @media (hover: none) and (pointer: coarse) {
      #leaderboardList, #membersListContainer, .live-main-scroll-viewport {
        -webkit-overflow-scrolling: touch;
        will-change: scroll-position;
        transform: translateZ(0);
      }
    }
    /* Dotykové displeje: řádky se při scrollování nemačkají ani nezvětšují
       (položený prst = :active, zvednutý = :hover zůstane → karty poskakovaly) */
    @media (hover: none) {
      .clan-row:hover, .clan-row:active,
      .player-card:hover, .player-card:active,
      .member-card:hover .member-card-inner, .member-card:active .member-card-inner {
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(css);

  // ---- Tichá obnova dat až po dokončení scrollování ----
  // Stránky každou minutu znovu postaví seznam; kdyby se to stalo během scrollu prstem,
  // zastaví se setrvačnost a seznam poskočí. whenScrollIdle(fn) počká, až je klid.
  let touching = false, lastScrollAt = 0;
  const IDLE_MS = 900;
  window.addEventListener("touchstart", () => { touching = true; }, { passive: true, capture: true });
  window.addEventListener("touchend", () => { touching = false; lastScrollAt = Date.now(); }, { passive: true, capture: true });
  window.addEventListener("touchcancel", () => { touching = false; lastScrollAt = Date.now(); }, { passive: true, capture: true });
  document.addEventListener("scroll", () => { lastScrollAt = Date.now(); }, { passive: true, capture: true });
  window.whenScrollIdle = function (fn) {
    const wait = () => {
      const quietFor = Date.now() - lastScrollAt;
      if (touching || quietFor < IDLE_MS) setTimeout(wait, touching ? 300 : IDLE_MS - quietFor + 20);
      else fn();
    };
    wait();
  };

  function attach(box) {
    if (box.dataset.sb) return;
    box.dataset.sb = "1";
    box.classList.add("sb-hidden");

    const parent = box.offsetParent || box.parentNode;
    const track = document.createElement("div");
    const thumb = document.createElement("div");
    track.className = "sb-track";
    thumb.className = "sb-thumb";
    track.appendChild(thumb);
    parent.appendChild(track);

    const z = parseInt(getComputedStyle(box).zIndex, 10);
    track.style.zIndex = isNaN(z) ? 1000 : z + 1;

    // Rozměry dráhy se přepočítají jen při změně velikosti/obsahu. Při scrollu se jen posune jezdec
    // (transformem, bez čtení layoutu), jinak Safari na iPhonu scroll prstem trhaně zasekávalo.
    let range = 0, free = 0, raf = 0;
    function layout() {
      range = box.scrollHeight - box.clientHeight;
      if (range <= 1 || !box.offsetParent) { track.style.display = "none"; return; }
      track.style.display = "block";
      track.style.left = (box.offsetLeft + box.offsetWidth - W) + "px";
      track.style.top = box.offsetTop + "px";
      track.style.height = box.offsetHeight + "px";
      free = box.offsetHeight - H;
      moveThumb();
    }
    function moveThumb() {
      raf = 0;
      if (range <= 1) return;
      const y = Math.max(0, Math.min(free, box.scrollTop / range * free));
      thumb.style.transform = `translateY(${y}px)`;
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(moveThumb); }
    const update = layout;

    function scaleOf() {
      return box.getBoundingClientRect().height / box.offsetHeight || 1;
    }

    // tažení jezdce
    thumb.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      thumb.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const startTop = box.scrollTop;
      const scale = scaleOf();
      const range = box.scrollHeight - box.clientHeight;
      const free = box.offsetHeight - H;

      const move = (ev) => {
        box.scrollTop = startTop + ((ev.clientY - startY) / scale) * (range / free);
      };
      const up = () => {
        thumb.removeEventListener("pointermove", move);
        thumb.removeEventListener("pointerup", up);
        thumb.removeEventListener("pointercancel", up);
      };
      thumb.addEventListener("pointermove", move);
      thumb.addEventListener("pointerup", up);
      thumb.addEventListener("pointercancel", up);
    });

    // klik na dráhu = skok na to místo
    track.addEventListener("pointerdown", (e) => {
      if (e.target !== track) return;
      const range = box.scrollHeight - box.clientHeight;
      const free = box.offsetHeight - H;
      const y = (e.clientY - track.getBoundingClientRect().top) / scaleOf() - H / 2;
      box.scrollTop = Math.max(0, Math.min(1, y / free)) * range;
    });

    // rychlejší kolečko (nad obsahem i nad dráhou)
    function onWheel(e) {
      if (e.ctrlKey) return;
      if (box.scrollHeight <= box.clientHeight) return;
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= box.clientHeight;
      e.preventDefault();
      e.stopPropagation();
      box.scrollTop += delta * SPEED;
    }
    box.addEventListener("wheel", onWheel, { passive: false });
    track.addEventListener("wheel", onWheel, { passive: false });

    box.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("load", update);
    if (window.ResizeObserver) new ResizeObserver(update).observe(box);
    new MutationObserver(update).observe(box, { childList: true, subtree: true });

    update();
  }

  function init() {
    document.querySelectorAll(SELECTORS).forEach(attach);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

// Rychlejší scrollování kolečkem myši
(function () {
  const SPEED = 2.5; // 1 = původní rychlost, 2.5 = 2,5× rychlejší, můžeš změnit
  const SELECTORS = ".live-main-scroll-viewport, #leaderboardList, .about-scroll-container, #membersListContainer";

  function attach(box) {
    if (box.dataset.fastScroll) return;
    box.dataset.fastScroll = "1";

    box.addEventListener("wheel", (e) => {
      if (e.ctrlKey) return; // zoom stránky nech být
      if (box.scrollHeight <= box.clientHeight) return;

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;               // řádky -> pixely
      else if (e.deltaMode === 2) delta *= box.clientHeight; // stránky -> pixely

      e.preventDefault();
      e.stopPropagation();
      box.scrollTop += delta * SPEED;
    }, { passive: false });
  }

  function init() {
    document.querySelectorAll(SELECTORS).forEach(attach);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

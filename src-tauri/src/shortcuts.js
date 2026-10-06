// Atalhos de teclado do Quickerest (injetados em toda página carregada).
(() => {
  if (window.__quickerestShortcuts) return;
  window.__quickerestShortcuts = true;

  window.addEventListener(
    "keydown",
    (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if ((e.altKey && e.key === "ArrowLeft") || (mod && e.key === "[")) {
        history.back();
      } else if ((e.altKey && e.key === "ArrowRight") || (mod && e.key === "]")) {
        history.forward();
      } else if ((mod && key === "r") || e.key === "F5") {
        location.reload();
      } else if (e.altKey && e.key === "Home") {
        location.href = "https://www.pinterest.com/";
      } else {
        return;
      }
      e.preventDefault();
    },
    true
  );

  // Botões laterais do mouse (voltar / avançar).
  window.addEventListener("mouseup", (e) => {
    if (e.button === 3) history.back();
    else if (e.button === 4) history.forward();
  });
})();

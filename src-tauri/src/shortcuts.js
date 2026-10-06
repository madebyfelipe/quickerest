// Atalhos de teclado do Quickerest (injetados em toda página carregada).
(() => {
  if (window.__quickerestShortcuts) return;
  window.__quickerestShortcuts = true;

  window.addEventListener(
    "keydown",
    (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && e.shiftKey && key === "a") {
        if (window.__quickerestToggleAdBlock) {
          const enabled = window.__quickerestToggleAdBlock();
          showNotice(
            enabled
              ? "Removedor de anúncios ativado."
              : "Removedor de anúncios pausado."
          );
        }
      } else if (mod && e.shiftKey && key === "f") {
        const search = document.querySelector(
          'input[data-test-id="search-box-input"], input[placeholder*="Search" i], input[placeholder*="Pesquisar" i], input[aria-label*="Search" i], input[aria-label*="Pesquisar" i]'
        );
        if (search) {
          search.focus();
          search.select();
        } else {
          showNotice("Campo de pesquisa não encontrado.");
        }
      } else if (mod && e.shiftKey && key === "l") {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard
            .writeText(location.href)
            .then(() => showNotice("Link copiado."))
            .catch(() => showNotice("Não foi possível copiar o link."));
        } else {
          showNotice("A cópia da área de transferência não está disponível.");
        }
      } else if ((e.altKey && e.key === "ArrowLeft") || (mod && e.key === "[")) {
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

  function showNotice(message) {
    let notice = document.getElementById("quickerest-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "quickerest-notice";
      notice.setAttribute("role", "status");
      Object.assign(notice.style, {
        position: "fixed",
        zIndex: "2147483647",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "10px 16px",
        borderRadius: "8px",
        background: "#222",
        color: "#fff",
        font: "14px system-ui, sans-serif",
        boxShadow: "0 2px 12px #0005",
        pointerEvents: "none",
      });
      document.documentElement.appendChild(notice);
    }

    notice.textContent = message;
    notice.style.display = "block";
    clearTimeout(notice.hideTimeout);
    notice.hideTimeout = setTimeout(() => {
      notice.style.display = "none";
    }, 1800);
  }

  // Botões laterais do mouse (voltar / avançar).
  window.addEventListener("mouseup", (e) => {
    if (e.button === 3) history.back();
    else if (e.button === 4) history.forward();
  });
})();

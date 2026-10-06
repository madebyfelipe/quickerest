// Atalhos de teclado do Quickerest (injetados em toda página carregada).
(() => {
  if (window.__quickerestShortcuts) return;
  window.__quickerestShortcuts = true;
  let lastHoveredPinImage = null;

  window.addEventListener(
    "keydown",
    (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const plainKey = !mod && !e.altKey && !e.shiftKey;
      const typing =
        e.target &&
        (e.target.isContentEditable ||
          ["input", "textarea", "select"].includes(
            e.target.tagName?.toLowerCase()
          ));
      const selectionText = window.getSelection?.()?.toString().trim() || "";

      if (mod && e.shiftKey && key === "a") {
        if (window.__quickerestToggleAdBlock) {
          const enabled = window.__quickerestToggleAdBlock();
          showNotice(
            enabled
              ? "Removedor de anúncios ativado."
              : "Removedor de anúncios pausado."
          );
        }
      } else if (plainKey && key === "f" && !typing) {
        const search = document.querySelector(
          'input[data-test-id="search-box-input"], input[placeholder*="Search" i], input[placeholder*="Pesquisar" i], input[aria-label*="Search" i], input[aria-label*="Pesquisar" i]'
        );
        if (search) {
          search.focus();
          search.select();
        } else {
          showNotice("Campo de pesquisa não encontrado.");
        }
      } else if (plainKey && key === "q" && !typing) {
        location.href = "https://www.pinterest.com/";
      } else if (plainKey && key === "r" && !typing) {
        savePrimaryPinOnPinterest();
      } else if (mod && !e.shiftKey && key === "c") {
        if (typing || selectionText) return;
        copyPrimaryImage();
      } else if (mod && e.shiftKey && key === "c") {
        copyCurrentLink();
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

  function findPrimaryImageUrl() {
    const hoverUrl = getImageUrl(lastHoveredPinImage);
    if (hoverUrl) return hoverUrl;

    const candidates = Array.from(
      document.querySelectorAll(
        'img[src*="pinimg.com"], img[currentSrc*="pinimg.com"]'
      )
    ).filter((img) => isViablePinImage(img));

    if (candidates.length > 0) {
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      const best = candidates
        .map((img) => {
          const rect = img.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance =
            Math.abs(centerX - viewportCenterX) +
            Math.abs(centerY - viewportCenterY);
          const area = rect.width * rect.height;
          const source = getImageUrl(img) || "";
          const qualityBoost =
            source.includes("/originals/") || source.includes("/736x/")
              ? 150000
              : 0;
          return { img, score: area - distance * 20 + qualityBoost };
        })
        .sort((a, b) => b.score - a.score)[0]?.img;

      const bestUrl = getImageUrl(best);
      if (bestUrl) return bestUrl;
    }

    const ogImage = document
      .querySelector('meta[property="og:image"], meta[name="og:image"]')
      ?.getAttribute("content");
    return ogImage || null;
  }

  function getImageUrl(img) {
    if (!img) return null;
    return img.currentSrc || img.src || null;
  }

  function isViablePinImage(img) {
    const source = getImageUrl(img);
    if (!source) return false;
    if (!source.includes("pinimg.com")) return false;
    if (source.includes("logo") || source.includes("favicon")) return false;

    const rect = img.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 120) return false;
    if (rect.bottom <= 0 || rect.right <= 0) return false;
    if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) {
      return false;
    }

    const area = (img.naturalWidth || 0) * (img.naturalHeight || 0);
    return area >= 30000;
  }

  function isVisibleElement(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (rect.bottom <= 0 || rect.right <= 0) return false;
    if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) {
      return false;
    }
    const style = getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  function isSaveButton(button) {
    if (!button) return false;
    const text = button.textContent?.trim() || "";
    const label =
      button.getAttribute("aria-label") ||
      button.getAttribute("title") ||
      button.getAttribute("data-test-id") ||
      "";
    return /(?:^|\b)(save|saved|salvar|salvo|guardar)(?:\b|$)/i.test(
      `${text} ${label}`
    );
  }

  function findSaveButtonInside(root) {
    if (!root) return null;

    const candidates = root.querySelectorAll(
      'button, [role="button"], div[role="button"]'
    );
    for (const button of candidates) {
      if (isVisibleElement(button) && isSaveButton(button)) return button;
    }
    return null;
  }

  function findSaveButtonForCurrentPin() {
    const roots = [];
    if (lastHoveredPinImage) {
      roots.push(
        lastHoveredPinImage.closest(
          '[data-test-id*="pin" i], article, [role="dialog"], main'
        )
      );
    }

    const focusedImage = document.querySelector(
      'img[src*="pinimg.com"][style*="object-fit"], img[currentSrc*="pinimg.com"][style*="object-fit"]'
    );
    if (focusedImage) {
      roots.push(
        focusedImage.closest(
          '[data-test-id*="pin" i], article, [role="dialog"], main'
        )
      );
    }

    for (const root of roots) {
      const button = findSaveButtonInside(root);
      if (button) return button;
    }

    const visibleButtons = Array.from(
      document.querySelectorAll('button, [role="button"], div[role="button"]')
    ).filter((button) => isVisibleElement(button) && isSaveButton(button));

    if (visibleButtons.length === 0) return null;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    return visibleButtons
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const bx = rect.left + rect.width / 2;
        const by = rect.top + rect.height / 2;
        const distance = Math.abs(bx - centerX) + Math.abs(by - centerY);
        return { button, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0].button;
  }

  function savePrimaryPinOnPinterest() {
    const saveButton = findSaveButtonForCurrentPin();
    if (!saveButton) {
      showNotice("Botão de salvar pin não encontrado.");
      return;
    }

    saveButton.click();
    showNotice("Pin salvo no Pinterest.");
  }

  async function copyPrimaryImage() {
    const imageUrl = findPrimaryImageUrl();
    if (!imageUrl) {
      showNotice("Imagem não encontrada para copiar.");
      return;
    }
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      showNotice("Cópia de imagem não é suportada neste navegador.");
      return;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("fetch failed");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not image");
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      showNotice("Imagem copiada.");
    } catch {
      showNotice("Não foi possível copiar a imagem.");
    }
  }

  function copyCurrentLink() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(location.href)
        .then(() => showNotice("Link copiado."))
        .catch(() => showNotice("Não foi possível copiar o link."));
    } else {
      showNotice("A cópia da área de transferência não está disponível.");
    }
  }

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

  window.addEventListener(
    "mousemove",
    (e) => {
      const img = e.target?.closest?.("img");
      lastHoveredPinImage = isViablePinImage(img) ? img : null;
    },
    true
  );
})();

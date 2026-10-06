// Bloqueio leve de anúncios e rastreadores conhecidos no Pinterest.
(() => {
  const labels = location.hostname.split(".");
  const pinterestIndex = labels.lastIndexOf("pinterest");
  const suffix = labels.slice(pinterestIndex + 1);
  const isPinterest =
    pinterestIndex >= 0 &&
    ((suffix.length === 1 && suffix[0].length <= 3) ||
      (suffix.length === 2 &&
        ["com", "co"].includes(suffix[0]) &&
        suffix[1].length === 2));

  if (!isPinterest) return;

  const STORAGE_KEY = "quickerest.adBlockEnabled";
  const BLOCKED_HOSTS = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "googletagmanager.com",
    "google-analytics.com",
    "connect.facebook.net",
    "analytics.tiktok.com",
    "ads-twitter.com",
    "analytics.twitter.com",
    "adnxs.com",
    "criteo.com",
    "taboola.com",
    "outbrain.com",
  ];
  const AD_MARKERS = [
    '[data-test-id*="promoted" i]',
    '[data-test-id*="sponsored" i]',
    '[aria-label*="promoted" i]',
    '[aria-label*="sponsored" i]',
    '[title*="promoted" i]',
    '[title*="sponsored" i]',
  ].join(",");
  const AD_LABEL =
    /(?:^|\b)(?:promoted|sponsored|patrocinad[oa]s?|publicidad|promocionad[oa]s?|gesponsert|sponsorisé(?:e)?s?)(?:\b|$)/i;

  let enabled = true;
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (storedValue !== null) enabled = storedValue === "true";
  } catch {
    // Private browsing modes may disable local storage.
  }

  function isBlockedUrl(value) {
    try {
      const requestUrl =
        value && typeof value === "object" && "url" in value
          ? value.url
          : value;
      const host = new URL(String(requestUrl), location.href).hostname;
      return BLOCKED_HOSTS.some(
        (blockedHost) =>
          host === blockedHost || host.endsWith(`.${blockedHost}`)
      );
    } catch {
      return false;
    }
  }

  const originalFetch = window.fetch;
  window.fetch = function (input, ...args) {
    if (enabled && isBlockedUrl(input)) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return originalFetch.call(this, input, ...args);
  };

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this.__quickerestBlockedRequest = isBlockedUrl(url);
    return originalXhrOpen.call(this, method, url, ...args);
  };

  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (enabled && this.__quickerestBlockedRequest) {
      this.abort();
      return;
    }
    return originalXhrSend.apply(this, args);
  };

  function hidePromotedPins(root) {
    if (!enabled || !root || root.nodeType !== Node.ELEMENT_NODE) return;

    const markers = [];
    if (root.matches(AD_MARKERS)) markers.push(root);
    markers.push(...root.querySelectorAll(AD_MARKERS));

    for (const marker of markers) {
      const card =
        marker.closest('[data-test-id*="pinWrapper" i], article') || marker;
      card.setAttribute("data-quickerest-ad-hidden", "true");
    }

    const cards = [];
    if (root.matches('[data-test-id*="pinWrapper" i], article')) {
      cards.push(root);
    }
    cards.push(
      ...root.querySelectorAll('[data-test-id*="pinWrapper" i], article')
    );

    for (const card of cards) {
      const labels = card.querySelectorAll("[aria-label], [title]");
      for (const label of labels) {
        if (AD_LABEL.test(label.getAttribute("aria-label") || "")) {
          card.setAttribute("data-quickerest-ad-hidden", "true");
          break;
        }
        if (AD_LABEL.test(label.getAttribute("title") || "")) {
          card.setAttribute("data-quickerest-ad-hidden", "true");
          break;
        }
      }
      if (!card.hasAttribute("data-quickerest-ad-hidden")) {
        for (const label of card.querySelectorAll("span")) {
          const text = label.textContent.trim();
          if (text.length <= 80 && AD_LABEL.test(text)) {
            card.setAttribute("data-quickerest-ad-hidden", "true");
            break;
          }
        }
      }
    }
  }

  function scanPromotedPins() {
    hidePromotedPins(document.documentElement);
  }

  let scanScheduled = false;
  const pendingNodes = [];
  const observer = new MutationObserver((records) => {
    if (!enabled) return;
    for (const record of records) {
      for (const node of record.addedNodes) pendingNodes.push(node);
    }
    if (scanScheduled) return;

    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      for (const node of pendingNodes.splice(0)) hidePromotedPins(node);
    });
  });

  function startCosmeticFiltering() {
    if (!document.documentElement) return;

    const style = document.createElement("style");
    style.id = "quickerest-ad-blocker";
    style.textContent =
      '[data-quickerest-ad-hidden="true"] { display: none !important; }';
    style.disabled = !enabled;
    document.documentElement.appendChild(style);

    scanPromotedPins();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.documentElement) {
    startCosmeticFiltering();
  } else {
    document.addEventListener("DOMContentLoaded", startCosmeticFiltering, {
      once: true,
    });
  }

  window.__quickerestToggleAdBlock = () => {
    enabled = !enabled;
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Filtering remains active for this session if preferences cannot persist.
    }

    const style = document.getElementById("quickerest-ad-blocker");
    if (style) style.disabled = !enabled;

    if (enabled) {
      scanPromotedPins();
    } else {
      document
        .querySelectorAll('[data-quickerest-ad-hidden="true"]')
        .forEach((card) => card.removeAttribute("data-quickerest-ad-hidden"));
    }

    return enabled;
  };
})();

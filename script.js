(() => {
  "use strict";

  const SELECTORS = {
    status: "#share-status",
    printableArea: "#print-certificate",
    dropdown: "#share-dropdown",
    menu: "#share-menu",
    menuButtons: "#share-menu button",
    toggle: '[data-action="toggle-share"]',
  };

  const SHARE_DATA = {
    title: "Haute Atelier Excellence Certificate",
    text: "Explore this premium certificate showcase by Digital Bond.",
    url: window.location.href,
  };

  const SOCIAL_URLS = {
    linkedin: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    twitter: (url, text) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: (url, title) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`,
  };

  const elements = {
    status: document.querySelector(SELECTORS.status),
    printableArea: document.querySelector(SELECTORS.printableArea),
    dropdown: document.querySelector(SELECTORS.dropdown),
    menu: document.querySelector(SELECTORS.menu),
    toggle: document.querySelector(SELECTORS.toggle),
    menuButtons: Array.from(document.querySelectorAll(SELECTORS.menuButtons)),
  };

  if (elements.menu) elements.menu.setAttribute("aria-hidden", "true");
  if (elements.toggle) elements.toggle.setAttribute("aria-expanded", "false");

  let isBusy = false;
  let statusTimeout = null;
  let toastEl = null;

  const Device = {
    isMobile() {
      const ua = navigator.userAgent || "";
      const mobileUa =
        /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
          ua,
        );
      const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
      return Boolean(mobileUa || coarsePointer);
    },
    isSecure() {
      return window.isSecureContext;
    },
  };

  const Status = {
    set(message, type = "info", persistMs = 3200) {
      if (!elements.status) return;
      elements.status.textContent = message;
      elements.status.classList.remove(
        "text-red-600",
        "text-green-700",
        "text-black/70",
      );
      if (type === "error") {
        elements.status.classList.add("text-red-600");
      } else if (type === "success") {
        elements.status.classList.add("text-green-700");
      } else {
        elements.status.classList.add("text-black/70");
      }
      if (statusTimeout) window.clearTimeout(statusTimeout);
      if (persistMs > 0) {
        statusTimeout = window.setTimeout(() => {
          if (elements.status) elements.status.textContent = "";
        }, persistMs);
      }
    },
    ensureToast() {
      if (toastEl) return toastEl;
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      toastEl.className =
        "pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-4 z-[60] rounded-luxury border border-black/10 bg-white/95 px-4 py-2 text-sm shadow-luxury opacity-0 transition-opacity duration-200";
      document.body.appendChild(toastEl);
      return toastEl;
    },
    toast(message, type = "info") {
      const toast = this.ensureToast();
      toast.textContent = message;
      toast.classList.remove("text-red-600", "text-green-700", "text-black");
      toast.classList.add(
        type === "error"
          ? "text-red-600"
          : type === "success"
            ? "text-green-700"
            : "text-black",
      );
      toast.classList.remove("opacity-0");
      toast.classList.add("opacity-100");
      window.setTimeout(() => {
        toast.classList.remove("opacity-100");
        toast.classList.add("opacity-0");
      }, 2200);
    },
  };

  const UI = {
    setBusy(nextState) {
      isBusy = nextState;
      const buttons = [...elements.menuButtons, elements.toggle].filter(
        Boolean,
      );
      buttons.forEach((button) => {
        button.disabled = nextState;
        button.setAttribute("aria-disabled", String(nextState));
        button.classList.toggle("opacity-60", nextState);
        button.classList.toggle("cursor-not-allowed", nextState);
      });
      if (nextState) Status.set("Generating snapshot...", "info", 0);
    },
    setMenuOpen(isOpen) {
      if (!elements.menu || !elements.toggle) return;
      elements.menu.classList.toggle("is-open", isOpen);
      elements.menu.setAttribute("aria-hidden", String(!isOpen));
      elements.toggle.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        const first = elements.menuButtons[0];
        if (first) first.focus();
      } else {
        elements.toggle.focus();
      }
    },
    moveFocusInMenu(currentButton, direction) {
      const visibleButtons = elements.menuButtons.filter(
        (btn) => !btn.disabled,
      );
      if (!visibleButtons.length) return;
      const index = visibleButtons.indexOf(currentButton);
      const nextIndex =
        (index + direction + visibleButtons.length) % visibleButtons.length;
      visibleButtons[nextIndex].focus();
    },
    closeMenuIfOutside(targetNode) {
      if (!elements.dropdown || !elements.menu) return;
      if (!elements.dropdown.contains(targetNode)) this.setMenuOpen(false);
    },
  };

  const ShareService = {
    getManualUrl(network) {
      const builder = SOCIAL_URLS[network];
      if (!builder) return "";
      if (network === "twitter")
        return builder(SHARE_DATA.url, SHARE_DATA.text);
      if (network === "facebook")
        return builder(SHARE_DATA.url, SHARE_DATA.title);
      return builder(SHARE_DATA.url);
    },
    async shareByNetwork(network) {
      const canNativeShare = navigator.share && Device.isSecure();

      // 1. Try Native Share (text + URL)
      if (canNativeShare && Device.isMobile()) {
        try {
          await navigator.share({
            title: SHARE_DATA.title,
            text: SHARE_DATA.text,
            url: SHARE_DATA.url,
          });
          return { message: "Share sheet opened." };
        } catch (error) {
          if (error.name === "AbortError") {
            throw new Error("Share cancelled.");
          }
          console.warn("Native share failed:", error);
        }
      }

      // 2. Manual Social URL Fallback
      const manualUrl = this.getManualUrl(network);
      if (manualUrl) {
        window.open(manualUrl, "_blank", "noopener,noreferrer");
        return { message: `Opening ${network} share...` };
      }

      throw new Error("Sharing is not supported on this device/browser.");
    },
    async copyPageLink() {
      if (navigator.clipboard?.writeText && Device.isSecure()) {
        await navigator.clipboard.writeText(SHARE_DATA.url);
        return;
      }

      const input = document.createElement("input");
      input.value = SHARE_DATA.url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(input);
      if (!copied) throw new Error("Clipboard API unavailable.");
    },
  };

  async function handleShare(network) {
    if (isBusy) return;
    isBusy = true;
    try {
      const result = await ShareService.shareByNetwork(network);
      Status.set(result.message, "success");
      Status.toast(result.message, "success");
    } catch (error) {
      console.error("Share failed:", error);
      Status.set(error?.message || "Unable to share.", "error");
      Status.toast(error?.message || "Unable to share.", "error");
    } finally {
      isBusy = false;
    }
  }

  function handleDownload() {
    window.print();
  }

  async function handleCopyLink() {
    if (isBusy) return;
    isBusy = true;
    try {
      await ShareService.copyPageLink();
      Status.set("Link copied.", "success");
      Status.toast("Link copied.", "success");
    } catch (error) {
      console.error("Copy failed:", error);
      Status.set("Unable to copy link.", "error");
      Status.toast("Unable to copy link.", "error");
    } finally {
      isBusy = false;
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (!button) {
      UI.closeMenuIfOutside(target);
      return;
    }

    const action = button.dataset.action;
    const shareTarget = button.dataset.share;

    if (action === "toggle-share") {
      event.preventDefault();
      if (!elements.menu) return;
      UI.setMenuOpen(!elements.menu.classList.contains("is-open"));
      return;
    }

    if (shareTarget) {
      UI.setMenuOpen(false);
      // Open social URL directly (synchronous) to avoid popup blocker
      const manualUrl = ShareService.getManualUrl(shareTarget);
      if (manualUrl) {
        window.open(manualUrl, "_blank", "noopener,noreferrer");
        Status.set(`Opening ${shareTarget} share...`, "success");
        Status.toast(`Opening ${shareTarget} share...`, "success");
      } else if (navigator.share && Device.isSecure() && Device.isMobile()) {
        // Native share for mobile only
        navigator
          .share({
            title: SHARE_DATA.title,
            text: SHARE_DATA.text,
            url: SHARE_DATA.url,
          })
          .then(() => {
            Status.set("Share sheet opened.", "success");
            Status.toast("Share sheet opened.", "success");
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              Status.set("Unable to share.", "error");
            }
          });
      } else {
        Status.set("Sharing not available.", "error");
        Status.toast("Sharing not available.", "error");
      }
      return;
    }

    if (action === "copy") {
      UI.setMenuOpen(false);
      handleCopyLink();
      return;
    }

    if (action === "download") {
      UI.setMenuOpen(false);
      handleDownload();
      return;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      UI.setMenuOpen(false);
      return;
    }

    if (!elements.menu?.classList.contains("is-open")) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLButtonElement)) return;
    if (!elements.menu.contains(active)) return;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      UI.moveFocusInMenu(active, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      UI.moveFocusInMenu(active, -1);
    }
  });
})();

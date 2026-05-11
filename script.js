(() => {
  "use strict";

  const CONFIG = {
    selectors: {
      status: "#share-status",
      printableArea: "#print-certificate",
      dropdown: "#share-dropdown",
      menu: "#share-menu",
      menuButtons: "#share-menu button",
      toggle: '[data-action="toggle-share"]',
    },
    shareData: {
      title: "Haute Atelier Excellence Certificate",
      text: "Explore this premium certificate showcase by Digital Bond.",
      url: window.location.href,
    },
    networks: {
      linkedin: (url) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      twitter: (url, text) =>
        `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: (url, title) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`,
    },
  };

  const elements = {
    status: document.querySelector(CONFIG.selectors.status),
    printableArea: document.querySelector(CONFIG.selectors.printableArea),
    dropdown: document.querySelector(CONFIG.selectors.dropdown),
    menu: document.querySelector(CONFIG.selectors.menu),
    toggle: document.querySelector(CONFIG.selectors.toggle),
    get menuButtons() {
      return Array.from(
        document.querySelectorAll(CONFIG.selectors.menuButtons),
      );
    },
  };

  // State
  let isProcessing = false;
  let statusTimeout = null;
  let toastElement = null;

  // Initialization
  if (elements.menu) elements.menu.setAttribute("aria-hidden", "true");
  if (elements.toggle) elements.toggle.setAttribute("aria-expanded", "false");

  const utils = {
    isMobile() {
      const ua = navigator.userAgent || "";
      const isTouch =
        /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
          ua,
        );
      const hasTouchPointer = window.matchMedia?.("(pointer: coarse)")?.matches;
      return Boolean(isTouch || hasTouchPointer);
    },
    isSecure: () => window.isSecureContext,
  };

  const ui = {
    setStatus(message, type = "info", duration = 3200) {
      if (!elements.status) return;

      elements.status.textContent = message;
      elements.status.classList.remove(
        "text-red-600",
        "text-green-700",
        "text-black/70",
      );

      if (type === "error") elements.status.classList.add("text-red-600");
      else if (type === "success")
        elements.status.classList.add("text-green-700");
      else elements.status.classList.add("text-black/70");

      if (statusTimeout) window.clearTimeout(statusTimeout);
      if (duration > 0) {
        statusTimeout = window.setTimeout(() => {
          if (elements.status) elements.status.textContent = "";
        }, duration);
      }
    },

    ensureToast() {
      if (toastElement) return toastElement;
      toastElement = document.createElement("div");
      toastElement.setAttribute("role", "status");
      toastElement.setAttribute("aria-live", "polite");
      toastElement.className =
        "pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-4 z-[60] rounded-luxury border border-black/10 bg-white/95 px-4 py-2 text-sm shadow-luxury opacity-0 transition-opacity duration-200";
      document.body.appendChild(toastElement);
      return toastElement;
    },

    showToast(message, type = "info") {
      const toast = this.ensureToast();
      toast.textContent = message;
      toast.classList.remove("text-red-600", "text-green-700", "text-black");

      if (type === "error") toast.classList.add("text-red-600");
      else if (type === "success") toast.classList.add("text-green-700");
      else toast.classList.add("text-black");

      toast.classList.remove("opacity-0");
      toast.classList.add("opacity-100");

      window.setTimeout(() => {
        toast.classList.remove("opacity-100");
        toast.classList.add("opacity-0");
      }, 2200);
    },

    setBusy(busy) {
      isProcessing = busy;
      const controls = [...elements.menuButtons, elements.toggle].filter(
        Boolean,
      );
      controls.forEach((btn) => {
        btn.disabled = busy;
        btn.setAttribute("aria-disabled", String(busy));
        btn.classList.toggle("opacity-60", busy);
        btn.classList.toggle("cursor-not-allowed", busy);
      });

      if (busy) {
        this.setStatus("جاري المعالجة...", "info", 0);
      }
    },

    setMenuOpen(open) {
      if (!elements.menu || !elements.toggle) return;

      elements.menu.classList.toggle("is-open", open);
      elements.menu.setAttribute("aria-hidden", String(!open));
      elements.toggle.setAttribute("aria-expanded", String(open));

      if (open) {
        const firstBtn = elements.menuButtons[0];
        if (firstBtn) firstBtn.focus();
      } else {
        elements.toggle.focus();
      }
    },

    moveFocus(currentBtn, direction) {
      const buttons = elements.menuButtons.filter((b) => !b.disabled);
      if (!buttons.length) return;

      const index = buttons.indexOf(currentBtn);
      const nextIndex = (index + direction + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
    },

    closeIfOutside(target) {
      if (elements.dropdown && elements.menu) {
        if (!elements.dropdown.contains(target)) {
          this.setMenuOpen(false);
        }
      }
    },
  };

  const actions = {
    getShareUrl(network) {
      const formatter = CONFIG.networks[network];
      if (!formatter) return "";
      if (network === "twitter")
        return formatter(CONFIG.shareData.url, CONFIG.shareData.text);
      if (network === "facebook")
        return formatter(CONFIG.shareData.url, CONFIG.shareData.title);
      return formatter(CONFIG.shareData.url);
    },

    async share(network) {
      if (navigator.share && utils.isSecure() && utils.isMobile()) {
        try {
          await navigator.share({
            title: CONFIG.shareData.title,
            text: CONFIG.shareData.text,
            url: CONFIG.shareData.url,
          });
          return { success: true, message: "تم فتح قائمة المشاركة" };
        } catch (err) {
          if (err.name === "AbortError") throw new Error("تم إلغاء المشاركة");
          console.warn("Native share failed:", err);
        }
      }

      const url = this.getShareUrl(network);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return { success: true, message: `جاري فتح ${network}...` };
      }

      throw new Error("المشاركة غير مدعومة في هذا المتصفح");
    },

    async copyLink() {
      if (navigator.clipboard?.writeText && utils.isSecure()) {
        await navigator.clipboard.writeText(CONFIG.shareData.url);
        return;
      }

      const input = document.createElement("input");
      input.value = CONFIG.shareData.url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const success = document.execCommand("copy");
      document.body.removeChild(input);

      if (!success) throw new Error("تعذر نسخ الرابط");
    },

    async downloadCertificate() {
      if (isProcessing) return;
      ui.setBusy(true);

      try {
        const certificate = elements.printableArea;
        if (!certificate) throw new Error("الشهادة غير موجودة");

        // Hide share dropdown during capture
        const dropdown = elements.dropdown;
        const originalDisplay = dropdown ? dropdown.style.display : "";
        if (dropdown) dropdown.style.display = "none";

        const canvas = await html2canvas(certificate, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        if (dropdown) dropdown.style.display = originalDisplay;

        const dataUrl = canvas.toDataURL("file/pdf");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "hac-certificate.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        ui.setStatus("تم تحميل الشهادة بنجاح", "success");
        ui.showToast("تم تحميل الشهادة بنجاح", "success");
      } catch (err) {
        console.error("Download failed:", err);
        ui.setStatus("فشل تحميل الشهادة", "error");
        ui.showToast("فشل تحميل الشهادة", "error");
      } finally {
        ui.setBusy(false);
      }
    },
  };

  // Event Listeners
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const btn = target.closest("button");
    if (!btn) {
      ui.closeIfOutside(target);
      return;
    }

    const action = btn.dataset.action;
    const network = btn.dataset.share;

    if (action === "toggle-share") {
      e.preventDefault();
      const isOpen = elements.menu?.classList.contains("is-open");
      ui.setMenuOpen(!isOpen);
      return;
    }

    if (network) {
      ui.setMenuOpen(false);
      actions
        .share(network)
        .then((res) => {
          ui.setStatus(res.message, "success");
          ui.showToast(res.message, "success");
        })
        .catch((err) => {
          if (err.message !== "تم إلغاء المشاركة") {
            ui.setStatus("تعذر المشاركة", "error");
            ui.showToast("تعذر المشاركة", "error");
          }
        });
      return;
    }

    if (action === "copy") {
      ui.setMenuOpen(false);
      if (isProcessing) return;
      isProcessing = true;
      actions
        .copyLink()
        .then(() => {
          ui.setStatus("تم نسخ الرابط", "success");
          ui.showToast("تم نسخ الرابط", "success");
        })
        .catch((err) => {
          console.error("Copy failed:", err);
          ui.setStatus("تعذر نسخ الرابط", "error");
          ui.showToast("تعذر نسخ الرابط", "error");
        })
        .finally(() => {
          isProcessing = false;
        });
      return;
    }

    if (action === "download") {
      ui.setMenuOpen(false);
      actions.downloadCertificate();
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      ui.setMenuOpen(false);
      return;
    }

    if (!elements.menu?.classList.contains("is-open")) return;

    const active = document.activeElement;
    if (active instanceof HTMLButtonElement && elements.menu.contains(active)) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        ui.moveFocus(active, 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        ui.moveFocus(active, -1);
      }
    }
  });
})();

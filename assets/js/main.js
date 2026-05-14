(async () => {
  const THEME_KEY = "portfolio-theme-preference";
  const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
  const themeButtons = [...document.querySelectorAll(".theme-btn[data-theme-value]")];

  const resolveTheme = (mode) => {
    if (mode === "system") {
      return mediaQuery.matches ? "light" : "dark";
    }

    return mode === "light" ? "light" : "dark";
  };

  const applyTheme = (mode) => {
    const resolved = resolveTheme(mode);
    document.body.setAttribute("data-theme", resolved);
    document.body.setAttribute("data-theme-mode", mode);
  };

  const getStoredThemeMode = () => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }

    return "dark";
  };

  const setThemeMode = (mode) => {
    localStorage.setItem(THEME_KEY, mode);
    applyTheme(mode);

    themeButtons.forEach((button) => {
      const isActive = button.getAttribute("data-theme-value") === mode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const initialThemeMode = getStoredThemeMode();
  applyTheme(initialThemeMode);

  if (themeButtons.length) {
    setThemeMode(initialThemeMode);

    themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextMode = button.getAttribute("data-theme-value");
        if (!nextMode) return;
        setThemeMode(nextMode);
      });
    });
  }

  mediaQuery.addEventListener("change", () => {
    if (getStoredThemeMode() === "system") {
      applyTheme("system");
    }
  });

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const VIDEO_QUERY_PARAM = "video";

  const normalizeVideoId = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const deriveVideoId = (entry, hdSrc, title) => {
    const explicitId = normalizeVideoId(entry?.id);
    if (explicitId) return explicitId;

    const sourceName = String(hdSrc || "")
      .split("/")
      .pop()
      ?.replace(/\.[a-z0-9]+$/i, "");
    const srcId = normalizeVideoId(sourceName);
    if (srcId) return srcId;

    const titleId = normalizeVideoId(title);
    if (titleId) return titleId;

    return "";
  };

  const buildPortfolioItem = (entry, previewSrc, hdSrc) => `
    <div class="video-item">
      <div
        class="video-wrapper"
        data-video-id="${escapeHtml(deriveVideoId(entry, hdSrc, entry.title))}"
        data-title="${escapeHtml(entry.title)}"
        data-fullhd="${escapeHtml(hdSrc)}"
        data-brand="${escapeHtml(entry.brand)}"
        data-description="${escapeHtml(entry.description)}"
        data-client-name="${escapeHtml(entry.clientName || entry.brand)}"
        data-review="${escapeHtml(entry.review)}"
        data-rating="${escapeHtml(entry.rating)}"
      >
        <video src="${escapeHtml(previewSrc)}" muted autoplay loop playsinline preload="metadata"></video>
        <div class="hover-overlay">
          <span class="overlay-text"></span>
        </div>
      </div>
    </div>
  `;

  const hydratePortfolioGridFromStaticData = async () => {
    const grid = document.querySelector("#portfolio .video-grid");
    if (!grid) return;

    try {
      let entries = Array.isArray(window.__PORTFOLIO_VIDEOS__)
        ? window.__PORTFOLIO_VIDEOS__
        : [];

      if (entries.length === 0) {
        const response = await fetch("data/videos.json");
        if (response.ok) {
          const body = await response.json();
          entries = Array.isArray(body) ? body : [];
        }
      }

      const validEntries = entries.filter(
        (item) => item.previewUrl && item.hdUrl
      );

      if (!validEntries.length) return;

      grid.innerHTML = validEntries
        .map((item) => buildPortfolioItem(item, item.previewUrl, item.hdUrl))
        .join("");
    } catch {
      // Keep default hardcoded markup if static data loading fails.
    }
  };

  await hydratePortfolioGridFromStaticData();

  const ensureVideoIds = () => {
    const usedIds = new Set();

    document.querySelectorAll(".video-wrapper").forEach((wrapper, index) => {
      const existingId = normalizeVideoId(wrapper.getAttribute("data-video-id"));
      const fallbackId = deriveVideoId(
        null,
        wrapper.getAttribute("data-fullhd"),
        wrapper.getAttribute("data-title")
      ) || `video-${index + 1}`;

      const baseId = existingId || fallbackId;
      let uniqueId = baseId;
      let suffix = 2;

      while (!uniqueId || usedIds.has(uniqueId)) {
        uniqueId = `${baseId}-${suffix}`;
        suffix += 1;
      }

      usedIds.add(uniqueId);
      wrapper.setAttribute("data-video-id", uniqueId);
    });
  };

  ensureVideoIds();

  document.addEventListener("contextmenu", (event) => event.preventDefault());

  const applyVideoProtection = (video) => {
    if (!(video instanceof HTMLVideoElement)) return;

    video.setAttribute("controlslist", "nodownload noplaybackrate noremoteplayback");
    video.setAttribute("disablepictureinpicture", "");
    video.setAttribute("disableremoteplayback", "");
  };

  const hideIdmOverlay = (root = document) => {
    const selectors = [
      "#idm_download",
      ".idm_download",
      '[title*="Download this video"]',
      '[aria-label*="Download this video"]',
    ];

    root.querySelectorAll(selectors.join(",")).forEach((node) => {
      node.style.setProperty("display", "none", "important");
      node.style.setProperty("visibility", "hidden", "important");
      node.style.setProperty("pointer-events", "none", "important");
    });
  };

  document.querySelectorAll("video").forEach((video) => {
    applyVideoProtection(video);
  });

  const protectionObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;

        if (node.matches("video")) applyVideoProtection(node);
        node.querySelectorAll?.("video").forEach((video) => applyVideoProtection(video));
      });
    });

    hideIdmOverlay();
  });

  protectionObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  hideIdmOverlay();

  document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
    const overlayText = wrapper.querySelector(".overlay-text");
    const title = wrapper.getAttribute("data-title");

    if (overlayText && title) {
      overlayText.innerHTML = "";
      [...title].forEach((char, index) => {
        const span = document.createElement("span");
        span.className = "overlay-char";
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.animationDelay = `${index * 15}ms`;
        overlayText.appendChild(span);
      });
    }

    wrapper.addEventListener("mouseenter", () => {
      wrapper.classList.add("hovering");
    });

    wrapper.addEventListener("mouseleave", () => {
      wrapper.classList.remove("hovering");
    });
  });

  const previewObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector("video");
        if (!video) return;

        if (document.body.classList.contains("modal-open")) {
          video.pause();
          return;
        }

        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
    if (wrapper.querySelector("video")) {
      previewObserver.observe(wrapper);
    }
  });

  const pauseAllPreviewVideos = () => {
    document.querySelectorAll(".video-wrapper video").forEach((video) => {
      video.pause();
    });
  };

  const resumeVisiblePreviewVideos = () => {
    if (document.body.classList.contains("modal-open")) return;

    document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
      const video = wrapper.querySelector("video");
      if (!video) return;

      const rect = wrapper.getBoundingClientRect();
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      const threshold = rect.height * 0.3;

      if (visibleHeight >= threshold) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  };

  const nav = document.getElementById("nav");
  const mainContainer = document.getElementById("main");
  const navLinks = nav
    ? [...nav.querySelectorAll('a[href^="#"]')]
    : [];

  const getNavAlignmentOffset = () => {
    if (!nav) return 0;
    const navStyle = window.getComputedStyle(nav);
    if (navStyle.display === "none") return 0;

    const navRect = nav.getBoundingClientRect();
    return navRect.top + navRect.height / 2;
  };

  const setActiveNavLink = (targetId) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${targetId}`);
    });
  };

  const navSections = navLinks
    .map((link) => {
      const selector = link.getAttribute("href");
      if (!selector) return null;
      return document.querySelector(selector);
    })
    .filter(Boolean);

  const getSectionTopForAlignment = (section) => {
    if (!section) return 0;

    if (section.id === "intro" && mainContainer) {
      return mainContainer.getBoundingClientRect().top + window.scrollY;
    }

    return section.getBoundingClientRect().top + window.scrollY;
  };

  const updateActiveSectionFromScroll = () => {
    if (navSections.length === 0) return;

    const marker = window.scrollY + getNavAlignmentOffset() + 8;
    let currentSection = navSections[0];

    navSections.forEach((section) => {
      if (getSectionTopForAlignment(section) <= marker) currentSection = section;
    });

    if (currentSection?.id) setActiveNavLink(currentSection.id);
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetSelector = link.getAttribute("href");
      if (!targetSelector || targetSelector.charAt(0) !== "#") return;

      const target = document.querySelector(targetSelector);
      if (!target) return;

      event.preventDefault();
      const top = getSectionTopForAlignment(target) - getNavAlignmentOffset();

      setActiveNavLink(target.id);
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      history.pushState(null, "", targetSelector);
    });
  });

  const alignNavOnInitialLoad = () => {
    if (navSections.length === 0) return;

    const hash = window.location.hash;
    const hashTarget = hash ? document.querySelector(hash) : null;
    const target =
      hashTarget && navSections.includes(hashTarget)
        ? hashTarget
        : navSections[0];

    if (!target) return;

    const alignedTop = Math.max(
      0,
      getSectionTopForAlignment(target) - getNavAlignmentOffset()
    );

    if (Math.abs(window.scrollY - alignedTop) > 1) {
      window.scrollTo({ top: alignedTop, behavior: "auto" });
    }

    if (target.id) setActiveNavLink(target.id);
  };

  window.addEventListener("load", () => {
    setTimeout(() => document.body.classList.remove("is-preload"), 100);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alignNavOnInitialLoad();
        updateActiveSectionFromScroll();
      });
    });
  });

  window.addEventListener("scroll", updateActiveSectionFromScroll, {
    passive: true,
  });
  window.addEventListener("resize", updateActiveSectionFromScroll);
  updateActiveSectionFromScroll();

  const modal = document.getElementById("videoModal");
  const modalVideo = document.getElementById("modalVideo");
  const modalTitle = document.getElementById("modalTitle");
  const modalBrand = document.getElementById("modalBrand");
  const modalDescription = document.getElementById("modalDescription");
  const modalClientName = document.getElementById("modalClientName");
  const modalReview = document.getElementById("modalReview");
  const modalStars = document.getElementById("modalStars");
  const shareModalLinkButton = document.getElementById("shareModalLink");
  let currentModalVideoId = "";

  const getVideoIdFromLocation = () => {
    const params = new URLSearchParams(window.location.search);
    return normalizeVideoId(params.get(VIDEO_QUERY_PARAM));
  };

  const buildUrlWithVideo = (videoId) => {
    const url = new URL(window.location.href);
    url.searchParams.set(VIDEO_QUERY_PARAM, videoId);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const buildUrlWithoutVideo = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete(VIDEO_QUERY_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const buildAbsoluteShareUrl = (videoId) => {
    const url = new URL(window.location.href);
    url.searchParams.set(VIDEO_QUERY_PARAM, videoId);
    return url.toString();
  };

  const copyTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  };

  const findWrapperByVideoId = (videoId) => {
    if (!videoId) return null;

    return (
      [...document.querySelectorAll(".video-wrapper")].find(
        (wrapper) => normalizeVideoId(wrapper.getAttribute("data-video-id")) === videoId
      ) || null
    );
  };

  const showModalForWrapper = (wrapper, { syncUrl = false, historyMode = "push" } = {}) => {
    const fullHdSrc = wrapper.getAttribute("data-fullhd");
    const title = wrapper.getAttribute("data-title") || "Project Video";
    const brand = wrapper.getAttribute("data-brand") || "Confidential Brand";
    const description =
      wrapper.getAttribute("data-description") ||
      "Premium cinematic 3D animation crafted with a modern visual style.";
    const clientName =
      wrapper.getAttribute("data-client-name") ||
      wrapper.getAttribute("data-client") ||
      brand ||
      "Client";
    const review =
      wrapper.getAttribute("data-review") ||
      "Kashem delivered a very good result with professional quality.";
    const rating = Math.max(
      1,
      Math.min(5, Number.parseInt(wrapper.getAttribute("data-rating") || "5", 10))
    );
    const videoId = normalizeVideoId(wrapper.getAttribute("data-video-id"));

    if (!modal || !modalVideo || !fullHdSrc || !videoId) return;

    currentModalVideoId = videoId;

    modalVideo.src = fullHdSrc;
    applyVideoProtection(modalVideo);
    modal.style.display = "flex";
    if (modalTitle) modalTitle.textContent = title;
    if (modalBrand) modalBrand.textContent = brand;
    if (modalDescription) modalDescription.textContent = description;
    if (modalClientName) modalClientName.textContent = clientName;
    if (modalReview) modalReview.textContent = review;

    if (modalStars) {
      modalStars.innerHTML = "";
      for (let i = 1; i <= 5; i += 1) {
        const star = document.createElement("span");
        star.className = `star${i > rating ? " inactive" : ""}`;
        star.textContent = "\u2605";
        modalStars.appendChild(star);
      }
      modalStars.setAttribute("aria-label", `Client rating: ${rating} out of 5`);
    }

    pauseAllPreviewVideos();
    document.body.classList.add("modal-open");

    if (syncUrl) {
      const nextUrl = buildUrlWithVideo(videoId);
      const nextState = { ...(history.state || {}), modal: true, videoId };

      if (historyMode === "replace") {
        history.replaceState(nextState, "", nextUrl);
      } else {
        history.pushState(nextState, "", nextUrl);
      }
    }
  };

  const hideModal = ({ syncUrl = false } = {}) => {
    if (!modal || !modalVideo) return;

    currentModalVideoId = "";
    if (shareModalLinkButton) {
      shareModalLinkButton.classList.remove("copied");
      shareModalLinkButton.title = "Copy share link";
      shareModalLinkButton.setAttribute("aria-label", "Copy share link");
    }

    modal.style.display = "none";
    modalVideo.pause();
    modalVideo.src = "";

    document.body.classList.remove("modal-open");
    resumeVisiblePreviewVideos();

    if (!syncUrl) return;

    if (history.state?.modal) {
      history.back();
      return;
    }

    if (getVideoIdFromLocation()) {
      history.replaceState(history.state, "", buildUrlWithoutVideo());
    }
  };

  const syncModalFromUrl = () => {
    const requestedVideoId = getVideoIdFromLocation();

    if (!requestedVideoId) {
      hideModal();
      return;
    }

    const targetWrapper = findWrapperByVideoId(requestedVideoId);
    if (!targetWrapper) {
      hideModal();
      history.replaceState(history.state, "", buildUrlWithoutVideo());
      return;
    }

    showModalForWrapper(targetWrapper);
  };

  document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
    wrapper.addEventListener("click", () => {
      showModalForWrapper(wrapper, { syncUrl: true, historyMode: "push" });
    });
  });

  const closeButton = document.querySelector(".close-btn");

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      hideModal({ syncUrl: true });
    });
  }

  if (shareModalLinkButton) {
    shareModalLinkButton.addEventListener("click", async () => {
      const videoId = currentModalVideoId || getVideoIdFromLocation();
      if (!videoId) return;

      try {
        await copyTextToClipboard(buildAbsoluteShareUrl(videoId));
        shareModalLinkButton.classList.add("copied");
        shareModalLinkButton.title = "Copied link";
        shareModalLinkButton.setAttribute("aria-label", "Copied link");
        window.setTimeout(() => {
          shareModalLinkButton.classList.remove("copied");
          shareModalLinkButton.title = "Copy share link";
          shareModalLinkButton.setAttribute("aria-label", "Copy share link");
        }, 1200);
      } catch {
        shareModalLinkButton.title = "Unable to copy";
        shareModalLinkButton.setAttribute("aria-label", "Unable to copy");
      }
    });
  }

  window.addEventListener("click", (event) => {
    if (!modal || event.target !== modal) return;
    hideModal({ syncUrl: true });
  });

  window.addEventListener("popstate", syncModalFromUrl);
  syncModalFromUrl();
})();

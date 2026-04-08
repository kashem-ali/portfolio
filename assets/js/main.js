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

  const buildPortfolioItem = (entry, previewSrc, hdSrc) => `
    <div class="video-item">
      <div
        class="video-wrapper"
        data-title="${escapeHtml(entry.title)}"
        data-fullhd="${escapeHtml(hdSrc)}"
        data-brand="${escapeHtml(entry.brand)}"
        data-description="${escapeHtml(entry.description)}"
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

  document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
    wrapper.addEventListener("click", () => {
      const modal = document.getElementById("videoModal");
      const modalVideo = document.getElementById("modalVideo");
      const modalTitle = document.getElementById("modalTitle");
      const modalBrand = document.getElementById("modalBrand");
      const modalDescription = document.getElementById("modalDescription");
      const modalReview = document.getElementById("modalReview");
      const modalStars = document.getElementById("modalStars");
      const fullHdSrc = wrapper.getAttribute("data-fullhd");
      const title = wrapper.getAttribute("data-title") || "Project Video";
      const brand = wrapper.getAttribute("data-brand") || "Confidential Brand";
      const description =
        wrapper.getAttribute("data-description") ||
        "Premium cinematic 3D animation crafted with a modern visual style.";
      const review =
        wrapper.getAttribute("data-review") ||
        "Kashem delivered a very good result with professional quality.";
      const rating = Math.max(
        1,
        Math.min(5, Number.parseInt(wrapper.getAttribute("data-rating") || "5", 10))
      );

      if (!modal || !modalVideo || !fullHdSrc) return;

      modalVideo.src = fullHdSrc;
      applyVideoProtection(modalVideo);
      modal.style.display = "flex";
      if (modalTitle) modalTitle.textContent = title;
      if (modalBrand) modalBrand.textContent = brand;
      if (modalDescription) modalDescription.textContent = description;
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
    });
  });

  const closeButton = document.querySelector(".close-btn");

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      const modal = document.getElementById("videoModal");
      const modalVideo = document.getElementById("modalVideo");

      if (!modal || !modalVideo) return;

      modal.style.display = "none";
      modalVideo.pause();
      modalVideo.src = "";

      document.body.classList.remove("modal-open");
      resumeVisiblePreviewVideos();
    });
  }

  window.addEventListener("click", (event) => {
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");

    if (!modal || !modalVideo || event.target !== modal) return;

    modal.style.display = "none";
    modalVideo.pause();
    modalVideo.src = "";

    document.body.classList.remove("modal-open");
    resumeVisiblePreviewVideos();
  });
})();

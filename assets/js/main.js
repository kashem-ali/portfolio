document.addEventListener("contextmenu", (event) => event.preventDefault());

// this block sets up hover and click events for each video preview, and animates overlay text
document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
  const video = wrapper.querySelector("video");
  const overlayText = wrapper.querySelector(".overlay-text");
  const title = wrapper.getAttribute("data-title");
  if (overlayText && title) {
    const characters = [...title];
    overlayText.innerHTML = "";
    characters.forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "overlay-char";
      span.textContent = char === " " ? "\u00A0" : char;
      span.style.animationDelay = `${i * 15}ms`;
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

// this block uses IntersectionObserver to auto-play/pause preview videos when in/out of view
const previewObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector("video");
      if (!video) return;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  },
  {
    threshold: 0.3,
  }
);

// this block attaches the observer to each video preview wrapper
document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
  const video = wrapper.querySelector("video");
  if (video && wrapper !== document.getElementById("videoModal")) {
    previewObserver.observe(wrapper);
  }
});

// this block sets up the shorts carousel variables and navigation buttons
const track = document.querySelector(".shorts-track");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let shorts = Array.from(document.querySelectorAll(".shorts-video"));

const visibleCount = 3;
const cloneCount = visibleCount;
let shortsIndex = cloneCount;
let isMutedByUser = false; // start false → first reel will have sound
let isBusy = false;
let isShortsSectionVisible = false;

// this block clones slides at the start and end for infinite carousel looping
function cloneSlides() {
  const originals = Array.from(document.querySelectorAll(".shorts-video"));
  for (let i = 0; i < cloneCount; i++) {
    const first = originals[i].cloneNode(true);
    const last = originals[originals.length - 1 - i].cloneNode(true);
    first.classList.add("clone");
    last.classList.add("clone");
    track.appendChild(first);
    track.insertBefore(last, track.firstChild);
  }
  shorts = Array.from(document.querySelectorAll(".shorts-video"));
}

// this block updates the shorts carousel position and controls, and handles video play state
function updateShortsCarousel(skipTransition = false) {
  const container = document.querySelector(".shorts-viewport");
  const centerSlide = shorts[shortsIndex];
  const slideWidth = centerSlide.offsetWidth + 20;
  const offset =
    slideWidth * shortsIndex -
    (container.offsetWidth / 2 - centerSlide.offsetWidth / 2);
  track.style.transition = skipTransition
    ? "none"
    : "transform 0.4s ease-in-out";
  track.style.transform = `translateX(-${offset}px)`;
  shorts.forEach((slide, i) => {
    const video = slide.querySelector("video");
    const oldControls = slide.querySelector(".shorts-controls");
    if (oldControls) oldControls.remove();
    if (!video) return;
    if (i === shortsIndex) {
      slide.classList.add("active");

      // Unmute only if user hasn’t muted manually
      video.muted = isMutedByUser;
      video.volume = Math.min(0.4, video.volume); // Cap volume at 70%

      if (isShortsSectionVisible) {
        if (video.paused && video.currentTime < video.duration) {
          video.play().catch(() => {});
        }
      }

      // 👇 Continue to create controls (as your current code does)
      const controlDiv = document.createElement("div");
      controlDiv.className = "shorts-controls";

      const playBtn = document.createElement("button");
      playBtn.className = "play-toggle";
      playBtn.setAttribute("aria-label", "Play/Pause");

      const playIcon = document.createElement("i");
      playIcon.className = video.paused
        ? "bi bi-play-fill"
        : "bi bi-pause-fill";
      playBtn.appendChild(playIcon);
      controlDiv.appendChild(playBtn);

      const muteBtn = document.createElement("button");
      muteBtn.className = "mute-toggle";
      muteBtn.setAttribute("aria-label", "Mute/Unmute");

      const muteIcon = document.createElement("i");
      muteIcon.className = video.muted
        ? "bi bi-volume-mute-fill"
        : "bi bi-volume-up-fill";
      muteBtn.appendChild(muteIcon);
      controlDiv.appendChild(muteBtn);
      slide.appendChild(controlDiv);
    } else {
      slide.classList.remove("active");
      video.pause();
      video.currentTime = 0;
      video.muted = true;
    }
  });
}

// this block corrects the carousel index for infinite looping
function correctShortsLoop() {
  const total = shorts.length;
  if (shortsIndex >= total - cloneCount) {
    shortsIndex = cloneCount;
    disableShortsTransitionTemporarily();
  }
  if (shortsIndex < cloneCount) {
    shortsIndex = total - cloneCount - 1;
    disableShortsTransitionTemporarily();
  }
}

// this block disables carousel transition briefly for seamless looping
function disableShortsTransitionTemporarily() {
  requestAnimationFrame(() => {
    track.style.transition = "none";
    updateShortsCarousel(true);
    requestAnimationFrame(() => {
      track.style.transition = "transform 0.4s ease-in-out";
    });
  });
}

// this block debounces carousel navigation to prevent rapid clicks
function debounce(fn) {
  if (isBusy) return;
  isBusy = true;
  fn();
  setTimeout(() => (isBusy = false), 420);
}

// this block enables auto-advance to next short when a video ends
function initAutoSlideOnEnd() {
  shorts.forEach((slide) => {
    const video = slide.querySelector("video");
    if (!video) return;
    video.onended = () => {
      if (!slide.classList.contains("active")) return;
      if (!isShortsSectionVisible) return;
      shortsIndex++;
      updateShortsCarousel(false);
      setTimeout(correctShortsLoop, 410);
    };
  });
}

// this block initializes the shorts carousel and auto-slide functionality
cloneSlides();
shorts = Array.from(document.querySelectorAll(".shorts-video"));
initAutoSlideOnEnd();

// this block handles next and previous button clicks for the shorts carousel
nextBtn.addEventListener("click", () => {
  setTimeout(() => {
    debounce(() => {
      shortsIndex++;
      updateShortsCarousel(false);
      setTimeout(correctShortsLoop, 410);
    });
  }, 50);
});

prevBtn.addEventListener("click", () => {
  debounce(() => {
    shortsIndex--;
    updateShortsCarousel(false);
    setTimeout(correctShortsLoop, 410);
  });
});

// this block observes the shorts section to pause videos when out of view
const shortsSection = document.querySelector("#second.short-videos");

const shortsSectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      isShortsSectionVisible = entry.isIntersecting;
      if (!isShortsSectionVisible) {
        document
          .querySelectorAll(".shorts-video video")
          .forEach((video) => video.pause());
      } else {
        updateShortsCarousel(false);
      }
    });
  },
  {
    threshold: 0.80, // Trigger when 55% of the section is visible
  }
);

if (shortsSection) shortsSectionObserver.observe(shortsSection);

// this block handles play/pause and mute/unmute button clicks for shorts videos
document.addEventListener("click", function (e) {
  const playBtn = e.target.closest(".play-toggle");
  if (playBtn) {
    const slide = playBtn.closest(".shorts-video");
    const video = slide?.querySelector("video");
    const icon = playBtn.querySelector("i");
    if (video && icon) {
      if (video.paused) {
        video.play();
        icon.className = "bi bi-pause-fill";
      } else {
        video.pause();
        icon.className = "bi bi-play-fill";
      }
    }
  }
  const muteBtn = e.target.closest(".mute-toggle");
  if (muteBtn) {
    const slide = muteBtn.closest(".shorts-video");
    const video = slide?.querySelector("video");
    const icon = muteBtn.querySelector("i");
    if (video && icon) {
      video.muted = !video.muted;
      icon.className = video.muted
        ? "bi bi-volume-mute-fill"
        : "bi bi-volume-up-fill";

      // ➕ Add this line:
      isMutedByUser = video.muted; // Update global sound preference
    }
  }
});

// this block handles responsive breakpoints and navigation for the HTML5 UP Stellar theme
(function ($) {
  const $window = $(window),
    $body = $("body"),
    $main = $("#main");
  breakpoints({
    xlarge: ["1281px", "1680px"],
    large: ["981px", "1280px"],
    medium: ["737px", "980px"],
    small: ["481px", "736px"],
    xsmall: [null, "480px"],
  });
  breakpoints.on(">medium", () =>
    $body.removeClass("is-medium is-small is-xsmall is-xxsmall")
  );
  breakpoints.on("<=medium", () =>
    $body.addClass("is-medium").removeClass("is-small is-xsmall is-xxsmall")
  );
  breakpoints.on("<=small", () =>
    $body.addClass("is-small").removeClass("is-medium is-xsmall is-xxsmall")
  );
  breakpoints.on("<=xsmall", () =>
    $body.addClass("is-xsmall").removeClass("is-medium is-small is-xxsmall")
  );
  breakpoints.on("<=480px", () => $body.addClass("is-xxsmall"));
  breakpoints.on(">xsmall", () => $body.removeClass("is-xsmall is-xxsmall"));
  breakpoints.on(">small", () =>
    $body.removeClass("is-small is-xsmall is-xxsmall")
  );
  $window.on("load", () => {
    setTimeout(() => $body.removeClass("is-preload"), 100);
  });
  const $nav = $("#nav");
  const $navLinks = $nav.find("a");
  if ($nav.length > 0) {
    $main.scrollex({
      mode: "top",
      enter: () => $nav.addClass("alt"),
      leave: () => $nav.removeClass("alt"),
    });
    $navLinks
      .scrolly({
        speed: 1000,
        offset: () => $nav.height(),
      })
      .on("click", function () {
        const $this = $(this);
        if ($this.attr("href").charAt(0) !== "#") return;
        $navLinks.removeClass("active active-locked");
        $this.addClass("active active-locked");
      })
      .each(function () {
        const $this = $(this),
          id = $this.attr("href"),
          $section = $(id);
        if ($section.length < 1) return;
        $section.scrollex({
          mode: "middle",
          initialize: () => {
            if (browser.canUse("transition")) $section.addClass("inactive");
          },
          enter: () => {
            $section.removeClass("inactive");
            if ($navLinks.filter(".active-locked").length === 0) {
              $navLinks.removeClass("active");
              $this.addClass("active");
            } else if ($this.hasClass("active-locked")) {
              $this.removeClass("active-locked");
            }
          },
        });
      });
  }
  $(".scrolly").scrolly({
    speed: 1000,
  });
})(jQuery);

// this block opens the modal and plays the high-quality video
document.querySelectorAll(".video-wrapper").forEach((wrapper) => {
  wrapper.addEventListener("click", () => {
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");
    const fullHdSrc = wrapper.getAttribute("data-fullhd");
    if (fullHdSrc) {
      modalVideo.src = fullHdSrc;
      modal.style.display = "flex";

      // Pause all background videos
      document.querySelectorAll(".video-wrapper video").forEach((video) => {
        video.pause();
      });

      // Disable scrolling
      document.body.classList.add("modal-open");
    }
  });
});

document.querySelector(".close-btn").addEventListener("click", () => {
  const modal = document.getElementById("videoModal");
  const modalVideo = document.getElementById("modalVideo");
  modal.style.display = "none";
  modalVideo.pause();
  modalVideo.src = "";

  // Resume background videos
  document.querySelectorAll(".video-wrapper video").forEach((video) => {
    video.play().catch(() => {});
  });

  // Enable scrolling
  document.body.classList.remove("modal-open");
});

window.addEventListener("click", (event) => {
  const modal = document.getElementById("videoModal");
  if (event.target === modal) {
    const modalVideo = document.getElementById("modalVideo");
    modal.style.display = "none";
    modalVideo.pause();
    modalVideo.src = "";

    // Resume background videos
    document.querySelectorAll(".video-wrapper video").forEach((video) => {
      video.play().catch(() => {});
    });

    // Enable scrolling
    document.body.classList.remove("modal-open");
  }
});

  document.addEventListener("DOMContentLoaded", () => {
    const track = document.querySelector(".carousel-track");
    const videoHolders = document.querySelectorAll(".video-holder");
    const prevBtn = document.querySelector(".bi-caret-left-fill").closest(".lnav");
    const nextBtn = document.querySelector(".bi-caret-right-fill").closest(".lnav");
    let currentIndex = 0;

    const updateCarousel = () => {
      const offset = -600 * currentIndex;
      track.style.transform = `translateX(${offset}px)`;

      // Pause all videos
      videoHolders.forEach((holder, index) => {
        const iframe = holder.querySelector("iframe");
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      });

      // Play the current video
      const activeIframe = videoHolders[currentIndex].querySelector("iframe");
      activeIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    };

    prevBtn.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + videoHolders.length) % videoHolders.length;
      updateCarousel();
    });

    nextBtn.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % videoHolders.length;
      updateCarousel();
    });

    // Enable API control by adding ?enablejsapi=1 (already done in the iframe links!)
    updateCarousel();
  });

  // Setup YouTube autoplay when visible
const ytObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const iframe = entry.target.querySelector("iframe");
    if (!iframe) return;

    // Try to play/pause via YouTube postMessage API
    if (entry.isIntersecting) {
      iframe.contentWindow.postMessage(
        '{"event":"command","func":"playVideo","args":""}', '*'
      );
    } else {
      iframe.contentWindow.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}', '*'
      );
    }
  });
}, {
  threshold: 0.8, // Adjust to control when "visible enough"
});

// Apply to each video-holder (skip if not YouTube iframe)
document.querySelectorAll('.video-holder').forEach(holder => {
  if (holder.querySelector('iframe')) {
    ytObserver.observe(holder);
  }
});
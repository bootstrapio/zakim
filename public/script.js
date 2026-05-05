const video = document.querySelector(".splash__video");
const reveal = document.querySelector(".brand-reveal");
const revealPanel = document.querySelector(".brand-reveal__panel");
const revealMaskFill = document.querySelector(".brand-reveal__mask-fill");
const revealLogo = document.querySelector(".brand-reveal__logo");
const lockLogo = document.querySelector(".brand-lock__logo");

const revealStartsAt = 3;
const revealEndsAt = 8;
const scaleEndsAt = 7;
const lockStartsAt = 7;
const overlayFadeDuration = 0.7;
const startScale = 9;
const endScale = 1;
const logoAspectRatio = 2020 / 440;
const maxLogoWidth = 768;
const minViewportInset = 24;
const maxViewportInset = 80;
const viewportInsetRatio = 0.08;

let hasStopped = false;
let frameRequest = null;

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value) {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeInQuad(value) {
  return value * value;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateRevealGeometry() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportInset = clamp(
    viewportWidth * viewportInsetRatio,
    minViewportInset,
    maxViewportInset,
  );
  const availableLogoWidth = Math.max(0, viewportWidth - viewportInset * 2);
  const logoWidth = Math.min(maxLogoWidth, availableLogoWidth);
  const logoHeight = logoWidth / logoAspectRatio;
  const logoX = (viewportWidth - logoWidth) / 2;
  const logoY = (viewportHeight - logoHeight) / 2;

  reveal.setAttribute("viewBox", `0 0 ${viewportWidth} ${viewportHeight}`);
  revealPanel.setAttribute("width", viewportWidth);
  revealPanel.setAttribute("height", viewportHeight);
  revealMaskFill.setAttribute("width", viewportWidth);
  revealMaskFill.setAttribute("height", viewportHeight);
  revealLogo.setAttribute("x", logoX);
  revealLogo.setAttribute("y", logoY);
  revealLogo.setAttribute("width", logoWidth);
  revealLogo.setAttribute("height", logoHeight);
  lockLogo.setAttribute("x", logoX);
  lockLogo.setAttribute("y", logoY);
  lockLogo.setAttribute("width", logoWidth);
  lockLogo.setAttribute("height", logoHeight);
}

function syncReveal() {
  const currentTime = video.currentTime;

  if (currentTime >= revealStartsAt) {
    const progress = clamp(
      (currentTime - revealStartsAt) / (scaleEndsAt - revealStartsAt),
      0,
      1,
    );
    const easedProgress = easeOutCubic(progress);
    const scale = startScale - (startScale - endScale) * easedProgress;
    const overlayProgress = clamp(
      (currentTime - revealStartsAt) / overlayFadeDuration,
      0,
      1,
    );

    reveal.style.setProperty("--zakim-scale", scale.toFixed(4));
    reveal.style.setProperty(
      "--overlay-opacity",
      easeInOutCubic(overlayProgress).toFixed(4),
    );
  }

  if (currentTime >= lockStartsAt) {
    const lockProgress = clamp(
      (currentTime - lockStartsAt) / (revealEndsAt - lockStartsAt),
      0,
      1,
    );

    reveal.style.setProperty(
      "--black-logo-opacity",
      easeInQuad(lockProgress).toFixed(4),
    );
    lockLogo.setAttribute("opacity", easeInQuad(lockProgress).toFixed(4));
  }

  if (currentTime >= revealEndsAt && !hasStopped) {
    stopReveal();
    return;
  }

  frameRequest = requestAnimationFrame(syncReveal);
}

function stopReveal() {
  hasStopped = true;
  reveal.style.setProperty("--zakim-scale", String(endScale));
  reveal.style.setProperty("--overlay-opacity", "1");
  reveal.style.setProperty("--black-logo-opacity", "1");
  lockLogo.setAttribute("opacity", "1");
  video.pause();

  if (Number.isFinite(video.duration)) {
    video.currentTime = Math.min(revealEndsAt, video.duration);
  } else {
    video.currentTime = revealEndsAt;
  }

  if (frameRequest) {
    cancelAnimationFrame(frameRequest);
  }
}

video.addEventListener("play", () => {
  updateRevealGeometry();
  frameRequest = requestAnimationFrame(syncReveal);
});

video.addEventListener("loadedmetadata", () => {
  if (video.currentTime >= revealEndsAt) {
    video.currentTime = 0;
  }
});

video.addEventListener("ended", () => {
  if (!hasStopped) {
    stopReveal();
  }
});

window.addEventListener("resize", updateRevealGeometry);
updateRevealGeometry();

(() => {
  "use strict";

  const mite = document.querySelector(".mite-walker");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!mite || reducedMotion.matches || typeof mite.animate !== "function") {
    return;
  }

  const random = (min, max) => min + Math.random() * (max - min);
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  let activeAnimation = null;
  let direction = Math.random() < 0.5 ? 1 : -1;

  function route(fromLeft) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const miteSize = mite.getBoundingClientRect().width || 20;
    const startX = fromLeft ? -miteSize - 4 : width + 4;
    const finishX = fromLeft ? width + 4 : -miteSize - 4;
    const lowerBandTop = Math.min(height - miteSize - 16, Math.max(190, height * 0.56));
    const lowerBandBottom = Math.max(lowerBandTop, height - miteSize - 18);
    const corridorY = random(lowerBandTop, lowerBandBottom);
    const bend = Math.min(34, Math.max(8, height * 0.045));
    const points = [];
    const sections = 5;

    for (let index = 0; index <= sections; index += 1) {
      const progress = index / sections;
      const x = startX + (finishX - startX) * progress;
      const y = Math.max(
        lowerBandTop,
        Math.min(lowerBandBottom, corridorY + random(-bend, bend))
      );

      points.push({ x, y });
    }

    return points;
  }

  async function crossScreen(fromLeft) {
    const points = route(fromLeft);
    const facing = fromLeft ? 90 : -90;
    const distance = Math.abs(points[points.length - 1].x - points[0].x);
    const duration = (distance / random(15, 22)) * 1000;
    const keyframes = points.map((point, index) => ({
      transform: `translate3d(${point.x}px, ${point.y}px, 0) rotate(${facing + random(-3, 3)}deg)`,
      opacity: index === 0 || index === points.length - 1 ? 0 : 0.82,
      offset: index / (points.length - 1)
    }));

    activeAnimation = mite.animate(keyframes, {
      duration,
      easing: "linear",
      fill: "forwards"
    });

    if (document.hidden) {
      activeAnimation.pause();
    }

    try {
      await activeAnimation.finished;
    } catch (_error) {
      // Resizing or leaving the page can cancel an in-progress crossing.
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (!activeAnimation) return;
    document.hidden ? activeAnimation.pause() : activeAnimation.play();
  });

  async function wander() {
    await wait(random(500, 1800));

    while (document.body.contains(mite)) {
      await crossScreen(direction === 1);
      direction *= -1;
      await wait(random(900, 3200));
    }
  }

  wander();
})();

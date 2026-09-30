(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  const STORAGE_KEY = "belba-mite-position-v2";
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const normalizeAngle = (angle) => {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  };

  let mite = document.querySelector(".mite-walker");

  if (!mite) {
    mite = document.createElement("img");
    mite.className = "mite-walker";
    mite.src = "/assets/mite-walker.png";
    mite.alt = "";
    mite.setAttribute("aria-hidden", "true");
    document.body.appendChild(mite);
  }

  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  } catch (_error) {
    stored = null;
  }

  const miteSize = mite.getBoundingClientRect().width || 20;
  const margin = 10;
  const maxX = () => Math.max(margin, window.innerWidth - miteSize - margin);
  const maxY = () => Math.max(margin, window.innerHeight - miteSize - margin);

  function firstPosition() {
    const enter = document.querySelector('a[href="/archive.html"]');

    if (enter) {
      const rect = enter.getBoundingClientRect();
      return {
        x: clamp(rect.right + random(28, 75), margin, maxX()),
        y: clamp(rect.top + random(-12, 35), margin, maxY())
      };
    }

    return {
      x: random(window.innerWidth * 0.22, window.innerWidth * 0.55),
      y: random(window.innerHeight * 0.18, window.innerHeight * 0.38)
    };
  }

  const start = firstPosition();
  let x = Number.isFinite(stored?.x) ? clamp(stored.x, margin, maxX()) : start.x;
  let y = Number.isFinite(stored?.y) ? clamp(stored.y, margin, maxY()) : start.y;
  let angle = Number.isFinite(stored?.angle) ? stored.angle : random(-Math.PI, Math.PI);
  let targetAngle = Number.isFinite(stored?.targetAngle)
    ? stored.targetAngle
    : angle + random(-1.35, 1.35);
  let speed = Number.isFinite(stored?.speed) ? stored.speed : random(10, 20);
  let targetSpeed = Number.isFinite(stored?.targetSpeed)
    ? stored.targetSpeed
    : random(7, 25);
  let nextTurn = performance.now() + random(500, 1700);
  let previousTime = performance.now();
  let lastSave = 0;
  let animationFrame = 0;

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        x,
        y,
        angle,
        targetAngle,
        speed,
        targetSpeed
      }));
    } catch (_error) {
      // The animation still works when storage is unavailable.
    }
  }

  function render() {
    const rotation = (angle * 180) / Math.PI + 90;
    mite.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
    mite.style.opacity = "0.82";
  }

  function chooseNewMotion(now) {
    const sharperTurn = Math.random() < 0.28;
    const turn = sharperTurn ? random(-2.35, 2.35) : random(-1.15, 1.15);

    targetAngle = normalizeAngle(angle + turn);
    targetSpeed = Math.random() < 0.16 ? random(3, 8) : random(9, 27);
    nextTurn = now + random(650, 2400);
  }

  function bounceFromEdges() {
    let bounced = false;

    if (x <= margin || x >= maxX()) {
      x = clamp(x, margin, maxX());
      angle = Math.PI - angle;
      bounced = true;
    }

    if (y <= margin || y >= maxY()) {
      y = clamp(y, margin, maxY());
      angle = -angle;
      bounced = true;
    }

    if (bounced) {
      angle = normalizeAngle(angle);
      targetAngle = normalizeAngle(angle + random(-0.7, 0.7));
      nextTurn = performance.now() + random(700, 1800);
    }
  }

  function move(now) {
    const elapsed = Math.min((now - previousTime) / 1000, 0.06);
    previousTime = now;

    if (now >= nextTurn) chooseNewMotion(now);

    const angleDifference = normalizeAngle(targetAngle - angle);
    angle = normalizeAngle(angle + angleDifference * Math.min(1, elapsed * 1.45));
    speed += (targetSpeed - speed) * Math.min(1, elapsed * 1.15);

    x += Math.cos(angle) * speed * elapsed;
    y += Math.sin(angle) * speed * elapsed;
    bounceFromEdges();
    render();

    if (now - lastSave > 180) {
      saveState();
      lastSave = now;
    }

    animationFrame = requestAnimationFrame(move);
  }

  window.addEventListener("resize", () => {
    x = clamp(x, margin, maxX());
    y = clamp(y, margin, maxY());
    render();
    saveState();
  });

  window.addEventListener("pagehide", () => {
    saveState();
    cancelAnimationFrame(animationFrame);
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;

    try {
      const latest = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(latest?.x)) x = clamp(latest.x, margin, maxX());
      if (Number.isFinite(latest?.y)) y = clamp(latest.y, margin, maxY());
      if (Number.isFinite(latest?.angle)) angle = latest.angle;
      if (Number.isFinite(latest?.targetAngle)) targetAngle = latest.targetAngle;
      if (Number.isFinite(latest?.speed)) speed = latest.speed;
      if (Number.isFinite(latest?.targetSpeed)) targetSpeed = latest.targetSpeed;
    } catch (_error) {
      // Keep the in-memory position if the saved state cannot be read.
    }

    previousTime = performance.now();
    render();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(move);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      saveState();
      cancelAnimationFrame(animationFrame);
      return;
    }

    previousTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(move);
  });

  render();
  animationFrame = requestAnimationFrame(move);
})();

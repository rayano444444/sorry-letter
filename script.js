/* =========================================================
   I'm sorry — and I love you
   hearts, glow, reveals, a little magic
   ========================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------
     1. floating hearts canvas
     --------------------------------------------------------- */

  const canvas = document.getElementById("hearts");
  const ctx = canvas.getContext("2d");

  // a unit heart, centred on (0, 0)
  const HEART = new Path2D();
  const STEPS = 64;
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const x = Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
    if (i === 0) HEART.moveTo(x, y - 0.37);
    else HEART.lineTo(x, y - 0.37);
  }
  HEART.closePath();

  const COLORS = ["#ff8fab", "#ffd3dd", "#ff6f91", "#f7b8c9", "#f0c9a8"];
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  let W = 0, H = 0, DPR = 1;
  const ambient = [];
  const bursts = [];

  function sizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function makeAmbient(seedTop) {
    return {
      x: Math.random() * W,
      y: seedTop ? Math.random() * H : H + 30 + Math.random() * 80,
      size: 6 + Math.random() * 13,
      scale: 1,
      vy: -(7 + Math.random() * 22),
      sway: 8 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      freq: 0.25 + Math.random() * 0.5,
      tw: 0.5 + Math.random() * 1.5,
      rot: (Math.random() - 0.5) * 0.5,
      vr: (Math.random() - 0.5) * 0.35,
      alpha: 0.14 + Math.random() * 0.36,
      color: pick(COLORS),
    };
  }

  function seedAmbient() {
    ambient.length = 0;
    const count = reduceMotion ? 16 : Math.min(34, Math.max(12, Math.round(W / 50)));
    for (let i = 0; i < count; i++) {
      const h = makeAmbient(true);
      if (reduceMotion) h.alpha = 0.12 + Math.random() * 0.2;
      ambient.push(h);
    }
  }

  function drawHeart(p, alpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const s = p.size / 2 * p.scale;
    ctx.scale(s, s);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = p.color;
    ctx.fill(HEART);
    ctx.restore();
  }

  function spawnBurst(x, y, count) {
    if (reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 230;
      bursts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 55,
        size: 5 + Math.random() * 15,
        scale: 1,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 7,
        life: 1,
        decay: 0.45 + Math.random() * 0.5,
        alpha: 1,
        color: pick(COLORS),
      });
    }
  }

  let last = performance.now();
  let time = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    ctx.clearRect(0, 0, W, H);

    if (!reduceMotion) {
      for (const h of ambient) {
        h.y += h.vy * dt;
        h.x += Math.sin(time * h.freq + h.phase) * h.sway * dt;
        h.rot += h.vr * dt;

        if (h.y < -40) {
          const fresh = makeAmbient(false);
          Object.assign(h, fresh);
        }
        if (h.x < -40) h.x = W + 30;
        if (h.x > W + 40) h.x = -30;

        h.scale = 1 + 0.06 * Math.sin(time * 1.1 + h.phase);
        const twinkle = 0.72 + 0.28 * Math.sin(time * h.tw + h.phase);
        drawHeart(h, h.alpha * twinkle);
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life -= b.decay * dt;
        if (b.life <= 0) {
          bursts.splice(i, 1);
          continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 130 * dt;
        b.vx *= 1 - 1.3 * dt;
        b.rot += b.vr * dt;
        b.scale = 0.6 + b.life * 0.7;
        drawHeart(b, Math.max(0, b.life) * 0.85);
      }
    } else {
      // a still, quiet constellation for reduced motion
      for (const h of ambient) drawHeart(h, h.alpha);
    }

    requestAnimationFrame(frame);
  }

  sizeCanvas();
  seedAmbient();
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeCanvas();
      seedAmbient();
    }, 180);
  });

  /* ---------------------------------------------------------
     2. hero heart — tap for a burst
     --------------------------------------------------------- */

  const heroHeart = document.getElementById("heroHeart");
  if (heroHeart) {
    heroHeart.addEventListener("click", (e) => {
      const r = heroHeart.getBoundingClientRect();
      const x = e.clientX && e.clientX !== 0 ? e.clientX : r.left + r.width / 2;
      const y = e.clientY && e.clientY !== 0 ? e.clientY : r.top + r.height / 2;
      spawnBurst(x, y, 26);
      heroHeart.classList.remove("pop");
      void heroHeart.offsetWidth;
      heroHeart.classList.add("pop");
    });
  }

  /* ---------------------------------------------------------
     3. scroll reveals
     --------------------------------------------------------- */

  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);

            // a little burst of hearts the moment the halves rejoin
            if (entry.target.classList.contains("mend")) {
              const el = entry.target;
              setTimeout(() => {
                const r = el.getBoundingClientRect();
                if (r.bottom > 0 && r.top < window.innerHeight) {
                  spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 18);
                }
              }, 1700);
            }
          }
        }
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    /* active section dots */
    const sections = [...document.querySelectorAll("main section")];
    const dots = [...document.querySelectorAll(".dots a")];

    const navIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = sections.indexOf(entry.target);
            dots.forEach((d, j) => d.classList.toggle("active", j === i));
          }
        }
      },
      { threshold: 0.55 }
    );
    sections.forEach((s) => navIO.observe(s));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------------------------------------------------------
     4. reading progress
     --------------------------------------------------------- */

  const progressBar = document.querySelector(".progress span");
  let scrollTicking = false;

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    progressBar.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)) + ")";
    scrollTicking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { passive: true }
  );
  updateProgress();

  /* ---------------------------------------------------------
     5. cursor glow
     --------------------------------------------------------- */

  const glow = document.getElementById("cursorGlow");
  if (glow && canHover && !reduceMotion) {
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.32;
    let cx = tx;
    let cy = ty;
    let shown = false;

    window.addEventListener(
      "pointermove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!shown) {
          shown = true;
          glow.classList.add("on");
        }
      },
      { passive: true }
    );

    (function follow() {
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      glow.style.transform =
        "translate3d(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px,0) translate(-50%, -50%)";
      requestAnimationFrame(follow);
    })();
  }

  /* ---------------------------------------------------------
     6. read it again
     --------------------------------------------------------- */

  const again = document.getElementById("again");
  if (again) {
    again.addEventListener("click", (e) => {
      const r = again.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      spawnBurst(x, y, 34);
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  }

  /* keep canvas in sync when tab wakes */
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
  });
})();

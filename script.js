(() => {
  const canvas = document.getElementById("cartpole");
  const ctx = canvas.getContext("2d");
  const modeLabel = document.getElementById("modeLabel");
  const stateLabel = document.getElementById("stateLabel");

  const palette = {
    none: "#102033",
    controller: "#2457d6",
    transformer: "#7857c6",
    brain: "#168a86",
    motor: "#d47b2e",
    papers: "#56616d"
  };

  const labels = {
    none: "NOMINAL",
    controller: "CONTROL",
    transformer: "LEARNED",
    brain: "NEURAL",
    motor: "PHYSICAL",
    papers: "PUBLICATIONS"
  };

  const plant = {
    gravity: 9.81,
    cartMass: 1.0,
    poleMass: 0.16,
    poleHalfLength: 0.72
  };

  let state = {
    x: 0,
    xDot: 0,
    theta: 0.035,
    thetaDot: 0
  };

  let targetX = 0;
  let targetTargetX = 0;
  let payload = "none";
  let payloadMass = 0;
  let lastTime = performance.now();
  let canvasWidth = 0;
  let canvasHeight = 0;
  let cssWidth = 0;
  let cssHeight = 0;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvasWidth = Math.max(1, Math.round(rect.width * dpr));
    canvasHeight = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setPayload(nextPayload, nextTarget = 0) {
    if (nextPayload === payload && Number(nextTarget) === targetTargetX) return;

    payload = nextPayload;
    targetTargetX = Number(nextTarget) || 0;

    const masses = {
      none: 0,
      controller: 0.05,
      transformer: 0.1,
      brain: 0.14,
      motor: 0.22,
      papers: 0.09
    };
    payloadMass = masses[payload] || 0;
    modeLabel.textContent = labels[payload] || "NOMINAL";
    modeLabel.style.color = palette[payload] || palette.none;

    if (!reducedMotion) {
      state.thetaDot += payload === "motor" ? 0.34 : 0.22;
      state.xDot -= 0.08;
    }
  }

  function controllerForce() {
    const error = state.x - targetX;

    // Stabilizing state feedback around the upright equilibrium.
    // The payload alters the actual plant mass; the controller stays fixed.
    const force =
      43.0 * state.theta +
      8.5 * state.thetaDot -
      2.25 * error -
      3.4 * state.xDot;

    return Math.max(-28, Math.min(28, force));
  }

  function dynamics(dt) {
    targetX += (targetTargetX - targetX) * Math.min(1, dt * 2.6);

    const force = controllerForce();
    const mCart = plant.cartMass + payloadMass;
    const mPole = plant.poleMass;
    const totalMass = mCart + mPole;
    const length = plant.poleHalfLength;

    const sin = Math.sin(state.theta);
    const cos = Math.cos(state.theta);
    const poleMassLength = mPole * length;

    const temp =
      (force + poleMassLength * state.thetaDot * state.thetaDot * sin) /
      totalMass;

    const thetaAcc =
      (plant.gravity * sin - cos * temp) /
      (length * (4 / 3 - (mPole * cos * cos) / totalMass));

    const xAcc =
      temp - (poleMassLength * thetaAcc * cos) / totalMass;

    state.x += dt * state.xDot;
    state.xDot += dt * xAcc;
    state.theta += dt * state.thetaDot;
    state.thetaDot += dt * thetaAcc;

    // A tiny amount of damping keeps the website animation visually calm.
    state.xDot *= 0.999;
    state.thetaDot *= 0.9992;

    if (Math.abs(state.theta) > 0.8 || Math.abs(state.x) > 2.2) {
      state = {
        x: Math.max(-0.6, Math.min(0.6, targetX)),
        xDot: 0,
        theta: Math.sign(state.theta || 1) * 0.08,
        thetaDot: 0
      };
    }

    const effort = Math.abs(force);
    stateLabel.textContent = effort > 18 ? "recovering" : effort > 7 ? "tracking" : "stabilized";
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function drawPayload(cx, cy, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (payload === "none") {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // White halo keeps each research payload legible while it moves with the pole.
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(160,174,188,.45)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.1;

    if (payload === "controller") {
      roundRect(-21, -14, 42, 28, 6, "rgba(255,255,255,.98)", color);
      ctx.font = "700 15px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("K", 0, 1);
    }

    if (payload === "transformer") {
      for (let i = 0; i < 3; i++) {
        roundRect(-20 + i * 3, -16 + i * 7, 40, 10, 3, "rgba(255,255,255,.98)", color);
      }
    }

    if (payload === "brain") {
      ctx.beginPath();
      ctx.moveTo(-19, 5);
      ctx.bezierCurveTo(-26, -9, -17, -23, -5, -19);
      ctx.bezierCurveTo(2, -27, 15, -23, 18, -13);
      ctx.bezierCurveTo(27, -7, 22, 8, 12, 11);
      ctx.bezierCurveTo(7, 19, -5, 18, -9, 11);
      ctx.bezierCurveTo(-15, 14, -22, 11, -19, 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-8, -16);
      ctx.bezierCurveTo(-1, -11, -10, -4, -2, 1);
      ctx.moveTo(5, -19);
      ctx.bezierCurveTo(1, -12, 11, -7, 3, 0);
      ctx.moveTo(-12, 7);
      ctx.bezierCurveTo(-5, 3, 0, 8, 2, 14);
      ctx.stroke();
    }

    if (payload === "motor") {
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.stroke();
      }
    }

    if (payload === "papers") {
      for (let i = 0; i < 3; i++) {
        roundRect(-20 + i * 3, -15 + i * 5, 40, 24, 4, "rgba(255,255,255,.98)", color);
      }
    }

    ctx.restore();
  }

  function draw() {
    resizeCanvas();

    const w = cssWidth;
    const h = cssHeight;
    ctx.clearRect(0, 0, w, h);

    const railY = h * 0.78;
    const usable = w * 0.63;
    const centerX = w * 0.5;
    const cartX = centerX + (state.x / 1.25) * (usable * 0.5);
    const targetPx = centerX + (targetX / 1.25) * (usable * 0.5);

    // Reference marker.
    ctx.strokeStyle = "#c4ccd5";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(targetPx, railY - 74);
    ctx.lineTo(targetPx, railY + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Track.
    ctx.strokeStyle = "#bac4ce";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.13, railY + 10);
    ctx.lineTo(w * 0.87, railY + 10);
    ctx.stroke();

    // Track ticks.
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const tx = w * 0.13 + (w * 0.74 * i) / 10;
      ctx.beginPath();
      ctx.moveTo(tx, railY + 7);
      ctx.lineTo(tx, railY + 13);
      ctx.stroke();
    }

    const cartW = 68;
    const cartH = 28;
    const cartTop = railY - cartH;
    const color = palette[payload] || palette.none;

    // Wheels.
    ctx.fillStyle = "#26384b";
    ctx.beginPath();
    ctx.arc(cartX - 21, railY + 3, 5, 0, Math.PI * 2);
    ctx.arc(cartX + 21, railY + 3, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cart.
    roundRect(cartX - cartW / 2, cartTop, cartW, cartH, 7, "#ffffff", "#8d99a6");
    ctx.fillStyle = color;
    ctx.fillRect(cartX - cartW / 2 + 8, cartTop + cartH - 5, cartW - 16, 2);

    // Pendulum.
    const poleLengthPx = Math.min(190, h * 0.46);
    const pivotX = cartX;
    const pivotY = cartTop + 2;
    const tipX = pivotX + Math.sin(state.theta) * poleLengthPx;
    const tipY = pivotY - Math.cos(state.theta) * poleLengthPx;

    ctx.strokeStyle = "#172a3d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // The active research object is the pendulum payload.
    drawPayload(tipX, tipY, color);

    ctx.fillStyle = "#172a3d";
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Small target label.
    ctx.font = "600 9px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#98a3ae";
    ctx.fillText("r", targetPx, railY - 79);
  }

  function animate(now) {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = Math.min(0.02, Math.max(0.001, rawDt));

    if (!reducedMotion) {
      const steps = 2;
      for (let i = 0; i < steps; i++) dynamics(dt / steps);
    } else {
      targetX = targetTargetX;
      state.x = targetX;
      state.xDot = 0;
      state.theta = 0;
      state.thetaDot = 0;
      stateLabel.textContent = "stabilized";
    }

    draw();
    requestAnimationFrame(animate);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (reducedMotion) return;
    const rect = canvas.getBoundingClientRect();
    const normalized = (event.clientX - rect.left) / rect.width - 0.5;
    state.thetaDot += normalized >= 0 ? 0.95 : -0.95;
    state.xDot += normalized * 0.55;
    stateLabel.textContent = "disturbed";
  });

  const sections = [...document.querySelectorAll(".observed-section")];
  const navLinks = [...document.querySelectorAll(".nav a")];

  function activate(section) {
    const nextPayload = section.dataset.payload || "none";
    const nextTarget = section.dataset.target || "0";
    setPayload(nextPayload, nextTarget);

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === "#" + section.id;
      link.classList.toggle("active", active);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) activate(visible[0].target);
    },
    {
      root: null,
      threshold: [0.2, 0.35, 0.5, 0.65],
      rootMargin: "-16% 0px -42% 0px"
    }
  );

  sections.forEach((section) => observer.observe(section));

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const selector = link.getAttribute("href");
      const section = document.querySelector(selector);
      if (section) activate(section);
    });
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(animate);
})();

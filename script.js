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
  let multitaskMode = false;
  let lastTime = performance.now();

  const multitaskStates = [
    { x: -0.18, xDot: 0, theta: 0.045, thetaDot: 0 },
    { x: 0.02, xDot: 0, theta: -0.035, thetaDot: 0 },
    { x: 0.20, xDot: 0, theta: 0.055, thetaDot: 0 }
  ];

  const multitaskPlants = [
    { cartMass: 0.88, poleMass: 0.14, poleHalfLength: 0.66 },
    { cartMass: 1.00, poleMass: 0.16, poleHalfLength: 0.72 },
    { cartMass: 1.15, poleMass: 0.19, poleHalfLength: 0.78 }
  ];
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
      // Section changes should be visible, but small enough that the feedback
      // controller remains close to the upright equilibrium.
      state.thetaDot += payload === "motor" ? 0.14 : 0.09;
      state.xDot -= 0.035;
    }
  }

  function feedbackForce(s, reference = targetX) {
    const error = s.x - reference;

    // LQR-style state feedback around the upright equilibrium.
    // The same gain K is used for every research section and for all
    // heterogeneous plants in multitask mode.
    const kTheta = 62.0;
    const kThetaDot = 13.5;
    const kX = 3.8;
    const kXDot = 5.4;

    const force =
      kTheta * s.theta +
      kThetaDot * s.thetaDot -
      kX * error -
      kXDot * s.xDot;

    return Math.max(-42, Math.min(42, force));
  }

  function controllerForce() {
    return feedbackForce(state, targetX);
  }

  function dynamics(dt) {
    targetX += (targetTargetX - targetX) * Math.min(1, dt * 1.65);

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

    // Light physical/numerical damping keeps the visualization calm without
    // replacing the feedback controller.
    state.xDot *= 0.9988;
    state.thetaDot *= 0.9989;

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

  function multitaskDynamics(dt) {
    targetX += (targetTargetX - targetX) * Math.min(1, dt * 1.65);

    let maxEffort = 0;

    multitaskStates.forEach((s, i) => {
      const p = multitaskPlants[i];
      const force = feedbackForce(s, targetX);
      const totalMass = p.cartMass + p.poleMass;
      const sin = Math.sin(s.theta);
      const cos = Math.cos(s.theta);
      const poleMassLength = p.poleMass * p.poleHalfLength;

      const temp =
        (force + poleMassLength * s.thetaDot * s.thetaDot * sin) /
        totalMass;

      const thetaAcc =
        (plant.gravity * sin - cos * temp) /
        (p.poleHalfLength * (4 / 3 - (p.poleMass * cos * cos) / totalMass));

      const xAcc =
        temp - (poleMassLength * thetaAcc * cos) / totalMass;

      s.x += dt * s.xDot;
      s.xDot += dt * xAcc;
      s.theta += dt * s.thetaDot;
      s.thetaDot += dt * thetaAcc;

      s.xDot *= 0.9988;
      s.thetaDot *= 0.9989;

      if (Math.abs(s.theta) > 0.8 || Math.abs(s.x) > 2.2) {
        s.x = Math.max(-0.6, Math.min(0.6, targetX));
        s.xDot = 0;
        s.theta = (i - 1) * 0.04;
        s.thetaDot = 0;
      }

      maxEffort = Math.max(maxEffort, Math.abs(force));
    });

    stateLabel.textContent =
      maxEffort > 18 ? "shared K · recovering" :
      maxEffort > 7 ? "shared K · tracking" :
      "shared K · stable";
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

  function drawPayload(cx, cy, color, kind = payload, scale = 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (kind === "none") {
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

    if (kind === "controller") {
      roundRect(-21, -14, 42, 28, 6, "rgba(255,255,255,.98)", color);
      ctx.font = "700 15px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("K", 0, 1);
    }

    if (kind === "transformer") {
      for (let i = 0; i < 3; i++) {
        roundRect(-20 + i * 3, -16 + i * 7, 40, 10, 3, "rgba(255,255,255,.98)", color);
      }
    }

    if (kind === "brain") {
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

    if (kind === "motor") {
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

    if (kind === "papers") {
      for (let i = 0; i < 3; i++) {
        roundRect(-20 + i * 3, -15 + i * 5, 40, 24, 4, "rgba(255,255,255,.98)", color);
      }
    }

    ctx.restore();
  }

  function drawSingleCartPole(s, rowTop, rowHeight, taskIndex) {
    const w = cssWidth;
    const color = palette.controller;
    const railY = rowTop + rowHeight * 0.72;
    const usable = w * 0.66;
    const centerX = w * 0.5;
    const cartX = centerX + (s.x / 1.25) * (usable * 0.5);
    const targetPx = centerX + (targetX / 1.25) * (usable * 0.5);

    ctx.strokeStyle = "#d3dae1";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(targetPx, rowTop + 20);
    ctx.lineTo(targetPx, railY + 15);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#bac4ce";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.16, railY + 7);
    ctx.lineTo(w * 0.84, railY + 7);
    ctx.stroke();

    const cartW = 48;
    const cartH = 20;
    const cartTop = railY - cartH;

    ctx.fillStyle = "#26384b";
    ctx.beginPath();
    ctx.arc(cartX - 15, railY + 2, 3.6, 0, Math.PI * 2);
    ctx.arc(cartX + 15, railY + 2, 3.6, 0, Math.PI * 2);
    ctx.fill();

    roundRect(cartX - cartW / 2, cartTop, cartW, cartH, 5, "#ffffff", "#8d99a6");
    ctx.fillStyle = color;
    ctx.fillRect(cartX - cartW / 2 + 6, cartTop + cartH - 4, cartW - 12, 2);

    const poleLengthPx = Math.min(78, rowHeight * 0.48);
    const pivotX = cartX;
    const pivotY = cartTop + 1;
    const tipX = pivotX + Math.sin(s.theta) * poleLengthPx;
    const tipY = pivotY - Math.cos(s.theta) * poleLengthPx;

    ctx.strokeStyle = "#172a3d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    drawPayload(tipX, tipY, color, "controller", 0.62);

    ctx.fillStyle = "#172a3d";
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "600 9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#8e99a5";
    ctx.fillText("task " + (taskIndex + 1), w * 0.07, rowTop + 18);
  }

  function drawMultitask() {
    resizeCanvas();
    const w = cssWidth;
    const h = cssHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.font = "700 10px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#2457d6";
    ctx.fillText("M = 3 HETEROGENEOUS TASKS · SHARED K", w * 0.07, 18);

    const top = 28;
    const rowHeight = (h - top - 4) / 3;

    multitaskStates.forEach((s, i) => {
      if (i > 0) {
        ctx.strokeStyle = "#edf0f3";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.06, top + i * rowHeight);
        ctx.lineTo(w * 0.94, top + i * rowHeight);
        ctx.stroke();
      }
      drawSingleCartPole(s, top + i * rowHeight, rowHeight, i);
    });
  }

  function draw() {
    if (multitaskMode) {
      drawMultitask();
      return;
    }

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
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        if (multitaskMode) multitaskDynamics(dt / steps);
        else dynamics(dt / steps);
      }
    } else {
      targetX = targetTargetX;
      if (multitaskMode) {
        multitaskStates.forEach((s) => {
          s.x = targetX;
          s.xDot = 0;
          s.theta = 0;
          s.thetaDot = 0;
        });
        stateLabel.textContent = "shared K · stable";
      } else {
        state.x = targetX;
        state.xDot = 0;
        state.theta = 0;
        state.thetaDot = 0;
        stateLabel.textContent = "stabilized";
      }
    }

    draw();
    requestAnimationFrame(animate);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (reducedMotion) return;
    const rect = canvas.getBoundingClientRect();
    const normalized = (event.clientX - rect.left) / rect.width - 0.5;
    if (multitaskMode) {
      multitaskStates.forEach((s, i) => {
        s.thetaDot += (normalized >= 0 ? 0.72 : -0.72) * (0.82 + i * 0.16);
        s.xDot += normalized * (0.34 + i * 0.06);
      });
      stateLabel.textContent = "shared K · disturbed";
    } else {
      state.thetaDot += normalized >= 0 ? 0.95 : -0.95;
      state.xDot += normalized * 0.55;
      stateLabel.textContent = "disturbed";
    }
  });

  const sections = [...document.querySelectorAll(".observed-section")];
  const navLinks = [...document.querySelectorAll(".nav a")];

  function activate(section) {
    const nextPayload = section.dataset.payload || "none";
    const nextTarget = section.dataset.target || "0";
    multitaskMode = section.dataset.multitask === "true";
    setPayload(nextPayload, nextTarget);

    if (multitaskMode) {
      modeLabel.textContent = "MULTITASK CONTROL";
      modeLabel.style.color = palette.controller;
    }

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

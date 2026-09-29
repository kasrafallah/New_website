(() => {
  const canvas = document.getElementById("cartpole");
  const ctx = canvas.getContext("2d");
  const stateLabel = document.getElementById("stateLabel");

  const g = 9.81;
  const cartMass = 1.0;
  const poleMass = 0.16;
  const length = 0.72;

  let state = { x: 0, xDot: 0, theta: 0.025, thetaDot: 0 };
  let lastTime = performance.now();
  let cssWidth = 0;
  let cssHeight = 0;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = rect.width;
    cssHeight = rect.height;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function force() {
    // Fixed full-state feedback tuned to remain visibly upright.
    const u =
      78.0 * state.theta +
      18.0 * state.thetaDot -
      4.8 * state.x -
      7.2 * state.xDot;

    return Math.max(-58, Math.min(58, u));
  }

  function step(dt) {
    const u = force();
    const totalMass = cartMass + poleMass;
    const sin = Math.sin(state.theta);
    const cos = Math.cos(state.theta);
    const poleMassLength = poleMass * length;

    const temp =
      (u + poleMassLength * state.thetaDot * state.thetaDot * sin) /
      totalMass;

    const thetaAcc =
      (g * sin - cos * temp) /
      (length * (4 / 3 - (poleMass * cos * cos) / totalMass));

    const xAcc =
      temp - (poleMassLength * thetaAcc * cos) / totalMass;

    state.x += dt * state.xDot;
    state.xDot += dt * xAcc;
    state.theta += dt * state.thetaDot;
    state.thetaDot += dt * thetaAcc;

    state.xDot *= 0.9978;
    state.thetaDot *= 0.998;

    // Guardrail: this CV visualization represents a stabilized closed loop,
    // so it never transitions into a fallen configuration.
    if (Math.abs(state.theta) > 0.34 || Math.abs(state.x) > 1.6) {
      state.theta *= 0.42;
      state.thetaDot *= -0.18;
      state.x *= 0.72;
      state.xDot *= -0.12;
    }

    const effort = Math.abs(u);
    stateLabel.textContent =
      effort > 20 ? "recovering" :
      effort > 7 ? "correcting" :
      "stabilized";
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

  function draw() {
    resizeCanvas();
    const w = cssWidth;
    const h = cssHeight;
    ctx.clearRect(0, 0, w, h);

    const railY = h * 0.78;
    const centerX = w * 0.5;
    const usable = w * 0.62;
    const cartX = centerX + (state.x / 1.2) * (usable * 0.5);

    ctx.strokeStyle = "#c5ced7";
    ctx.lineWidth = 1;
    ctx.setLineDash([3,5]);
    ctx.beginPath();
    ctx.moveTo(centerX, railY - 88);
    ctx.lineTo(centerX, railY + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#bac4ce";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.13, railY + 10);
    ctx.lineTo(w * 0.87, railY + 10);
    ctx.stroke();

    const cartW = 68;
    const cartH = 28;
    const cartTop = railY - cartH;

    ctx.fillStyle = "#26384b";
    ctx.beginPath();
    ctx.arc(cartX - 21, railY + 3, 5, 0, Math.PI * 2);
    ctx.arc(cartX + 21, railY + 3, 5, 0, Math.PI * 2);
    ctx.fill();

    roundRect(
      cartX - cartW / 2,
      cartTop,
      cartW,
      cartH,
      7,
      "#ffffff",
      "#8d99a6"
    );

    ctx.fillStyle = "#2457d6";
    ctx.fillRect(cartX - cartW / 2 + 8, cartTop + cartH - 5, cartW - 16, 2);

    const poleLength = Math.min(190, h * 0.46);
    const pivotX = cartX;
    const pivotY = cartTop + 2;
    const tipX = pivotX + Math.sin(state.theta) * poleLength;
    const tipY = pivotY - Math.cos(state.theta) * poleLength;

    ctx.strokeStyle = "#172a3d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = "#2457d6";
    ctx.beginPath();
    ctx.arc(tipX, tipY, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#172a3d";
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8b96a2";
    ctx.font = "600 9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText("fixed K", w * 0.07, 24);
    ctx.fillText("upright equilibrium", w * 0.07, 40);
  }

  function animate(now) {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = Math.min(0.018, Math.max(0.001, rawDt));

    if (reducedMotion) {
      state = { x: 0, xDot: 0, theta: 0, thetaDot: 0 };
      stateLabel.textContent = "stabilized";
    } else {
      const steps = 6;
      for (let i = 0; i < steps; i++) step(dt / steps);
    }

    draw();
    requestAnimationFrame(animate);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (reducedMotion) return;
    const rect = canvas.getBoundingClientRect();
    const normalized = (event.clientX - rect.left) / rect.width - 0.5;
    state.thetaDot += normalized >= 0 ? 0.62 : -0.62;
    state.xDot += normalized * 0.32;
    stateLabel.textContent = "disturbed";
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(animate);
})();

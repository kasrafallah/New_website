(() => {
  const nav = document.querySelector(".nav");
  if (nav && !nav.querySelector('a[href="collaborators.html"]')) {
    const cvLink = nav.querySelector('a[href="cv.html"]');
    const link = document.createElement("a");
    link.href = "collaborators.html";
    link.textContent = "Collaborators";
    if (cvLink) cvLink.insertAdjacentElement("afterend", link);
    else nav.appendChild(link);
  }

  const canvas = document.getElementById("cartpole");
  const ctx = canvas.getContext("2d");
  const modeLabel = document.getElementById("modeLabel");
  const stateLabel = document.getElementById("stateLabel");

  const palette = {
    none: "#102033",
    controller: "#2457d6",
    education: "#2457d6",
    latent: "#7857c6",
    brain: "#168a86",
    motor: "#d47b2e",
    papers: "#56616d"
  };

  const labels = {
    none: "NOMINAL",
    controller: "CONTROL",
    education: "EDUCATION",
    latent: "LARGE LEARNED",
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
  let educationStage = "columbia";
  const controllerText = document.getElementById("controllerText");
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
      education: 0.02,
      latent: 0.1,
      brain: 0.14,
      motor: 0.22,
      papers: 0.09
    };
    payloadMass = masses[payload] || 0;
    modeLabel.textContent = labels[payload] || "NOMINAL";
    modeLabel.style.color = palette[payload] || palette.none;

    // Changing research sections changes only the reference/payload.
    // Disturbances are injected explicitly by the user clicking the canvas.
  }

  function setEducationStage(stage) {
    educationStage = stage || "columbia";

    if (educationStage === "sharif") {
      modeLabel.textContent = "FOUNDATIONS";
      stateLabel.textContent = "full-state feedback";
      if (controllerText) controllerText.textContent = "u = -Kx · full state";
    } else if (educationStage === "waterloo") {
      modeLabel.textContent = "ESTIMATION";
      stateLabel.textContent = "partial observation";
      if (controllerText) controllerText.textContent = "y = Cx + v · u = -Kx̂";
    } else {
      modeLabel.textContent = "LEARNING + ROBUSTNESS";
      stateLabel.textContent = "uncertain dynamics";
      if (controllerText) controllerText.textContent = "u = π(x̂, D) · robust feedback";
    }

    modeLabel.style.color = palette.education;
  }

  function resetControllerLabel() {
    if (controllerText) controllerText.textContent = "u = -Kx · LQR-style feedback";
  }

  function feedbackForce(s, reference = targetX) {
    const error = s.x - reference;

    // Continuous-time LQR gain for the upright linearization.
    // State order: [x-reference, xDot, theta, thetaDot].
    // With this model's angle convention, the stabilizing law is
    // u = 3.381 e + 5.549 xDot + 51.910 theta + 15.874 thetaDot.
    // The same gain is intentionally shared across all research sections
    // and across the three heterogeneous multitask plants.
    const force =
      3.381 * error +
      5.549 * s.xDot +
      51.910 * s.theta +
      15.874 * s.thetaDot;

    return Math.max(-55, Math.min(55, force));
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

    if (kind === "latent") {
      // A learned dynamical state z with nominal and controlled trajectories.
      // Drawn deliberately larger than the other payloads so the concept is unmistakable.
      ctx.save();
      ctx.scale(1.18, 1.18);

      // Outer state-space ring.
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Nominal trajectory.
      ctx.beginPath();
      ctx.moveTo(-27, 9);
      ctx.bezierCurveTo(-25, -18, -8, -31, 12, -25);
      ctx.bezierCurveTo(24, -21, 30, -12, 28, -3);
      ctx.stroke();

      // Controlled trajectory branches away from nominal.
      ctx.beginPath();
      ctx.moveTo(7, 18);
      ctx.bezierCurveTo(17, 17, 24, 12, 30, 3);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.7;
      ctx.stroke();

      // Trajectory samples.
      const points = [[-25,7],[-20,-12],[-5,-25],[13,-23],[27,-7],[28,3]];
      points.forEach(([px,py],idx) => {
        ctx.beginPath();
        ctx.arc(px, py, idx === points.length - 1 ? 3.5 : 2.4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      // Latent state.
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.98)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "700 16px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("z", 0, 0);

      // Explicit control input u -> z.
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 39);
      ctx.lineTo(0, 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 17);
      ctx.lineTo(-5, 23);
      ctx.moveTo(0, 17);
      ctx.lineTo(5, 23);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "700 11px ui-monospace, monospace";
      ctx.fillText("u", 0, 46);

      // Tiny dynamics marker.
      ctx.font = "600 8px ui-monospace, monospace";
      ctx.fillText("fθ", -27, -28);

      ctx.restore();
    }

    if (kind === "education") {
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.98)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "700 13px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("x", 0, 0);
    }

    if (kind === "brain") {
      ctx.save();
      ctx.translate(1, 0);
      ctx.scale(1.32, 1.32);

      // Side-profile brain silhouette: frontal lobe faces right,
      // cerebellum and brain stem sit at the lower rear.
      ctx.fillStyle = "#e7f4f2";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.15;

      ctx.beginPath();
      ctx.moveTo(-21, 3);
      ctx.bezierCurveTo(-24, -6, -21, -16, -14, -21);
      ctx.bezierCurveTo(-9, -27, 0, -29, 8, -26);
      ctx.bezierCurveTo(17, -24, 24, -18, 27, -10);
      ctx.bezierCurveTo(31, -2, 29, 7, 24, 12);
      ctx.bezierCurveTo(20, 17, 14, 19, 8, 19);
      ctx.bezierCurveTo(3, 19, -1, 17, -5, 15);
      ctx.bezierCurveTo(-8, 12, -9, 9, -8, 6);
      ctx.bezierCurveTo(-12, 8, -17, 8, -21, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cerebellum: distinct posterior-lower lobe.
      ctx.beginPath();
      ctx.moveTo(-9, 7);
      ctx.bezierCurveTo(-14, 5, -20, 7, -22, 11);
      ctx.bezierCurveTo(-25, 16, -20, 21, -15, 21);
      ctx.bezierCurveTo(-10, 21, -6, 18, -5, 14);
      ctx.bezierCurveTo(-4, 11, -6, 9, -9, 7);
      ctx.closePath();
      ctx.fillStyle = "#e7f4f2";
      ctx.fill();
      ctx.stroke();

      // Brain stem.
      ctx.beginPath();
      ctx.moveTo(-4, 14);
      ctx.bezierCurveTo(-3, 19, 0, 23, 3, 27);
      ctx.lineTo(-2, 30);
      ctx.bezierCurveTo(-6, 26, -8, 21, -8, 16);
      ctx.closePath();
      ctx.fillStyle = "#e7f4f2";
      ctx.fill();
      ctx.stroke();

      // Lateral cortical folds.
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.45;

      ctx.beginPath();
      ctx.moveTo(-12, -17);
      ctx.bezierCurveTo(-4, -20, 5, -17, 10, -12);
      ctx.bezierCurveTo(14, -9, 16, -6, 15, -2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-15, -10);
      ctx.bezierCurveTo(-7, -11, 0, -8, 5, -5);
      ctx.bezierCurveTo(10, -2, 13, 1, 12, 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.bezierCurveTo(-8, -3, -2, 0, 2, 3);
      ctx.bezierCurveTo(6, 6, 10, 8, 15, 7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-11, 5);
      ctx.bezierCurveTo(-5, 4, 0, 7, 3, 10);
      ctx.bezierCurveTo(6, 13, 11, 14, 16, 12);
      ctx.stroke();

      // Cerebellar folds.
      ctx.beginPath();
      ctx.moveTo(-20, 12);
      ctx.bezierCurveTo(-17, 10, -13, 11, -10, 13);
      ctx.moveTo(-20, 16);
      ctx.bezierCurveTo(-16, 14, -12, 15, -9, 17);
      ctx.stroke();

      ctx.restore();
    }

    if (kind === "motor") {
      ctx.save();
      ctx.scale(1.22, 1.22);

      // Stator housing.
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();

      // Air gap / stator bore.
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Twelve stator teeth make the payload read as an electric machine,
      // rather than a generic gear.
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const c = Math.cos(a);
        const s = Math.sin(a);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(c * 18, s * 18);
        ctx.lineTo(c * 23, s * 23);
        ctx.stroke();
      }

      // Rotor and four salient poles.
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();

      for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
        const c = Math.cos(a);
        const s = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(c * 4, s * 4);
        ctx.lineTo(c * 10, s * 10);
        ctx.stroke();
      }

      // Rotor shaft.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Tiny current-reference cue.
      ctx.font = "700 8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("i*", 0, 31);

      ctx.restore();
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

  function drawEducationOverlay({w, h, cartX, railY, pivotX, pivotY, tipX, tipY, color}) {
    ctx.save();
    ctx.font = "700 9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (educationStage === "sharif") {
      ctx.fillStyle = color;
      ctx.fillText("FULL STATE", w * 0.07, 28);

      ctx.strokeStyle = "rgba(36,87,214,.45)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cartX - 38, railY - 8);
      ctx.lineTo(cartX - 9, railY - 8);
      ctx.stroke();

      ctx.fillStyle = "#74808d";
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillText("xₜ", cartX - 52, railY - 5);
      ctx.fillText("uₜ = -Kxₜ", w * 0.07, 45);
    }

    if (educationStage === "waterloo") {
      ctx.fillStyle = color;
      ctx.fillText("PARTIAL OBSERVATION", w * 0.07, 28);

      // Noisy measured/estimated pole, shown as a ghost beside the true state.
      const ghostDx = 12;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(120,87,198,.52)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(tipX + ghostDx, tipY + 5);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#7857c6";
      ctx.beginPath();
      ctx.arc(tipX + ghostDx, tipY + 5, 5, 0, Math.PI * 2);
      ctx.fill();

      // Sensor / measurement cue.
      ctx.strokeStyle = "rgba(120,87,198,.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cartX + 38, railY - 34, 11, -0.7, 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cartX + 38, railY - 34, 17, -0.55, 0.55);
      ctx.stroke();

      ctx.fillStyle = "#74808d";
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillText("yₜ = Cxₜ + vₜ", w * 0.07, 45);
      ctx.fillText("x̂ₜ", tipX + ghostDx + 8, tipY + 8);
    }

    if (educationStage === "columbia") {
      ctx.fillStyle = color;
      ctx.fillText("LEARNING · UNCERTAINTY · ROBUSTNESS", w * 0.07, 28);

      // Disturbance input.
      const wx = tipX + 56;
      const wy = tipY - 22;
      ctx.strokeStyle = "#b27330";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(tipX + 13, tipY - 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tipX + 13, tipY - 3);
      ctx.lineTo(tipX + 20, tipY - 10);
      ctx.moveTo(tipX + 13, tipY - 3);
      ctx.lineTo(tipX + 23, tipY);
      ctx.stroke();

      ctx.fillStyle = "#9a6328";
      ctx.font = "700 9px ui-monospace, monospace";
      ctx.fillText("wₜ", wx + 2, wy - 3);

      // Uncertainty set around the state.
      ctx.strokeStyle = "rgba(36,87,214,.23)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3,4]);
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, 31, 20, -0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, 42, 27, -0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#74808d";
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillText("x̂ₜ , θ̂ , D", w * 0.07, 45);
    }

    // Three-stage intellectual trajectory.
    const labels = [
      ["FOUNDATIONS", "sharif"],
      ["INFERENCE", "waterloo"],
      ["ROBUST CONTROL", "columbia"]
    ];
    const baseY = h - 12;
    const startX = w * 0.08;
    const step = (w * 0.84) / 3;

    labels.forEach(([label, key], i) => {
      const x = startX + step * i;
      ctx.fillStyle = key === educationStage ? color : "#b3bcc6";
      ctx.font = key === educationStage
        ? "700 8px ui-monospace, monospace"
        : "600 8px ui-monospace, monospace";
      ctx.fillText(label, x, baseY);
    });

    ctx.restore();
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

    if (payload === "education") {
      drawEducationOverlay({ w, h, cartX, railY, pivotX, pivotY, tipX, tipY, color });
    }

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
        s.thetaDot += (normalized >= 0 ? 0.82 : -0.82) * (0.82 + i * 0.16);
        s.xDot += normalized * (0.38 + i * 0.06);
      });
      stateLabel.textContent = "shared K · disturbed";
    } else {
      state.thetaDot += normalized >= 0 ? 1.05 : -1.05;
      state.xDot += normalized * 0.48;
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

    if (section.id === "education") {
      setEducationStage(educationStage);
    } else {
      resetControllerLabel();
    }

    if (multitaskMode) {
      modeLabel.textContent = "MULTITASK CONTROL";
      modeLabel.style.color = palette.controller;
    }

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === "#" + section.id;
      link.classList.toggle("active", active);
    });
  }

  const educationEntries = [...document.querySelectorAll(".education-entry[data-education-stage]")];
  const educationObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible[0]) {
        const stage = visible[0].target.dataset.educationStage;
        setPayload("education", "0");
        setEducationStage(stage);

        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === "#education");
        });
      }
    },
    {
      threshold: [0.25, 0.45, 0.7],
      rootMargin: "-27% 0px -27% 0px"
    }
  );

  educationEntries.forEach((entry) => educationObserver.observe(entry));

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

(() => {
  const canvas = document.getElementById("collabGlobe");
  const ctx = canvas.getContext("2d");
  const resetButton = document.getElementById("resetGlobe");
  const roster = document.getElementById("collabRoster");
  const nameEl = document.getElementById("collabName");
  const affiliationEl = document.getElementById("collabAffiliation");
  const areaEl = document.getElementById("collabArea");
  const cityEl = document.getElementById("collabCity");

  const people = [
    {name:"James Anderson", affiliation:"Columbia University", city:"New York, USA", lat:40.8, lon:-74.0, area:"Control theory, learning, robust control, and optimization."},
    {name:"Leonardo F. Toso", affiliation:"Columbia University", city:"New York, USA", lat:41.2, lon:-73.6, area:"LQG policy optimization, multitask control, and adaptive control."},
    {name:"Ravi R. Mazumdar", affiliation:"University of Waterloo", city:"Waterloo, Canada", lat:43.5, lon:-80.5, area:"Information theory, stochastic systems, and channels with memory."},
    {name:"George J. Pappas", affiliation:"University of Pennsylvania", city:"Philadelphia, USA", lat:40.0, lon:-75.2, area:"Control, learning, multitask systems, and generalization."},
    {name:"Alejandro Ribeiro", affiliation:"University of Pennsylvania", city:"Philadelphia, USA", lat:40.3, lon:-75.0, area:"Optimization, graph learning, and constrained generative inference."},
    {name:"Shervin Khalafi", affiliation:"University of Pennsylvania", city:"Philadelphia, USA", lat:39.7, lon:-75.0, area:"Generative models, constrained optimization, and flow-matching inference."},
    {name:"Nikolai Matni", affiliation:"University of Pennsylvania", city:"Philadelphia, USA", lat:40.1, lon:-75.4, area:"Robust and data-driven control and system-level synthesis."},
    {name:"Tesshu Fujinami", affiliation:"University of Pennsylvania", city:"Philadelphia, USA", lat:39.8, lon:-75.4, area:"Shared controllers, history representations, and linear control."},
    {name:"Charis Stamouli", affiliation:"ETH Zürich", city:"Zürich, Switzerland", lat:47.4, lon:8.5, area:"Reliable control, multitask optimization, and generalization."},
    {name:"Erfan Zabeh", affiliation:"UT Southwestern Medical Center", city:"Dallas, USA", lat:32.8, lon:-96.8, area:"Neural dynamics, robust intervention, and control-inspired neuroscience."},
    {name:"Wenhao Zhang", affiliation:"UT Southwestern Medical Center", city:"Dallas, USA", lat:33.0, lon:-96.7, area:"Computational neuroscience, continuous attractors, and neural sampling."},
    {name:"Rudramani Singha", affiliation:"UT Southwestern Medical Center", city:"Dallas, USA", lat:32.7, lon:-96.7, area:"Probabilistic modeling, neural dynamics, and robust representation steering."},
    {name:"Han Bao", affiliation:"UCLA", city:"Los Angeles, USA", lat:34.1, lon:-118.2, area:"Federated learning, online learning, and inverse optimization."},
    {name:"Shinsaku Sakaue", affiliation:"Tokyo", city:"Tokyo, Japan", lat:35.8, lon:139.8, area:"Online optimization, inverse optimization, and learning theory."},
    {name:"Taira Tsuchiya", affiliation:"The University of Tokyo", city:"Tokyo, Japan", lat:35.7, lon:139.6, area:"Online learning, learning theory, and inverse optimization."},
    {name:"Francis Bach", affiliation:"Inria / École Normale Supérieure", city:"Paris, France", lat:48.9, lon:2.35, area:"Optimization, statistical machine learning, and learning theory."},
    {name:"Maxfield Parson-Scherban", affiliation:"Columbia University", city:"New York, USA", lat:40.9, lon:-73.8, area:"Wound-rotor synchronous machines and predictive control."},
    {name:"Navid Rahbariasr", affiliation:"Columbia University", city:"New York, USA", lat:40.6, lon:-74.2, area:"Optimization, energy systems, and model predictive control."},
    {name:"Bernard Steyaert", affiliation:"Columbia University", city:"New York, USA", lat:40.7, lon:-73.6, area:"Electric machines, power electronics, and WRSM modeling."},
    {name:"Matthias Preindl", affiliation:"Columbia University", city:"New York, USA", lat:40.5, lon:-74.0, area:"Model predictive control, electric drives, and power electronics."}
  ];

  let yaw = -0.5, pitch = -0.2, dragging = false, lastX = 0, lastY = 0, selected = 0;
  let pins = [];

  function rotate(lat, lon) {
    const p = lat * Math.PI / 180;
    const l = lon * Math.PI / 180;
    let x = Math.cos(p) * Math.cos(l);
    let y = Math.sin(p);
    let z = Math.cos(p) * Math.sin(l);

    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = cy * x + sy * z;
    const z1 = -sy * x + cy * z;

    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return {x:x1, y:cp*y-sp*z1, z:sp*y+cp*z1};
  }

  function project(lat, lon, cx, cy, r) {
    const p = rotate(lat, lon);
    return {x:cx+p.x*r, y:cy-p.y*r, z:p.z};
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function draw() {
    resize();
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const cx = w/2, cy = h/2, r = Math.min(w,h)*0.43;
    ctx.clearRect(0,0,w,h);

    const g = ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r);
    g.addColorStop(0,"#fff");
    g.addColorStop(1,"#e8eef4");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "#c8d2dc";
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.clip();

    ctx.strokeStyle = "rgba(110,128,146,.18)";
    ctx.lineWidth = 0.8;
    for(let lat=-60;lat<=60;lat+=30){
      ctx.beginPath();
      let open=false;
      for(let lon=-180;lon<=180;lon+=4){
        const p=project(lat,lon,cx,cy,r);
        if(p.z<0){open=false;continue;}
        if(!open){ctx.moveTo(p.x,p.y);open=true;} else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
    for(let lon=-150;lon<=180;lon+=30){
      ctx.beginPath();
      let open=false;
      for(let lat=-85;lat<=85;lat+=3){
        const p=project(lat,lon,cx,cy,r);
        if(p.z<0){open=false;continue;}
        if(!open){ctx.moveTo(p.x,p.y);open=true;} else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }

    pins = [];
    people.forEach((person,i) => {
      const p = project(person.lat,person.lon,cx,cy,r);
      if(p.z<0) return;
      pins.push({i,x:p.x,y:p.y});
      ctx.beginPath();
      ctx.arc(p.x,p.y,i===selected?6:4,0,Math.PI*2);
      ctx.fillStyle = i===selected ? "#2457d6" : "#607da7";
      ctx.fill();
      if(i===selected){
        ctx.beginPath();
        ctx.arc(p.x,p.y,11,0,Math.PI*2);
        ctx.strokeStyle = "rgba(36,87,214,.25)";
        ctx.stroke();
      }
    });

    ctx.restore();
    requestAnimationFrame(draw);
  }

  function selectPerson(i) {
    selected = i;
    const p = people[i];
    nameEl.textContent = p.name;
    affiliationEl.textContent = p.affiliation;
    areaEl.textContent = p.area;
    cityEl.textContent = p.city;
  }

  canvas.addEventListener("pointerdown", e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if(!dragging) return;
    yaw += (e.clientX-lastX)*0.007;
    pitch = Math.max(-1.1, Math.min(1.1, pitch + (e.clientY-lastY)*0.006));
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener("pointerup", e => {
    dragging = false;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX-rect.left, y = e.clientY-rect.top;
    let hit = null, best = 14;
    pins.forEach(p => {
      const d = Math.hypot(x-p.x,y-p.y);
      if(d<best){best=d;hit=p.i;}
    });
    if(hit!==null) selectPerson(hit);
  });

  resetButton.addEventListener("click", () => { yaw=-0.5; pitch=-0.2; });

  people.forEach((p,i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "collab-person";
    b.innerHTML = '<span class="collab-dot"></span><span><h3>'+p.name+'</h3><p>'+p.affiliation+' · '+p.city+'</p></span>';
    b.addEventListener("click", () => selectPerson(i));
    roster.appendChild(b);
  });

  selectPerson(0);
  window.addEventListener("resize", resize);
  draw();
})();
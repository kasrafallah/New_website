(() => {
  const canvas = document.getElementById("collabGlobe");
  const ctx = canvas.getContext("2d");
  const resetButton = document.getElementById("resetGlobe");
  const zoomInButton = document.getElementById("zoomInGlobe");
  const zoomOutButton = document.getElementById("zoomOutGlobe");
  const journeyButton = document.getElementById("journeyGlobe");
  const zoomReadout = document.getElementById("zoomReadout");
  const roster = document.getElementById("collabRoster");
  const nameEl = document.getElementById("collabName");
  const affiliationEl = document.getElementById("collabAffiliation");
  const areaEl = document.getElementById("collabArea");
  const cityEl = document.getElementById("collabCity");

  const groups = [
    {
      label: "Professors",
      people: [
        {name:"James Anderson", affiliation:"Department of Electrical Engineering, Columbia University", city:"New York", country:"USA", lat:40.81, lon:-73.96, role:"Professor", papers:"Coauthor on [2], [3], [5], [6], [7], [8], [9]"},
        {name:"George J. Pappas", affiliation:"Department of Electrical and Systems Engineering, University of Pennsylvania", city:"Philadelphia", country:"USA", lat:39.95, lon:-75.19, role:"Professor", papers:"Coauthor on [6]"},
        {name:"Alejandro Ribeiro", affiliation:"Department of Electrical and Systems Engineering, University of Pennsylvania", city:"Philadelphia", country:"USA", lat:40.05, lon:-75.10, role:"Professor", papers:"Coauthor on [9]"},
        {name:"Matthias Preindl", affiliation:"Department of Electrical Engineering, Columbia University", city:"New York", country:"USA", lat:40.65, lon:-73.90, role:"Professor", papers:"Coauthor on [5], [7]"},
        {name:"Paul Sajda", affiliation:"Department of Biomedical Engineering, Columbia University", city:"New York", country:"USA", lat:40.93, lon:-74.04, role:"Professor", papers:"Coauthor on [8]"},
        {name:"Attila Losonczy", affiliation:"Peter O’Donnell Jr. Brain Institute, University of Texas Southwestern Medical Center", city:"Dallas", country:"USA", lat:32.81, lon:-96.84, role:"Professor", papers:"Coauthor on [4]"},
        {name:"Gergely Turi", affiliation:"University of Texas Southwestern Medical Center", city:"Dallas", country:"USA", lat:32.94, lon:-96.73, role:"Professor", papers:"Coauthor on [4]"}
      ]
    },
    {
      label: "Postdoctoral Researchers",
      people: [
        {name:"Erfan Zabeh", affiliation:"Mortimer B. Zuckerman Mind Brain Behavior Institute, Columbia University", city:"New York", country:"USA", lat:40.76, lon:-74.12, role:"Postdoctoral Researcher", papers:"Coauthor on [4], [8]"},
        {name:"Eunji Kong", affiliation:"Peter O’Donnell Jr. Brain Institute, University of Texas Southwestern Medical Center", city:"Dallas", country:"USA", lat:32.68, lon:-96.72, role:"Postdoctoral Researcher", papers:"Coauthor on [4]"},
        {name:"Peng Wang", affiliation:"Department of Electrical Engineering, Columbia University", city:"New York", country:"USA", lat:40.52, lon:-73.84, role:"Postdoctoral Researcher", papers:"Coauthor on [7]"}
      ]
    },
    {
      label: "Research Scientists",
      people: [
        {name:"Navid Rahbariasr", affiliation:"Associate Research Scientist, Department of Electrical Engineering, Columbia University", city:"New York", country:"USA", lat:40.97, lon:-73.83, role:"Research Scientist", papers:"Coauthor on [5], [7]"}
      ]
    },
    {
      label: "PhD Students",
      people: [
        {name:"Leonardo F. Toso", affiliation:"Department of Electrical Engineering, Columbia University", city:"New York", country:"USA", lat:40.70, lon:-73.72, role:"PhD Student", papers:"Coauthor on [2], [3], [6]"},
        {name:"Shervin Khalafi", affiliation:"Department of Electrical and Systems Engineering, University of Pennsylvania", city:"Philadelphia", country:"USA", lat:39.84, lon:-75.08, role:"PhD Student", papers:"Coauthor on [9]"},
        {name:"Maxfield Parson-Scherban", affiliation:"Department of Electrical Engineering, Columbia University", city:"New York", country:"USA", lat:40.86, lon:-73.70, role:"PhD Student", papers:"Coauthor on [5], [7]"},
        {name:"Charis Stamouli", affiliation:"Department of Electrical and Systems Engineering, University of Pennsylvania", city:"Philadelphia", country:"USA", lat:40.08, lon:-75.28, role:"PhD Student", papers:"Coauthor on [6]"},
        {name:"Bernard Steyaert", affiliation:"Department of Electrical Engineering, Columbia University", city:"New York", country:"USA", lat:40.58, lon:-74.08, role:"PhD Student", papers:"Coauthor on [5], [7]"}
      ]
    },
    {
      label: "Other Collaborators",
      people: [
        {name:"Hannah Ghanei", affiliation:"School of Computer Science and Electronic Engineering, University of Surrey", city:"Guildford", country:"United Kingdom", lat:51.24, lon:-0.59, role:"Collaborator", papers:"Coauthor on [8]"},
        {name:"Haoyu Novak Chen", affiliation:"Peter O’Donnell Jr. Brain Institute, University of Texas Southwestern Medical Center", city:"Dallas", country:"USA", lat:32.73, lon:-96.94, role:"Collaborator", papers:"Coauthor on [4]"},
        {name:"Rudramani Singha", affiliation:"Peter O’Donnell Jr. Brain Institute, University of Texas Southwestern Medical Center", city:"Dallas", country:"USA", lat:32.88, lon:-96.93, role:"Collaborator", papers:"Coauthor on [4], [8]"}
      ]
    }
  ];

  const people = groups.flatMap(group => group.people.map(person => ({...person, group:group.label})));

  const cities = [
    {name:"New York", country:"USA", lat:40.71, lon:-74.01},
    {name:"Philadelphia", country:"USA", lat:39.95, lon:-75.17},
    {name:"Dallas", country:"USA", lat:32.78, lon:-96.80},
    {name:"Guildford", country:"United Kingdom", lat:51.24, lon:-0.57},
    {name:"Waterloo", country:"Canada", lat:43.47, lon:-80.54},
    {name:"Tehran", country:"Iran", lat:35.69, lon:51.39}
  ];

  const journey = [
    {index:"01", city:"Tehran", institution:"Sharif University of Technology", degree:"B.Sc.", years:"2018–2022", lat:35.69, lon:51.39},
    {index:"02", city:"Waterloo", institution:"University of Waterloo", degree:"M.A.Sc.", years:"2022–2024", lat:43.47, lon:-80.54},
    {index:"03", city:"New York", institution:"Columbia University", degree:"Ph.D.", years:"2024–Present", lat:40.81, lon:-73.96}
  ];

  const countryLabels = [
    {name:"USA",lat:39,lon:-99},{name:"Canada",lat:57,lon:-106},{name:"Mexico",lat:23,lon:-102},
    {name:"Brazil",lat:-10,lon:-52},{name:"Argentina",lat:-38,lon:-64},{name:"United Kingdom",lat:55,lon:-3},
    {name:"France",lat:46.5,lon:2},{name:"Spain",lat:40,lon:-4},{name:"Germany",lat:51,lon:10},
    {name:"Italy",lat:42.5,lon:12.5},{name:"Switzerland",lat:46.8,lon:8.2},{name:"Norway",lat:64,lon:11},
    {name:"Sweden",lat:62,lon:15},{name:"Poland",lat:52,lon:19},{name:"Turkey",lat:39,lon:35},
    {name:"Iran",lat:32,lon:54},{name:"Egypt",lat:27,lon:30},{name:"South Africa",lat:-30,lon:24},
    {name:"India",lat:22,lon:79},{name:"China",lat:35,lon:103},{name:"Japan",lat:37,lon:138},
    {name:"Russia",lat:61,lon:90},{name:"Australia",lat:-25,lon:134},{name:"Indonesia",lat:-2,lon:118}
  ];

  let countries = null;
  let yaw = -0.42;
  let pitch = -0.2;
  let zoom = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let selected = 0;
  let pins = [];
  let moved = 0;

  fetch("https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson")
    .then(response => response.ok ? response.json() : null)
    .then(data => { countries = data; })
    .catch(() => { countries = null; });

  function rotate(lat, lon) {
    const p = lat * Math.PI / 180;
    const l = lon * Math.PI / 180;

    // Conventional geographic orientation:
    // longitude increases eastward and therefore appears to the right
    // when viewed with the prime meridian facing the camera.
    const x = Math.cos(p) * Math.sin(l);
    const y = Math.sin(p);
    const z = Math.cos(p) * Math.cos(l);

    // yaw is the longitude at the center of the view.
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = cy * x - sy * z;
    const z1 = sy * x + cy * z;

    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return {x:x1, y:cp*y-sp*z1, z:sp*y+cp*z1};
  }

  function project(lat, lon, cx, cy, r) {
    const p = rotate(lat, lon);

    // Canvas x-axis correction:
    // geographic east must appear on the right side of the globe.
    // The previous projection used the opposite screen-space handedness,
    // which mirrored all countries and labels horizontally.
    return {x:cx-p.x*r, y:cy-p.y*r, z:p.z};
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function drawRing(ring, cx, cy, r) {
    ctx.beginPath();
    let open = false;
    for (let i=0; i<ring.length; i+=Math.max(1,Math.floor(ring.length/260))) {
      const coord = ring[i];
      const p = project(coord[1],coord[0],cx,cy,r);
      if (p.z < 0.01) { open=false; continue; }
      if (!open) { ctx.moveTo(p.x,p.y); open=true; }
      else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
  }

  function drawCountries(cx,cy,r) {
    if (!countries) return;
    ctx.strokeStyle = "rgba(83,104,125,.38)";
    ctx.lineWidth = .75;

    countries.features.forEach(feature => {
      const geometry = feature.geometry;
      if (!geometry) return;
      if (geometry.type === "Polygon") {
        geometry.coordinates.forEach(ring => drawRing(ring,cx,cy,r));
      } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach(poly => poly.forEach(ring => drawRing(ring,cx,cy,r)));
      }
    });
  }

  function drawLabel(text, p, style) {
    if (p.z < .08) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, .35 + p.z);
    ctx.font = style.font;
    ctx.fillStyle = style.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text,p.x,p.y);
    ctx.restore();
  }

  function draw() {
    resize();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cx = w/2, cy = h/2, r = Math.min(w,h)*.43*zoom;
    ctx.clearRect(0,0,w,h);

    const g = ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r);
    g.addColorStop(0,"#ffffff");
    g.addColorStop(.72,"#f5f8fb");
    g.addColorStop(1,"#e7edf3");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "#c8d2dc";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.clip();

    ctx.strokeStyle = "rgba(110,128,146,.13)";
    ctx.lineWidth = .7;
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

    drawCountries(cx,cy,r);

    countryLabels.forEach(country => {
      const p = project(country.lat,country.lon,cx,cy,r);
      drawLabel(country.name,p,{
        font:'600 8px ui-monospace, SFMono-Regular, Menlo, monospace',
        color:"rgba(76,94,112,.48)"
      });
    });

    cities.forEach(city => {
      const p = project(city.lat,city.lon,cx,cy,r);
      if(p.z<.04) return;
      ctx.beginPath();
      ctx.arc(p.x,p.y,2.2,0,Math.PI*2);
      ctx.fillStyle="#102033";
      ctx.fill();
      ctx.font='700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle="#33485d";
      ctx.textAlign="left";
      ctx.textBaseline="middle";
      ctx.fillText(city.name+" · "+city.country,p.x+6,p.y-1);
    });


    function toCartesian(lat, lon) {
      const p = lat * Math.PI / 180;
      const l = lon * Math.PI / 180;
      return [Math.cos(p)*Math.cos(l), Math.sin(p), Math.cos(p)*Math.sin(l)];
    }

    function fromCartesian(v) {
      const n = Math.hypot(v[0],v[1],v[2]) || 1;
      const x=v[0]/n, y=v[1]/n, z=v[2]/n;
      return {
        lat: Math.asin(y) * 180 / Math.PI,
        lon: Math.atan2(z,x) * 180 / Math.PI
      };
    }

    function drawJourneySegment(a,b) {
      const av=toCartesian(a.lat,a.lon);
      const bv=toCartesian(b.lat,b.lon);
      ctx.beginPath();
      let open=false;
      for(let t=0;t<=1.0001;t+=0.025){
        const v=[
          av[0]*(1-t)+bv[0]*t,
          av[1]*(1-t)+bv[1]*t,
          av[2]*(1-t)+bv[2]*t
        ];
        const ll=fromCartesian(v);
        const p=project(ll.lat,ll.lon,cx,cy,r);
        if(p.z<0.02){open=false;continue;}
        if(!open){ctx.moveTo(p.x,p.y);open=true;} else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle="#b87333";
      ctx.lineWidth=2.4;
      ctx.setLineDash([7,5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawJourneySegment(journey[0],journey[1]);
    drawJourneySegment(journey[1],journey[2]);

    journey.forEach(stop=>{
      const p=project(stop.lat,stop.lon,cx,cy,r);
      if(p.z<0.02) return;

      ctx.beginPath();
      ctx.arc(p.x,p.y,8.5,0,Math.PI*2);
      ctx.fillStyle="#fff8f1";
      ctx.fill();
      ctx.strokeStyle="#b87333";
      ctx.lineWidth=2.2;
      ctx.stroke();

      ctx.fillStyle="#8a4f00";
      ctx.font='700 8px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText(stop.index,p.x,p.y+.2);

      ctx.textAlign="left";
      ctx.textBaseline="alphabetic";
      ctx.font='700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle="#7a4a1c";
      ctx.fillText(stop.city,p.x+12,p.y-3);
      ctx.font='600 7px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle="rgba(122,74,28,.78)";
      ctx.fillText(stop.degree+" · "+stop.years,p.x+12,p.y+9);
    });

    pins=[];
    people.forEach((person,i)=>{
      const p=project(person.lat,person.lon,cx,cy,r);
      if(p.z<0) return;
      pins.push({i,x:p.x,y:p.y});
      ctx.beginPath();
      ctx.arc(p.x,p.y,i===selected?5.8:3.8,0,Math.PI*2);
      ctx.fillStyle=i===selected?"#2457d6":"#6681aa";
      ctx.fill();
      if(i===selected){
        ctx.beginPath();
        ctx.arc(p.x,p.y,10.5,0,Math.PI*2);
        ctx.strokeStyle="rgba(36,87,214,.28)";
        ctx.lineWidth=1.5;
        ctx.stroke();
      }
    });

    ctx.restore();
    requestAnimationFrame(draw);
  }

  function selectPerson(i) {
    selected=i;
    const p=people[i];
    nameEl.textContent=p.name;
    affiliationEl.textContent=p.affiliation;
    areaEl.textContent=p.role+" · "+p.papers;
    cityEl.textContent=p.city+", "+p.country;
    document.querySelectorAll(".collab-person").forEach((el,index)=>{
      el.classList.toggle("selected",index===i);
    });
  }

  const activePointers = new Map();
  let pinchDistance = null;
  let pinchZoomStart = 1;

  function updateZoom(nextZoom) {
    zoom = Math.max(.78, Math.min(2.8, nextZoom));
    if (zoomReadout) zoomReadout.textContent = Math.round(zoom * 100) + "%";
  }

  canvas.addEventListener("wheel",e=>{
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * .0012);
    updateZoom(zoom * factor);
  }, {passive:false});

  canvas.addEventListener("pointerdown",e=>{
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(activePointers.size===2){
      const pts=[...activePointers.values()];
      pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      pinchZoomStart=zoom;
      dragging=false;
    } else {
      dragging=true;
      moved=0;
      lastX=e.clientX;
      lastY=e.clientY;
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove",e=>{
    if(activePointers.has(e.pointerId)){
      activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    }

    if(activePointers.size===2 && pinchDistance){
      const pts=[...activePointers.values()];
      const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      updateZoom(pinchZoomStart * (d/pinchDistance));
      return;
    }

    if(!dragging) return;
    const dx=e.clientX-lastX;
    const dy=e.clientY-lastY;
    moved+=Math.hypot(dx,dy);
    yaw+=dx*.007;
    pitch=Math.max(-1.1,Math.min(1.1,pitch+dy*.006));
    lastX=e.clientX;
    lastY=e.clientY;
  });

  canvas.addEventListener("pointerup",e=>{
    activePointers.delete(e.pointerId);
    if(activePointers.size<2) pinchDistance=null;
    dragging=false;
    if(moved>7) return;
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    let hit=null, best=13;
    pins.forEach(pin=>{
      const d=Math.hypot(x-pin.x,y-pin.y);
      if(d<best){best=d;hit=pin.i;}
    });
    if(hit!==null) selectPerson(hit);
  });

  function focusJourney() {
    yaw = -0.16;
    pitch = -0.34;
    updateZoom(1.08);
  }

  resetButton.addEventListener("click",()=>{yaw=-.42;pitch=-.2;updateZoom(1);});
  if (zoomInButton) zoomInButton.addEventListener("click",()=>updateZoom(zoom*1.18));
  if (zoomOutButton) zoomOutButton.addEventListener("click",()=>updateZoom(zoom/1.18));
  if (journeyButton) journeyButton.addEventListener("click",focusJourney);

  groups.forEach(group=>{
    const section=document.createElement("section");
    section.className="collab-group";

    const title=document.createElement("h3");
    title.className="collab-group-title";
    title.textContent=group.label;
    section.appendChild(title);

    const list=document.createElement("div");
    list.className="collab-group-list";

    group.people.forEach(person=>{
      const i=people.findIndex(p=>p.name===person.name);
      const button=document.createElement("button");
      button.type="button";
      button.className="collab-person";

      const dot=document.createElement("span");
      dot.className="collab-dot";

      const body=document.createElement("span");
      const name=document.createElement("strong");
      name.className="collab-person-name";
      name.textContent=person.name;
      const affiliation=document.createElement("span");
      affiliation.className="collab-person-affiliation";
      affiliation.textContent=person.affiliation;
      const papers=document.createElement("span");
      papers.className="collab-person-papers";
      papers.textContent=person.papers;

      body.append(name,affiliation,papers);
      button.append(dot,body);
      button.addEventListener("click",()=>selectPerson(i));
      list.appendChild(button);
    });

    section.appendChild(list);
    roster.appendChild(section);
  });

  selectPerson(0);
  updateZoom(1);
  window.addEventListener("resize",resize);
  draw();
})();
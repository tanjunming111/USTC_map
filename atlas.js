"use strict";

const byId = id => document.getElementById(id);
const canvas = byId("scene");
const modelCanvas = byId("atlasScene3D");
const ctx = canvas.getContext("2d");
const search = byId("search");
const detail = byId("detail");
const names = {academic:"教学科研",admin:"行政办公",venue:"校内场馆",dorm:"学生宿舍",housing:"家属住宅",service:"生活设施",landscape:"文化风景",access:"出入口",road:"道路"};
const colors = {
  academic:{roof:"#ece7de", walls:["#b8b6ae","#c8c5bb","#d9d5ca"]},
  service:{roof:"#f0e9db", walls:["#bfb8aa","#d0c9b8","#dfd7c7"]},
  accent:{roof:"#dfe8df", walls:["#a0b0a7","#b3c2b8","#cbd7cf"]}
};
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const home = {x:678,y:932,yaw:-.29,pitch:.73,zoom:1};
const camera = {...home};
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
let width = 1, height = 1, pixelRatio = 1;
let frame = 0, flight = 0, selected = null, filter = "all", matches = [], hits = [];
let walkDestination = null;
let flat = false;
let modelRenderer, modelUnavailable=false;

function drawModel(scale) {
  modelCanvas.hidden=flat || modelUnavailable || walk.active;
  if (modelCanvas.hidden) return;
  try {
    modelRenderer ??= createCampusRenderer(modelCanvas,true);
    modelRenderer.draw(camera,scale);
  } catch (error) {
    console.warn("3D atlas unavailable",error);
    modelCanvas.hidden=modelUnavailable=true;
  }
}
modelCanvas.addEventListener("webglcontextlost",event=>{
  event.preventDefault();
  modelRenderer=null;
  modelCanvas.hidden=modelUnavailable=true;
});
modelCanvas.addEventListener("webglcontextrestored",()=>{
  modelUnavailable=false;
  scheduleDraw();
});
function projectRaw(x,y,z,view) {
  const c = Math.cos(view.yaw), s = Math.sin(view.yaw);
  const dx = x-view.x, dy = y-view.y;
  return [dx*c-dy*s, (dx*s+dy*c)*Math.sin(view.pitch)-z*Math.cos(view.pitch)];
}

const extents = campus.outline.map(([x,y]) => projectRaw(x,y,0,home));
const minX = Math.min(...extents.map(point => point[0]));
const maxX = Math.max(...extents.map(point => point[0]));
const minY = Math.min(...extents.map(point => point[1]));
const maxY = Math.max(...extents.map(point => point[1]));
const homeCenterX = (minX+maxX)/2, homeCenterY = (minY+maxY)/2;
home.x += homeCenterX*Math.cos(home.yaw)+homeCenterY/Math.sin(home.pitch)*Math.sin(home.yaw);
home.y += -homeCenterX*Math.sin(home.yaw)+homeCenterY/Math.sin(home.pitch)*Math.cos(home.yaw);
Object.assign(camera, home);

function sceneScale() {
  const verticalFit = Math.max(1, Math.sin(camera.pitch)/Math.sin(home.pitch));
  return Math.min((width-32)/(maxX-minX+90), (height-48)/((maxY-minY+65)*verticalFit))*camera.zoom;
}

function polygon(points, fill, stroke, lineWidth = 1) {
  const path = new Path2D();
  path.moveTo(...points[0]);
  for (const point of points.slice(1)) path.lineTo(...point);
  path.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(path); }
  return path;
}

function draw() {
  frame = 0;
  if (!ctx) return;
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  const bg = ctx.createRadialGradient(width*.52,height*.46,0,width*.5,height*.5,Math.max(width,height)*.75);
  bg.addColorStop(0,"#f1f4eb");
  bg.addColorStop(1,"#dfe9db");
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,width,height);

  const c = Math.cos(camera.yaw), s = Math.sin(camera.yaw);
  const rise = Math.cos(camera.pitch), fall = Math.sin(camera.pitch);
  const scale = sceneScale();
  const project = (x,y,z=0) => {
    const dx = x-camera.x, dy = y-camera.y;
    return [width/2+(dx*c-dy*s)*scale, height/2+((dx*s+dy*c)*fall-z*rise)*scale];
  };
  const depth = (x,y) => x*s+y*c;
  const shapeAt = (shape, z=0) => shape.map(([x,y]) => project(x,y,z));
  const stroke = (points, color, size) => {
    ctx.beginPath();
    points.forEach((point,i) => i ? ctx.lineTo(...point) : ctx.moveTo(...point));
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(.45,size*scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  const ground = (shape, fill, edge) => polygon(shapeAt(shape),fill,edge,.65);
  const ring = (x,y,rx,ry,rotation=0,steps=20) => Array.from({length:steps},(_,i) => {
    const a = i*2*Math.PI/steps;
    return [x+Math.cos(a+rotation)*rx,y+Math.sin(a+rotation)*ry];
  });

  // The boundary tint separates the campus from its surrounding streets on one plane.
  const edgeTop = shapeAt(campus.outline);
  ctx.save();
  ctx.shadowColor = "#57778627";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 4;
  const board = polygon(edgeTop,"#d5e6c6","#a8bcab",.85);
  ctx.restore();
  ctx.save();
  ctx.clip(board);
  for (const lawn of campus.lawns) ground(lawn,"#b9d4a5");
  ground(campus.tunnel.portalLawn,"#a6c391");
  ground(campus.parking.lawn,"#a9c991");
  for (const plaza of campus.plazas) ground(plaza,"#e4eadc");
  for (const lawn of campus.squareScene.lawns) ground(lawn,"#a9c38b");
  ground(campus.squareScene.corridor,"#e0dacf");
  ground(campus.squareScene.patio,"#c8bdae");
  ground(campus.activityModel.apron,"#c3beb0");
  for (const building of campus.buildings) {
    const offset = 4+building.height*.16*rise;
    ground(building.shape.map(([x,y]) => [x+offset,y+offset*.65]),"#586e6527");
  }
  for (const tree of campus.trees) ground(ring(tree.x+4,tree.y+3,tree.r,tree.r*.7),"#627d5733");
  ctx.restore();
  for (const [kind,shapes] of Object.entries(campus.roadSurfaces)) {
    ctx.beginPath();
    for (const shape of shapes) {
      shapeAt(shape).forEach((point,i)=>i ? ctx.lineTo(...point) : ctx.moveTo(...point));
      ctx.closePath();
    }
    ctx.fillStyle=campus.roadColors[kind];
    ctx.fill();
  }
  for(const {shape} of campus.tunnel.ramps) ground(shape,"#797b72");
  ctx.save();
  ctx.clip(board);
  ground(campus.squareScene.pool,"#7fbab2");
  ground(campus.squareScene.planter,"#789356");
  for(const step of campus.squareScene.steps) ground(step,"#d5d4c9","#a8a99e");
  for(const [x,y] of campus.squareScene.flagpoles) ground(ring(x,y,.72,.72),"#858e85");
  for(const {x,y,r} of [...campus.memorialShrubs,...campus.historyShrubs,...campus.lakeShrubs,...campus.oxShrubs,...campus.tunnel.shrubs]) ground(ring(x,y,r,r*.84),"#779653");
  for(const {shape,kind} of campus.sportCourts) ground(shape,kind==="tennis"?"#648ca3":"#608c6e");
  for(const {shape} of campus.libraryFront.steps) ground(shape,"#b0b1a5");
  for(const {shape} of campus.busDepot.buses) ground(shape,"#e0c35f");
  ground(campus.bikeShelter.shape,"#929d97");
  for(const {x,y,r} of campus.bikeShelter.shrubs) ground(ring(x,y,r,r*.84),"#779653");
  for(const [x,y] of campus.squareScene.terraceTables) ground(ring(x,y,2.03,2.03),"#eee6d7");
  for (const water of campus.waters) {
    ground(water,"#7fbab2","#68a89f");
    const center = water.reduce(([x,y],[a,b]) => [x+a/water.length,y+b/water.length],[0,0]);
    polygon(shapeAt(water.map(([x,y]) => [center[0]+.83*(x-center[0]),center[1]+.85*(y-center[1])])), "#89c2b9");
    for (let i=-1;i<=1;i++) stroke(shapeAt([[center[0]-13,center[1]+i*9],[center[0]+9,center[1]+i*9-2]]),"#c5e2d6",1.6);
  }

  const trackShape = campus.trackShape;
  ground(trackShape(0),"#bf8269","#ede0b5");
  for (const inset of [4,8,12,16]) ground(trackShape(inset),null,"#efd5ae");
  ground(trackShape(20),"#a8bd7d","#f0dfb8");
  ground(campus.box(322,967,76,112),null,"#e1e9bb");
  stroke(shapeAt([[322,1023],[398,1023]]),"#e1e9bb",1.5);
  ground(ring(360,1023,11,11),null,"#e1e9bb");
  for (const place of campus.ornaments) {
    ground(ring(place.x,place.y,4.5,4.5),"#e4e7cc","#a5ad88");
    ground(ring(place.x,place.y,2.3,2.3),"#617e69");
  }
  stroke(shapeAt(campus.pavilionWalk,3),"#e6d8b3",6);
  ctx.restore();

  function prism(shape, z0, z1, palette, outline, facade) {
    const base = shapeAt(shape,z0);
    const top = shapeAt(shape,z1);
    const area = shape.reduce((sum,[x,y],i) => {
      const [nx,ny] = shape[(i+1)%shape.length];
      return sum+x*ny-nx*y;
    },0);
    const faces = [];
    if (rise > .01) base.forEach((point,i) => {
      const j = (i+1)%base.length;
      if (area*(base[j][0]-point[0]) >= 0) return;
      const [x,y] = shape[i], [nx,ny] = shape[j];
      const dx = nx-x, dy = ny-y;
      const light = (dx+dy*.65)/Math.hypot(dx,dy)*Math.sign(area);
      const color = palette.walls[light < -.35 ? 0 : light < .6 ? 1 : 2];
      faces.push({d:depth((x+nx)/2,(y+ny)/2),points:[point,base[j],top[j],top[i]],color,x,y,dx,dy});
    });
    faces.sort((a,b) => a.d-b.d);
    const paths = faces.map(face => {
      const path = polygon(face.points,face.color,outline||"#a9a68e",outline?1.05:.55);
      if (facade && scale*rise > .24) {
        const {x,y,dx,dy} = face;
        const point = (t,z) => project(x+dx*t,y+dy*t,z+z0);
        const windows = new Path2D();
        for (const [l,r,b,t] of campus.wallWindows(Math.hypot(dx,dy),z1-z0,facade)) {
          windows.moveTo(...point(l,b));
          windows.lineTo(...point(r,b));
          windows.lineTo(...point(r,t));
          windows.lineTo(...point(l,t));
          windows.closePath();
        }
        ctx.fillStyle = facade.glass || "#718a826e";
        ctx.fill(windows);
      }
      return path;
    });
    paths.push(polygon(top,palette.roof,outline||"#b9b29a",outline?1.35:.6));
    return paths;
  }

  const objects = campus.buildings.map(building => ({
    d:Math.max(...building.shape.map(([x,y]) => depth(x,y))),
    render() {
      const active = selected?.id === building.id && !!building.id;
      const style = building.style || {};
      const base=colors[building.type];
      const palette = style.wall ? {walls:[style.base||style.wall,style.wall,style.wall],roof:style.roof||base.roof} : base;
      const bottom=building===campus.busDepot.shelter?4.1:building.id==="activity"?campus.activityModel.upper.bottom:0;
      const paths = prism(building.shape,bottom,building.baseHeight??building.height,active ? {...palette,roof:"#e1edcc"} : palette,active ? "#387c73" : null,style);
      for(const {shape,top,style} of building.masses||[]) paths.push(...prism(shape,building.baseHeight,top,
        {walls:[style.base||style.wall,style.wall,style.trim||style.wall],roof:active?"#e1edcc":style.roof},
        active?"#387c73":null,style.floors?style:null));
      if (building.id==="activity") for(const {shape,top} of campus.activityModel.columns) paths.push(...prism(shape,0,top,palette));
      hits.push({id:building.id,paths});
    }
  }));
  for (const tree of campus.trees) objects.push({
    d:depth(tree.x,tree.y)+tree.r,
    render() {
      const {x,y,r,cherry} = tree;
      stroke([project(x,y),project(x,y,r)],"#8b8066",2);
      const [cx,cy] = project(x,y,r*1.5);
      const radius = Math.max(1.1,r*scale);
      const gradient = ctx.createRadialGradient(cx-radius*.36,cy-radius*.36,0,cx,cy,radius*1.08);
      gradient.addColorStop(0,cherry?"#f3dad4":"#b4c68e");
      gradient.addColorStop(1,cherry?"#c38f93":"#678b6f");
      ctx.beginPath();
      ctx.ellipse(cx,cy,radius,radius*.86,0,0,Math.PI*2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  });
  const {x:pavilionX,y:pavilionY} = campus.pavilion;
  objects.push({d:depth(pavilionX,pavilionY),render() {
    const platform = ring(pavilionX,pavilionY,7.2,6.5,0,6);
    const base = prism(platform,0,3,{roof:"#ead6af",walls:["#a18f71","#b6a17f","#c6b48d"]});
    for (const [x,y] of ring(pavilionX,pavilionY,5.2,4.5,0,6)) stroke([project(x,y,3),project(x,y,10)],"#826745",1.4);
    const rim = shapeAt(ring(pavilionX,pavilionY,8.8,8,0,6),10);
    const tip = project(pavilionX,pavilionY,15);
    const roofColors = ["#5e776c","#738577","#526e67","#405e59","#577670","#779388"];
    for (let i=0;i<6;i++) base.push(polygon([tip,rim[i],rim[(i+1)%6]],roofColors[i],"#405f56",.55));
    hits.push({id:"pavilion",paths:base});
  }});
  for (const {place,parts} of campus.gates) {
    objects.push({d:depth(place.x,place.y),render() {
      const paths=parts.flatMap(({shape,bottom,top,wall,roof}) =>
        prism(shape,bottom,top,{roof,walls:[wall,wall,wall]}));
      hits.push({id:place.id,paths});
    }});
  }
  hits = campus.waters.slice(0,2).map(shape => ({id:"lakes",paths:[polygon(shapeAt(shape),null)]}));
  hits.push({id:"track",paths:[polygon(shapeAt(trackShape(0)),null)]});
  hits.push({id:"square",paths:[polygon(shapeAt(campus.square),null)]});
  objects.sort((a,b) => a.d-b.d);
  for (const object of objects) object.render();
  drawModel(scale);
  placeMarkers(project);
  byId("needle").style.transform = "rotate(" + camera.yaw + "rad)";
}

function scheduleDraw() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function resize() {
  if (canvas.hidden) return;
  const bounds = canvas.getBoundingClientRect();
  width = Math.max(1,bounds.width);
  height = Math.max(1,bounds.height);
  pixelRatio = Math.min(devicePixelRatio || 1,2);
  canvas.width = Math.round(width*pixelRatio);
  canvas.height = Math.round(height*pixelRatio);
  scheduleDraw();
}

const markers = new Map();
const buildingsByPlace = new Map(campus.buildings.filter(building => building.id).map(building => [building.id,building]));
const overviewPlaces = [...campus.landmarks].sort((a,b) => markerPriority(a)-markerPriority(b));

function markerPriority(place) {
  if (place.featured) return 0;
  if (place.id === "second" || place.id === "fifth") return 0.5;
  if (place.searchOnly) return 3;
  return buildingsByPlace.has(place.id) ? 1 : 2;
}

for (const place of campus.landmarks) {
  const building = buildingsByPlace.get(place.id);
  const numberedBlock = place.searchOnly && /^\d+#$/.test(place.aliases);
  const name = numberedBlock ? building.number+"号楼" : place.short;
  const label = name.length > 11 ? name.slice(0,10)+"…" : name;
  const button = document.createElement("button");
  button.className = building ? "marker building-marker" : "marker";
  button.dataset.kind=place.kind;
  button.textContent = label;
  button.title = place.name;
  button.setAttribute("aria-label",place.name);
  button.addEventListener("click", () => selectPlace(place));
  byId("markers").append(button);
  const labelWidth = [...label].reduce((sum,char) => sum+(/^[\x00-\x7F]$/.test(char)?6:10),22);
  markers.set(place.id,{button,labelWidth});
}

function placeMarkers(project) {
  const occupied = [];
  const visibleNames = new Set();
  const ordered = selected ? [selected,...overviewPlaces.filter(place => place !== selected)] : overviewPlaces;
  const labelsFiltered = search.value.trim() || filter !== "all";
  const overviewLimit = width >= 760 ? 38 : width >= 500 ? 27 : 18;
  for (const place of ordered) {
    const {button:marker,labelWidth} = markers.get(place.id);
    const active = place === selected;
    const [x,y] = project(place.x,place.y,place.h);
    const overviewVisible = occupied.length < overviewLimit && !visibleNames.has(place.name)
      && (place.kind!=="road" || place.featured || camera.zoom>1.35 || flat);
    marker.hidden = !(active || (labelsFiltered ? matches.includes(place) : overviewVisible))
      || x < 7 || x > width-7 || y < 29 || y > height-17;
    if (marker.hidden) continue;
    const left = x-labelWidth/2;
    const right = x+labelWidth/2;
    const offsets = !labelsFiltered && !place.searchOnly ? [9,23,-9] : [9];
    const leader = offsets.find(offset => {
      const top = offset>0 ? y-offset-22 : y-offset, bottom = top+22;
      return left>=3 && right<=width-3 && top>=3 && bottom<=height-3 &&
        !occupied.some(([l,t,r,b]) => left<r+4 && right>l-4 && top<b+4 && bottom>t-4);
    });
    marker.hidden = !active && leader===undefined;
    if (marker.hidden) continue;
    const offset = leader ?? 9;
    marker.style.left = x+"px";
    marker.style.top = (y-offset)+"px";
    marker.style.setProperty("--leader",Math.abs(offset)+"px");
    marker.classList.toggle("below",offset<0);
    marker.classList.toggle("active",active);
    const top = offset>0 ? y-offset-22 : y-offset;
    occupied.push([left,top,right,top+22]);
    visibleNames.add(place.name);
  }
}

function stopFlight() {
  cancelAnimationFrame(flight);
  flight = 0;
}

function flyTo(target) {
  stopFlight();
  const start = {...camera};
  const end = {...camera,...target};
  end.yaw = start.yaw+Math.atan2(Math.sin(end.yaw-start.yaw),Math.cos(end.yaw-start.yaw));
  if (prefersReducedMotion.matches) {
    Object.assign(camera,end);
    scheduleDraw();
    return;
  }
  const begin = performance.now();
  const tick = now => {
    const t = clamp((now-begin)/480,0,1);
    const blend = t*t*(3-2*t);
    for (const key of Object.keys(camera)) camera[key] = start[key]+(end[key]-start[key])*blend;
    scheduleDraw();
    flight = t < 1 ? requestAnimationFrame(tick) : 0;
  };
  flight = requestAnimationFrame(tick);
}

function setFlat(enabled) {
  flat = enabled;
  const button = byId("viewMode");
  button.textContent = flat ? "3D" : "2D";
  button.setAttribute("aria-pressed",String(flat));
  button.setAttribute("aria-label",flat ? "切换到三维视角" : "切换到二维俯视");
}

const tips = {
  "old-north":"从门洞向南走，就能进入樱花大道。",
  sakura:"沿两排樱树向南走，可到一教北侧。两侧步道通向眼镜湖。",
  lakes:"站在樱花大道上可同时辨认东、西两池。一鉴亭位于东池。",
  pavilion:"可从东池北岸经曲折的回廊靠近亭子。",
  classroom:"漫游定位在北侧门廊外，便于观察红砖立面和门前铺装。",
  square:"可沿中轴查看郭沫若先生像，再向南去老图书馆。",
  "old-library":"旧馆与东区新馆相邻。搜索「207」可以直接定位到老图书馆。",
  library:"漫游定位在南侧台阶外，朝向玻璃门厅。",
  canteen:"从图书馆沿校内道路向东可到食堂一带。",
  track:"运动场靠近金寨路。可从东侧校内道路观察跑道和看台。",
  auditorium:"从水池西侧看临水立面，可以辨认成排长窗和浅色横带。"
};

function showPlaceFacts(place) {
  const facts = byId("detailFacts");
  const building = buildingsByPlace.get(place.id);
  const rows = [];
  if (building?.number) rows.push(["楼号",building.number+"#"]);
  if (building?.levels) rows.push(["资料楼层",building.levels+" 层"]);
  if (building) rows.push(["模型高度","约 "+Math.round(building.height/eastOSM.unit)+" 米"]);
  facts.replaceChildren();
  for (const [name,value] of rows) {
    const dt=document.createElement("dt"), dd=document.createElement("dd");
    dt.textContent=name;
    dd.textContent=value;
    facts.append(dt,dd);
  }
  facts.hidden=!rows.length;
  const tip=byId("detailTip");
  tip.textContent=tips[place.id]||"";
  tip.hidden=!tips[place.id];
  const nearby=byId("detailNearby");
  const candidates=campus.landmarks.filter(p=>!p.searchOnly && p.kind!=="road" && p!==place)
    .map(p=>({p,distance:Math.hypot(p.x-place.x,p.y-place.y)/eastOSM.unit}))
    .filter(({distance})=>distance>=12 && distance<=240)
    .sort((a,b)=>a.distance-b.distance).slice(0,3);
  nearby.replaceChildren();
  nearby.hidden=!candidates.length;
  if (!candidates.length) return;
  const title=document.createElement("h3");
  title.textContent="附近地点 · 直线距离";
  nearby.append(title);
  for (const {p,distance} of candidates) {
    const button=document.createElement("button");
    button.type="button";
    button.textContent=p.short+" · "+Math.round(distance/5)*5+" 米";
    button.addEventListener("click",()=>selectPlace(p));
    nearby.append(button);
  }
}

function selectPlace(place) {
  selected = place;
  detail.hidden = false;
  detail.scrollTop = 0;
  byId("detailName").textContent = place.name;
  byId("detailMeta").textContent = "东校区 / " + names[place.kind];
  byId("detailBody").textContent = place.description;
  showPlaceFacts(place);
  byId("detailWalk").hidden=walk.active;
  const source = byId("detailSource");
  const facade = campus.facadeSources[place.id];
  const plans = place.id === "second" || place.id === "fifth";
  source.href = facade || (plans ? campus.floorPlans : campus.reference);
  source.textContent = facade ? "外观参考 ↗" : "教室平面 ↗";
  source.hidden = !facade && !plans;
  const vr=byId("detailVR");
  vr.href=campus.vrUrl;
  vr.hidden=!campus.vrPlaces.has(place.id);
  markListSelection();
  if (walk.active) {
    walk.teleport(place);
    byId("walkScene").focus({preventScroll:true});
    return;
  }
  walkDestination = place;
  flyTo({x:place.x,y:place.y,zoom:Math.max(1.62,camera.zoom)});
}

function clearSelection() {
  selected = null;
  walkDestination = null;
  detail.hidden = true;
  markListSelection();
  scheduleDraw();
}

function markListSelection() {
  for (const button of byId("places").querySelectorAll(".place")) {
    button.setAttribute("aria-current",String(button.dataset.place === selected?.id));
  }
}

function updateList() {
  const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  matches = campus.landmarks.filter(place =>
    (!place.searchOnly || terms.length > 0 || filter !== "all") && (filter === "all" || filter === place.kind) &&
    terms.every(term => [place.name,place.short,place.aliases,names[place.kind]].join(" ").toLowerCase().includes(term)));
  byId("count").textContent = matches.length + " 处";
  const list = byId("places");
  list.replaceChildren();
  for (const place of matches) {
    const button = document.createElement("button");
    button.className = "place";
    button.dataset.place = place.id;
    const badge = document.createElement("span");
    badge.className = "place-number " + place.kind;
    badge.textContent = String(campus.landmarks.indexOf(place)+1).padStart(2,"0");
    const title = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = place.name;
    const category = document.createElement("small");
    category.textContent = names[place.kind];
    title.append(name,category);
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.setAttribute("aria-hidden","true");
    arrow.textContent = "↗";
    button.append(badge,title,arrow);
    button.addEventListener("click", () => selectPlace(place));
    list.append(button);
  }
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "没有匹配的地标。试试简称，或切换到「全部」。";
    list.append(empty);
  }
  markListSelection();
  scheduleDraw();
}

for (const [key,label] of Object.entries({all:"全部",...names})) {
  const button = document.createElement("button");
  button.textContent = label;
  button.dataset.kind=key;
  button.setAttribute("aria-pressed",String(key === filter));
  button.addEventListener("click", () => {
    filter = key;
    for (const sibling of byId("filters").children) sibling.setAttribute("aria-pressed",String(sibling === button));
    updateList();
  });
  byId("filters").append(button);
}
search.addEventListener("input",updateList);
search.addEventListener("keydown",event => {
  if (event.key === "Enter" && !event.isComposing && matches.length) selectPlace(matches[0]);
});
byId("closeDetail").addEventListener("click",clearSelection);
byId("source").href = campus.reference;
const touch = matchMedia("(pointer: coarse)").matches;
const atlasHint = touch ? "拖动旋转 · 双指缩放与平移" : "拖动旋转 · 滚轮缩放 · Shift + 拖动平移";
byId("viewHint").textContent = atlasHint;

function setWalkMode(enabled) {
  if (enabled) {
    if (!walk.enter(walkDestination)) return;
    walkDestination = null;
    stopFlight();
  } else {
    walk.exit();
  }
  byId("walkMode").setAttribute("aria-pressed",String(enabled));
  byId("atlasMode").setAttribute("aria-pressed",String(!enabled));
  canvas.hidden = enabled;
  if (enabled) modelCanvas.hidden = true;
  byId("markers").hidden = enabled;
  byId("atlasControls").hidden = enabled;
  byId("walkHud").hidden = !enabled;
  byId("walkScene").hidden = !enabled;
  byId("detailWalk").hidden = enabled;
  byId("viewCaption").textContent = enabled ? "第一人称漫游" : "微缩校园沙盘";
  byId("viewHint").textContent = enabled
    ? touch ? "方向按钮行走 · 可经校门走上周边道路" : "WASD 行走 · 拖动观察 · 空格加速 · Shift + W／S 升降 · X 下落"
    : atlasHint;
  byId(enabled ? "walkScene" : "scene").focus({preventScroll:true});
  if (!enabled) resize();
}
byId("atlasMode").addEventListener("click",() => setWalkMode(false));
byId("walkMode").addEventListener("click",() => setWalkMode(true));
byId("detailWalk").addEventListener("click",() => setWalkMode(true));

function reset() {
  clearSelection();
  setFlat(false);
  flyTo(home);
}

function zoomBy(factor) {
  stopFlight();
  camera.zoom = clamp(camera.zoom*factor,.55,4.4);
  scheduleDraw();
}

byId("reset").addEventListener("click",reset);
byId("north").addEventListener("click",() => flyTo({yaw:0}));
byId("zoomIn").addEventListener("click",() => zoomBy(1.23));
byId("zoomOut").addEventListener("click",() => zoomBy(1/1.23));
byId("viewMode").addEventListener("click",() => {
  setFlat(!flat);
  flyTo(flat ? {yaw:0,pitch:Math.PI/2} : {yaw:home.yaw,pitch:home.pitch});
});

canvas.closest(".map").addEventListener("wheel",event => {
  if (walk.active || detail.contains(event.target)) return;
  event.preventDefault();
  const delta = event.deltaY*(event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
  zoomBy(Math.exp(-clamp(delta,-170,170)*.002));
},{passive:false});
canvas.addEventListener("contextmenu",event => event.preventDefault());
const pointers = new Map();
let moved = false, pan = false, pointerStart;

function panBy(dx,dy) {
  const scale = sceneScale();
  const rx = dx/scale, ry = dy/(scale*Math.sin(camera.pitch));
  camera.x = clamp(camera.x-rx*Math.cos(camera.yaw)-ry*Math.sin(camera.yaw),-250,1650);
  camera.y = clamp(camera.y+rx*Math.sin(camera.yaw)-ry*Math.cos(camera.yaw),-250,2150);
}

canvas.addEventListener("pointerdown",event => {
  if (event.button !== 0 && event.button !== 2) return;
  stopFlight();
  canvas.setPointerCapture(event.pointerId);
  const point = [event.clientX,event.clientY];
  if (!pointers.size) {
    pointerStart = point;
    moved = false;
    pan = event.shiftKey || event.button === 2;
  } else {
    moved = true;
  }
  pointers.set(event.pointerId,point);
});
canvas.addEventListener("pointermove",event => {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const [x,y] = [event.clientX,event.clientY];
  pointers.set(event.pointerId,[x,y]);
  if (!moved && Math.hypot(x-pointerStart[0],y-pointerStart[1]) < 4) return;
  moved = true;
  const dx = x-previous[0], dy = y-previous[1];
  if (pointers.size === 2) {
    const [ox,oy] = [...pointers.entries()].find(([id]) => id !== event.pointerId)[1];
    const oldDistance = Math.hypot(previous[0]-ox,previous[1]-oy);
    if (oldDistance > 3) zoomBy(Math.hypot(x-ox,y-oy)/oldDistance);
    panBy(dx/2,dy/2);
  } else if (pointers.size === 1) {
    if (pan || event.shiftKey || flat) panBy(dx,dy);
    else {
      camera.yaw += dx*.009;
      camera.pitch = clamp(camera.pitch+dy*.006,.33,1.36);
    }
  }
  scheduleDraw();
});
canvas.addEventListener("pointerup",event => {
  if (!pointers.delete(event.pointerId)) return;
  if (moved || event.button !== 0) return;
  const {left,top} = canvas.getBoundingClientRect();
  const x = (event.clientX-left)*pixelRatio, y = (event.clientY-top)*pixelRatio;
  const hit = [...hits].reverse().find(item => item.paths.some(path => ctx.isPointInPath(path,x,y)));
  if (hit?.id) selectPlace(campus.landmarks.find(place => place.id === hit.id));
});
canvas.addEventListener("pointercancel",event => pointers.delete(event.pointerId));
canvas.addEventListener("lostpointercapture",event => pointers.delete(event.pointerId));
canvas.addEventListener("keydown",event => {
  const key = event.key;
  if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home","Escape"].includes(key)) return;
  event.preventDefault();
  stopFlight();
  if (key === "Home") return reset();
  if (key === "Escape") return clearSelection();
  if (key === "+" || key === "=") return zoomBy(1.2);
  if (key === "-") return zoomBy(1/1.2);
  const horizontal = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  const vertical = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  if (flat || event.shiftKey) panBy(horizontal*35,vertical*35);
  else {
    camera.yaw += horizontal*.16;
    camera.pitch = clamp(camera.pitch+vertical*.12,.33,1.36);
  }
  scheduleDraw();
});

updateList();
setFlat(false);
new ResizeObserver(resize).observe(canvas);
resize();

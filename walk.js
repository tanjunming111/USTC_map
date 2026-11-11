"use strict";

const walk = (() => {
  const view = document.getElementById("walkScene");
  const mini = document.getElementById("miniMap").getContext("2d");
  const lock = document.getElementById("mouseLock");
  const labels = document.getElementById("walkLabels");
  const prompt = document.getElementById("buildingPrompt");
  const promptName = document.getElementById("buildingPromptName");
  const promptMeta = document.getElementById("buildingPromptMeta");
  const location = document.getElementById("walkLocation");
  const status = document.getElementById("walkStatus");
  const eyeHeight = 1.8*eastOSM.unit, maxAltitude = 165;
  const fallAcceleration = 9.81*eastOSM.unit*2.25;
  const initialFallSpeed = 8*eastOSM.unit;
  const {x:westX,y:westY}=campus.landmarks.find(place=>place.id==="west");
  const start = {x:westX-16*eastOSM.unit,y:westY,z:eyeHeight,yaw:Math.PI/2,pitch:.12};
  const keys = new Set(), padKeys = new Map();
  const labelElements = Array.from({length:5},() => {
    const label = document.createElement("span");
    label.className = "walk-label";
    label.hidden = true;
    labels.append(label);
    return label;
  });
  const anchors = {
    lakes:[646,526,586,499], sakura:[650,548,642,467],
    pavilion:[668,466,campus.pavilion.x,campus.pavilion.y], classroom:[648,547,650,585,.08],
    library:[681,987,681,948,.16], square:[665,813,663,732],
    north:[780,212,779,233], west:[start.x,start.y,westX,westY,start.pitch],
    south:[853,1579,860,1601], track:[431,1036,360,1025],
    auditorium:[745,708,802,711,.075], research:[921,1370,900,1319,.24],
    "old-library":[659,827,663,875], fifth:[949,365,949,319], "fifth-bike-shelter":[858,377,833,372],
    east:[1139,347,1168,346], "old-north":[634,370,631,346],
    "small-south":[347,1529,347,1551], "west-parking":[404,795,474,800],
    "osm-285860077":[244,1541,244,1516],"osm-1135310349":[317,1511,316,1490],
    "osm-1135310341":[715,1598,715,1562,.2],"osm-1135310338":[861,1538,892,1547,.13],
    activity:[824,1023,894,1023,.10], "activity-food":[857,1023,894,1023,.14],
    cafe:[593,726,594,704,.04], motto:[717,701.73,731.58,701.73,.03],
    "qian-linzhao":[721.5,772.47,739.32,772.47,.03],
    "west-underpass":[...campus.tunnel.eastView.position,...campus.tunnel.eastView.target,-.043]
  };
  const movement = {
    KeyW:[0,1],ArrowUp:[0,1],KeyS:[0,-1],ArrowDown:[0,-1],
    KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]
  };
  let gl, renderMesh, active = false, visited = false, raf = 0, time = 0, messageTimer;
  let pose = {...start}, drag, lastLocation = "", fallSpeed = null;
  let bounced=false;

  const {contains,segmentDistance} = campus;
  const pad = 1.45;
  const buildingShapes = campus.buildings.map(building => building.shape);
  const trunks = campus.trees.map(({x,y,r,evergreen,plane,heightScale=1}) =>
    [x,y,r*.12+.75,r*heightScale*(evergreen ? 3.1 : plane ? 2.78 : 2.42)]);
  const roofRise = {classroom:2,library:1,history:4,"osm-271365631":4,canteen:3,hall:5.64};
  const bounds = shape => ({
    shape, minX:Math.min(...shape.map(([x])=>x))-pad, maxX:Math.max(...shape.map(([x])=>x))+pad,
    minY:Math.min(...shape.map(([,y])=>y))-pad, maxY:Math.max(...shape.map(([,y])=>y))+pad
  });
  const solids = [...buildingShapes, ...campus.waters].map(bounds);
  const props = campus.obstacles.map(({shape,top})=>({...bounds(shape),top}));
  const elevated=[campus.activityModel.upper,...campus.activityModel.decks,...campus.researchLinks,
    ...campus.activityModel.stairs.flatMap(flight=>flight.steps),...campus.libraryFront.steps];
  const stairBounds=[...campus.activityModel.stairs,...campus.libraryFront.steps].map(({shape})=>bounds(shape));
  const atStair=(x,y)=>stairBounds.some(stair=>touches(stair,x,y));
  const railClearance=.26;
  const railingBounds=bounds(campus.activityModel.rails.flat());
  const activityRails=campus.activityModel.rails.map(([a,b])=>({a,b,
    minX:Math.min(a[0],b[0])-railClearance,maxX:Math.max(a[0],b[0])+railClearance,
    minY:Math.min(a[1],b[1])-railClearance,maxY:Math.max(a[1],b[1])+railClearance
  }));
  function hitsRailing(x,y,feet) {
    if (x<railingBounds.minX || x>railingBounds.maxX || y<railingBounds.minY || y>railingBounds.maxY) return false;
    return activityRails.some(({a,b,minX,maxX,minY,maxY})=>{
      if (x<minX || x>maxX || y<minY || y>maxY || segmentDistance(x,y,a,b)>=railClearance) return false;
      const dx=b[0]-a[0],dy=b[1]-a[1];
      const fraction=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
      const base=a[2]+(b[2]-a[2])*fraction;
      return feet>=base-.29 && feet<base+1.08;
    });
  }
  function touches({shape,minX,maxX,minY,maxY},x,y) {
    return x>=minX && x<=maxX && y>=minY && y<=maxY && (contains(shape,x,y) ||
      shape.some((a,j) => segmentDistance(x,y,a,shape[(j+1)%shape.length]) < pad));
  }
  const shapeEdges = shape => shape.map(([x,y],i) => {
    const [nx,ny]=shape[(i+1)%shape.length];
    return {x,y,dx:nx-x,dy:ny-y};
  });
  const buildings = campus.buildings.map((building,i) => ({...solids[i],building,edges:shapeEdges(building.shape),
    masses:building.masses?.map(({shape,top})=>({...bounds(shape),edges:shapeEdges(shape),height:top,bottom:building.baseHeight,building}))
  }));
  const memorialOccluders=campus.obstacles.filter(({id})=>id==="motto"||id==="qian-linzhao")
    .map(({shape,top})=>({shape,height:top}));
  const memorialTargets=memorialOccluders.map(building=>({building,edges:shapeEdges(building.shape)}));
  const buildingIds = new Set(campus.buildings.map(building => building.id).filter(Boolean));
  let shownBuilding;
  function minimumAltitude(x,y,z=eyeHeight,step=0) {
    const passage=campus.tunnelAt(x,y);
    if (passage && z<passage.ceiling) return eyeHeight+passage.floor;
    let floor = 0;
    for (const [tx,ty,r,height] of trunks) {
      if ((x-tx)**2+(y-ty)**2 < r*r) floor=Math.max(floor,height);
    }
    for(const prop of props) {
      if(touches(prop,x,y)) floor=Math.max(floor,prop.top);
    }
    for(const {shape,top} of elevated) {
      if (z+step>=top+eyeHeight-.001 && contains(shape,x,y)) floor=Math.max(floor,top);
    }
    solids.forEach((solid,i) => {
      if (!touches(solid,x,y)) return;
      const building = campus.buildings[i];
      if (building) {
        if (building===campus.busDepot.shelter) {
          if(z>=building.height+eyeHeight-.001) floor=Math.max(floor,building.height);
          return;
        }
        if (building.id==="activity") return;
        const rim=building.osmKind!=="grandstand" && building.id!=="auditorium" && building.height>8 ? .46 : 0;
        const equipment=!building.style && building.height>16 ? 1.2 : 0;
        floor=Math.max(floor,(building.baseHeight??building.height)+Math.max(roofRise[building.id]||0,rim,equipment,building.towerLevels?2.2:0));
        for(const mass of buildings[i].masses||[]) if(touches(mass,x,y)) floor=Math.max(floor,mass.height+.46);
      } else {
        const onBridge = campus.pavilionWalk.some((a,j,points) => j && segmentDistance(x,y,points[j-1],a) < 2.1)
          || Math.hypot(x-campus.pavilion.x,y-campus.pavilion.y) < 6;
        if (!onBridge) floor=Math.max(floor,1);
      }
    });
    return eyeHeight+floor;
  }
  function canOccupy(x,y,z=eyeHeight) {
    return campus.canRoam(x,y) && z>=minimumAltitude(x,y,z)-.001 && !hitsRailing(x,y,z-eyeHeight) &&
      !elevated.some(({shape,bottom,top})=>z>bottom-.15 && z<top+eyeHeight-.001 && contains(shape,x,y));
  }
  function tryStep(x,y) {
    let z=pose.z;
    const from=campus.tunnelAt(pose.x,pose.y);
    const to=campus.tunnelAt(x,y);
    const onRamp=from && z<from.ceiling && z<eyeHeight-.015;
    const grounded=Math.abs(z-minimumAltitude(pose.x,pose.y,z))<.025;
    if (onRamp && !to && z<eyeHeight-.22) return;
    if (!from && to && to.floor<-.24 && z<=eyeHeight+.45) return;
    if (grounded && (from || to) && z<=(from?.ceiling??Infinity) && z<=eyeHeight+.01) {
      const next=eyeHeight+(to?.floor??0);
      if (Math.abs(next-z)<.24 && next<(to?.ceiling??Infinity)) z=next;
    } else if (atStair(x,y) && grounded) {
      const floor=minimumAltitude(x,y,z,.32);
      if (Math.abs(floor-z)<=.32) z=floor;
    }
    if (canOccupy(x,y,z)) Object.assign(pose,{x,y,z});
  }
  function look(dx,dy) {
    pose.yaw = (pose.yaw+dx*.0045)%(Math.PI*2);
    pose.pitch = Math.max(-1.25,Math.min(1.25,pose.pitch-dy*.004));
    requestFrame();
  }
  function move(dt) {
    const pressed = new Set([...keys,...padKeys.values()]);
    let right=0, forward=0;
    for(const key of pressed) {
      if (!movement[key]) continue;
      right += movement[key][0];
      forward += movement[key][1];
    }
    const shifted = pressed.has("ShiftLeft") || pressed.has("ShiftRight");
    const speed = (pressed.has("Space") ? 30 : 12)*eastOSM.unit;
    if (shifted && forward) {
      fallSpeed = null;
      const z = pose.z+Math.sign(forward)*speed*dt;
      let ceiling=maxAltitude;
      const passage=campus.tunnelAt(pose.x,pose.y);
      if (passage && pose.z<passage.ceiling) ceiling=Math.min(ceiling,passage.ceiling-.1);
      if (forward>0) for (const {shape,bottom} of elevated) {
        if (pose.z<=bottom-.15 && contains(shape,pose.x,pose.y)) ceiling=Math.min(ceiling,bottom-.15);
      }
      pose.z = Math.max(minimumAltitude(pose.x,pose.y,pose.z),Math.min(ceiling,z));
      forward = 0;
    }
    const length = Math.hypot(right,forward);
    if (length) {
      const step = dt*speed/length;
      const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
      const dx = (right*c+forward*s)*step, dy = (right*s-forward*c)*step;
      const steps = Math.max(1,Math.ceil(Math.hypot(dx,dy)/(atStair(pose.x,pose.y)?.4:.7)));
      for(let i=0;i<steps;i++) {
        tryStep(pose.x+dx/steps,pose.y);
        tryStep(pose.x,pose.y+dy/steps);
      }
    }
    if (fallSpeed !== null) {
      const floor = minimumAltitude(pose.x,pose.y,pose.z);
      pose.z = Math.max(floor,pose.z-dt*(fallSpeed+fallAcceleration*dt/2));
      fallSpeed+=fallAcceleration*dt;
      if (pose.z<=floor) {
        const rebound=Math.min(6.4,fallSpeed*.30);
        fallSpeed=!bounced && rebound>.85 ? -rebound : null;
        bounced=true;
      }
    }
  }
  function teleport(place) {
    if (!place) return;
    if (place.id?.startsWith("street-") && canOccupy(place.x,place.y)) {
      pose={x:place.x,y:place.y,z:eyeHeight,yaw:campus.nearestStreet(place.x,place.y,place.name).yaw,pitch:0};
      fallSpeed = null;
      requestFrame();
      return;
    }
    let sign, closest=Infinity;
    if (place.kind==="road") for (const candidate of campus.roadSigns) {
      if (!candidate.blades.some(blade=>blade.name===place.name)) continue;
      const distance=Math.hypot(candidate.x-place.x,candidate.y-place.y);
      if (distance<closest) { closest=distance; sign=candidate; }
    }
    const [x,y,tx,ty,pitch=.06] = anchors[place.id] || [place.x,place.y+15,sign?.x??place.x,sign?.y??place.y];
    for (let r=0;r<=90;r+=3) {
      for (let i=0;i<(r===0?1:16);i++) {
        const angle = i*Math.PI/8;
        const px=x+Math.cos(angle)*r, py=y+Math.sin(angle)*r;
        if (!canOccupy(px,py) || Math.hypot(px-tx,py-ty)<3) continue;
        pose = {x:px,y:py,z:eyeHeight,yaw:Math.atan2(tx-px,py-ty),pitch};
        fallSpeed = null;
        requestFrame();
        return;
      }
    }
  }
  const overview = document.createElement("canvas");
  const miniSize = 164;
  const miniScale = mini.canvas.width/miniSize;
  overview.width = overview.height = mini.canvas.width;
  const map = overview.getContext("2d");
  map.scale(miniScale,miniScale);
  mini.scale(miniScale,miniScale);
  const miniPoint = (x,y) => [22+(x-90)*.095,7+(y-155)*.095];
  function miniShape(points,color) {
    map.beginPath();
    points.forEach(([x,y],i) => i ? map.lineTo(...miniPoint(x,y)) : map.moveTo(...miniPoint(x,y)));
    map.closePath();
    map.fillStyle=color;
    map.fill();
  }
  map.fillStyle="#e9efe5";
  map.fillRect(0,0,miniSize,miniSize);
  miniShape(campus.outline,"#c8dfb8");
  for (const [kind,shapes] of Object.entries(campus.roadSurfaces)) {
    map.beginPath();
    for (const shape of shapes) {
      shape.forEach(([x,y],i) => i ? map.lineTo(...miniPoint(x,y)) : map.moveTo(...miniPoint(x,y)));
      map.closePath();
    }
    map.fillStyle=campus.roadColors[kind];
    map.fill();
  }
  for(const shape of buildingShapes) miniShape(shape,"#e8dec5");
  for(const water of campus.waters) miniShape(water,"#76aaa9");
  map.font="bold 13px sans-serif";
  map.fillStyle="#276151";
  map.fillText("北",10,18);
  function drawMini() {
    mini.drawImage(overview,0,0,miniSize,miniSize);
    mini.save();
    mini.translate(...miniPoint(pose.x,pose.y));
    mini.rotate(pose.yaw);
    mini.scale(.8,.8);
    mini.beginPath();
    mini.moveTo(0,-8);
    mini.lineTo(5,5);
    mini.lineTo(0,3);
    mini.lineTo(-5,5);
    mini.closePath();
    mini.fillStyle="#276151";
    mini.strokeStyle="#fffde9";
    mini.lineWidth=1.5;
    mini.fill();
    mini.stroke();
    mini.restore();
  }
  function drawLabels(c,s,cp,sp) {
    const width=view.clientWidth, height=view.clientHeight;
    const project = (x,y,z) => {
      const dx=x-pose.x, dy=y-pose.y, lift=z-pose.z;
      const front=dx*s-dy*c, depth=front*cp+lift*sp;
      if(depth<=1) return null;
      const px=width/2+(dx*c+dy*s)*height*walkFocalLength/(2*depth);
      const py=height/2-(lift*cp-front*sp)*height*walkFocalLength/(2*depth);
      return px>=48 && px<=width-48 && py>=76 && py<=height*.77 ? [px,py] : null;
    };
    const inView = [];
    const nearby = buildings.filter(({minX,maxX,minY,maxY}) =>
      pose.x>=minX-145 && pose.x<=maxX+145 && pose.y>=minY-145 && pose.y<=maxY+145);
    const rayTargets=[...memorialTargets,...nearby,...nearby.flatMap(({masses})=>masses||[])];
    function firstBuilding(dx,dy,rise,maxDistance) {
      let hit, distance=maxDistance;
      for (const {building,edges,shape=building.shape,height=building.baseHeight??building.height,
        bottom=building.id==="activity"?campus.activityModel.upper.bottom:0} of rayTargets) {
        if (rise < -.00001) {
          const travel=(height-pose.z)/rise;
          if (travel>.01 && travel<distance && contains(shape,pose.x+dx*travel,pose.y+dy*travel)) {
            distance=travel;
            hit=building;
          }
        }
        for (const edge of edges) {
          const ox=edge.x-pose.x, oy=edge.y-pose.y;
          const determinant=dx*edge.dy-dy*edge.dx;
          if(Math.abs(determinant)<.00001) continue;
          const travel=(ox*edge.dy-oy*edge.dx)/determinant;
          const along=(ox*dy-oy*dx)/determinant;
          const z=pose.z+rise*travel;
          if (travel<.01 || travel>=distance || along<0 || along>1 || z<bottom || z>height) continue;
          distance=travel;
          hit=building;
        }
      }
      return hit;
    }
    const centered = firstBuilding(s,-c,Math.tan(pose.pitch),145);
    const aimed = memorialOccluders.includes(centered) ? undefined : centered;
    if (aimed!==shownBuilding) {
      prompt.hidden=!aimed;
      if (aimed) {
        const identity=aimed.number ? "楼号 "+aimed.number : aimed.located ? "东校区建筑" : "模型编号 "+aimed.model;
        const evidence=campus.facadeSources[aimed.id] ? "外观有参考资料" : "立面示意";
        promptName.textContent=aimed.name;
        promptMeta.textContent=identity+" · "+(aimed.levels ? aimed.levels+" 层 · " : "")+evidence;
      }
      shownBuilding=aimed;
    }
    for (const {building,edges} of nearby) {
      if(building===aimed) continue;
      let best;
      for (const {x,y,dx,dy} of edges) {
        const along=((pose.x-x)*dx+(pose.y-y)*dy)/(dx*dx+dy*dy);
        const t=Math.max(.18,Math.min(.82,along));
        const px=x+dx*t, py=y+dy*t, z=Math.min(building.height*.53,9);
        const distance=Math.hypot(px-pose.x,py-pose.y);
        if (distance<4 || distance>108 || (best && best.distance<=distance)) continue;
        const point=project(px,py,z);
        if(!point) continue;
        const hit=firstBuilding((px-pose.x)/distance,(py-pose.y)/distance,(z-pose.z)/distance,distance+.1);
        if(hit!==building) continue;
        best={text:building.short,x:point[0],y:point[1],distance,building:true};
      }
      if(best) inView.push(best);
    }
    let nearest, closest=Infinity;
    for (const place of campus.landmarks) {
      const dx=place.x-pose.x, dy=place.y-pose.y;
      const distance=Math.hypot(dx,dy);
      if (distance<closest) { closest=distance; nearest=place; }
      if (place.kind==="road" || distance>92 || distance<5 || buildingIds.has(place.id)) continue;
      const z=Math.max(7,place.h+2);
      const point=project(place.x,place.y,z);
      if (!point || firstBuilding(dx/distance,dy/distance,(z-pose.z)/distance,distance)) continue;
      inView.push({text:place.short,x:point[0],y:point[1],distance});
    }
    inView.sort((a,b)=>a.distance-b.distance);
    const used=aimed ? [[width/2,height/2+46,112]] : [];
    const visible=inView.filter(({x,y,text}) => {
      const half=Math.min(112,text.length*5.7+10);
      if(used.some(([px,py,span])=>Math.abs(x-px)<half+span+8 && Math.abs(y-py)<26)) return false;
      used.push([x,y,half]);
      return true;
    });
    labelElements.forEach((label,i) => {
      const entry=visible[i];
      label.hidden=!entry;
      if(!entry) return;
      label.textContent=entry.text;
      label.classList.toggle("building",!!entry.building);
      label.style.left=entry.x+"px";
      label.style.top=entry.y+"px";
    });
    const onSakura = campus.cherryWalk.some((point,i,points) =>
      i && segmentDistance(pose.x,pose.y,points[i-1],point)<6);
    const outside=!contains(campus.outline,pose.x,pose.y);
    const street=outside ? campus.nearestStreet(pose.x,pose.y) : null;
    const text=outside ? street?.name||"校外道路" : onSakura ? "樱花大道" : closest<128 ? nearest.short+"附近" : "校园道路";
    if(text!==lastLocation) { location.textContent=text; lastLocation=text; }
  }
  function frame(now) {
    raf=0;
    if (!active) return;
    const elapsed = time ? Math.min((now-time)/1000,.065) : 0;
    time = now;
    move(elapsed);
    const c=Math.cos(pose.yaw), s=Math.sin(pose.yaw), cp=Math.cos(pose.pitch), sp=Math.sin(pose.pitch);
    renderMesh(pose);
    drawMini();
    drawLabels(c,s,cp,sp);
    if (fallSpeed !== null || [...keys,...padKeys.values()].some(key => movement[key])) requestFrame();
    else time=0;
  }
  function requestFrame() {
    if (active && !raf) raf=requestAnimationFrame(frame);
  }
  function showStatus(text) {
    clearTimeout(messageTimer);
    status.textContent=text;
    status.hidden=false;
    messageTimer=setTimeout(()=>{status.hidden=true;},5300);
  }
  function enter(place) {
    if (active) return true;
    try {
      if (!renderMesh) ({gl,draw:renderMesh}=createCampusRenderer(view));
      if (gl.isContextLost()) throw new Error("WebGL context lost");
    } catch(error) {
      console.warn(error);
      showStatus("当前浏览器无法启用 WebGL 漫游。可以继续浏览校园沙盘。");
      return false;
    }
    if (!visited || place) {
      pose={...start};
      teleport(place);
    }
    visited=true;
    active=true;
    time=0;
    status.hidden=true;
    requestFrame();
    return true;
  }
  function clearInput() { keys.clear(); padKeys.clear(); drag=null; }
  function exit() {
    active=false;
    fallSpeed=null;
    cancelAnimationFrame(raf);
    raf=0;
    clearInput();
    if (document.pointerLockElement===view) document.exitPointerLock();
  }
  window.addEventListener("keydown",event => {
    if (!active || event.altKey || event.ctrlKey || event.metaKey || event.target.matches?.("input,textarea,[contenteditable]")) return;
    if (event.code === "KeyX") {
      if (!event.repeat && fallSpeed === null && pose.z>minimumAltitude(pose.x,pose.y,pose.z)) {
        fallSpeed=initialFallSpeed;
        bounced=false;
        requestFrame();
      }
      return;
    }
    const boost = event.code === "Space";
    if (boost && document.pointerLockElement!==view && event.target.matches?.("button,a,select")) return;
    if (movement[event.code] || boost || ["ShiftLeft","ShiftRight"].includes(event.code)) {
      if(movement[event.code] || boost) event.preventDefault();
      keys.add(event.code);
      requestFrame();
    }
  });
  window.addEventListener("keyup",event => keys.delete(event.code));
  window.addEventListener("blur",clearInput);
  document.addEventListener("visibilitychange",() => { if(document.hidden) clearInput(); });
  view.addEventListener("pointerdown",event => {
    if (!active || event.button!==0 || document.pointerLockElement===view) return;
    view.focus({preventScroll:true});
    view.setPointerCapture(event.pointerId);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  view.addEventListener("pointermove",event => {
    if (!active || drag?.id!==event.pointerId) return;
    look(event.clientX-drag.x,event.clientY-drag.y);
    drag.x=event.clientX;
    drag.y=event.clientY;
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]) view.addEventListener(type,event => {
    if (drag?.id===event.pointerId) drag=null;
  });
  document.addEventListener("mousemove",event => {
    if (active && document.pointerLockElement===view) look(event.movementX,event.movementY);
  });
  lock.addEventListener("click",async () => {
    if (!active) return;
    if (document.pointerLockElement===view) { document.exitPointerLock(); return; }
    try {
      if (!view.requestPointerLock) throw new Error("Pointer lock unavailable");
      await view.requestPointerLock();
    } catch { showStatus("当前环境无法锁定鼠标。按住场景拖动也可以转头。"); }
  });
  document.addEventListener("pointerlockerror",() => {
    if(active) showStatus("当前环境无法锁定鼠标。按住场景拖动也可以转头。");
  });
  document.addEventListener("pointerlockchange",() => {
    const locked=document.pointerLockElement===view;
    lock.textContent=locked ? "Esc 释放鼠标" : "锁定鼠标视角";
    lock.setAttribute("aria-pressed",String(locked));
  });
  for(const button of document.querySelectorAll(".walk-pad button")) {
    button.addEventListener("pointerdown",event => {
      button.setPointerCapture(event.pointerId);
      padKeys.set(event.pointerId,button.dataset.key);
      requestFrame();
    });
    for(const type of ["pointerup","pointercancel","lostpointercapture"]) button.addEventListener(type,event => padKeys.delete(event.pointerId));
  }
  view.addEventListener("webglcontextlost",event => {
    event.preventDefault();
    renderMesh=null;
    if (active) {
      document.getElementById("atlasMode").click();
      showStatus("漫游画面已中断。可以重新进入第一人称漫游。");
    }
  });
  new ResizeObserver(requestFrame).observe(view);
  return {enter,exit,teleport,get active(){return active;}};
})();

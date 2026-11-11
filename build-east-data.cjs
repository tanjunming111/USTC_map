"use strict";

// Rebuild the offline scene data with node build-east-data.cjs.
const fs = require("node:fs");
const path = require("node:path");
const source = path.join(__dirname,"..","source","osm");
const load = name => JSON.parse(fs.readFileSync(path.join(source,name),"utf8").replace(/^\uFEFF/,"")).features;
const features = load("ustc-east.geojson");
const boundary = load("ustc-campus-boundaries.geojson").find(feature => feature.properties.campus === "east");

// Preserve the atlas coordinate scale and place the first teaching building at its old origin.
const unit = 1.425, originLat = 31.841047, originLon = 117.263648;
const eastScale = 111320*Math.cos(originLat*Math.PI/180)*unit, southScale = 110540*unit;
const round = n => Math.round(n*100)/100;
const project = ([lon,lat]) => [round(652+(lon-originLon)*eastScale),round(611+(originLat-lat)*southScale)];
const same = (a,b) => a[0]===b[0] && a[1]===b[1];
function points(raw) {
  return raw.map(project).filter((point,i,all) => !i || !same(point,all[i-1]));
}
function ring(raw) {
  const shape=points(raw);
  if (same(shape[0],shape.at(-1))) shape.pop();
  return shape;
}
const outline = ring(boundary.geometry.coordinates[0]);
const center = shape => shape.reduce(([x,y],[px,py]) => [x+px/shape.length,y+py/shape.length],[0,0]);
const edges = shape => shape.map((a,i) => [a,shape[(i+1)%shape.length]]);
function inside([x,y],shape=outline) {
  let result=false;
  for (const [[ax,ay],[bx,by]] of edges(shape)) {
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) result=!result;
  }
  return result;
}
const vector = (a,b) => [b[0]-a[0],b[1]-a[1]];
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
const boundaryEdges = edges(outline);
function clipLine(line) {
  const output=[];
  let current=[];
  for(let i=1;i<line.length;i++) {
    const a=line[i-1], b=line[i], v=vector(a,b), cuts=[0,1];
    for(const [c,d] of boundaryEdges) {
      const w=vector(c,d), denom=cross(v,w);
      if(Math.abs(denom)<1e-8) continue;
      const q=vector(a,c), t=cross(q,w)/denom, u=cross(q,v)/denom;
      if(t>0 && t<1 && u>=0 && u<=1) cuts.push(t);
    }
    cuts.sort((l,r)=>l-r);
    const at = t => [a[0]+v[0]*t,a[1]+v[1]*t];
    for(let j=1;j<cuts.length;j++) {
      const lo=cuts[j-1],hi=cuts[j];
      if(hi-lo<1e-7) continue;
      if(!inside(at((lo+hi)/2))) {
        if(current.length>1) output.push(current);
        current=[];
        continue;
      }
      if(!current.length) current.push(at(lo).map(round));
      const endpoint=at(hi).map(round);
      if(!same(current.at(-1),endpoint)) current.push(endpoint);
    }
  }
  if(current.length>1) output.push(current);
  return output;
}

const buildings=[], contextBuildings=[], roads=[], surroundingRoads=[], waters=[], green=[], plazas=[], places={};
const roadWidths={residential:10,service:6,pedestrian:7,footway:3.8,path:3.2,steps:3.4,primary:14,secondary:13,trunk:17,trunk_link:10};
const vehicleRoads=new Set(["residential","service","primary","secondary","trunk","trunk_link"]);
const outerNames=new Set(["金寨路","黄山路","太湖路","宿松路"]);
const sceneRect = [20,175,1300,1710];
function clipContextLine(line) {
  const [left,top,right,bottom]=sceneRect;
  const result=[];
  for(let i=1;i<line.length;i++) {
    const [x,y]=line[i-1], [dx,dy]=vector(line[i-1],line[i]);
    let enter=0, leave=1;
    for(const [slope,offset] of [[-dx,x-left],[dx,right-x],[-dy,y-top],[dy,bottom-y]]) {
      if(slope<0) enter=Math.max(enter,offset/slope);
      else if(slope>0) leave=Math.min(leave,offset/slope);
      else if(offset<0) { enter=1; leave=0; break; }
    }
    if(enter<leave) result.push([[round(x+dx*enter),round(y+dy*enter)],[round(x+dx*leave),round(y+dy*leave)]]);
  }
  return result;
}
for (const {geometry:g,properties:p} of features) {
  const name=p["name:zh-Hans"]||p.name||"", id=p.osm;
  if (g.type==="Point") {
    if(name) places[id]=project(g.coordinates);
    continue;
  }
  if (g.type==="Polygon" || (g.type==="LineString" && p.area==="yes" && g.coordinates.length>=4)) {
    const shape=ring(g.type==="Polygon"?g.coordinates[0]:g.coordinates);
    if(shape.length<3) continue;
    const position=center(shape);
    const building=p.building && p.building!=="no" && id!=="way/1135725449";
    const levels=Number(p["building:levels"])||undefined;
    if(!inside(position)) {
      const [left,top,right,bottom]=sceneRect;
      if(building && shape.every(([x,y])=>x>=left && x<=right && y>=top && y<=bottom && !inside([x,y]))) {
        contextBuildings.push({shape,kind:p.building,levels});
      }
      continue;
    }
    if(name) places[id]=position.map(round);
    if(building) {
      buildings.push({id,shape,name,kind:p.building,levels});
    } else if (p.natural==="water") waters.push(shape);
    else if (p.leisure==="park" || p.landuse==="grass" || p.leisure==="pitch") green.push(shape);
    else if (p.highway==="pedestrian") plazas.push(shape);
    continue;
  }
  if(g.type!=="LineString" || !roadWidths[p.highway] || p.tunnel==="yes" || Number(p.layer)<0) continue;
  const line=points(g.coordinates), width=roadWidths[p.highway];
  const asphalt=p.surface ? p.surface==="asphalt" : vehicleRoads.has(p.highway);
  if(outerNames.has(name) && p.bridge!=="yes") {
    for(const points of clipContextLine(line)) surroundingRoads.push({points,width,name,asphalt});
  } else if (!["trunk","trunk_link","primary","secondary"].includes(p.highway)) {
    for(const points of clipLine(line)) roads.push({id,points,width,name:name||undefined,asphalt});
  }
}

const westUnderpass = points(features.find(({properties})=>properties.osm==="way/264872429").geometry.coordinates);
const entries = Object.entries({unit,outline,buildings,contextBuildings,roads,surroundingRoads,waters,green,plazas,places,westUnderpass});
const data = entries.map(([key,value]) => {
  const records = Array.isArray(value) ? value.map(row=>JSON.stringify(row)).join(",\n    ") : "";
  return "  "+key+": "+(Array.isArray(value) ? "[\n    "+records+"\n  ]" : JSON.stringify(value));
}).join(",\n");
fs.writeFileSync(path.join(__dirname,"east-osm.js"),"// Generated from the local OSM extract by build-east-data.cjs. © OpenStreetMap contributors (ODbL).\nconst eastOSM = {\n"+data+"\n};\n");
console.log({buildings:buildings.length,roads:roads.length,water:waters.length,green:green.length,plazas:plazas.length});

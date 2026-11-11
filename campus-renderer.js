"use strict";

let campusMesh;
const walkFocalLength = 1/Math.tan(58*Math.PI/360);

function createCampusRenderer(view, orthographic = false) {
  const gl = view.getContext("webgl",{antialias:true,alpha:false,powerPreference:"low-power"});
  if (!gl) throw new Error("WebGL unavailable");
  const rampChecks=campus.tunnel.ramps.map(({shape})=>{
    const vector=(a,b)=>"vec4("+[...a,...b].map(v=>v.toFixed(4)).join(",")+")";
    return "insideRamp("+vector(shape[0],shape[1])+","+vector(shape[2],shape[3])+")";
  }).join(" || ");
  const vs = `
    attribute vec3 position;
    attribute vec3 color;
    attribute float material;
    uniform vec3 eye;
    uniform vec4 orientation;
    uniform vec2 lens;
    uniform bool isOrtho;
    varying vec3 shade;
    varying vec3 world;
    varying float depth;
    varying float surfaceType;
    void main(){
      vec3 p = position-eye;
      float side = dot(p.xy, orientation.xy);
      float front = dot(p.xy, vec2(orientation.y,-orientation.x));
      float y = p.z*orientation.z-front*orientation.w;
      depth = front*orientation.z+p.z*orientation.w;
      if(isOrtho){
        float across=dot(p.xy,vec2(orientation.x,-orientation.y));
        float ground=dot(p.xy,vec2(orientation.y,orientation.x));
        float zOrder=ground*orientation.z+p.z*orientation.w;
        gl_Position=vec4(across*lens.x,(p.z*orientation.z-ground*orientation.w)*lens.y,-zOrder/2100.0,1.0);
        depth=0.0;
      }else{
        gl_Position = vec4(side*lens.x, y*lens.y, depth*1.0005-.70018, depth);
      }
      shade=color;
      world=position;
      surfaceType=material;
    }`;
  const fs = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif
    varying vec3 shade;
    varying vec3 world;
    varying float depth;
    varying float surfaceType;
    uniform bool isOrtho;
    float side(vec2 a,vec2 b) {
      vec2 d=b-a, p=world.xy-a;
      return d.x*p.y-d.y*p.x;
    }
    bool insideRamp(vec4 a,vec4 b) {
      return side(a.xy,a.zw)<=0.0 && side(a.zw,b.xy)<=0.0 &&
             side(b.xy,b.zw)<=0.0 && side(b.zw,a.xy)<=0.0;
    }
    void main(){
      if(world.z>=-.25 && world.z<.16 && surfaceType<10.5 && (${rampChecks})) discard;
      if(isOrtho && surfaceType>6.5 && surfaceType<7.5) discard;
      vec2 cell=floor(mod(world.xy+vec2(.26,.58)*world.z,191.0)*3.0);
      float grain=fract(sin(dot(cell,vec2(17.17,39.83)))*257.0);
      float nearView=isOrtho ? .0 : 1.0-smoothstep(18.0,110.0,depth);
      float detail=(grain-.5)*.012*nearView;
      vec3 color=shade;
      if(surfaceType>.5 && surfaceType<1.5 || surfaceType>7.5 && surfaceType<8.5){
        vec2 p=world.xy/vec2(1.16,.71);
        p.x+=mod(floor(p.y),2.0)*.5;
        vec2 edge=min(fract(p),1.0-fract(p));
        float joint=1.0-smoothstep(.008,.052,min(edge.x,edge.y));
        color-=joint*.047*nearView;
      }else if(surfaceType>1.5 && surfaceType<2.5 || surfaceType>5.5 && surfaceType<6.5){
        vec2 grains=floor(mod(world.xy,191.0)*10.0);
        detail=(fract(sin(dot(grains,vec2(11.31,27.19)))*731.0)-.5)*.028*nearView;
      }else if(surfaceType>2.5 && surfaceType<3.5){
        float ripples=sin(world.x*.49+world.y*2.8+sin(world.x*.71)*1.35);
        float broken=sin(world.y*1.17-world.x*.82);
        float reflection=smoothstep(.46,1.2,ripples+broken*.32)*.12*nearView;
        color=mix(color,vec3(.54,.69,.67),smoothstep(9.0,100.0,depth));
        color+=reflection*vec3(.75,.9,.87);
        detail=0.0;
      }else if(surfaceType>3.5 && surfaceType<4.5){
        float mottling=sin(world.x*.043+world.y*.061)*sin(world.y*.046)+.53*sin(world.x*.066-world.y*.111);
        color+=mottling*.009;
        color+=sin(world.x*.29)*sin(world.y*.21)*.021*nearView;
      }else if(surfaceType>4.5 && surfaceType<5.5){
        vec2 tile=abs(fract(world.xy/3.8)-.5);
        color-=smoothstep(.47,.5,max(tile.x,tile.y))*.04*nearView;
      }else if(surfaceType>8.5 && surfaceType<9.5){
        float row=world.z/.36;
        float span=(world.x+world.y)/.75+mod(floor(row),2.0)*.5;
        vec2 joints=abs(fract(vec2(span,row))-.5);
        float mortar=smoothstep(.43,.5,max(joints.x,joints.y));
        float brick=sin(floor(span)*15.33+floor(row)*63.17);
        color=mix(color+brick*.017*nearView,vec3(.69,.58,.49),mortar*.55*nearView);
      }else if(surfaceType>9.5 && surfaceType<10.5){
        float reflection=sin(world.z*.71+(world.x-world.y)*.06);
        color+=vec3(.039,.053,.061)*(.55+reflection*.45)*nearView;
      }
      float fog=smoothstep(130.0,760.0,depth)*.78;
      vec3 scene=mix(color+detail,vec3(.79,.866,.862),fog);
      gl_FragColor=vec4(scene,1.0);
    }`;
  const skyVertex = `
    attribute vec2 point;
    varying mediump float skyY;
    void main(){gl_Position=vec4(point,.99999,1.);skyY=point.y;}`;
  const skyFragment = `
    precision mediump float;
    varying mediump float skyY;
    uniform float pitch;
    void main(){
      float h=skyY+pitch*1.55;
      vec3 c=mix(vec3(.91,.927,.851),vec3(.56,.746,.826),smoothstep(-.2,1.25,h));
      gl_FragColor=vec4(c,1.);
    }`;
  function program(vertex,fragment) {
    const output = gl.createProgram();
    for (const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(output,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(output);
    if (!gl.getProgramParameter(output,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(output));
    return output;
  }
  function buffer(data) {
    const output=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,output);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    return output;
  }
  function attribute(index,size,stride,offset) {
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index,size,gl.FLOAT,false,stride,offset);
  }
  const sceneProgram=program(vs,fs), skyProgram=program(skyVertex,skyFragment);
  const mesh=campusMesh ??= makeWalkMesh(), meshBuffer=buffer(mesh);
  const skyBuffer=buffer(new Float32Array([-1,-1,3,-1,-1,3]));
  const position=gl.getAttribLocation(sceneProgram,"position"), color=gl.getAttribLocation(sceneProgram,"color");
  const material=gl.getAttribLocation(sceneProgram,"material");
  const stride=walkMeshStride*Float32Array.BYTES_PER_ELEMENT;
  const eyeUniform=gl.getUniformLocation(sceneProgram,"eye"), orientation=gl.getUniformLocation(sceneProgram,"orientation");
  const lens=gl.getUniformLocation(sceneProgram,"lens");
  const point=gl.getAttribLocation(skyProgram,"point"), skyPitch=gl.getUniformLocation(skyProgram,"pitch");
  const ortho=gl.getUniformLocation(sceneProgram,"isOrtho");
  function draw(pose,scale) {
    const ratio=Math.min(window.devicePixelRatio||1,1.6);
    const width=Math.max(1,Math.round(view.clientWidth*ratio)), height=Math.max(1,Math.round(view.clientHeight*ratio));
    if (view.width!==width || view.height!==height) { view.width=width; view.height=height; }
    gl.viewport(0,0,width,height);
    gl.clearColor(.89,.925,.866,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if (!orthographic) {
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(skyProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
      attribute(point,2,0,0);
      gl.uniform1f(skyPitch,pose.pitch);
      gl.drawArrays(gl.TRIANGLES,0,3);
      gl.disableVertexAttribArray(point);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(sceneProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);
    attribute(position,3,stride,0);
    attribute(color,3,stride,12);
    attribute(material,1,stride,24);
    const c=Math.cos(pose.yaw), s=Math.sin(pose.yaw);
    gl.uniform3f(eyeUniform,pose.x,pose.y,pose.z||0);
    gl.uniform4f(orientation,c,s,Math.cos(pose.pitch),Math.sin(pose.pitch));
    gl.uniform1i(ortho,orthographic);
    if(orthographic) gl.uniform2f(lens,scale*2/view.clientWidth,scale*2/view.clientHeight);
    else gl.uniform2f(lens,walkFocalLength*height/width,walkFocalLength);
    gl.drawArrays(gl.TRIANGLES,0,mesh.length/walkMeshStride);
    gl.disableVertexAttribArray(position);
    gl.disableVertexAttribArray(color);
    gl.disableVertexAttribArray(material);
  }
  return {gl,draw};
}


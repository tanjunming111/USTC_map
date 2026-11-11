"use strict";

// Position, RGB and a surface-material index per vertex.
const walkMeshStride = 7;
const meshMaterial = {asphaltRoad:6,roadMarking:7,pavedRoad:8,brick:9,glass:10};

function makeWalkMesh() {
  const data = [];
  const palette = {
    academic:["#e6d8b9","#f3e8cf","#b7a989"],
    service:["#d9c9a5","#e8ddc1","#ab9a79"],
    accent:["#c1ae8a","#e1cfac","#9f8e6b"]
  };
  const colorCache = new Map();
  const rgba = hex => {
    if (!colorCache.has(hex)) colorCache.set(hex,[1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255));
    return colorCache.get(hex);
  };
  function triangle(a,b,c,color,shade=1,material=0) {
    const rgb = rgba(color).map(channel => channel*shade);
    data.push(...a,...rgb,material,...b,...rgb,material,...c,...rgb,material);
  }
  function quad(a,b,c,d,color,shade,material) {
    triangle(a,b,c,color,shade,material);
    triangle(a,c,d,color,shade,material);
  }
  const area = shape => shape.reduce((sum,[x,y],i) => {
    const [nx,ny] = shape[(i+1)%shape.length];
    return sum+x*ny-nx*y;
  },0);
  const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function surface(shape,z,color,material=0) {
    const ring = area(shape)>0 ? [...shape] : [...shape].reverse();
    const at = ([x,y]) => [x,y,z];
    while (ring.length > 3) {
      const ear = ring.findIndex((b,i) => {
        const a = ring[(i+ring.length-1)%ring.length], c = ring[(i+1)%ring.length];
        return cross(a,b,c) > .0001 && !ring.some(p =>
          p!==a && p!==b && p!==c && cross(a,b,p) >= 0 && cross(b,c,p) >= 0 && cross(c,a,p) >= 0);
      });
      if (ear < 0) break;
      triangle(at(ring[(ear+ring.length-1)%ring.length]),at(ring[ear]),at(ring[(ear+1)%ring.length]),color,1,material);
      ring.splice(ear,1);
    }
    if (ring.length === 3) triangle(...ring.map(at),color,1,material);
  }
  const circle = (x,y,rx,ry=rx,count=16) => Array.from({length:count},(_,i) => {
    const a = i*2*Math.PI/count;
    return [x+Math.cos(a)*rx,y+Math.sin(a)*ry];
  });
  function strip(points,width,z,color,rounded=true,material=0) {
    for (let i=1;i<points.length;i++) {
      const [x,y] = points[i-1], [nx,ny] = points[i];
      const length = Math.hypot(nx-x,ny-y);
      if (length < .01) continue;
      const dx = (ny-y)*width/(2*length), dy = -(nx-x)*width/(2*length);
      quad([x+dx,y+dy,z],[nx+dx,ny+dy,z],[nx-dx,ny-dy,z],[x-dx,y-dy,z],color,1,material);
    }
    if (rounded) for (const [x,y] of points) surface(circle(x,y,width/2,width/2,9),z,color,material);
  }
  function inscription(a,b,level,color,spaced=false) {
    const label=document.createElement("canvas");
    label.width=spaced?288:190;
    label.height=spaced?38:23;
    const ink=label.getContext("2d");
    ink.textAlign="center";
    ink.textBaseline="middle";
    const name="中国科学技术大学";
    if (spaced) {
      ink.font='bold 31px KaiTi, STKaiti, "Microsoft YaHei", serif';
      [...name].forEach((character,i)=>ink.fillText(character,36*(i+.5),19));
    } else {
      ink.font='bold 19px "Microsoft YaHei", sans-serif';
      ink.fillText(name,95,11.5);
    }
    letterMesh(label,ink,(col,row)=>{
      const t=spaced?col/label.width:.10+.80*col/label.width;
      return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,level-row*(spaced?.045:.067)];
    },color);
  }
  function letterMesh(label,ink,at,color,material=0) {
    const pixels=ink.getImageData(0,0,label.width,label.height).data;
    for(let row=0;row<label.height;row++) {
      for(let col=0;col<label.width;) {
        if(pixels[4*(row*label.width+col)+3]<105) { col++; continue; }
        const start=col;
        do {col++;} while(col<label.width && pixels[4*(row*label.width+col)+3]>=105);
        quad(at(start,row),at(col,row),at(col,row+1),at(start,row+1),color,1,material);
      }
    }
  }
  function prism(shape,z0,z1,wall,roof,style=null,entry) {
    const winding = Math.sign(area(shape));
    shape.forEach(([x,y],i) => {
      const [nx,ny] = shape[(i+1)%shape.length];
      const length = Math.hypot(nx-x,ny-y);
      if (length < .01) return;
      const dx = (ny-y)/length*winding, dy = (x-nx)/length*winding;
      const shade = .91+(.54*dx-.43*dy)*.14;
      quad([x,y,z0],[nx,ny,z0],[nx,ny,z1],[x,y,z1],wall,shade,style?.brick?meshMaterial.brick:0);
      if (!style) return;
      const height = z1-z0;
      const point = (t,z,offset=.04) => [x+(nx-x)*t+dx*offset,y+(ny-y)*t+dy*offset,z+z0];
      const panel = (l,r,b,t,color,offset,material) => quad(point(l,b,offset),point(r,b,offset),point(r,t,offset),point(l,t,offset),color,shade,material);
      const trim=style.trim||"#eee2c4", glass=style.glass||"#6e8a87";
      if (style.fins && length>14) {
        const bays=Math.max(2,Math.round(length/(style.spacing||6)));
        for(let col=1;col<bays;col++) {
          const t=col/bays, half=.22/length;
          const fin=[point(t-half,0,.04),point(t+half,0,.04),point(t+half,0,.58),point(t-half,0,.58)].map(p=>p.slice(0,2));
          prism(fin,z0+2,z1-.38,trim,trim);
        }
      }
      if(style.accent && length>10) {
        const width=Math.min(.2,5.5/length);
        panel(0,width,0,height-.6,style.accent,.044);
        panel(1-width,1,0,height-.6,style.accent,.044);
      }
      if(style.ribbons && length>17) for(let row=1;row<(style.floors||5);row++) {
        const level=height*row/(style.floors||5);
        panel(.025,.975,level-.16,level+.19,trim,.155);
      }
      panel(0,1,0,style.brick?2.4:1.35,style.base||"#aba080");
      panel(0,1,height-1.3,height-.15,trim,.14);
      if(style.balconies) for(let floor=1;floor<style.floors;floor++) {
        const level=height*floor/style.floors;
        panel(.005,.995,level-.12,level+.12,"#bdb8a4",.09);
      }
      if (style.brick) {
        panel(0,1,height-2.05,height-1.25,"#bfb1a0",.1);
        for (const t of [.035,.965]) {
          const width=Math.min(.025,.95/length);
          panel(t-width,t+width,2.35,height-1.25,"#bf745a",.105);
        }
      }
      if (style.bands) {
        panel(0,1,1.4,3.3,trim,.13);
        panel(0,1,height*.47,height*.56,trim,.13);
      }
      const door = entry?.edge === i ? entry.center : null;
      const doorWidth = 3.8/length;
      const grand = door!==null && style.grandEntry;
      const teaching = door!==null && style.teachingEntry;
      const span = grand ? campus.libraryFront.span : Math.min(.24,25/length);
      for (const [l,r,b,t] of campus.wallWindows(length,height,style)) {
        if (grand && l<door+span+.04 && r>door-span-.04) continue;
        if (teaching && b<6 && l<door+span && r>door-span) continue;
        if (door!==null && b<5 && l<door+doorWidth && r>door-doorWidth) continue;
        panel(l-.35/length,r+.35/length,b-.32,t+.24,trim,.065);
        panel(l,r,b,t,glass,.085,meshMaterial.glass);
        panel(l,r,b,b+.45,"#354b50",.11);
        const middle=(l+r)/2;
        panel(middle-.10/length,middle+.10/length,b,t,trim,.135);
        if (!style.bands) panel(l,r,b-.37,b-.12,trim,.14);
        if (style.balconies && length>15 && b>height/style.floors && Math.floor(middle*length/(style.spacing||8)+.05)%2===0) {
          const left=l-.23/length,right=r+.23/length, floor=b-.58, rail=floor+1.12;
          const footprint=[point(left,0,.08),point(right,0,.08),point(right,0,1.65),point(left,0,1.65)].map(p=>p.slice(0,2));
          prism(footprint,z0+floor-.26,z0+floor,"#aaa993",trim);
          panel(left,right,floor+.18,rail-.13,"#7c8d82",1.62);
          panel(left,right,rail-.13,rail,trim,1.67);
          for(const t of [left,middle,right]) panel(t-.055/length,t+.055/length,floor,rail,trim,1.69);
          for(const t of [left,right]) quad(point(t,floor+.11,.09),point(t,floor+.11,1.65),
            point(t,rail,1.65),point(t,rail,.09),"#abae9d",shade);
        }
      }
      if (teaching) {
        const left=door-span,right=door+span;
        const middle=doorWidth*.9;
        panel(left,right,.4,5.55,"#554f44",.18);
        panel(door-middle,door+middle,.35,4.7,"#476566",.26);
        for(const t of [door-middle,door,door+middle]) panel(t-.11/length,t+.11/length,.35,4.7,"#a5a89f",.31);
        const extension=(l,r,front,back,z0,z1,wall,roof) => {
          const shape=[point(l,0,front),point(r,0,front),point(r,0,back),point(l,0,back)].map(p=>p.slice(0,2));
          prism(shape,z0,z1,wall,roof);
        };
        for(const t of [left+.025,right-.025]) {
          extension(t-.6/length,t+.6/length,5.7,4.2,0,5.35,"#9c9a8c","#b9b8ab");
        }
        extension(left-.026,right+.026,6.6,.06,5.3,6.5,"#777c75","#a8aca1");
        extension(left-.035,right+.035,6.75,0,6.4,6.61,"#a8aaa0","#babbb1");
        for(let step=0;step<3;step++) {
          extension(door-span*.72,door+span*.72,3.4-step*.7,.05,0,(step+1)*.18,"#98998d","#b5b6aa");
        }
      } else if (grand) {
        const left=door-span*.82,right=door+span*.82;
        panel(left,right,2,height*.83,"#385b68",.12);
        for(let row=1;row<9;row++) panel(left,right,row*height*.09,row*height*.09+.3,"#758181",.25);
        for(let col=0;col<=10;col++) {
          const t=left+(right-left)*col/10;
          panel(t,t+.23/length,2,height*.83,"#78949a",.26);
        }
        panel(door-span*.76,door+span*.76,2.43,5.55,"#416568",.30);
        for(const offset of [-.76,-.38,0,.38,.76]) {
          const t=door+span*offset;
          panel(t-.095/length,t+.095/length,2.43,5.55,"#c0c0ae",.33);
        }
        const surround=(l,r,lo,hi,depth,color) => quad(point(l,lo,depth),point(r,lo,depth),point(r,hi,depth),point(l,hi,depth),color);
        for(let band=0;band<3;band++) {
          const inset=band*.019, high=height*(.61-band*.067), reach=5.8-band*1.7;
          const l=left+inset,r=right-inset;
          surround(l,l+.022,.1,high,reach,"#bcb9ab");
          surround(r-.022,r,.1,high,reach,"#bcb9ab");
          surround(l,r,high-1.6,high,reach,"#c9c4b5");
          quad(point(l,high-1.6,.12),point(r,high-1.6,.12),point(r,high-1.6,reach),point(l,high-1.6,reach),"#888b83");
        }
        for (const t of [door-span*.93,door+span*.93]) {
          const half=span*.115;
          quad(point(t-half,0,.08),point(t+half,0,.08),point(t+half,height+.8,.08),point(t-half,height+.8,.08),"#c97847");
          quad(point(t-half,0,2.6),point(t+half,0,2.6),point(t+half,height+.8,2.6),point(t-half,height+.8,2.6),"#ca7646");
          for (const edge of [t-half,t+half]) quad(point(edge,0,.08),point(edge,0,2.6),point(edge,height+.8,2.6),point(edge,height+.8,.08),"#955940");
          quad(point(t-half,height+.8,.08),point(t+half,height+.8,.08),point(t+half,height+.8,2.6),point(t-half,height+.8,2.6),"#d89663");
        }
        for(const {shape,top} of campus.libraryFront.steps) prism(shape,0,top,"#9fa197","#b0b1a5");
        panel(left,right,height*.78,height*.88,"#babfb7",.37);
      } else if (door!==null) {
        const left=door-doorWidth, right=door+doorWidth, seam=.11/length;
        panel(left-seam*4,right+seam*4,0,5.45,"#efe0c4",.12);
        panel(left,right,.2,4.9,"#4d6c67",.18);
        panel(left,right,3.85,4.68,"#789891",.24);
        for (const t of [left,door,right]) panel(t-seam,t+seam,.2,4.87,"#cfc8ab",.27);
        const a=point(left-.018,5.4,.15), b=point(right+.018,5.4,.15);
        const c=point(right+.018,5.4,3), d=point(left-.018,5.4,3);
        quad(a,b,c,d,"#bfae8f");
        quad(b,c,[c[0],c[1],c[2]+.5],[b[0],b[1],b[2]+.5],"#b2a188");
        quad(c,d,[d[0],d[1],d[2]+.5],[c[0],c[1],c[2]+.5],"#baa98b");
        quad(d,a,[a[0],a[1],a[2]+.5],[d[0],d[1],d[2]+.5],"#b2a188");
        quad([a[0],a[1],a[2]+.5],[b[0],b[1],b[2]+.5],[c[0],c[1],c[2]+.5],[d[0],d[1],d[2]+.5],"#ded2b7");
      }
    });
    surface(shape,z1,roof,style?5:0);
  }
  function parapet(shape,z,wall,roof) {
    const winding=Math.sign(area(shape));
    shape.forEach(([x,y],i)=>{
      const [nx,ny]=shape[(i+1)%shape.length], length=Math.hypot(nx-x,ny-y);
      if(length<1) return;
      const dx=-(ny-y)/length*winding*.36,dy=(nx-x)/length*winding*.36;
      prism([[x,y],[nx,ny],[nx+dx,ny+dy],[x+dx,y+dy]],z,z+.46,wall,roof);
    });
  }
  const box = (x,y,w,d,z0,z1,wall,roof=wall) => prism(campus.box(x,y,w,d),z0,z1,wall,roof);
  function pitchedRoof(shape,z,rise,color,wall) {
    const [a,b,c,d]=shape.map(p=>[...p,z+.025]);
    const left=[(a[0]+d[0])/2,(a[1]+d[1])/2,z+rise];
    const right=[(b[0]+c[0])/2,(b[1]+c[1])/2,z+rise];
    quad(a,b,right,left,color,.92);
    quad(left,right,c,d,color,1);
    triangle(a,left,d,wall);
    triangle(b,right,c,wall);
  }

  function mottoStone(x,y) {
    box(x-1.05,y-4.6,2.1,9.2,0,.56,"#84503c","#a66e50");
    box(x-.67,y-4.42,1.34,8.84,.56,4.8,"#333537","#5b5c5c");
    const label=document.createElement("canvas");
    label.width=300;
    label.height=144;
    const ink=label.getContext("2d");
    ink.textAlign="center";
    ink.textBaseline="middle";
    const column=(value,col,row,step,font)=>{
      ink.font=font;
      [...value].forEach((glyph,i)=>ink.fillText(glyph,col,row+i*step));
    };
    column("勤奮學習",236,23,32,"bold 30px KaiTi, STKaiti, serif");
    column("紅專並進",201,26,30,"bold 30px KaiTi, STKaiti, serif");
    column("郭沫若",150,78,22,"bold 23px KaiTi, STKaiti, serif");
    column("中國科學技術大學",53,65,8,"8px KaiTi, serif");
    column("全體校友敬立",45,86,7,"7px KaiTi, serif");
    letterMesh(label,ink,(col,row)=>[x-.69,y-4.3+col*8.6/300,4.7-row*.028],"#e6b944");
  }

  function squareDetails() {
    const {corridor,lawns,pool,planter,patio,terraceTables,steps,shrubs,flagpoles}=campus.squareScene;
    const at=campus.squarePoint;
    for (const lawn of lawns) surface(lawn,.029,"#90ae72",4);
    surface(corridor,.065,"#ded9ca",1);
    surface(patio,.061,"#c8bdae",1);
    for(let v=10;v<128;v+=7) strip([at(-13,v),at(13,v)],.115,.069,"#ada799",false);
    for(const u of [-8,0,8]) strip([at(u,6),at(u,128)],.115,.069,"#ada799",false);
    for(const [i,shape] of steps.entries()) prism(shape,.067,.20+i*.17,"#a8a99e","#d5d4c9");
    prism(planter,.07,.64,"#8f8b78","#695944");
    prism(planter.map(([x,y],i)=>[x+(i===0||i===3?.42:-.42),y+(i<2?.42:-.42)]),.64,1.08,"#5b764a","#789356");
    surface(pool,.145,"#5d8e82",3);
    strip([...pool,pool[0]],.55,.33,"#9b8e7b",false);
    const [nearLeft,nearRight,,farLeft]=pool;
    const inPool=(u,v)=>nearLeft.map((value,i)=>value+
      u*(nearRight[i]-value)+v*(farLeft[i]-value));
    for(const fraction of [.22,.73]) {
      const [x,y]=inPool(.5,fraction);
      prism(circle(x,y,.65,.65,9),.14,.32,"#8c9586","#e4e8d9");
    }
    for(let i=0;i<5;i++) {
      const [x,y]=inPool(.13+i*.16,.88);
      box(x-.48,y-.49,.96,.98,.15,.39,"#9f9e90","#c7c4b4");
    }
    for(const [x,y] of shrubs) {
      const base=circle(x,y,1.7,1.5,10), top=circle(x,y,1.3,1.15,10);
      for(let i=0;i<10;i++) {
        const j=(i+1)%10;
        quad([...base[i],.35],[...base[j],.35],[...top[j],1.55],[...top[i],1.55],"#68894c",.80+i*.033);
        triangle([...top[i],1.55],[...top[j],1.55],[x,y,2.04],"#779953");
      }
    }
    for(const [i,[x,y]] of flagpoles.entries()) {
      const top=i===1?15:13.5;
      prism(circle(x,y,.11,.11,6),.54,top,"#8f9790","#b7bbb3");
      const flag=i===1?"#b84237":"#47728d";
      quad([x,y,top-.25],[x+2.38,y+.48,top-.39],[x+2.38,y+.48,top-1.48],[x,y,top-1.38],flag);
    }
    for(const [x,y] of terraceTables) {
      prism(circle(x,y,.72,.72,12),.98,1.12,"#8e8071","#c5ae8b");
      prism(circle(x,y,.075,.075,6),.08,3.32,"#776f5f","#948771");
      const rim=circle(x,y,2.03,2.03,8);
      rim.forEach(([px,py],i)=>triangle([px,py,2.77],[...rim[(i+1)%8],2.77],[x,y,3.34],i%2?"#e7dfce":"#f1eadc"));
      for(const dx of [-1.25,1.25]) {
        box(x+dx-.3,y-.28,.60,.56,.51,.63,"#987e62","#b79a78");
        box(x+dx-.3,y+.19,.60,.085,.59,1.02,"#a98b68");
        for(const leg of [-.24,.24]) box(x+dx+leg-.045,y-.235,.09,.47,.08,.54,"#646660");
      }
    }
  }

  function parkingDetails() {
    const paint="#e3e0d4";
    for(const {x,y,count} of campus.parking.rows) {
      for(let i=0;i<=count;i++) strip([[x+5*i,y],[x+5*i,y+7.7]],.155,.083,paint,false);
      strip([[x,y],[x+5*count,y]],.155,.083,paint,false);
    }
    for (const [x,y,color] of campus.parking.cars) {
      box(x-1.22,y-2.97,2.44,5.94,.43,1.21,color);
      const glass="#66777c";
      const a=[x-1.07,y-1.74,1.21], b=[x+1.07,y-1.74,1.21];
      const c=[x+1.07,y+1.84,1.21], d=[x-1.07,y+1.84,1.21];
      const e=[x-.89,y-1.11,2.11], f=[x+.89,y-1.11,2.11];
      const g=[x+.89,y+1.19,2.11], h=[x-.89,y+1.19,2.11];
      quad(a,b,f,e,glass); quad(b,c,g,f,glass,.88); quad(c,d,h,g,glass); quad(d,a,e,h,glass,.88); quad(e,f,g,h,color,1.1);
      for(const side of [-1,1]) for(const axle of [-1.8,1.8]) {
        const wheel=circle(y+axle,.55,.46,.46,10).map(([py,z])=>[x+side*1.24,py,z]);
        wheel.forEach((point,i)=>triangle(point,wheel[(i+1)%10],[x+side*1.24,y+axle,.55],"#353936"));
      }
      for(const side of [-1,1]) {
        box(x+side*.84-.24,y-3.005,.48,.09,.77,1.02,"#e4dcc4");
        box(x+side*.84-.24,y+2.93,.48,.09,.79,1.05,"#a44e42");
      }
    }
  }

  function busDepotDetails() {
    const {yard,buses,shelter,supports,backWall}=campus.busDepot;
    surface(yard,.06,"#c5c5ba",1);
    for(const x of [488.8,494.8,500.8,506.8]) strip([[x,599],[x,618]],.16,.085,"#f1edda",false);
    strip([[488.8,618],[506.8,618]],.16,.085,"#f1edda",false);
    for(const {x,y,shape,top} of buses) {
      prism(shape,.54,1.65,"#4f926e","#4f926e");
      prism(shape,1.65,top,"#e6c85c","#e4e6df");
      box(x-.9,y-1.8,1.8,3.6,top,top+.23,"#c1c8bf");
      for(const side of [-1,1]) {
        for(let pane=0;pane<6;pane++) box(x+side*1.8-.028,y-7.25+pane*2.42,.056,2.18,2.33,3.99,"#405b62");
        for(const axle of [-5,4.9]) {
          const px=x+side*1.84;
          const tire=circle(y+axle,.68,.62,.62,12).map(([py,z])=>[px,py,z]);
          tire.forEach((point,i)=>triangle(point,tire[(i+1)%tire.length],[px,y+axle,.68],"#343a37"));
        }
        box(x+side*1.17-.25,y-8.05,.50,.09,1.05,1.37,"#f1eed3");
      }
      box(x-1.6,y-8.045,3.2,.065,2.22,4.02,"#45636a");
      box(x-.84,y-8.07,1.68,.06,3.74,3.98,"#a96c34");
    }
    prism(shelter.shape,0,.15,"#a3a69b","#c1c2b6");
    prism(shelter.shape,4.1,shelter.height,"#505a56","#6e7972");
    prism(backWall.shape,.15,backWall.top,"#6d7166","#83887b");
    for(const {shape,top} of supports) prism(shape,.15,top,"#929990","#aeb1a6");
    box(520.6,635.3,1.03,9.8,.78,1.1,"#8c7656","#b29971");
    for(const y of [636,643.9]) box(520.9,y,.46,.35,.15,.79,"#666d64");
    const sign=document.createElement("canvas");
    sign.width=120; sign.height=24;
    const ink=sign.getContext("2d");
    ink.font='bold 20px "Microsoft YaHei", sans-serif';
    ink.textAlign="center"; ink.textBaseline="middle";
    ink.fillText("校车站台",60,12);
    box(530.02,647.6,.24,6,3.14,3.92,"#386551");
    letterMesh(sign,ink,(col,row)=>[530.27,653.36-col*.046,3.85-row*.026],"#f2f2dc");
  }

  function drawBikeShelter() {
    const {shape,bikes,posts}=campus.bikeShelter;
    const [[left,back],,[right,front]]=shape;
    const roofHeight=y=>3.42+1.34*Math.sin(Math.PI*(y-back)/(front-back));
    const tube=(a,b,width,color)=>{
      const [dx,dy,dz]=b.map((v,i)=>v-a[i]);
      const length=Math.hypot(dx,dy,dz), horizontal=Math.hypot(dx,dy);
      if(length<.001) return;
      const u=horizontal>.001 ? [-dy/horizontal,dx/horizontal,0] : [1,0,0];
      const v=[-dz*u[1]/length,dz*u[0]/length,(dx*u[1]-dy*u[0])/length];
      const offsets=[u,v,u.map(n=>-n),v.map(n=>-n)];
      const edge=(p,i)=>p.map((n,k)=>n+offsets[i][k]*width/2);
      for(let i=0;i<4;i++) {
        const j=(i+1)%4;
        quad(edge(a,i),edge(b,i),edge(b,j),edge(a,j),color,.86+i*.045);
      }
    };
    for(let i=0;i<10;i++) {
      const a=back+i*(front-back)/10,b=back+(i+1)*(front-back)/10;
      quad([left,a,roofHeight(a)],[right,a,roofHeight(a)],[right,b,roofHeight(b)],[left,b,roofHeight(b)],
        i%2?"#909a98":"#99a39f");
      for(const x of [left,left+8.5,left+17,left+25.5,right]) tube([x,a,roofHeight(a)-.09],[x,b,roofHeight(b)-.09],.13,"#676f69");
    }
    for(const {shape,top} of posts) {
      const [[x,y]]=shape;
      prism(shape,.055,top,"#747d76","#a4aca4");
      for(const end of [back,front]) tube([x+.14,y+.14,top-1.35],[x+.14,end,roofHeight(end)-.06],.15,"#747d76");
    }
    for(const {x,y,color,direction,basket} of bikes) {
      const at=(along,z,across=0)=>[x+across,y+along*direction,z];
      for(const offset of [-.82,.82]) {
        const outer=circle(offset,.54,.48,.48,24),inner=circle(offset,.54,.40,.40,24);
        outer.forEach(([py,z],i)=>{
          const j=(i+1)%outer.length;
          for(const side of [-.048,.048]) {
            quad(at(py,z,side),at(...outer[j],side),at(...inner[j],side),at(...inner[i],side),"#353d38");
            tube(at(...inner[i],side),at(...inner[j],side),.022,"#9da6a0");
          }
          quad(at(py,z,-.048),at(...outer[j],-.048),at(...outer[j],.048),at(py,z,.048),"#424942");
          if(i%2===0) tube(at(offset,.54,i%4===0?.08:-.08),at(...inner[i]),.013,"#89928a");
        });
        tube(at(offset,.54,-.13),at(offset,.54,.13),.08,"#8c978f");
      }
      for(const [a,b] of [[[0,.49],[-.3,1.15]],[[-.3,1.15],[.46,1.2]],[[.46,1.2],[0,.49]],
        [[-.82,.52],[0,.49]],[[-.82,.52],[-.3,1.15]],[[.82,.52],[.46,1.2]],[[.46,1.2],[.42,1.47]]]) {
        tube(at(...a),at(...b),.055,color);
      }
      tube(at(.42,1.47,-.33),at(.42,1.47,.33),.044,"#84928b");
      for(const side of [-1,1]) tube(at(.42,1.47,side*.25),at(.34,1.47,side*.39),.075,"#434b45");
      tube(at(-.37,1.25),at(-.17,1.24),.24,"#3b443d");
      tube(at(0,.49,-.16),at(0,.49,.16),.074,"#727c75");
      tube(at(0,.49,.16),at(.17,.34,.16),.041,"#818d83");
      tube(at(.17,.34,.12),at(.17,.34,.27),.07,"#424a43");
      for(const dz of [-.038,.039]) tube(at(-.82,.54+dz,.09),at(0,.49+dz,.12),.025,"#49534b");
      if(basket) {
        for(const level of [1.03,1.33]) {
          for(const side of [-.24,.24]) tube(at(.6,level,side),at(1,level,side),.046,"#646d64");
          for(const end of [.6,1]) tube(at(end,level,-.24),at(end,level,.24),.046,"#646d64");
        }
        for(const end of [.6,1]) for(const side of [-.24,.24]) tube(at(end,1.03,side),at(end,1.33,side),.047,"#646d64");
      }
    }
  }

  function drawSportCourts() {
    const paint="#e7e7cd";
    for(const {x,y,w,d,shape,kind} of campus.sportCourts) {
      const tennis=kind==="tennis";
      surface(shape,.045,tennis?"#4c876f":"#a85b4d");
      const padding=tennis?2:1.7;
      const play=campus.box(x+padding,y+padding,w-padding*2,d-padding*2);
      surface(play,.064,tennis?"#577e9c":"#4c8666");
      strip([...play,play[0]],.15,.072,paint,false);
      if(tennis) {
        for(const side of [1,-1]) {
          const edge=x+w/2+side*(w/2-3.4), service=y+d/2+side*d*.24;
          strip([[edge,y+padding],[edge,y+d-padding]],.12,.072,paint,false);
          strip([[x+3.4,service],[x+w-3.4,service]],.13,.072,paint,false);
          box(x+w/2+side*(w/2-1.4)-.08,y+d/2-.08,.16,.16,.064,1.47,"#4e6256");
        }
        strip([[x+w/2,y+d*.26],[x+w/2,y+d*.74]],.12,.072,paint,false);
        const netY=y+d/2;
        box(x+1.4,netY-.035,w-2.8,.07,1.39,1.46,"#dfdfc8");
        for(let z=.22;z<1.35;z+=.21) box(x+1.4,netY-.022,w-2.8,.044,z,z+.034,"#53655d");
        for(let px=x+1.5;px<x+w-1.4;px+=.51) box(px,netY-.024,.034,.048,.15,1.39,"#53655d");
        continue;
      }
      const cx=x+w/2,cy=y+d/2,radius=Math.min(2.5,w*.13);
      const center=circle(cx,cy,radius,radius,20);
      strip([...center,center[0]],.14,.073,paint,false);
      strip([[x+padding,cy],[x+w-padding,cy]],.14,.073,paint,false);
      for(const side of [-1,1]) {
        const baseline=cy+side*(d/2-padding), free=baseline-side*Math.min(7.2,d*.21);
        const key=Math.min(3.4,w*.21);
        surface(campus.box(cx-key,Math.min(baseline,free),key*2,Math.abs(free-baseline)),.068,"#a65a4d");
        strip([[cx-key,baseline],[cx-key,free],[cx+key,free],[cx+key,baseline]],.14,.073,paint,false);
        const arc=Array.from({length:15},(_,i)=>{
          const angle=-Math.PI/2+i*Math.PI/14;
          return [cx+Math.sin(angle)*radius,free-side*Math.cos(angle)*radius];
        });
        strip(arc,.14,.073,paint,false);
        const post=baseline+side*.8, board=baseline-side*.65;
        box(cx-.12,post-.12,.24,.24,.05,4.35,"#616e67");
        box(cx-.08,Math.min(post,board),.16,Math.abs(post-board),4.19,4.32,"#69736b");
        box(cx-1.13,board-.07,2.26,.14,3.97,5.02,"#d1d8cf");
        const rim=circle(cx,board-side*.46,.37,.37,12);
        strip([...rim,rim[0]],.07,4.18,"#c4774e",false);
      }
    }
  }

  function roadSigns() {
    const label=document.createElement("canvas");
    label.width=144;
    label.height=32;
    const ink=label.getContext("2d");
    ink.font='bold 24px "Microsoft YaHei", sans-serif';
    ink.textAlign="center";
    ink.textBaseline="middle";
    for (const {x,y,blades} of campus.roadSigns) {
      prism(circle(x,y,.095,.095,7),.03,3+blades.length*1.18,"#717f77","#b5c0b2");
      blades.forEach(({name,dx,dy},i)=>{
        const z=3+i*1.18;
        const point=(along,across)=>[x+dx*along-dy*across,y+dy*along+dx*across];
        prism([point(-2.28,-.10),point(2.28,-.10),point(2.28,.10),point(-2.28,.10)],
          z,z+1.12,"#4f6e63","#728d80");
        ink.clearRect(0,0,label.width,label.height);
        ink.fillText(name,label.width/2,label.height/2);
        for (const side of [-1,1]) {
          const at=(along,level,depth)=>[...point(along,depth*side),z+level];
          quad(at(-2.20,.06,.105),at(2.20,.06,.105),at(2.20,1.06,.105),at(-2.20,1.06,.105),"#d0d9c9");
          quad(at(-2.13,.12,.111),at(2.13,.12,.111),at(2.13,1,.111),at(-2.13,1,.111),"#315c51");
          letterMesh(label,ink,(col,row)=>at(side*(col-label.width/2)*.031,.96-row*.025,.119),"#f2f0dc");
        }
      });
    }
  }

  function northEntryDetails() {
    const [[x,y],[right]]=campus.northStone;
    const width=right-x;
    const base=campus.poly(x,y+.9,x+1.35,y,x+width-.9,y,x+width,y+1.05,x+width-.35,y+3.42,x+2,y+4.55,x+.4,y+3.02);
    const rim=base.map(([px,py],i)=>[px+(x+width/2-px)*.13,py+(y+2-py)*.12,[2.18,3.18,3.06,2.18,2.47,3.42,2.82][i]]);
    base.forEach(([px,py],i)=>{
      const j=(i+1)%base.length;
      quad([px,py,.06],[...base[j],.06],rim[j],rim[i],"#a49a84",.86+(i%3)*.09);
      triangle(rim[i],rim[j],[x+width*.52,y+2,3.56],"#b4a88e",.88+(i%3)*.055);
    });
    const label=document.createElement("canvas");
    label.width=252; label.height=42;
    const ink=label.getContext("2d");
    ink.font='bold 28px KaiTi, "Microsoft YaHei", serif';
    ink.textAlign="center"; ink.textBaseline="middle";
    [..."中国科学技术大学"].forEach((glyph,i)=>ink.fillText(glyph,16+i*31.4,21));
    letterMesh(label,ink,(col,row)=>{
      const z=2.23-row*.033;
      return [x+width-1.94-col/label.width*(width-4.1),y+z*.032-.065,z];
    },"#a13732");
    const [[bx,by]]=campus.northBarrier;
    for(let i=0;i<13;i++) {
      const p=i/13,q=(i+1)/13;
      const at=(t,z)=>[bx+.36-10.2*t,by+.33,1.21+t*2.05+z];
      quad(at(p,0),at(q,0),at(q,.18),at(p,.18),i%2?"#bd473e":"#dedbd2");
    }
  }

  function activityDetails(building) {
    const {upper,columns,core,decks,stairs,rails,apron}=campus.activityModel;
    surface(apron,.052,"#b8b4a7",1);
    surface(building.shape,upper.bottom,"#8a8980",1);
    prism(building.shape,upper.bottom,building.height,"#aba79b","#bcb8a9");
    const front=campus.poly(846.75,1004,877,1002.5,879,1044.5,847.75,1046);
    prism(front,upper.bottom,upper.top,"#b8b2a3","#c5c1b2");
    for(let row=0;row<11;row++) {
      const z=15.1+row*1.25;
      quad([846.68,1004,z],[847.68,1046,z],
        [847.68,1046,z+.045],[846.68,1004,z+.045],"#a5a092");
    }
    for(const y of [1007,1017.5,1028,1038.5]) box(846.2+(y-1007)*.025,y,3.1,2.2,upper.top-1.45,upper.top-.95,"#a4a097","#c7c1b2");
    for(let x=854;x<893;x+=5.6) for(let y=1004;y<1041;y+=6.7) {
      const panel=campus.box(x,y,5.2,6.25);
      prism(panel,upper.bottom-.42,upper.bottom-.23,"#aba99e","#c8c5b8");
      surface(panel,upper.bottom-.42,"#c0bdb1");
    }
    for(const {shape,top} of columns) {
      prism(shape,0,top,"#998d7e","#aea496");
      const [x,y]=shape[0], [right,far]=shape[2];
      box(x-.18,y-.18,right-x+.36,far-y+.36,0,.54,"#71685d");
      for(let z=.95;z<top;z+=1.31) box(x-.018,y-.018,right-x+.036,far-y+.036,z,z+.037,"#81776d");
      box(x-.34,y-.34,right-x+.68,far-y+.68,top-.49,top,"#a59c8d");
    }
    prism(core.shape,0,core.top,"#b3a18e","#bbb5a4");
    const face=core.shape[0][0]-.025;
    quad([face,988,.2],[face,1058,.2],[face,1058,14.05],[face,988,14.05],"#b0a08c",1,meshMaterial.brick);
    for(const [bottom,top] of [[.62,3.64],[4.81,6.55],[10.02,11.73],[12.51,13.83]]) {
      quad([face-.04,990,bottom],[face-.04,1056,bottom],[face-.04,1056,top],[face-.04,990,top],"#475957",1,meshMaterial.glass);
      for(let y=990;y<=1056;y+=3) box(face-.09,y,.04,.12,bottom,top,"#b8b4a3");
    }
    for(const {shape,bottom,top} of decks) {
      prism(shape,bottom,top,"#a39d8e","#c7c1b0");
      surface(shape,bottom,"#a29f93",1);
    }
    for(const {steps} of stairs) {
      for(const {shape,bottom,top} of steps) prism(shape,bottom,top,"#a19b8f","#c9c2b0");
    }
    for(const [[x,y,z],[nx,ny,nz]] of rails) {
      const dx=nx-x,dy=ny-y,length=Math.hypot(dx,dy);
      const ox=-dy/length*.045,oy=dx/length*.045;
      for(const [lo,hi] of [[.17,.235],[.99,1.08]]) {
        const a=[x+ox,y+oy,z+hi], b=[nx+ox,ny+oy,nz+hi], c=[nx-ox,ny-oy,nz+hi], d=[x-ox,y-oy,z+hi];
        quad(a,b,c,d,"#babcb2");
        quad(a,b,[b[0],b[1],nz+lo],[a[0],a[1],z+lo],"#91968b");
        quad(d,c,[c[0],c[1],nz+lo],[d[0],d[1],z+lo],"#969a90");
      }
      const posts=Math.ceil(length/1.5);
      for(let i=0;i<=posts;i++) {
        const t=i/posts,base=z+(nz-z)*t;
        box(x+dx*t-.048,y+dy*t-.048,.096,.096,base-.14,base+1.035,"#a0a499");
      }
    }
    const label=document.createElement("canvas");
    label.width=282; label.height=44;
    const ink=label.getContext("2d");
    ink.font='bold 36px KaiTi, "Microsoft YaHei", serif';
    ink.textAlign="center"; ink.textBaseline="middle";
    [..."科大美食广场"].forEach((glyph,i)=>ink.fillText(glyph,26+i*46,22));
    letterMesh(label,ink,(col,row)=>[face-.075,1023+(col-141)*.073,8.39-row*.041],"#8f312c");
  }

  function westGateDetails({place:{x,y},parts,scale}) {
    const start=data.length;
    const stone=["#bfb3a0","#c8bcaa","#b9af9e","#c1b5a3","#b5ab99"];
    const front=x+(parts[0].shape[0][0]-x)/scale[0], back=x+(parts[0].shape[1][0]-x)/scale[0];
    function tiles(face,left,right,bottom,top) {
      for(let row=0;row<15;row++) {
        const low=Math.max(bottom,row*.78+.018), high=Math.min(top,(row+1)*.78-.018);
        if (high<=low) continue;
        const origin=y-15+(row%2)*.74;
        for(let col=Math.floor((left-origin)/1.48);origin+col*1.48<right;col++) {
          const lo=Math.max(left,origin+col*1.48+.018), hi=Math.min(right,origin+(col+1)*1.48-.018);
          if (hi<=lo) continue;
          const color=stone[((row*7+col*3)%stone.length+stone.length)%stone.length];
          quad([face,lo,low],[face,hi,low],[face,hi,high],[face,lo,high],color,.91+(row%4)*.021);
        }
      }
    }
    for (const face of [front-.025,back+.025]) {
      tiles(face,y-14.5,y-9.1,.17,7.5);
      tiles(face,y+9.1,y+14.5,.17,7.5);
      tiles(face,y-14.5,y+14.5,7.5,11.4);
    }
    inscription([front-.065,y-9.4],[front-.065,y+9.4],10.42,"#79562c",true);
    inscription([front-.1,y-9.45],[front-.1,y+9.35],10.47,"#edc563",true);

    function roundedDetail(px,py,pz,rx,ry,rz,color) {
      const rings=[-.72,0,.72].map(h=>circle(px,py,rx*Math.sqrt(1-h*h),ry*Math.sqrt(1-h*h),8)
        .map(([vx,vy])=>[vx,vy,pz+h*rz]));
      for(let i=0;i<8;i++) {
        const j=(i+1)%8, shade=.86+i*.018;
        triangle([px,py,pz-rz],rings[0][i],rings[0][j],color,shade);
        quad(rings[0][i],rings[0][j],rings[1][j],rings[1][i],color,shade);
        quad(rings[1][i],rings[1][j],rings[2][j],rings[2][i],color,shade+.06);
        triangle(rings[2][i],rings[2][j],[px,py,pz+rz],color,shade+.11);
      }
    }
    for (const side of [-1,1]) {
      const py=y+side*12.13, px=x-5.01;
      const edge=y+side*7.94;
      const glassY=edge-(side<0?.07:0);
      box(front+.48,glassY,3.7,.07,.63,7.12,"#4f5750");
      for(let bar=0;bar<=3;bar++) box(front+.45+bar*1.24,glassY-.025,.065,.12,.63,7.12,"#a08b65");
      for(let z=.69;z<7.15;z+=1.08) box(front+.45,glassY-.025,3.76,.12,z,z+.055,"#a08b65");

      roundedDetail(px+.18,py,1.12,.57,.58,.63,"#b2b1a3");
      roundedDetail(px-.16,py,1.68,.48,.49,.50,"#adada0");
      roundedDetail(px-.45,py,1.75,.31,.36,.32,"#c4c1b1");
      roundedDetail(px-.68,py,1.59,.17,.24,.13,"#a29f91");
      for(const dy of [-.25,.25]) {
        roundedDetail(px-.31,py+dy,.94,.19,.16,.31,"#b5b4a5");
        roundedDetail(px-.48,py+dy,.73,.29,.19,.12,"#bbb9a9");
        roundedDetail(px-.27,py+dy,1.99,.16,.14,.16,"#b9b7aa");
      }
      roundedDetail(px+.82,py+side*1.58,.71,.73,.88,.63,"#657d51");
      roundedDetail(px+.65,py-side*1.67,.6,.62,.71,.54,"#526e46");
      roundedDetail(px+.96,py-side*1.52,.99,.60,.64,.54,"#738754");
      const flowerStart=side<0?y-15.3:y+9.35;
      box(x-6.73,flowerStart,1.16,5.95,0,.21,"#aca894","#526246");
      for(let row=0;row<2;row++) for(let i=0;i<25;i++) {
        const fy=flowerStart+.12+i*.232+(row%2)*.09;
        const fx=x-6.46+row*.5+Math.sin(i*4.3)*.12;
        prism(circle(fx,fy,.17,.16,5),.19,.36,"#607547","#6b824f");
        surface(circle(fx,fy,.11,.115,5),.40,["#bb3c31","#e7b938","#d75334"][(i+row)%3]);
      }
    }
    const railX=x+4.9;
    for(let i=0;i<11;i++) {
      const ay=y-7.9+i*.42;
      box(railX,ay,.11,.09,.10,1.8,"#555b57");
      if(i===10) continue;
      for(const [low,high] of [[.36,1.55],[1.55,.36]]) {
        quad([railX-.02,ay,low],[railX-.02,ay+.42,high],[railX-.02,ay+.42,high+.055],[railX-.02,ay,low+.055],"#7b7c70");
      }
    }
    for(let i=start;i<data.length;i+=walkMeshStride) {
      data[i]=x+(data[i]-x)*scale[0];
      data[i+1]=y+(data[i+1]-y)*scale[1];
      data[i+2]*=scale[2];
    }
  }

  surface(campus.box(-175,-150,1770,2180),-.25,"#bdc7bb",4);
  surface(campus.outline,0,"#bfd2ad",4);
  for (const lawn of campus.lawns) surface(lawn,.012,"#a9c997",4);
  surface(campus.tunnel.portalLawn,.014,"#9ab77e",4);
  surface(campus.parking.lawn,.021,"#94b87d",4);
  for (const building of campus.buildings) for (const {shape,height} of [
    {shape:building.shape,height:building.baseHeight??building.height},
    ...(building.masses||[]).map(({shape,top})=>({shape,height:top}))
  ]) {
    const projected=shape.map(([x,y])=>[x+height*.28,y+height*.44]);
    surface(projected,.019,"#a5b799",4);
    shape.forEach(([x,y],i)=>{
      const j=(i+1)%shape.length;
      quad([x,y,.019],[...shape[j],.019],[...projected[j],.019],[...projected[i],.019],"#a5b799",1,4);
    });
  }
  for (const plaza of campus.plazas) surface(plaza,.03,"#d2d6bb",1);
  for (const shape of campus.roadSurfaces.sidewalk) surface(shape,.04,campus.roadColors.sidewalk,1);
  for (const shape of campus.roadSurfaces.paving) surface(shape,.055,campus.roadColors.paving,meshMaterial.pavedRoad);
  for (const shape of campus.roadSurfaces.asphalt) surface(shape,.075,campus.roadColors.asphalt,meshMaterial.asphaltRoad);
  const {segments,ceiling,fenceTop}=campus.tunnel;
  for(const [[x,y],[nx,ny]] of campus.tunnel.apronFences) {
    strip([[x,y],[nx,ny]],.15,fenceTop,"#39454a",false);
    strip([[x,y],[nx,ny]],.12,.84,"#535e60",false);
    const count=Math.ceil(Math.hypot(nx-x,ny-y)/1.55);
    for(let i=0;i<=count;i++) {
      const px=x+(nx-x)*i/count,py=y+(ny-y)*i/count;
      box(px-.055,py-.055,.11,.11,.075,fenceTop,"#404a4e");
    }
  }
  for(const {a,b,covered,shape} of segments.slice(1)) {
    const at=(station,t,z=station.z)=>{
      const [l,r]=station.edges;
      return [l[0]+(r[0]-l[0])*t,l[1]+(r[1]-l[1])*t,z];
    };
    const along=(t,u,z=0)=>{
      const p=at(a,u), q=at(b,u);
      return p.map((v,i)=>v+(q[i]-v)*t+(i===2?z:0));
    };
    quad(at(a,0),at(a,1),at(b,1),at(b,0),"#555956",1,11);
    const distance=Math.hypot(b.point[0]-a.point[0],b.point[1]-a.point[1]);
    for(let offset=2;offset+2<distance;offset+=6) {
      const t=offset/distance, end=(offset+2)/distance;
      quad(along(t,.495,.016),along(t,.505,.016),along(end,.505,.016),along(end,.495,.016),"#c9b372",1,11);
    }
    for(const [edge,kerb] of [[0,.12],[1,.88]]) {
      const top=covered?ceiling:.72;
      quad(at(a,edge),at(b,edge),at(b,edge,top),at(a,edge,top),covered?"#65655e":"#b4aa9a",1,11);
      quad(at(a,edge,a.z+.16),at(a,kerb,a.z+.16),at(b,kerb,b.z+.16),at(b,edge,b.z+.16),"#c6c2b3",1,11);
      quad(at(a,kerb),at(b,kerb),at(b,kerb,b.z+.16),at(a,kerb,a.z+.16),"#a4a59a",1,11);
      if (!covered) {
        for(let z=-6;z<.72 && a.z!==b.z;z+=.8) {
          const from=Math.max(0,Math.min(1,(z-a.z)/(b.z-a.z)));
          const [lo,hi]=a.z>b.z?[from,1]:[0,from];
          if(hi<=lo) continue;
          const p=along(lo,edge===0?.001:.999),q=along(hi,edge===0?.001:.999);
          quad([p[0],p[1],z],[q[0],q[1],z],[q[0],q[1],z+.024],[p[0],p[1],z+.024],"#918d80",1,11);
        }
        quad(at(a,edge,.72),at(b,edge,.72),at(b,edge,.83),at(a,edge,.83),"#a39c8d",1,11);
        quad(at(a,edge,fenceTop-.09),at(b,edge,fenceTop-.09),at(b,edge,fenceTop),at(a,edge,fenceTop),"#39454a");
        for(let i=0;i<distance;i+=1.55) {
          const [x,y]=along(i/distance,edge);
          box(x-.045,y-.045,.09,.09,.82,fenceTop,"#404a4e");
        }
      }
    }
    if (covered) {
      surface(shape,ceiling,"#727168");
      for(let i=5;i<distance;i+=10) {
        const [x,y]=along(i/distance,.5);
        box(x-.8,y-.27,1.6,.54,ceiling-.18,ceiling,"#dbd4b5");
      }
    } else if (a.portal || b.portal) {
      const portal=a.z<b.z?a:b;
      const [l,r]=portal.edges;
      const head=[l,r,r.map((v,i)=>v+(i===0?.52:0)),l.map((v,i)=>v+(i===0?.52:0))];
      prism(head,ceiling,1.05,"#9b9c91","#c2beb0");
      if(b.portal) {
        const face=(t,z,offset)=>[l[0]+(r[0]-l[0])*t+offset,l[1]+(r[1]-l[1])*t,z];
        quad(face(.15,-.54,.55),face(.85,-.54,.55),face(.85,.66,.55),face(.15,.66,.55),"#2e3433",1,11);
        quad(face(.17,-.43,.565),face(.83,-.43,.565),face(.83,.56,.565),face(.17,.56,.565),"#171c1b",1,11);
        const label=document.createElement("canvas");
        label.width=220;
        label.height=21;
        const ink=label.getContext("2d");
        ink.textAlign="center";
        ink.textBaseline="middle";
        ink.font='bold 19px "Microsoft YaHei", sans-serif';
        ink.fillText("红专并进，理实交融",110,10.5);
        letterMesh(label,ink,(col,row)=>face(.19+.62*col/220,.50-row*.043,.58),"#f45648",11);
      }
    }
  }
  parkingDetails();
  busDepotDetails();
  drawBikeShelter();
  drawSportCourts();
  roadSigns();
  for (const {name,points:[[x,y],[nx,ny]]} of campus.surroundingRoads) {
    const length=Math.hypot(nx-x,ny-y);
    const dx=(nx-x)/length,dy=(ny-y)/length;
    for(let start=4;start+3<length-2;start+=9) {
      const center=start+1.5;
      if(campus.approaches.some(({points,width})=>points.slice(1).some((end,i)=>
        campus.segmentDistance(x+dx*center,y+dy*center,points[i],end)<width*.6+2))) continue;
      strip([[x+dx*start,y+dy*start],[x+dx*(start+3),y+dy*(start+3)]],.18,.081,
        name==="金寨路"?"#dedfce":"#e7d299",false,meshMaterial.roadMarking);
    }
  }
  const hatch=[[635,560],[664,558],[665,572],[636,574]];
  strip([...hatch,hatch[0]],.22,.12,"#e5c566",false,meshMaterial.roadMarking);
  for(let i=0;i<=5;i++) {
    const x=635.7+i*4.7;
    strip([[x,573.6-i*.33],[x+5.3,560-i*.33]],.21,.121,"#e5c566",false,meshMaterial.roadMarking);
  }
  const arena = campus.trackShape(0);
  surface(arena,.09,"#a76c55",2);
  surface(campus.trackShape(19),.12,"#8da969",4);
  for(let i=0;i<8;i++) surface(campus.box(322,967+i*14,76,14),.135,i%2?"#8fa96a":"#97b373",4);
  for (const inset of [3,7,11,15,19]) {
    const lane = campus.trackShape(inset);
    strip([...lane,lane[0]],.31,.145,"#efdfc1",false);
  }
  const pitch = campus.box(322,967,76,112);
  strip([...pitch,pitch[0]],.39,.16,"#e8ead0",false);
  strip([[322,1023],[398,1023]],.35,.16,"#e8ead0",false);
  const center = circle(360,1023,11);
  strip([...center,center[0]],.34,.16,"#e8ead0",false);
  surface(circle(360,1023,.53),.17,"#e8ead0");
  for (const [y,sign] of [[967,1],[1079,-1]]) {
    for (const [halfWidth,depth] of [[20,16],[9,6]]) {
      strip([[360-halfWidth,y],[360-halfWidth,y+sign*depth],[360+halfWidth,y+sign*depth],[360+halfWidth,y]],.33,.16,"#e8ead0",false);
    }
    surface(circle(360,y+sign*11,.46),.17,"#e8ead0");
    const posts=[356.3,363.7], back=y-sign*2;
    box(posts[0]-.09,y-.09,7.58,.18,2.4,2.58,"#e9ebdd");
    for(const x of posts) {
      box(x-.09,y-.09,.18,.18,.12,2.58,"#e9ebdd");
      quad([x,y,2.42],[x+.075,y,2.42],[x+.075,back,.15],[x,back,.15],"#d8ddd0");
    }
    for(let i=0;i<=12;i++) {
      const x=posts[0]+i*7.4/12;
      quad([x,y,2.42],[x+.022,y,2.42],[x+.022,back,.15],[x,back,.15],"#c1c9ab");
    }
  }

  squareDetails();
  for (const {x,y,ornament} of campus.ornaments) {
    const bronze="#496457";
    if (ornament==="stone") {
      mottoStone(x,y);
    } else if (ornament==="ox") {
      box(x-3.8,y-1.9,7.6,3.8,0,.75,"#a19d87","#bcb29a");
      prism(circle(x,y,2.8,1.15,8),1.3,2.7,bronze,"#627f69");
      for(const dx of [-1.5,1.45]) for(const dy of [-.65,.65]) box(x+dx-.24,y+dy-.2,.48,.4,.75,1.55,bronze);
      prism(circle(x+2.5,y,.85,.73,6),1.9,3,bronze,"#66806e");
    } else {
      prism(circle(x,y,2.3,2.3,12),.07,.37,"#aaa38b","#c9c0a7");
      box(x-.92,y-.8,1.84,1.6,.37,1.85,"#a99f85","#d1c6aa");
      prism(circle(x,y,.6,.46,8),1.85,3.23,bronze,"#6a8976");
      prism(circle(x,y,.43,.39,8),3.16,3.97,bronze,"#779181");
    }
  }
  for (const [index,shape] of campus.waters.entries()) {
    surface(shape,.12,"#5c8475",3);
    strip([...shape,shape[0]],.86,.14,"#a3ae92",false);
    const [cx,cy] = shape.reduce(([a,b],[px,py]) => [a+px/shape.length,b+py/shape.length],[0,0]);
    if (index===2) continue;
    for (const [i,[x,y]] of shape.entries()) {
      const nx=x+(cx-x)*.2,ny=y+(cy-y)*.2;
      for(let j=0;j<5;j++) {
        const px=nx+Math.sin(i*4+j*2.4)*3.5, py=ny+Math.cos(i*2-j*1.8)*2.8;
        if(!campus.contains(shape,px,py)||campus.isPaved(px,py,1.5)) continue;
        const radius=.36+(i*j%6)*.115;
        surface(circle(px,py,radius,radius*.82,6),.154+j*.005,["#769557","#899d5b","#698b50"][j%3]);
      }
      if(i%3===0 && !campus.isPaved(x,y,1.6)) {
        prism(circle(x,y,.95,.65,6),0,.31+(i%4)*.11,"#929789","#a7a99a");
        for(let stem=0;stem<6;stem++) {
          const px=x+(cx-x)*.025+Math.sin(i+stem*2.4)*.68;
          const py=y+(cy-y)*.025+Math.cos(i+stem*2.4)*.49;
          const height=.58+.68*Math.abs(Math.sin(i*.8+stem*4));
          triangle([px-.055,py,.12],[px+.055,py,.12],[px+.23,py-.18,height],"#637c4e",1+stem*.05);
          triangle([px,py-.055,.12],[px,py+.055,.12],[px+.23,py-.18,height],"#789052");
        }
      }
    }
  }
  strip(campus.pavilionWalk,6,.38,"#d7c097");
  for (let i=1;i<campus.pavilionWalk.length;i++) {
    const [x,y]=campus.pavilionWalk[i-1], [nx,ny]=campus.pavilionWalk[i];
    const length=Math.hypot(nx-x,ny-y), posts=Math.ceil(length/3.2);
    for (const side of [-1,1]) {
      const sx=(ny-y)/length*2.72*side, sy=(x-nx)/length*2.72*side;
      strip([[x+sx,y+sy],[nx+sx,ny+sy]],.34,2.24,"#a88d67",false);
      for (let j=0;j<=posts;j++) {
        const px=x+(nx-x)*j/posts+sx, py=y+(ny-y)*j/posts+sy;
        box(px-.18,py-.18,.36,.36,.36,2.25,"#a78b64");
      }
    }
  }
  const {x:pavilionX,y:pavilionY}=campus.pavilion;
  const pavilion = circle(pavilionX,pavilionY,7.2,6.5,6);
  prism(pavilion,.2,1,"#a99a7b","#ded0aa");
  for (const [x,y] of circle(pavilionX,pavilionY,5.2,4.5,6)) box(x-.32,y-.32,.64,.64,1,8.1,"#846644");
  const roofRing = circle(pavilionX,pavilionY,8.8,8,6);
  roofRing.forEach(([x,y],i) => {
    const [nx,ny] = roofRing[(i+1)%6];
    const mid = [pavilionX+(x-pavilionX)*.62,pavilionY+(y-pavilionY)*.62,10.6];
    const next = [pavilionX+(nx-pavilionX)*.62,pavilionY+(ny-pavilionY)*.62,10.6];
    const shade = .8+i*.04;
    quad([x,y,8.1],[nx,ny,8.1],next,mid,"#546e65",shade);
    triangle(mid,next,[pavilionX,pavilionY,15],"#69837a",shade);
  });
  for (const gate of campus.gates) {
    const {place,parts}=gate;
    for (const part of parts) prism(part.shape,part.bottom,part.top,part.wall,part.roof);
    if (place.id==="north") {
      northEntryDetails();
    } else if (place.id==="old-north") {
      const beam=parts[2], [a,b,c,d]=beam.shape, level=beam.top-.47;
      inscription([d[0],d[1]+.085],[c[0],c[1]+.085],level,"#813d36");
      inscription([b[0],b[1]-.085],[a[0],a[1]-.085],level,"#813d36");
    } else if (place.id==="west") {
      westGateDetails(gate);
    }
  }
  for (const {shape,kind,top} of campus.contextBuildings) {
    const wall=kind==="residential"?"#c3baaa":"#b5beb8";
    prism(shape,-.25,top,wall,"#c9cec3",{
      trim:"#d2d3c7",glass:"#788b89",base:"#a3aca2",spacing:9.5,windowWidth:4.6
    });
  }
  for(const {shape,bottom,top} of campus.researchLinks) {
    prism(shape,bottom,top,bottom?"#5b747c":"#a6adaa","#b9c3bf",{
      floors:bottom?1:2,spacing:bottom?3.1:7,windowWidth:bottom?2.55:4.9,
      trim:"#b2c3c3",glass:"#4b6871",base:bottom?"#637a82":"#9da6a5"
    });
  }
  for (const building of campus.buildings) {
    const [wall,roof,base] = palette[building.type];
    const style=building.style||{};
    if (building===campus.busDepot.shelter) continue;
    if (building.id==="activity") { activityDetails(building); continue; }
    if (building.towerLevels) {
      const z=building.height;
      prism(building.shape,0,z,"#848d91","#b9bdb5",{
        floors:building.towerLevels,spacing:5.3,windowWidth:2.5,trim:"#9fa6a5",glass:"#4c6166",
        accent:building.id==="teaching-admin"||building.name==="管理科学教学科研楼"?"#b96549":undefined
      });
      const [x,y]=building.shape.reduce(([a,b],[px,py])=>[a+px/building.shape.length,b+py/building.shape.length],[0,0]);
      box(x-5.5,y-2.8,11,5.6,z,z+2.2,"#9c5140","#b56a54");
      const edge=building.shape.reduce((best,a,i,shape)=>{
        const b=shape[(i+1)%shape.length];
        return Math.hypot(b[0]-a[0],b[1]-a[1])>best.length?{a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1])}:best;
      },{length:0});
      const winding=Math.sign(area(building.shape));
      const nx=(edge.b[1]-edge.a[1])*winding/edge.length,ny=(edge.a[0]-edge.b[0])*winding/edge.length;
      for (const offset of [.12,.49,.84]) {
        const ax=edge.a[0]+(edge.b[0]-edge.a[0])*offset,ay=edge.a[1]+(edge.b[1]-edge.a[1])*offset;
        const dx=(edge.b[0]-edge.a[0])*2.25/edge.length,dy=(edge.b[1]-edge.a[1])*2.25/edge.length;
        prism([[ax,ay],[ax+dx,ay+dy],[ax+dx+nx*.24,ay+dy+ny*.24],[ax+nx*.24,ay+ny*.24]],3,z+.32,"#a85341","#b36d54");
      }
      continue;
    }
    if (building.id==="cafe") {
      const z=building.height;
      const [left,,,right]=building.shape;
      prism(building.shape,0,z,"#c9b9a0","#dedad0",{floors:1,spacing:4,windowWidth:2.9,glass:"#506665",trim:"#9e886e"});
      const awning=[left,right,[right[0],right[1]+1.28],[left[0],left[1]+1.28]];
      prism(awning,z-1.23,z-.98,"#665a4b","#8b7660");
      const label=document.createElement("canvas");
      label.width=240;
      label.height=30;
      const ink=label.getContext("2d");
      ink.font='bold 23px "Microsoft YaHei", sans-serif';
      ink.textAlign="center";
      ink.textBaseline="middle";
      ink.fillText("USTC1958 咖啡馆",120,15);
      box(587.55,707.03,12.45,.27,z-.99,z-.12,"#574b41");
      letterMesh(label,ink,(col,row)=>[587.8+col*.05,707.32,z-.17-row*.024],"#eee4c9");
      continue;
    }
    if (building.osmKind==="grandstand") {
      // Clip each riser to the footprint, with the lower seats facing the pitch.
      const along=(x,y)=>x-.064*(y-933);
      const front=Math.max(...building.shape.map(([x,y])=>along(x,y)));
      for(let step=0;step<5;step++) {
        const limit=front-step*1.55;
        const tread=building.shape.flatMap((a,i,ring)=>{
          const b=ring[(i+1)%ring.length], da=along(...a)-limit,db=along(...b)-limit;
          const points=da<=0?[a]:[];
          if((da<0 && db>0)||(da>0 && db<0)) {
            const t=da/(da-db);
            points.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
          }
          return points;
        });
        if(tread.length>=3) prism(tread,step*building.height/5,(step+1)*building.height/5,
          "#9a9b92",step%2?"#b5b3a5":"#c6c3b3");
      }
      continue;
    }
    const entryTarget = building.entry || {
      classroom:[649,581], library:[679,963], hall:[515,1398],
      canteen:[861,973], activity:[891,1067], second:[868,785],
      expert:[710,436], "teaching-admin":[864,293], history:[765,1115],
      physics:[354,814], auditorium:[805,733], cafe:[594,712], fifth:[949,365],
      "osm-1135310337":[788,783],"research-a":[802,1342],research:[951,1344],"research-c":[935,1440]
    }[building.id];
    let entry, best=Infinity;
    if (building.id==="library") entry={edge:campus.libraryFront.edge,center:.5};
    else if (entryTarget) building.shape.forEach(([x,y],i,shape) => {
      const [nx,ny]=shape[(i+1)%shape.length];
      const dx=nx-x,dy=ny-y,len=Math.hypot(dx,dy);
      if(len<14) return;
      const fraction=((entryTarget[0]-x)*dx+(entryTarget[1]-y)*dy)/(len*len);
      const center=Math.max(5/len,Math.min(1-5/len,fraction));
      const distance=Math.hypot(entryTarget[0]-x-dx*center,entryTarget[1]-y-dy*center);
      if (distance<best) { best=distance; entry={edge:i,center}; }
    });
    const overWater=building.id==="auditorium";
    if (overWater) {
      for (const [px,py] of [[787,704],[798,705],[810,704],[821,705],[789,721],[804,721],[823,725]]) {
        box(px-.7,py-.7,1.4,1.4,0,2.5,"#a7b0a6");
      }
      prism(building.shape,2.4,3,"#c9cfc4","#e2e5d8");
    }
    const residential=["housing","dorm","residential","apartments","dormitory"].includes(building.kind);
    const facade=building.id==="library" ? {...style,grandEntry:true} :
      building.id==="fifth" ? {...style,teachingEntry:true} :
      building.id==="classroom" ? {...style,teachingEntry:true} : residential ? {
        trim:"#d9d7c4",glass:"#728982",spacing:6.5,windowWidth:3.7,
        floors:building.levels||Math.max(1,Math.round(building.height/(3.2*eastOSM.unit))),...style,balconies:!style.fins
      } : style;
    prism(building.shape,overWater?3:0,building.baseHeight??building.height,style.wall||wall,style.roof||roof,facade,entry);
    for (const {shape,top,style} of building.masses||[]) {
      prism(shape,building.baseHeight,top,style.wall,style.roof,style.floors?style:null);
      parapet(shape,top,style.trim||style.wall,style.roof);
      if (!style.floors) continue;
      if (building.id==="osm-1135310338" && top<building.height) {
        const skylight=[[919,1545],[943,1545],[944,1558],[920,1558]];
        const center=[931.5,1551.5];
        const cap=skylight.map(p=>p.map((v,i)=>center[i]+(v-center[i])*.72));
        prism(skylight,top,top+.6,"#758a96","#627f91");
        skylight.forEach((p,i)=>{
          const j=(i+1)%skylight.length;
          quad([...p,top+.6],[...skylight[j],top+.6],[...cap[j],top+2.55],[...cap[i],top+2.55],i%2?"#466e8a":"#517f9a");
        });
        surface(cap,top+2.55,"#51788e",meshMaterial.glass);
        box(990,1546,13,10,top,top+3.7,"#b76d50","#c2c7c3");
        box(989.5,1545.5,14,11,top+3.7,top+4.12,"#c6c9c2");
        for (const y of [1565,1568,1571]) {
          strip([[917,y],[978,y]],.13,top+.025,"#a2b3b8",false);
        }
        continue;
      }
      const [x,y]=shape.reduce(([a,b],[px,py])=>[a+px/shape.length,b+py/shape.length],[0,0]);
      box(x-5,y-2,10,4,top,top+1.5,"#a5adaa","#cbd1c9");
      for(const offset of [-7,7]) box(x+offset-1.1,y-1.05,2.2,2.1,top,top+.85,"#9fa6a3","#bcc3be");
      if ((building.id==="osm-1135310341" && top===building.height) || building.id==="osm-1135310338") {
        const px=shape[0][0]+7, py=shape[0][1]+8;
        prism(circle(px,py,2.9),top,top+1.1,"#b6bcb8","#dde0d9");
        const low=circle(px,py,2.8), high=circle(px,py,1.95);
        low.forEach(([ax,ay],i)=>{
          const j=(i+1)%low.length;
          quad([ax,ay,top+1.1],[...low[j],top+1.1],[...high[j],top+2.8],[...high[i],top+2.8],"#e3e7df",.9+i*.009);
          triangle([...high[i],top+2.8],[...high[j],top+2.8],[px,py,top+3.55],"#e8ebe5");
        });
      }
    }
    if (building.id==="cafe") {
      box(580,703.5,26,4.6,0,.36,"#a48966","#ba9e76");
      box(582,705,22,2.4,4.3,4.57,"#63796c","#9bada0");
    }
    if (building.id==="hall") {
      const z=building.height;
      const roofline=[[461.4,1338.1],[558.1,1334.2],[562.1,1406.2],[464.3,1410.4]];
      prism(roofline,z-.28,z+.24,"#9caaa9",style.roof);
      pitchedRoof(roofline,z+.24,5.4,style.roof,style.wall);
      box(491,1405.7,37,5.7,4.5,5.25,"#9da7a3","#c4cbc4");
      for(const x of [493,525]) box(x,1409.5,.95,.9,0,4.5,"#d3d0c4");
      for(let i=0;i<4;i++) box(486+i*.85,1412-i*.85,46-i*1.7,.86,0,.24*(i+1),"#a4a39a","#c6c1b4");
    } else if (building.id==="history" || building.name==="行政楼") {
      const z=building.height;
      const main=building.id==="history"?[[727,1091],[805,1085],[805,1100],[733,1104]]:
        [[719,984],[800,978],[801,990],[719,996]];
      pitchedRoof(main,z,4,style.roof,style.wall);
      for(const wing of building.id==="history"?[[715,1080,12,27],[806,1073,13,28]]:
        [[707,979,12,28],[801,974,10,25]]) {
        pitchedRoof(campus.box(...wing),z,2.8,style.roof,style.wall);
      }
    } else if (building.height>8 && !overWater) {
      const z=building.baseHeight??building.height, rim=style.trim||"#d9d4c2";
      const shape=building.shape;
      parapet(shape,z,rim,style.roof||roof);
      if (!building.style && building.height>16 && Math.abs(area(shape))>500) {
        const cabinet=campus.box(building.x-2.2,building.y-1.6,4.4,3.2);
        if (cabinet.every(([x,y])=>campus.contains(shape,x,y))) {
          prism(cabinet,z,z+1.2,"#b1afa0","#cccbbe");
        }
      }
    }
    const [x,y] = building.shape.reduce(([a,b],[px,py]) => [a+px/building.shape.length,b+py/building.shape.length],[0,0]);
    if (!["classroom","canteen","activity"].includes(building.id)) continue;
    if (building.id === "classroom") {
      box(635,589,29,10,building.height,building.height+2,"#a86450",style.roof);
    } else {
      box(x-13,y-3,26,6,building.height,building.height+3,base,roof);
    }
  }
  for (const {x,y,r,cherry,evergreen,plane,heightScale=1} of campus.trees) {
    const wood = plane?"#b6ad95":"#7d7156";
    const vertical=r*heightScale;
    if (plane) {
      const rings=[[0,.12],[.48,.095],[.98,.076],[1.66,.038]].map(([h,rx])=>(
        circle(x+Math.sin(y*.31)*h*r*.13,y+Math.cos(x*.39)*h*r*.10,r*rx,r*rx,7).map(p=>[...p,h*vertical])));
      for(let j=0;j<rings.length-1;j++) for(let i=0;i<7;i++) {
        const k=(i+1)%7, [a,b,c,d]=[rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]];
        quad(a,b,c,d,wood,.82+i*.037);
        const point=(u,v)=>a.map((n,k)=>n*(1-u)*(1-v)+b[k]*u*(1-v)+c[k]*u*v+d[k]*(1-u)*v+
          (k===0?(a[0]+b[0]-2*x)*.008:k===1?(a[1]+b[1]-2*y)*.008:0));
        for(let p=0;p<3;p++) {
          const u=.13+(1+Math.sin(i*5+j*3+p*4))*.22, v=.08+p*.27;
          quad(point(u,v),point(u+.22,v+.065),point(u+.12,v+.225),point(u-.08,v+.16),p%2?"#a39882":"#d1c7aa");
        }
      }
    } else prism(circle(x,y,r*.12,r*.12,6),0,vertical*1.42,wood,wood);
    surface(circle(x+r*.35,y+r*.48,r*.98,r*.72,13),.026,"#9dae8e",4);
    surface(circle(x,y,r*.29,r*.29),.046,"#a3a17b",4);
    if (evergreen) {
      for (let layer=0;layer<4;layer++) {
        const radius=r*(.95-layer*.16), z=r*(.48+layer*.47);
        const needles=circle(x,y,radius,radius,8);
        needles.forEach(([px,py],i) =>
          triangle([px,py,z],[...needles[(i+1)%8],z],[x,y,z+r*1.17],"#537a61",.78+i*.043+layer*.028));
      }
      continue;
    }
    const phase=x*.22+y*.17;
    for(let branch=0;branch<5;branch++) {
      const angle=phase+branch*Math.PI*2/5;
      const dx=Math.cos(angle)*r*.47,dy=Math.sin(angle)*r*.47;
      const high=vertical*((plane?1.52:1.25)+(1+Math.sin(phase+branch*4))*.20);
      const start=plane?1.03:.65;
      const root=circle(x+(plane?Math.sin(y*.31)*start*r*.13:0),y+(plane?Math.cos(x*.39)*start*r*.10:0),r*.071,r*.071,5);
      const fork=circle(x+dx,y+dy,r*.029,r*.029,5);
      for(let i=0;i<5;i++) {
        const j=(i+1)%5;
        quad([...root[i],vertical*start],[...root[j],vertical*start],[...fork[j],high],[...fork[i],high],wood,.81+i*.04);
      }
      const colors=plane?["#9f884f","#b69c56","#8d8a52"]:cherry?["#e2b0ba","#edc2c8","#daa3b0"]:["#76975e","#87a76c","#739466"];
      const color=colors[branch%3];
      const cx=x+dx,cy=y+dy;
      const rings=[[.31,.30],[.59,.56],[.40,.37]].map(([rx,ry],layer)=>
        circle(cx,cy,r*rx,r*ry,10).map(([px,py],i)=>{
          const bump=1+.11*Math.sin(phase+i*5+branch*3+layer*.9);
          return [cx+(px-cx)*bump,cy+(py-cy)*bump];
        }));
      const heights=[high-vertical*.26,high+vertical*.22,high+vertical*.61];
      for(let i=0;i<10;i++) {
        const j=(i+1)%10, lit=.83+Math.sin(i*Math.PI/5+angle)*.10;
        for(let layer=0;layer<2;layer++) {
          quad([...rings[layer][i],heights[layer]],[...rings[layer][j],heights[layer]],
            [...rings[layer+1][j],heights[layer+1]],[...rings[layer+1][i],heights[layer+1]],color,lit+layer*.13);
        }
        triangle([...rings[2][i],heights[2]],[...rings[2][j],heights[2]],[cx,cy,high+vertical*.86],color,1.03);
      }
    }
  }
  for (const {at,verticalScale} of campus.benches) {
    const board=(x,y,w,d,z0,z1,wall,roof=wall)=>prism(
      campus.box(x,y,w,d).map(([u,v])=>at(u,v)),z0*verticalScale,z1*verticalScale,wall,roof);
    for(let slat=0;slat<4;slat++) board(0,slat*.39,5,.34,1.12,1.42,"#a38a63","#b99b70");
    board(0,.1,.6,1.2,0,1.13,"#76816d");
    board(4.4,.1,.6,1.2,0,1.13,"#76816d");
    for(const dx of [.23,4.5]) board(dx,.09,.22,.23,1.17,2.41,"#788377");
    for(const z of [1.63,2.01]) board(0,.12,5,.26,z,z+.29,"#9e815c","#b99b70");
  }
  for (const {x,y,r,h} of [...campus.memorialShrubs,...campus.historyShrubs,...campus.lakeShrubs,...campus.oxShrubs,...campus.bikeShelter.shrubs,...campus.tunnel.shrubs]) {
    prism(circle(x,y,r,r*.84,10),.015,h*.55,"#617f4b","#7e9c5d");
    prism(circle(x,y,r*.69,r*.61,9),h*.54,h,"#719151","#8ba967");
  }
  for (const [x,y,n] of [[569,693,7],[674,694,7],[592,837,6],[687,838,7]]) {
    for (let i=0;i<n;i++) {
      const px=x+i*3.4, py=y-i*.1;
      if (campus.isPaved(px,py,2.3) || campus.waters.some(shape=>campus.contains(shape,px,py))
        || campus.buildings.some(({shape})=>campus.contains(shape,px,py))) continue;
      const shrub=circle(px,py,2.2,1.7,7);
      shrub.forEach(([sx,sy],j) =>
        triangle([sx,sy,.2],[...shrub[(j+1)%7],.2],[px,py,2.1],"#789960",.84+j*.026));
    }
  }
  return new Float32Array(data);
}

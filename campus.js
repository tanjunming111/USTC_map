"use strict";

// East-campus geometry is projected from the local OSM extract; smaller scenery
// and unrecorded building heights remain illustrative.
const campus = (() => {
  const reference = "https://indico.pnp.ustc.edu.cn/event/3091/attachments/6396/12868/%E7%A7%91%E5%A4%A7%E4%B8%9C%E5%8C%BA%E6%A0%A1%E5%9B%BE.pdf";
  const photos = "https://sz.ustc.edu.cn/wdxz_show/61.html";
  const facadeSources = {
    classroom:"https://business.ustc.edu.cn/2010/1214/c28419a526438/page.htm",
    library:"https://lib.ustc.edu.cn/%E6%9C%AC%E9%A6%86%E6%A6%82%E5%86%B5/%E4%B8%9C%E5%8C%BA%E5%9B%BE%E4%B9%A6%E9%A6%86%E7%AE%80%E4%BB%8B/",
    auditorium:photos, research:photos, "research-a":photos, "research-c":photos,
    "old-library":"https://www.gooood.cn/en/the-academic-building-for-network-center-computer-science-big-data-and-microelectronics.htm",
    history:"https://zgkdb.ustc.edu.cn/download/995",
    pavilion:"https://zgkdb.ustc.edu.cn/ndetail/9977"
  };
  const floorPlans = "https://www.teach.ustc.edu.cn/service/svc-resource/12388.html";
  const vrUrl = "https://map.ustc.edu.cn/sj/e/index.html";
  const vrPlaces = new Set(["classroom","auditorium","sakura","lakes","pavilion","old-north","west"]);
  const studentServicesColors={wall:"#e6d8b9",roof:"#f3e8cf",base:"#b7a989",trim:"#eee2c4",glass:"#6e8a87"};
  const teachingBrickFacade={wall:"#ad5c47",roof:"#b0aea4",base:"#817569",trim:"#e4dac8",
    glass:"#4c666a",floors:4,spacing:7.7,windowWidth:3.7,brick:true,topTrim:.48};
  const facadeStyles = {
    classroom:teachingBrickFacade,
    "old-library":{...teachingBrickFacade,base:teachingBrickFacade.wall},
    library:{wall:"#bc754b",roof:"#a6a9a2",base:"#828581",trim:"#c3c2b6",glass:"#527a89",floors:6,spacing:7.2,windowWidth:5.8},
    auditorium:{wall:"#d9ded8",roof:"#aeb6b2",base:"#687872",trim:"#e6e9e1",glass:"#46676c",floors:2,spacing:5.1,windowWidth:4.6,bands:true},
    research:{wall:"#81898c",roof:"#b8bcb8",base:"#565d60",trim:"#b6bbba",glass:"#4b5c63",floors:10,spacing:5.3,windowWidth:3.7,ribbons:true,fins:true},
    history:{wall:"#dad8cc",roof:"#a35b43",base:"#b1ab9e",trim:"#ebe5d7",glass:"#536664",floors:3,spacing:6.8,windowWidth:3.3},
    hall:{wall:"#d1cfc2",roof:"#aeb5b4",base:"#aaa99f",trim:"#e0ded2",glass:"#576b6d",floors:2,spacing:10,windowWidth:5.4},
    "osm-270334648":studentServicesColors,
    second:{wall:"#e1e4e3",roof:"#bfc8cc",base:"#afb9bd",trim:"#edf0ec",glass:"#4a606c",accent:"#c67550",floors:8,spacing:5.9,windowWidth:3.8},
    fifth:{wall:"#bbc9c7",roof:"#c4cdca",trim:"#dce3de",glass:"#63828b",floors:5,spacing:5.7,windowWidth:4.2,ribbons:true},
    expert:{wall:"#b86e56",roof:"#a5a099",trim:"#dfc8a5",glass:"#4b6267",floors:3,spacing:6.5,windowWidth:4.5,brick:true,expertEntry:true,roofHeadroom:2.4},
    cafe:{wall:"#dadfd3",roof:"#778d84",trim:"#e0ddd0",glass:"#53756b",floors:1,spacing:5.2,windowWidth:3.8},
    "osm-1135310337":{wall:"#e0dfd4",roof:"#c4cbc5",trim:"#e5e6dc",glass:"#546d76",accent:"#b96d4a",floors:5,spacing:5.6,windowWidth:3.8}
  };
  const {outline,plazas,unit} = eastOSM;
  const surroundingRoads=eastOSM.surroundingRoads.map(road=>({...road,width:(road.width+3)*1.15,sidewalk:2}));
  const southPaths=[
    [[244,1530.8],[244,1523]],
    [[716,1599],[716,1577.7]],
    [[860.82,1540.18],[893.8,1540.18]],
    [[791.48,1545.36],[805,1538],[811,1527],[811,1515],[808,1506],[812,1494],[822,1489],[834,1493],[844,1490],[856,1481.5]],
    [[814,1543.7],[811,1554],[804,1561],[803,1572],[809,1580],[819,1584],[829,1581],[837,1583],[850,1592],[864.4,1592]]
  ];
  const roads=eastOSM.roads.flatMap(road=>{
    if (road.id==="way/265575541") return [{...road,points:road.points.slice(0,5)}];
    // The surface path starts south of the portal. Its mapped northern stub crosses the planting bed.
    if (road.id==="way/324628892") return [{...road,points:road.points.slice(2)}];
    // Curve the west entrance into the lot instead of ending the road at a separate apron.
    if (road.id==="way/308701261") return [{...road,points:[
      road.points[0],[395.1,781],[396,786],[398.5,790.5],[402.5,793.4],[407.5,794.8],[413,795]
    ]}];
    // The terminal approach alongside the stand fits a footpath between the two buildings.
    if (road.id==="way/265575538") return [
      {...road,points:road.points.slice(0,2)},
      {...road,asphalt:false,width:3.8,points:[road.points[1],[284,1115],[282,1094],[281.5,1084.77]]}
    ];
    // The two joined laboratory wings close the route between these access drives.
    if (road.id==="way/298766172") return [
      {...road,points:road.points.slice(0,2)},
      {...road,points:[[531.4,1442],road.points[2]]}
    ];
    if (["way/308701266","way/308701268","way/365518967","way/1135725451"].includes(road.id)) return [];
    if (road.name==="红专路" || road.id==="way/265583821") return [{...road,asphalt:true}];
    if (road.id==="way/290099137" || road.id==="way/290099139") return [{...road,asphalt:false}];
    if (road.id==="way/290099138") return [{...road,width:6,asphalt:false}];
    const squareConnections={"way/306371633":[649.18,734.86],"way/306371635":[652.5,785.75],
      "way/306496883":[671.08,733.44],"way/306496884":[675.57,782.63]};
    if(squareConnections[road.id]) return [{...road,points:[squareConnections[road.id],...road.points.slice(1)]}];
    if (road.id==="way/306373632" || road.id==="way/290099140") return [{...road,width:3.8,asphalt:false}];
    return [road];
  }).map(road=>road.id==="way/265583820" ? {...road,previousWidth:4.9,width:4.9,sidewalk:.55} :
    road.asphalt || ["天使路","勤奋路","志学路"].includes(road.name)
    ? {...road,previousWidth:road.width+1.5,width:(road.width+1.5)*1.25,sidewalk:1.55}
    : {...road,previousWidth:road.width,width:road.width*1.12});
  const roadColors = {asphalt:"#626969",paving:"#d7ddd5",sidewalk:"#bcbeb1"};
  const box = (x,y,w,d) => [[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
  const poly = (...coordinates) => Array.from({length:coordinates.length/2}, (_,i) => coordinates.slice(i*2,i*2+2));
  const scienceForecourt=poly(695,1578,737,1575,737,1583.8,695,1586.8);
  const labFacade={wall:"#dadbd3",roof:"#bec5c3",trim:"#dedfd9",base:"#a1a8a1",glass:"#57747f",spacing:6.2,windowWidth:4.1,ribbons:true};
  const hospitalFacade={...labFacade,wall:"#e7e8e2",trim:"#eef0e8",glass:"#506168",spacing:5.6,windowWidth:4.5};
  const resourceFacade={...labFacade,wall:"#b7b9b0",roof:"#c5c9c0",trim:"#d0d1c9",spacing:5.3,windowWidth:3.2,ribbons:false};
  const apartmentFacade={...labFacade,wall:"#c78160",roof:"#a6adae",trim:"#e1e3dd",glass:"#729098",floors:8,spacing:5.7,windowWidth:3.4,fins:true};
  const dormFacade={...labFacade,wall:"#deddd1",roof:"#c8ceca",trim:"#d3d5ce",glass:"#597078",floors:6,spacing:5.5,windowWidth:3.4,fins:true};
  const redDormFacade={...dormFacade,wall:"#a86652",trim:"#c6b0a0",brick:true,fins:false};
  const creamDormFacade={...dormFacade,wall:"#e0d8af",trim:"#ded7b6",floors:5};
  const numberedDorm=(number,style)=>({name:"学生公寓"+number+"号楼",number,kind:"dorm",aliases:number+"#",style});
  // Match the existing 19 and 20 residential palette in both views.
  const fifthHousingStyle={wall:"#d9c9a5",roof:"#e8ddc1",base:"#aba080",trim:"#d9d7c4",glass:"#728982",floors:5,spacing:6.5,windowWidth:3.7};
  const eastHousingStyles=[
    {...fifthHousingStyle,wall:"#cec8b8",roof:"#bcc4c2",trim:"#e1d9c8",fins:true,ribbons:true},
    {...fifthHousingStyle,wall:"#d7dcd7",roof:"#bdc6c8",trim:"#e5e5da",glass:"#647983",balconies:true},
    {...fifthHousingStyle,wall:"#bec8cb",roof:"#aab8bc",trim:"#d2d7d4",accent:"#a3b1b6",fins:true},
    {...fifthHousingStyle,wall:"#d9dbd3",roof:"#ac645b",trim:"#e3e0d4",accent:"#a9665b",balconies:true,pitchedRise:3.4}
  ];
  const buildingDetails={
    "way/265575551":{height:21.5},
    "way/265575547":{entry:[893.755,319.615]},
    "way/267646979":{style:facadeStyles.fifth},
    "way/1135310357":{name:"东区幼儿园",short:"幼儿园",number:36,kind:"service",aliases:"幼儿园36# 36号楼 科大幼儿园",height:12,
      description:"幼儿园按平面图围绕36–39号楼布置，分设活动场地和楼间步道。",
      style:{...labFacade,wall:"#8fb7c9",roof:"#becad0",trim:"#d1dce0",glass:"#577a91",accent:"#b77eac",floors:2}},
    "way/1135310358":{height:10,style:{...labFacade,wall:"#dbd0b3",roof:"#c5cbc2",accent:"#b36e59",floors:2}},
    "way/1135310359":{height:9,style:{...labFacade,wall:"#dcc0a1",roof:"#bbc6c5",accent:"#669496",floors:2}},
    "way/1135310360":{height:8,style:{...labFacade,wall:"#d5d7b7",roof:"#bac6c2",accent:"#ae7764",floors:2}},
    "way/1135360036":{style:eastHousingStyles[1]},
    "way/1135360037":{style:eastHousingStyles[1]},
    "way/1135360038":{style:eastHousingStyles[1]},
    "way/1135360039":{style:eastHousingStyles[1]},
    "way/1135360044":{style:eastHousingStyles[1]},
    "way/1135360045":{style:eastHousingStyles[1]},
    "way/1135310355":{name:"幼儿园35号楼",short:"35号楼",number:35,kind:"service",aliases:"35# 幼儿园 35号楼",
      description:"东区幼儿园北侧的35号楼。",style:{...labFacade,wall:"#78a8c6",roof:"#92b4cc",trim:"#a9c9dc",glass:"#496e85",floors:3}},
    "way/334120282":{name:"7号楼",number:7,kind:"housing",aliases:"7#",style:fifthHousingStyle},
    "way/334120556":{name:"8号楼",number:8,kind:"housing",aliases:"8#",style:fifthHousingStyle},
    "way/334120281":{name:"15号楼",number:15,kind:"housing",aliases:"15#",style:fifthHousingStyle},
    "way/334120557":{name:"16号楼",number:16,kind:"housing",aliases:"16#",style:fifthHousingStyle},
    "way/267624863":{height:28,style:{...dormFacade,wall:"#d2cabb",roof:"#aebdc7",base:"#955f51",facadeBaseHeight:9.3,spacing:4.4,windowWidth:3.45,glass:"#425359"}},
    "way/267624864":{height:28,style:{...dormFacade,wall:"#d9d8ca",roof:"#d1d3c9",base:"#aa6c55",facadeBaseHeight:4.4,centerAccent:"#a76b57"}},
    "way/267624865":{height:28,style:{...dormFacade,wall:"#d8d5c6",roof:"#ced1c7",base:"#a46050",facadeBaseHeight:8.6,glass:"#40545b",windowWidth:3.6,fins:false,balconies:false}},
    "way/267624866":{height:28,style:{...dormFacade,wall:"#d6d7cc",roof:"#c8cec7",base:"#a56755",facadeBaseHeight:7.8,centerAccent:"#a56654"}},
    "way/270048432":numberedDorm(229,redDormFacade),
    "way/270048433":numberedDorm(221,redDormFacade),
    "way/271958260":numberedDorm(215,redDormFacade),
    "way/271958268":numberedDorm(230,creamDormFacade),
    "way/271958258":numberedDorm(222,creamDormFacade),
    "way/270048434":numberedDorm(216,creamDormFacade),
    "way/271959068":{name:"学生公寓364、365号楼",short:"学生公寓364、365",kind:"dorm",aliases:"364# 365# 学生公寓364号楼 学生公寓365号楼 研究生公寓364 研究生公寓365",height:38,
      style:{...dormFacade,wall:"#c0b3a1",trim:"#ccc9c0",roof:"#bfc6c5",accent:"#aa654d",floors:8}},
    "way/290097996":{...numberedDorm(366,{...dormFacade,wall:"#d6d6cb",roof:"#bfc6c5",floors:7}),height:32},
    "way/270334649":{short:"国际学院",height:18.5,entry:[534,1186],style:{...labFacade,wall:"#b76949",roof:"#9fa9aa",trim:"#bd8871",glass:"#486a74",floors:4,accent:"#b76445"}},
    "way/270334648":{height:19,entry:[548,1280],style:{...labFacade,wall:"#e4e7df",trim:"#e0e4dc",glass:"#3c5863",floors:4,spacing:5.8,windowWidth:4.65}},
    "way/1135310342":{height:15,style:{...labFacade,wall:"#e0ded5",roof:"#b66850",trim:"#ebe6da",floors:3,ribbons:false}},
    "way/298766878":{height:11,style:{...labFacade,wall:"#d5d0a9",roof:"#c0c8bc",floors:2,ribbons:false}},
    "way/298741849":{name:"所系结合专家公寓1号楼",short:"专家公寓1号楼",kind:"housing",height:36.5,baseHeight:34,style:apartmentFacade,masses:[
      {shape:poly(799,506,837,504,838,519,800,521),top:36.5,style:{wall:"#d5dad7",roof:"#9da6a8"}},
      {shape:poly(842,504,879,502,880,516,843,518),top:36.5,style:{wall:"#d5dad7",roof:"#9da6a8"}}
    ]},
    "way/298741850":{name:"所系结合专家公寓2号楼",short:"专家公寓2号楼",kind:"housing",height:36.5,baseHeight:34,style:apartmentFacade,masses:[
      {shape:poly(792,422,832,420,833,432,793,435),top:36.5,style:{wall:"#d5dad7",roof:"#9da6a8"}},
      {shape:poly(837,419,875,417,876,429,838,432),top:36.5,style:{wall:"#d5dad7",roof:"#9da6a8"}}
    ]},
    "way/306371640":{name:"校车队",aliases:"校车停车场 巴士停车场",description:"站台西北侧的校车停放区，入口接校内支路。"},
    "way/306371643":{name:"巴士站台",kind:"service",aliases:"校园建筑M061 校车站台 候车亭",height:5.34,description:"校车队旁的路边候车站台，向道路一侧敞开。"},
    "way/285860077":{name:"校医院综合楼",short:"校医院综合楼",kind:"service",aliases:"校医院 东区医院",
      description:"沿太湖路的校医院主楼，毗邻门诊楼。名称按参考截图标注。",
      entry:[244,1533],baseHeight:12,style:{...hospitalFacade,floors:3},masses:[
        {shape:poly(191,1479,278,1483,276,1516,189,1511),top:26,style:{...hospitalFacade,floors:4}}
      ]},
    "way/1135310349":{name:"校医院门诊楼",short:"校医院门诊楼",kind:"service",aliases:"门诊部 校医院 急诊部",
      description:"截图标为门诊楼，位于校医院综合楼与小南门之间。本地底图将该轮廓记为急诊部。",
      entry:[315,1507],height:11,style:{...hospitalFacade,wall:"#cfb59c",floors:2}},
    "way/298742273":{name:"环境与资源楼",short:"环资楼",aliases:"环资楼 环境资源楼",
      description:"位于礼堂西侧。长条主楼连接两翼，沿太湖路的一侧形成凹入的入口空间。",
      entry:[379,1390],baseHeight:29.5,style:{...resourceFacade,floors:6},masses:[
        {shape:poly(280,1391,365,1386,366,1408,280,1415),top:38.5,style:{...resourceFacade,floors:2}},
        {shape:poly(355,1350,428,1345,432,1370,357,1376),top:38.5,style:{...resourceFacade,floors:2}}
      ]},
    "way/290097999":{name:"材料楼",aliases:"化学与材料科学学院 化学材料楼",entry:[442,1484],height:15,style:{...labFacade,floors:3}},
    "way/298766431":{name:"近代物理楼",aliases:"近代物理系 近代物理楼",entry:[510,1438],height:24,style:{...labFacade,floors:5}},
    "way/1135310347":{aliases:"结构中心楼 单分子科学楼",entry:[575,1471],height:23,style:{...labFacade,floors:5}},
    "way/1135310348":{entry:[490,1558],height:18,style:{...labFacade,wall:"#d6cdbb",floors:4,ribbons:false}},
    "way/290098001":{entry:[625,1531],height:14,style:{...labFacade,floors:3,ribbons:false}},
    "way/298766164":{name:"新数学楼（物理楼）",short:"新数学楼",aliases:"数学科学学院 物理楼 新数学楼",
      description:"位于基础科学教学实验中心北侧，靠近理化广场。",
      entry:[716,1436],height:23,style:{...labFacade,floors:5}},
    "way/1135310341":{name:"基础科学教学实验中心",short:"基础科学教学实验中心",aliases:"理化楼 理化大楼 基础科学实验中心",
      description:"也称理化大楼。主塔面向太湖路，北侧设有较低的附楼。",
      entry:[717,1583],baseHeight:15,style:{...labFacade,floors:3},masses:[
        {shape:poly(685,1507,765,1502,762,1569,685,1574),top:87,style:{...labFacade,wall:"#bfc3c0",glass:"#677c83",spacing:4.7,windowWidth:2.6,floors:16,fins:true}},
        {shape:poly(670,1495,729,1491,730,1503,671,1507),top:27,style:{...labFacade,floors:3}}
      ]},
    "way/1135310338":{name:"地球和空间科学前沿研究中心",short:"地空前沿研究中心",aliases:"地球与空间科学前沿研究中心 地空中心",
      description:"位于东区南门东侧。北侧为蓝灰色塔楼，太湖路一侧为橙灰色退台裙楼。",
      entry:[881,1546],baseHeight:9,style:{...labFacade,wall:"#af6348",roof:"#bec8ca",trim:"#afbdc4",glass:"#5485a0",spacing:7.3,windowWidth:5.7,floors:2},masses:[
        {shape:poly(889,1486,960,1482,962,1529,891,1532),top:49,style:{...labFacade,wall:"#9aaeb6",roof:"#c4cccd",trim:"#c3ccd0",glass:"#4c85ab",spacing:4.1,windowWidth:3.25,floors:9,base:"#9faeb2"}},
        {shape:poly(899,1535,1011,1535,1016,1576,984,1574,984,1583,908,1575),top:20.5,style:{...labFacade,wall:"#b96d4c",roof:"#c2cbcc",trim:"#a6b8c1",glass:"#5286a5",spacing:8,windowWidth:6.7,floors:3}}
      ]}
  };
  const physicsLawn=poly(321,789,388,785,392,797,403,816,398,835,369,841,
    361,877,353,882,320,878,309,855,307,818);
  const lawns = [...eastOSM.green,physicsLawn,
    poly(606,1361,680,1357,686,1404,604,1408),
    poly(800,1471,818,1461,842,1465,848,1476,852,1535,800,1539),
    poly(792,1552,852,1548,856,1597,834,1605,799,1600,782,1586)
  ];
  // The extract maps the western pond. The eastern and report-hall ponds retain
  // approximate shorelines from the university plan, aligned to the OSM paths.
  const enlargePond=(shape,cx,cy,west)=>shape.map(([x,y])=>{
    const expanded=cx+(x-cx)*1.15;
    const axis=634+(y-375)*.075;
    let px=west?Math.min(expanded,Math.max(x,axis-14)):Math.max(expanded,Math.min(x,axis+14));
    let py=cy+(y-cy)*1.12;
    for(let i=0;i<12 && roads.some(({points,width,sidewalk=0})=>points.some((b,j)=>
      j>0 && segmentDistance(px,py,points[j-1],b)<width/2+sidewalk+1));i++) {
      px+=(cx-px)*.055;
      py+=(cy-py)*.055;
    }
    return [px,py];
  });
  const waters = [...eastOSM.waters.map(shape=>enlargePond(shape,587,499,true)),
    enlargePond(poly(676,463,682,450,689,447,700,443,718,447,727,457,733,477,730,496,719,515,701,522,684,514,678,501,678,484),703,482,false),
    poly(791,697,824,693,849,681,875,679,886,670,897,685,898,708,904,724,893,734,849,736,816,727,797,718)
  ];
  const roadsByName = new Map();
  for(const road of roads) {
    if(road.name && !roadsByName.has(road.name)) roadsByName.set(road.name,road);
  }
  const landmarks = [
    {id:"lakes",name:"眼镜湖",short:"眼镜湖",kind:"landscape",x:586,y:518,h:2,featured:true,aliases:"双湖 西湖 东湖",description:"位于第一教学楼北侧。两片水面分列樱花大道东西两侧，从空中俯瞰像一副眼镜。"},
    {id:"sakura",name:"樱花大道",short:"樱花大道",kind:"landscape",x:646,y:473,h:2,featured:true,aliases:"玉泉北路 樱花",description:"这条路从眼镜湖两片水面之间穿过，本名玉泉北路。春天的樱花是东区最有辨识度的景色之一。"},
    {id:"classroom",name:"第一教学楼",short:"一教",kind:"academic",x:651,y:609,h:30,featured:true,aliases:"一教 教一楼 201 第一教学楼",description:"位于眼镜湖南侧。北侧入口朝向樱花大道，南侧入口朝向郭沫若广场。"},
    {id:"pavilion",name:"一鉴亭",short:"一鉴亭",kind:"landscape",x:718,y:471,h:14,featured:true,aliases:"六角亭 东湖",description:"六角亭坐落在眼镜湖东湖，由曲折的回廊与岸边相连。"},
    {id:"square",name:"郭沫若广场",short:"郭沫若广场",kind:"landscape",x:650,y:778,h:2,featured:true,aliases:"郭沫若像 郭广 广场",description:"广场位于第一教学楼与图书馆之间，设有中国科大首任校长郭沫若的塑像。"},
    {id:"library",name:"东区图书馆",short:"图书馆",kind:"academic",x:673,y:931,h:49,featured:true,aliases:"东校区图书馆 东区馆 图书馆 新图书馆",description:"东区新馆共六层。橙色立面之间嵌着灰色入口门框，宽台阶通向玻璃门厅。"},
    {id:"auditorium",name:"水上报告厅",short:"水上报告厅",kind:"academic",x:804,y:726,h:17,aliases:"水报 203 报告厅",description:"位于第一教学楼东南方向、水池西侧。临水立面用浅色横带和成排长窗组织。"},
    {id:"track",name:"东区运动场",short:"运动场",kind:"landscape",x:360,y:1035,h:2,featured:true,aliases:"操场 跑道 体育场 东区田径场",description:"东校区西侧的田径场，紧邻金寨路一侧。"},
    {id:"canteen",name:"东区学生食堂",short:"食堂",kind:"service",x:868,y:930,h:27,aliases:"餐厅 学生餐厅 食堂 208",description:"位于图书馆东侧，靠近东区活动中心。"},
    {id:"history",name:"校史馆",short:"校史馆",kind:"academic",x:769,y:1097,h:26,aliases:"219 校史",description:"位于图书馆东南侧，行政楼南面。"},
    {id:"north",name:"东校区北门",short:"北门",kind:"access",x:783,y:241,h:4,featured:true,aliases:"科大北门 黄山路 东区北门",description:"面向黄山路，从北侧进入东校区。"},
    {id:"west",name:"东校区西门",short:"西门",kind:"access",x:343,y:765,h:4,aliases:"科大西门 金寨路 东区西门 西大门",description:"位于金寨路一侧，向东可到郭沫若广场。"},
    {id:"south",name:"东校区南门",short:"南门",kind:"access",x:861,y:1601,h:4,aliases:"科大南门 太湖路 东区南门",description:"面向太湖路，从东校区南侧进出。"},
    {id:"second",name:"第二教学楼",short:"二教",kind:"academic",x:856,y:773,h:53,aliases:"二教 205 教二楼",description:"紧邻水上报告厅。教务处公布的教室平面覆盖一至八层。"},
    {id:"teaching-admin",name:"教学行政楼",short:"教学行政楼",kind:"academic",x:868,y:277,h:33,aliases:"教学行政楼 黄山路 北门",description:"位于东校区北门东侧，靠近黄山路。"},
    {id:"expert",name:"东区专家楼",short:"专家楼",kind:"service",x:715,y:391,h:24,aliases:"专家楼 住宿",description:"位于眼镜湖东北侧。沿樱花大道向北走，可从湖区到达专家楼附近。"},
    {id:"activity",name:"东区活动中心",short:"东区活动中心",kind:"service",x:894,y:1033,h:32,aliases:"东活 活动中心",description:"位于东区学生食堂南侧。底部为多层架空空间，二楼设有美食广场。"},
    {id:"hall",name:"东区大礼堂",short:"大礼堂",kind:"academic",x:516,y:1374,h:32,aliases:"礼堂 331",description:"位于校园南部，靠近环境与资源楼。"},
    {id:"physics",name:"物理楼",short:"物理楼",kind:"academic",x:717,y:1460,h:28,aliases:"物理学院 物理学系",description:"位于东区西侧，靠近西大门和陶瓷艺术中心。"},
    {id:"old-library",name:"办公楼",short:"办公楼",kind:"admin",x:669,y:878,h:27,aliases:"207 207# 东区老图书馆 老图书馆 老馆",description:"办公楼（207 号楼）位于东区图书馆北侧，为四层红砖建筑。"},
    {id:"fifth",name:"第五教学楼",short:"五教",kind:"academic",x:949,y:339,h:34,aliases:"教五楼 五教",description:"位于北门东侧、教学行政楼东南方向。"},
    {id:"research",name:"物质科学教研 B 楼",short:"物质科研 B 楼",kind:"academic",x:895,y:1314,h:57,aliases:"物质科学教研B楼 物质科研楼 科研楼 B栋",description:"物质科学教研楼群的 B 楼。立面参考实景中的灰白竖向构件和蓝色玻璃。"}
  ];
  const extra = (id,name,kind,description,aliases="",ornament) =>
    landmarks.push({id,name,short:name,kind,description,aliases,ornament,h:ornament ? 4.4 : 2});
  extra("research-a","物质科学教研 A 楼","academic","物质科学教研楼群的 A 楼，位于 B 楼西侧。","物质科学教研A楼 物质科研楼 A栋");
  extra("research-c","物质科学教研 C 楼","academic","物质科学教研楼群的 C 楼，位于 B 楼南侧。","物质科学教研C楼 物质科研楼 C栋");
  extra("old-north","东区老北门","access","樱花大道北端的老校门。","老北门");
  extra("east","东区东门","access","位于校园东北侧、东部生活区旁。","东门");
  extra("small-south","东区小南门","access","位于东区西南侧、太湖路旁。","小南门");
  extra("guo-moruo","郭沫若先生像","landscape","位于一教以南的校园中轴线上。","郭沫若像","statue");
  extra("motto","校训石","landscape","石碑右侧是郭沫若手书的「勤奋学习，红专并进」，旁有署名。","勤奋学习 红专并进 郭沫若题字","stone");
  extra("hua-luogeng","华罗庚像","landscape","位于郭沫若广场西侧一带。","华罗庚","statue");
  extra("guo-yonghuai","郭永怀像","landscape","位于新老图书馆西北侧一带。","郭永怀","statue");
  extra("yang-zhenning","杨振宁像","landscape","位于水上报告厅以南、第二教学楼附近。","杨振宁","statue");
  extra("qian-linzhao","钱临照像","landscape","位于校园中轴东侧。","钱临照","statue");
  extra("zhao-zhongyao","赵忠尧先生像","landscape","位于校园南部实验区。","赵忠尧","statue");
  extra("ox","孺子牛雕塑","landscape","位于东校区中部绿地。","孺子牛","ox");
  extra("cafe","USTC1958 咖啡馆","service","位于一教西南侧，为单层咖啡馆，门外设露天座椅和遮阳伞。","1958 咖啡 东区");
  extra("west-parking","西门停车场","service","位于西门内右侧，向南延伸至学生公寓320号楼前，与公寓前道路之间留有绿化带。","停车场 西门停车 320号楼停车");
  extra("pomegranate","石榴园","landscape","位于一教东侧、玉泉北路旁的园地。");
  extra("activity-square","东活广场","landscape","位于东区学生活动中心旁。","学生活动中心广场");
  extra("activity-food","东区活动中心二楼美食广场","service","从架空大厅任一侧先向外上楼，在转角平台折回向内，到二楼后沿回廊走到正中。两侧楼梯同样通往三楼。","东活二楼 美食广场");
  extra("science-square","理化广场","landscape","位于校园南部理化楼一带。","理化");
  const featureByLandmark = {
    classroom:"way/265575551", library:"way/284161541", "old-library":"way/284161540",
    canteen:"way/284161542", auditorium:"way/267646980", history:"way/271365634",
    "teaching-admin":"way/270537512", fifth:"way/265575547", expert:"way/270537516",
    second:"way/271958257", activity:"way/267624861", hall:"way/271958271",
    physics:"way/270334645", research:"way/686068854", "research-a":"way/686068242", "research-c":"way/686069052",
    lakes:"way/290098995", pavilion:"way/306372994", square:"node/3026612881", sakura:"node/6430329987",
    north:"node/2755623225", west:"way/298813543", south:"node/6430302670",
    "old-north":"node/2705289540", east:"node/3694562293", "small-south":"node/5006731308",
    "guo-moruo":"node/3026612881", motto:"node/10582890764", "hua-luogeng":"node/10582890762",
    "guo-yonghuai":"node/10582890761", "yang-zhenning":"node/10583324104", "qian-linzhao":"node/10582890763",
    ox:"node/10588133339", "zhao-zhongyao":"node/10582890651", cafe:"way/268207470",
    pomegranate:"way/1135310351", "activity-square":"way/298738840", "science-square":"way/1135842416"
  };
  const placesById = new Map(landmarks.map(place => [place.id,place]));
  Object.assign(placesById.get("west-parking"),{x:465,y:799});
  Object.assign(placesById.get("activity-food"),{x:894,y:1023,h:6.8,short:"二楼美食广场"});
  placesById.get("motto").h=4.8;
  const landmarksByFeature = new Map(Object.entries(featureByLandmark)
    .map(([id,feature]) => [feature,placesById.get(id)]));
  for (const place of landmarks) {
    const coords=eastOSM.places[featureByLandmark[place.id]];
    if(coords) [place.x,place.y]=coords;
    if(place.id==="square") place.y+=25;
    if(place.id==="sakura") place.x=639;
  }
  const buildingNumbers = {classroom:201,auditorium:203,second:205,"old-library":207,canteen:208,history:219,hall:331};
  const nameNumbers = {
    "行政楼":218,"档案馆":214,"少年班学院":204,"化学实验楼":345
  };
  const types = {residential:"service",dormitory:"service",apartments:"service",hospital:"service",commercial:"service",retail:"service",garages:"service"};
  const defaultHeights = {residential:15,dormitory:17,apartments:16,university:13,hospital:12,commercial:10,school:9,retail:5,garages:4,grandstand:4};
  const knownLevels = {classroom:4,library:6,"old-library":4,second:8,fifth:5,activity:6};
  const northTowers={"way/270537512":16,"way/270537513":15,"way/270537514":13};
  const schoolNumbers = new Set([320,321,322,323,366,367,229,230,221,215,222,216]);
  const venueIds = new Set(["auditorium","activity","hall","track"]);
  const adminNames = new Set(["教学行政楼","行政楼","档案馆","化学与材料科学学院行政楼"]);
  for (const place of landmarks) {
    if (venueIds.has(place.id)) place.kind="venue";
    if (adminNames.has(place.name)) place.kind="admin";
  }
  const gateWays = new Set(["way/298813543","way/1135310350"]);
  // These three residential footprints are estimated from the supplied campus plan.
  const fifthHousing=[
    [9,poly(907,435,955,432,956,447,908,450)],
    [17,poly(980,435,1029,432,1030,447,981,450)],
    [18,poly(982,479,1042,475,1043,492,983,496)]
  ].map(([number,shape])=>({id:"plan/fifth-housing-"+number,shape,name:number+"#",kind:"residential"}));
  // The campus plan places 7 and 15 immediately south of Fifth Teaching Building.
  const fifthHousingOffsets={
    "way/334120282":{north:42,eastLimit:960},"way/334120281":{north:41},
    "way/334120556":{north:35},"way/334120557":{north:40,westLimit:978}
  };
  const buildings = [...eastOSM.buildings,...fifthHousing].filter(building =>
    !gateWays.has(building.id) && building.id!=="way/1135842417").map((data,i) => {
    let place=landmarksByFeature.get(data.id);
    const landmarkId=place?.id;
    const detail=buildingDetails[data.id];
    const offset=fifthHousingOffsets[data.id];
    const shape=offset ? data.shape.map(([x,y])=>[
      Math.max(offset.westLimit??-Infinity,Math.min(offset.eastLimit??Infinity,x)),y-offset.north
    ]) : data.shape;
    const model="M"+String(i+1).padStart(3,"0");
    const number=detail?.number || buildingNumbers[landmarkId] || nameNumbers[data.name] || Number(data.name.match(/^(\d+)#$/)?.[1]) || undefined;
    const towerLevels=northTowers[data.id];
    const levels=landmarkId==="cafe" ? 1 : data.levels||knownLevels[landmarkId];
    const height=detail?.height??detail?.masses?.reduce((top,part)=>Math.max(top,part.top),detail.baseHeight)??
      (landmarkId==="cafe" ? 4 : (levels||towerLevels) ? (levels||towerLevels)*3.2 : defaultHeights[data.kind]||10)*unit;
    const eastHousing=data.kind==="residential"&&number&&xIsEastern(data.shape);
    const style=detail?.style || (eastHousing ? eastHousingStyles[[78,79,80].includes(number)?3:
      data.shape[0][1]>900?2:data.shape[0][1]>550?1:0] : null) ||
      (landmarkId==="canteen" ? {wall:facadeStyles.classroom.wall,roof:"#b9c2bf",trim:"#d3b09b",glass:"#566f76",bands:true} :
      data.name==="行政楼" ? facadeStyles.history :
      facadeStyles[landmarkId||"osm-"+data.id.split("/")[1]] || (landmarkId?.startsWith("research-") ? facadeStyles.research : null));
    const fallback=number ? (schoolNumbers.has(number) ? "学生公寓" : "")+number+"号楼" : "校园建筑 "+model;
    const name=place?.name || detail?.name || (data.name && !/^\d+#$/.test(data.name) ? data.name : fallback);
    const type=types[data.kind]||(landmarkId==="auditorium"?"accent":"academic");
    const [x,y]=shape.reduce(([a,b],[px,py]) => [a+px/shape.length,b+py/shape.length],[0,0]);
    if (!place && (data.name||detail?.name)) {
      let kind=type==="service"?"service":"academic";
      if (adminNames.has(name)) kind="admin";
      else if (/体育教学部|羽毛球馆/.test(name)) kind="venue";
      else if (schoolNumbers.has(number) || data.kind==="dormitory" || /公寓/.test(name)) kind="dorm";
      else if (data.kind==="residential" && number) kind="housing";
      const fromPlan=data.id.startsWith("plan/");
      place={id:(fromPlan?"":"osm-")+data.id.split("/")[1],name,short:detail?.short||name,kind:detail?.kind||kind,
        searchOnly:!detail&&!fromPlan,aliases:detail?.number ? detail.aliases : [data.name,detail?.aliases].filter(Boolean).join(" "),
        description:detail?.description || (fromPlan ? "楼号与相对位置参考校园平面图，轮廓和高度为估算。" :
          levels ? "OpenStreetMap 记录为 "+levels+" 层。模型高度按楼层估算。" : "建筑轮廓来自 OpenStreetMap，立面与高度为示意。")};
      landmarks.push(place);
    }
    if(place) {place.x=x;place.y=y;place.h=height;}
    return {shape,height,type,towerLevels,entry:detail?.entry,baseHeight:detail?.baseHeight,masses:detail?.masses,
      kind:place?.kind||data.kind,osmKind:data.kind,id:place?.id,osm:data.id,
      model,number,name,short:place?.short||name,x,y,levels,located:!!(place||data.name||number),
      style:style||levels ? {...style,...(levels ? {floors:levels} : {})} : data.id.startsWith("plan/")?fifthHousingStyle:null};
  });
  function xIsEastern(shape) {
    return shape.every(([x])=>x>970);
  }
  function steppedEntrance(building,edge,span,reach,count,rise,center=.5,landingDepth=1.8) {
    const [x,y]=building.shape[edge], [nx,ny]=building.shape[(edge+1)%building.shape.length];
    const dx=nx-x,dy=ny-y,length=Math.hypot(dx,dy);
    const point=(t,d)=>[x+dx*t+dy*d/length,y+dy*t-dx*d/length];
    const footprint=(half,front,back)=>[point(center-half,front),point(center+half,front),point(center+half,back),point(center-half,back)];
    return {edge,center,target:point(center,0),view:point(center,reach+9),
      apron:footprint(span+.055,reach+1.2,0),
      steps:Array.from({length:count},(_,i)=>{
        const tread=(reach-landingDepth)/(count-1);
        const front=reach-i*tread,back=i===count-1?0:front-tread;
        return {shape:footprint(span,front,back),bottom:0,top:(i+1)*rise};
      })};
  }
  const junior=buildings.find(b=>b.osm==="way/1135310337");
  junior.height=buildings.find(b=>b.id==="classroom").height;
  landmarks.find(p=>p.id===junior.id).h=junior.height;
  const juniorEntry=steppedEntrance(junior,12,.17,20.2,15,2.5/15,.585,12.5);
  const expertBuilding=buildings.find(building=>building.id==="expert");
  expertBuilding.shape.splice(4,3);
  expertBuilding.entry={edge:3,center:.29};
  expertBuilding.height+=expertBuilding.style.roofHeadroom;
  landmarks.find(place=>place.id==="expert").h=expertBuilding.height;
  const expertCars=[[726,389.5,"#d7d8d2"],[731,389.5,"#4f5b65"],
    [727,416,"#6c4a46"],[732,416,"#d6d8d5"]];
  const expertTree={x:752,y:398,r:7.6,heightScale:1.15,whiteBase:true};
  const outerPullUpBars=[{x:328,y:887,height:2.55},{x:339,y:883,height:3.05},
    {x:350,y:880,height:3.4},{x:361,y:880,height:2.8},
    {x:372,y:883,height:3.05},{x:383,y:886,height:2.55},
    {x:394,y:889,height:3.4},{x:405,y:891,height:2.8}];
  const pullUpBars=[...outerPullUpBars,...outerPullUpBars.map(bar=>({...bar,y:bar.y+12}))];
  const trackStage={shape:box(272,1006,22,36),top:4.8,
    walls:[box(272,1006,2,36),box(274,1006,19,2),box(274,1040,19,2)],roofHeight:14.5};
  const officeBuilding=buildings.find(b=>b.id==="old-library");
  const officeEntry=steppedEntrance(officeBuilding,2,.18,7,6,.24);
  officeBuilding.firstFloor=officeEntry.steps.at(-1).top;
  officeBuilding.height+=officeBuilding.firstFloor;
  placesById.get("old-library").h=officeBuilding.height;
  const kindergarten={
    sign:{shape:box(1166,667,1.15,10.5),top:3.15},
    signView:[1179,672.25,1167.15,672.25],
    yard:poly(1037,637,1168,632,1172,739,1077,743,1075,714,1040,715),
    courts:[box(1093,636,39,23),box(1048,688,26,22),box(1146,697,19,35)],
    paths:[[[1138.36,684.91],[1136.06,660.78],[1129,659]],[[1138.36,684.91],[1143,696],[1155,697]],
      [[1080,682],[1077,697],[1080,713],[1080,738]]],
    eastFence:[[1168,632],[1170,678],[1170.3,689],[1172,739]],
    playEquipment:[{shape:box(1102,643,7.8,4.4),top:3.3},{shape:box(1151,714,6,5),top:2.65}]
  };
  const hallFront={edge:2,center:.5,point:[568.205,1370.015],apron:poly(568,1348,584,1348,587,1394,570,1394)};
  const hallStepPoint=(t,reach)=>[569.39-2.37*t+reach,1397.95-55.87*t-reach*.0424];
  hallFront.steps=Array.from({length:5},(_,i)=>{
    const reach=6-i*.95, next=i===4?0:reach-.95;
    return {shape:[hallStepPoint(.18,reach),hallStepPoint(.82,reach),hallStepPoint(.82,next),hallStepPoint(.18,next)],
      bottom:0,top:(i+1)*.24};
  });
  const researchBuilding=buildings.find(b=>b.osm==="way/267646979");
  landmarks.push({id:"network-center",name:"网络中心",short:"网络中心",kind:"academic",x:1080,y:326,h:researchBuilding.height,
    aliases:"网络中心 科研楼",description:"按校园平面图标在科研楼南侧相连的区域。"});
  const hallParking={outline:box(607,1365,76,28),rows:[{x:610,y:1366,count:14},{x:610,y:1384,count:14}],
    entrance:[[590.2,1385],[607,1385]]};
  landmarks.push({id:"hall-parking",name:"大礼堂旁停车场",short:"礼堂停车场",kind:"service",x:646,y:1379,h:.1,
    aliases:"大礼堂停车场",description:"位于大礼堂东侧，停车位与入口按校园平面图布置。"});
  const bikeShelter={
    shape:box(816,366,34,10.5), apron:box(813,363,42,21),
    path:[[854,377],[868,377],[886.8,377]],
    bikes:[368.42,374.08].flatMap((y,row)=>Array.from({length:8},(_,i)=>({
      x:818.8+i*4.05+row*.46,y,direction:row===0?-1:1,basket:(i+row)%4===1,
      color:["#4d6872","#b58132","#5b6b65","#a75951","#6d7e89","#3f6263"][(i+row*2)%6]
    }))),
    posts:[817,827.6,838.4,849].map(x=>({shape:box(x-.14,371.11,.28,.28),top:4.76}))
  };
  const fifthForecourt=poly(888.55,316.71,898.96,322.52,889.5,341.3,874.5,338.2);
  landmarks.push({id:"fifth-bike-shelter",name:"五教自行车棚",short:"自行车棚",kind:"service",x:833,y:372,h:4.85,
    aliases:"五教 停车棚 自行车",description:"五教西南侧、专家公寓2号楼北侧的自行车停放区，步道向东接石榴园路。"});
  const shelterCeiling=4.92;
  const busDepot={
    ceiling:shelterCeiling,
    signCenter:[529.21,650.6,4.224],
    yard:poly(487,578,507,578,510,624,489,627),
    buses:[491.8,497.8,503.8].map(x=>({x,y:609,shape:box(x-1.8,601,3.6,16),top:4.55})),
    shelter:buildings.find(building=>building.id==="osm-306371643"),
    supports:[617,630,644,658].map(y=>({shape:box(528.2,y,.42,.42),top:shelterCeiling})),
    backWall:{shape:box(522.3,614.5,.57,48),top:shelterCeiling}
  };
  busDepot.shelter.shape=box(522,614,7.2,49);
  const shelterCenter={x:525.6,y:638.5};
  Object.assign(busDepot.shelter,shelterCenter);
  Object.assign(landmarks.find(place=>place.id===busDepot.shelter.id),shelterCenter);
  const libraryShape=buildings.find(building=>building.id==="library").shape;
  const libraryFront={edge:libraryShape.findIndex(([x,y])=>x===690.86&&y===947.67),span:.465,stairGap:.14};
  const doorEdge=libraryShape[libraryFront.edge], doorEnd=libraryShape[libraryFront.edge+1];
  const doorLength=Math.hypot(doorEnd[0]-doorEdge[0],doorEnd[1]-doorEdge[1]);
  const doorPoint=(t,reach)=>[
    doorEdge[0]+(doorEnd[0]-doorEdge[0])*t+(doorEnd[1]-doorEdge[1])*reach/doorLength,
    doorEdge[1]+(doorEnd[1]-doorEdge[1])*t+(doorEdge[0]-doorEnd[0])*reach/doorLength
  ];
  libraryFront.steps=[[-.79,-libraryFront.stairGap],[libraryFront.stairGap,.79]].flatMap(([left,right])=>{
    const l=.5+libraryFront.span*left,r=.5+libraryFront.span*right;
    return Array.from({length:8},(_,i)=>{
      const reach=11-i*1.12, top=(i+1)*.315;
      const nextReach=i===7?0:reach-1.12;
      const shape=[doorPoint(l,reach),doorPoint(r,reach),doorPoint(r,nextReach),doorPoint(l,nextReach)];
      return {shape,bottom:0,top};
    });
  });
  const sportCourts=[
    ...[[320,1162],[346,1162],[328,1220],[369,1218],[412,1216]].map(([x,y])=>
      ({x,y,w:23,d:42,kind:"basketball"})),
    ...[[443,1184],[468,1184],[443,1230],[468,1230]].map(([x,y])=>({x,y,w:21,d:39,kind:"tennis"}))
  ].map(court=>({...court,shape:box(court.x,court.y,court.w,court.d)}));
  landmarks.push(
    {id:"south-basketball",name:"东区篮球场",short:"篮球场",kind:"venue",x:348,y:1232,h:.1,
      aliases:"篮球 运动场",description:"运动场南侧、网球场以西的室外篮球场。"},
    {id:"south-tennis",name:"东区网球场",short:"网球场",kind:"venue",x:466,y:1226,h:.1,
      aliases:"网球 国际学院",description:"国际学院与学生服务中心西侧的室外网球场。"}
  );
  const secondBuilding=buildings.find(building=>building.id==="second");
  const clipSecond=(shape,boundary)=>shape.flatMap((a,i)=>{
    const b=shape[(i+1)%shape.length], da=boundary(a),db=boundary(b);
    const points=da<=0?[a]:[];
    if(da*db<0) points.push(a.map((v,j)=>v+(b[j]-v)*da/(da-db)));
    return points;
  });
  const secondUpper=clipSecond(clipSecond(secondBuilding.shape,([,y])=>y-781.5),([x])=>818.5-x);
  const mainStyle={...secondBuilding.style,wall:"#f0f0eb",roof:"#f0f0eb",trim:"#faf9f3",base:"#f0f0eb",
    glass:"#4b606b",accent:undefined,floors:6,roofEquipment:false};
  secondBuilding.baseHeight=2*3.2*unit;
  secondBuilding.masses=[{shape:secondUpper,top:secondBuilding.height,style:mainStyle}];
  secondBuilding.style={...mainStyle,glass:"#64808c",floors:2};
  const activityBuilding=buildings.find(building=>building.id==="activity");
  activityBuilding.shape=poly(847,1004,854,1004,853,983,931.5,978,936,1062,855,1067,853,1046,848,1046);
  // Limit the expansion beside fixed footprints without narrowing the original access.
  const sideOf=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  for(const road of roads) {
    const verge=road.sidewalk||0;
    for(let i=1;i<road.points.length&&road.width>road.previousWidth;i++) {
      const a=road.points[i-1],b=road.points[i];
      const reach=road.width/2+verge;
      for(const {shape} of buildings) {
        if(shape.every(([x])=>x<Math.min(a[0],b[0])-reach)||
          shape.every(([x])=>x>Math.max(a[0],b[0])+reach)||
          shape.every(([,y])=>y<Math.min(a[1],b[1])-reach)||
          shape.every(([,y])=>y>Math.max(a[1],b[1])+reach)) continue;
        let clearance=contains(shape,...a)||contains(shape,...b)?0:reach;
        for(let j=0;j<shape.length;j++) {
          const p=shape[j],q=shape[(j+1)%shape.length];
          if(sideOf(a,b,p)*sideOf(a,b,q)<0&&sideOf(p,q,a)*sideOf(p,q,b)<0) {
            clearance=0;
            break;
          }
          clearance=Math.min(clearance,segmentDistance(...p,a,b),
            segmentDistance(...a,p,q),segmentDistance(...b,p,q));
        }
        road.width=Math.max(road.previousWidth,Math.min(road.width,(clearance-verge)*2));
      }
    }
  }
  // These cuts follow the modeled road edges. Apply them after
  // fixing road widths so the setback is measured from the displayed sidewalk.
  const setbacks=[
    ["way/270048432","way/1135310346",[0]], // M015
    ["way/271365631","way/265032054",[1]],  // M026
    ["way/290097996","way/265033438",[0]],  // M047
    ["way/290097997","way/265033438",[0]],  // M048
    ["way/298741849","way/268206609",[3]],  // M052
    ["way/298741850","way/268206609",[4,5]], // M053
    ["way/298741850","way/306372992",[2]],  // M053, south side
    ["way/334120556","way/298742074",[4]],  // M067
    ["way/334120556","way/306496879",[0]],  // M067, north side
    ["way/334120557","way/298742074",[4]],  // M068
    ["way/1135360088","宿松路",[0]]         // M135
  ];
  for(const [osm,roadId,segments] of setbacks) {
    const building=buildings.find(candidate=>candidate.osm===osm);
    const road=roadId==="宿松路" ? surroundingRoads.find(candidate=>
      candidate.name===roadId&&candidate.points[0][0]===1194.68&&candidate.points[0][1]===816.96) :
      roads.find(candidate=>candidate.id===roadId);
    if (!building || !road) continue;
    let shape=building.shape;
    for(const segment of segments) {
      const a=road.points[segment],b=road.points[segment+1];
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const direction=Math.sign(sideOf(a,b,[building.x,building.y]));
      const clearance=road.width/2+(road.sidewalk||0)+unit;
      const margin=p=>direction*sideOf(a,b,p)/length-clearance;
      shape=shape.flatMap((p,i,ring)=>{
        const q=ring[(i+1)%ring.length],d=margin(p),e=margin(q);
        const points=d>=0?[p]:[];
        if(d*e<0) points.push(p.map((value,k)=>value+(q[k]-value)*d/(d-e)));
        return points;
      });
    }
    if(shape.length<3) continue;
    building.shape=shape;
    [building.x,building.y]=shape.reduce(([x,y],[px,py])=>[x+px/shape.length,y+py/shape.length],[0,0]);
    const place=placesById.get(building.id)||landmarks.find(place=>place.id===building.id);
    if(place) Object.assign(place,{x:building.x,y:building.y});
  }
  const activityCenterY=1023;
  const galleryLevels=[4.6,9.05];
  const galleryX=888, wallX=894;
  const stairX=872, returnX=877, stairWidth=4.6, landingDepth=5.2;
  const landingEnds=[activityCenterY-14,activityCenterY+14];
  const activityStairs=[];
  const activityRails=[];
  const turnLandings=[];
  function addFlight(x,start,end,from,to) {
    const count=10, depth=(end-start)/count;
    const steps=Array.from({length:count},(_,i)=>{
      const a=start+depth*i,b=i===count-1?end:start+depth*(i+1);
      const top=i===count-1?to:from+(to-from)*(i+1)/count;
      return {shape:box(x,Math.min(a,b),stairWidth,Math.abs(a-b)),bottom:Math.max(0,top-.5),top};
    });
    activityStairs.push({shape:box(x,Math.min(start,end),stairWidth,Math.abs(end-start)),steps});
    for(const edge of [x,x+stairWidth]) activityRails.push([[edge,start,from],[edge,end,to]]);
  }
  for (const [i,inner] of landingEnds.entries()) {
    const side=i===0?-1:1, outer=inner+10*side, edge=outer+4.8*side;
    for(const [level,top] of galleryLevels.entries()) {
      const base=level===0?0:galleryLevels[level-1], halfway=(base+top)/2;
      addFlight(stairX,inner,outer,base,halfway);
      addFlight(returnX,outer,inner,halfway,top);
      turnLandings.push({shape:box(stairX,Math.min(outer,edge),returnX+stairWidth-stairX,4.8),
        bottom:halfway-.48,top:halfway,rail:[
          [[stairX,edge],[returnX+stairWidth,edge]],[[stairX,outer],[stairX,edge]],
          [[returnX+stairWidth,outer],[returnX+stairWidth,edge]]
        ]});
    }
  }
  const researchLinks=[
    {shape:poly(883,1334,939,1331,943,1390,886,1394),bottom:0,top:10.8},
    {shape:poly(825,1326,875,1330,876,1340,825,1335),bottom:14,top:19.2},
    {shape:poly(904,1335,914,1334,919,1392,909,1393),bottom:14,top:19.2}
  ];
  const activityModel={
    upper:{shape:activityBuilding.shape,bottom:14.3,top:activityBuilding.height+3.2},
    apron:poly(832,992,933,979,938,1061,830,1070),
    columns:[[850,1005,3.35,3.2],[851.5,1038,3.35,3.2],[854,988,2.5,2.6],[857,1055,2.6,2.4],
      [882,984,2.4,2.6],[882,1058,2.4,2.5]].map(([x,y,w,d])=>({shape:box(x,y,w,d),top:14.3})),
    core:{shape:poly(wallX,988,931.6,988,935.1,1058,wallX,1058),top:14.3},
    decks:[...turnLandings,...galleryLevels.flatMap((top,level)=>[
      ...(level===0?[{shape:box(galleryX,997,wallX-galleryX,52),rail:[...[[997,landingEnds[0]],
        [landingEnds[0]+landingDepth,landingEnds[1]-landingDepth],[landingEnds[1],1049]]
        .map(([a,b])=>[[galleryX,a],[galleryX,b]]),[[galleryX,997],[wallX,997]],[[galleryX,1049],[wallX,1049]]]}]:[]),
      ...landingEnds.map((end,i)=>{
        const y=i===0?end:end-landingDepth, inside=i===0?end+landingDepth:y;
        return {shape:box(stairX,y,galleryX-stairX,landingDepth),rail:[
          [[stairX,inside],[galleryX,inside]],[[stairX,end],[stairX,inside]],[[returnX+stairWidth,end],[galleryX,end]],
          ...(level===0?[]:[[[galleryX,y],[galleryX,y+landingDepth]]])
        ]};
      })
    ].map(deck=>({...deck,bottom:top-.62,top})))],
    stairs:activityStairs,rails:activityRails
  };
  for(const {top,rail} of activityModel.decks) for(const [a,b] of rail) activityRails.push([[...a,top],[...b,top]]);
  const northEntry=placesById.get("north");
  const northStone=box(northEntry.x-34,northEntry.y+1.7,18.75,6.9);
  const northStoneTop=7.12;
  const northBarrier=box(northEntry.x+5.8,northEntry.y-.9,1.1,1.8);
  const northParking={
    outline:box(668,244,83,43),
    entrance:[[750,265.8],[784.31,265.92]],
    rows:[{x:672,y:247,count:15},{x:672,y:276,count:15}]
  };
  landmarks.push({id:"north-parking",name:"北门停车场",short:"北门停车场",kind:"service",x:708,y:265,h:.1,
    aliases:"北门停车 校名石停车场",description:"位于北门校名石西南侧，出入口接北门内道路。"});
  const trees = [];
  let seed = 1960;
  const random = () => (seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 4294967296;
  function avenue(x1,y1,x2,y2,count) {
    for(let i=0;i<count;i++) {
      const t = (i+.4)/count;
      trees.push({x:x1+(x2-x1)*t+(random()-.5)*6,y:y1+(y2-y1)*t+(random()-.5)*8,r:5+random()*5});
    }
  }
  avenue(575,706,583,824,9);
  avenue(733,695,745,822,9);
  avenue(603,989,615,1160,12);
  avenue(262,1085,331,843,13);
  avenue(433,916,443,1130,12);
  avenue(646,282,741,262,8);
  avenue(477,565,597,366,13);
  avenue(330,1439,455,1432,9);
  avenue(788,579,888,568,8);
  avenue(778,653,893,647,8);
  avenue(867,1504,871,1578,7);
  avenue(866,1372,839,1339,5);
  avenue(161,1493,208,1307,10);
  avenue(592,980,737,977,9);
  avenue(980,1353,990,1458,8);
  trees.push(
    {x:599,y:579,r:9,evergreen:true},{x:614,y:570,r:10,evergreen:true},
    {x:704,y:581,r:9,evergreen:true},{x:724,y:576,r:8,evergreen:true},
    {x:602,y:681,r:9,evergreen:true},{x:696,y:685,r:9,evergreen:true},
    {x:752,y:1069,r:10,evergreen:true},{x:784,y:1064,r:9,evergreen:true}
  );
  const cherryWalk = [[631.77,346.51],[634.06,375.74],[642.10,483.87],[647.76,559.32]];
  const pavilionWalk = [[679.49,436.66],[687.83,438.91],[691,441.79],[696.69,443.13],[700.12,446.63],[700.66,455.80]];
  const square = poly(585,704,732,695,737,813,590,819);
  const squarePoint=(u,v)=>[656.82+u+v*.075,690+v];
  const squareBox=(u,v,w,d)=>box(u,v,w,d).map(([a,b])=>squarePoint(a,b));
  const stepDiameter=112;
  const squareScene={
    corridor:squareBox(-13,6,26,122),
    lawns:[squareBox(-43,16,28,94),squareBox(15,12,34,104)],
    pool:squareBox(-5,22,10,25),
    planter:squareBox(-4,57,8,33),
    patio:box(580,707.2,28,9.15),
    terraceTables:[[585,712],[593,712.6],[602,711.5]],
    steps:[12,10.5,9].map(r=>Array.from({length:14},(_,i)=>{
      const a=i*Math.PI/13;
      return squarePoint(r*Math.cos(a),stepDiameter+r*Math.sin(a)*.75);
    })),
    flagpoles:[-3.5,0,3.5].map(u=>squarePoint(u,stepDiameter)),
    shrubs:[[-21,22],[-21,32],[-21,40],[-21,48],[-21,59],[-21,71],[-21,81],[-21,94],[-21,103],
      [19,26],[20,33],[21,41],[21,49],[32,60],[32,72],[32,84],[20,97],[20,105]]
      .map(([u,v])=>squarePoint(u,v))
  };
  const parking={
    outline:poly(407,786,520,784,527,816,533,873,536,908,473,912,466,903,449,893,424,885,410,881,405,859,405,815),
    lawn:poly(399,773,543,770,551,822,520,830,468,831,408,830,399,815),
    entrances:[box(459,767.5,8,21),box(520,800,35,8)],
    rows:[{x:415,y:787,count:20},{x:414,y:802,count:21},{x:421,y:817,count:19},
      {x:417,y:842,count:22},{x:419,y:865,count:22},{x:456,y:888,count:15}],
    cars:[[417.5,791,"#d3d7d5"],[432.5,791,"#536472"],[452.5,791,"#a55d51"],[482.5,791,"#d8d7cd"],
      [507.5,791,"#58615e"],[502.5,791,"#b9bfc4"],[421.5,806,"#484b4f"],[446.5,806,"#d9d9d3"],
      [481.5,806,"#697b83"],[516.5,806,"#95594a"],[433.5,821,"#d8d6cb"],[468.5,821,"#4b5d65"],
      [429.5,846,"#7a8687"],[484.5,846,"#d2d5d1"],[511.5,869,"#9c6355"],[488.5,892,"#505d65"]]
  };
  lawns.push(poly(382,797,406,805,410,883,387,885),
    poly(412,884,449,892,472,910,552,904,557,926,470,936,438,920,409,906),
    poly(520,785,543,780,551,812,575,809,599,826,609,873,606,910,586,921,535,913,532,874,526,816));
  const teachingForecourt = poly(617,560,687,555,690,580,620,585);
  // The buried way joins the cut-off road north of the west gate to Science Avenue.
  const tunnel={half:8.1*1.1,depth:7,ceiling:-.56,fenceTop:1.36};
  const junction=roads.find(road=>road.id==="way/265032056").points[0];
  const nextCrossing=roads.find(road=>road.id==="way/265032055").points[1];
  const crossingLength=Math.hypot(nextCrossing[0]-junction[0],nextCrossing[1]-junction[1]);
  const eastMouth=eastOSM.westUnderpass[0];
  // A straight, flared approach keeps both sides of the opening in sight from the junction.
  const approachStations=[0,.14,.36,.64,.84,1];
  const eastApproach=approachStations.map(t=>junction.map((v,i)=>v+(eastMouth[i]-v)*t));
  const route=[...eastApproach,...eastOSM.westUnderpass.slice(1),[154,661.52]];
  const eastPortal=eastApproach.length-1;
  const westPortal=route.length-3;
  const descentStart=1;
  const distances=[0];
  for(let i=1;i<route.length;i++) distances.push(distances[i-1]+Math.hypot(
    route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]));
  const normals=route.slice(1).map(([x,y],i)=>{
    const [a,b]=route[i], length=Math.hypot(x-a,y-b);
    return [-(y-b)/length,(x-a)/length];
  });
  const sections=route.map(([x,y],i)=>{
    const last=route.length-1;
    const a=normals[Math.max(0,i-1)], b=normals[Math.min(last-1,i)];
    const n=a.map((v,j)=>(v+b[j])/(1+a[0]*b[0]+a[1]*b[1]));
    const eastGrade=Math.max(0,(distances[i]-distances[descentStart])/(distances[eastPortal]-distances[descentStart]));
    const grade=Math.min(1,eastGrade,
      (distances[last]-distances[i])/(distances[last]-distances[westPortal]));
    const half=tunnel.half+([13.5,4.5,2.3,1.2,.4][i]||0);
    const edgeNormal=i===0?junction.map((v,j)=>(v-nextCrossing[j])/crossingLength):n;
    return {point:[x,y],z:-tunnel.depth*grade,portal:i===eastPortal||i===westPortal,
      edges:[-1,1].map(side=>[x+side*edgeNormal[0]*half,y+side*edgeNormal[1]*half])};
  });
  tunnel.segments=sections.slice(1).map((b,i)=>{
    const a=sections[i];
    return {a,b,covered:i>=eastPortal&&i<westPortal,shape:[a.edges[0],a.edges[1],b.edges[1],b.edges[0]]};
  });
  tunnel.apron=tunnel.segments[0].shape;
  const mouthEdge=tunnel.segments[0].a.edges;
  const mouthDirection=eastMouth.map((v,i)=>v-junction[i]);
  const mouthLength=Math.hypot(...mouthDirection);
  const offsetMouth=(point,distance)=>point.map((v,i)=>v+mouthDirection[i]*distance/mouthLength);
  tunnel.roadJoin=[offsetMouth(mouthEdge[0],-1.25),offsetMouth(mouthEdge[1],-1.25),
    offsetMouth(mouthEdge[1],1.25),offsetMouth(mouthEdge[0],1.25)];
  tunnel.portalLawn=tunnel.segments[eastPortal].shape;
  const entry=tunnel.segments[0];
  tunnel.apronFences=entry.a.edges.map((point,i)=>{
    const end=entry.b.edges[i];
    return [point.map((v,j)=>v+(end[j]-v)*.38),end];
  });
  tunnel.portalGuard=sections[eastPortal].edges.map(([x,y])=>[x+.52,y]);
  tunnel.ramps=tunnel.segments.slice(1).filter(segment=>!segment.covered);
  tunnel.eastView={position:junction.map((v,i)=>v+(v-eastMouth[i])*.035),target:eastMouth};
  const exit=tunnel.segments.at(-1).b;
  tunnel.westApproach=[...exit.edges.map(([x,y])=>[x+1.25,y]),[125,exit.edges[1][1]],[125,exit.edges[0][1]]];
  landmarks.push({id:"west-underpass",name:"金寨路地下通道",short:"地下通道",kind:"road",
    x:525,y:685,h:.2,featured:true,aliases:"西门 下穿通道 科学大道 郭沫若路 勤奋路",
    description:"从郭沫若路与勤奋路的十字路口向西下坡，经金寨路下方通往科学大道。"});
  function tunnelAt(x,y) {
    for(const {a,b,covered,shape} of tunnel.segments) {
      if (!contains(shape,x,y)) continue;
      if (covered) return {floor:a.z,ceiling:tunnel.ceiling};
      const [px,py]=nearestPoint(x,y,a.point,b.point);
      const t=Math.hypot(px-a.point[0],py-a.point[1])/Math.hypot(b.point[0]-a.point[0],b.point[1]-a.point[1]);
      return {floor:a.z+(b.z-a.z)*t,ceiling:Infinity};
    }
    return null;
  }
  const westGate = placesById.get("west");
  const westApron = poly(-19,-5,-8,-9.05,5.5,-9.05,12,-5.2,25,-2,25,9.5,16,10.5,5.5,10.5,-8,9.05,-19,5)
    .map(([x,y])=>[westGate.x+x,westGate.y+y]);
  const ornaments = landmarks.filter(place => place.ornament);
  const ornamentObstacles = ornaments.map(({id,x,y,ornament})=>({
    id,
    shape:ornament==="ox" ? box(x-3.8,y-1.9,7.6,3.8) : ornament==="stone" ? box(x-1.05,y-4.6,2.1,9.2) : box(x-.92,y-.8,1.84,1.6),
    top:ornament==="stone" ? 4.8 : ornament==="ox" ? 3 : 3.97
  }));
  const pavilion = placesById.get("pavilion");
  const labeledRoads = ["中直路","红专路","孺子牛路","郭沫若路","理化路","东升路"]
    .map(name => roadsByName.get(name)).filter(Boolean);
  const streetSegments = surroundingRoads.flatMap(road => road.points.slice(1).map((point,i) =>
    ({name:road.name,width:road.width,a:road.points[i],b:point})));
  const streetNames = [
    ["金寨路",304,793,"东区西侧的城市道路，靠近西大门。"],
    ["黄山路",762,189,"东区北侧的城市道路，靠近北门。"],
    ["太湖路",690,1618,"东区南侧的城市道路，靠近东南门和小南门。"],
    ["宿松路",1193,834,"东区东侧的城市道路，靠近东门。"]
  ];
  function nearestPoint(x,y,a,b) {
    const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
    const t=length ? Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)) : 0;
    return [a[0]+t*dx,a[1]+t*dy];
  }
  function segmentDistance(x,y,a,b) {
    const [px,py]=nearestPoint(x,y,a,b);
    return Math.hypot(x-px,y-py);
  }
  function nearestStreet(x,y,name) {
    let best;
    for (const {name:street,width,a,b} of streetSegments) {
      if (name && name!==street) continue;
      const point=nearestPoint(x,y,a,b);
      const distance=Math.hypot(x-point[0],y-point[1]);
      if (!best || distance<best.distance) {
        best={name:street,point,distance,width,yaw:Math.atan2(b[0]-a[0],a[1]-b[1])};
      }
    }
    return best;
  }
  const approaches = [
    ["west","金寨路"],["north","黄山路"],["south","太湖路"],["small-south","太湖路"],["east","宿松路"]
  ].flatMap(([id,name]) => {
    const gate=placesById.get(id), {x,y}=gate;
    if (id==="west") {
      const crossings=streetSegments.filter(({name:street,a,b})=>street===name && (a[1]<=y)!==(b[1]<=y))
        .map(({a,b})=>a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1])).filter(px=>px<x);
      if (crossings.length) return [{points:[[x,y],[Math.max(...crossings),y]],width:12,name,asphalt:true}];
    }
    const street=nearestStreet(x,y,name);
    if (!street) return [];
    return [{points:[[x,y],street.point],width:9.6,name,asphalt:true}];
  });
  const pavedRoads = [
    {points:northParking.entrance,width:9,asphalt:true},
    ...kindergarten.paths.map(points=>({points,width:2.8})),
    {points:hallParking.entrance,width:6,asphalt:true},
    ...roads.filter(road=>!road.asphalt),...southPaths.map(points=>({points,width:3.5})),
    {points:bikeShelter.path,width:12.6,asphalt:true},...surroundingRoads,...approaches,
    ...roads.filter(road=>road.asphalt),{points:cherryWalk,width:11.5,asphalt:true}
  ];
  const roadSurfaces = {sidewalk:[],paving:[],asphalt:[]};
  const sidewalks=pavedRoads.filter(road=>road.sidewalk).map(({points,width,sidewalk})=>({
    points,width:width+2*sidewalk,sidewalk:true
  }));
  const roadNodes = new Map();
  const bendPatches=[];
  for (const {points,width,asphalt,sidewalk} of [...sidewalks,...pavedRoads.map(({sidewalk,...road})=>road)]) {
    const surface=sidewalk?roadSurfaces.sidewalk:asphalt?roadSurfaces.asphalt:roadSurfaces.paving, half=width/2;
    for (let i=1;i<points.length;i++) {
      const a=points[i-1], b=points[i];
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if (length<.001) continue;
      const dx=(b[0]-a[0])/length, dy=(b[1]-a[1])/length;
      const nx=-dy*half, ny=dx*half;
      surface.push([[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]]);
      for (const [point,tx,ty] of [[a,dx,dy],[b,-dx,-dy]]) {
        const key=[sidewalk,asphalt,width,...point].join(",");
        if (!roadNodes.has(key)) roadNodes.set(key,{point,surface,half,directions:[]});
        const {directions}=roadNodes.get(key);
        if (!directions.some(([ux,uy])=>ux*tx+uy*ty>.99999)) directions.push([tx,ty]);
      }
    }
  }
  // Fill bends between two segments of equal width, keeping terminal cuts flat.
  for (const {point:[x,y],surface,half,directions} of roadNodes.values()) {
    if (directions.length!==2) continue;
    const [[ax,ay],[bx,by]]=directions, turn=ax*by-ay*bx;
    if (Math.abs(turn)<.001) continue;
    const sign=Math.sign(turn);
    const ux=ay*sign, uy=-ax*sign, vx=-by*sign, vy=bx*sign;
    const a=[x+ux*half,y+uy*half], b=[x+vx*half,y+vy*half];
    const miter=half/(1+ux*vx+uy*vy), tip=[x+(ux+vx)*miter,y+(uy+vy)*miter];
    const patch=Math.hypot(tip[0]-x,tip[1]-y)<=2*half ? [[x,y],a,tip,b] : [[x,y],a,b];
    const shape=turn>0?patch.reverse():patch;
    surface.push(shape);
    bendPatches.push(shape);
  }
  roadSurfaces.asphalt.push(westApron,teachingForecourt,parking.outline,...parking.entrances);
  roadSurfaces.asphalt.push(tunnel.apron,tunnel.roadJoin,tunnel.westApproach);
  roadSurfaces.asphalt.push(bikeShelter.apron);
  roadSurfaces.asphalt.push(hallParking.outline,northParking.outline);
  roadSurfaces.paving.push(...kindergarten.courts,hallFront.apron,juniorEntry.apron,officeEntry.apron);
  roadSurfaces.paving.push(scienceForecourt,busDepot.yard,fifthForecourt);
  const vergeSegments = [...pavedRoads,...sidewalks,{points:pavilionWalk,width:6}].flatMap(({points,width})=>
    points.slice(1).map((b,i)=>({a:points[i],b,half:width/2})));
  const extraPaving=[...bendPatches,...tunnel.ramps.map(ramp=>ramp.shape),tunnel.apron,tunnel.roadJoin,tunnel.westApproach,
    scienceForecourt,busDepot.yard,bikeShelter.apron,fifthForecourt,hallParking.outline,northParking.outline,hallFront.apron,juniorEntry.apron,officeEntry.apron,...kindergarten.courts].map(shape=>({
    shape,left:Math.min(...shape.map(p=>p[0])),right:Math.max(...shape.map(p=>p[0])),
    top:Math.min(...shape.map(p=>p[1])),bottom:Math.max(...shape.map(p=>p[1]))
  }));
  squareScene.shrubs=squareScene.shrubs.filter(([x,y])=>!isPaved(x,y,1.75));
  const contextBuildings = (eastOSM.contextBuildings||[]).filter(({shape})=>
    !shape.some(([x,y])=>isPaved(x,y)) && !surroundingRoads.some(({points:[a,b]})=>
      contains(shape,...a)||contains(shape,...b))).map(({shape,kind,levels})=>({
    shape,kind,top:(levels ? levels*3.2 : defaultHeights[kind]||8)*unit
  }));
  const streetPlaces = streetNames.flatMap(([name,x,y,description],i) => {
    const street=nearestStreet(x,y,name);
    if (!street) return [];
    return [{id:"street-"+i,name,short:name,kind:"road",h:.15,x:street.point[0],y:street.point[1],description,featured:true}];
  });
  const innerRoadPlaces = labeledRoads.map(({name,points},i) => {
    const [x,y]=points[Math.floor(points.length/2)];
    return {id:"road-"+i,name,short:name,kind:"road",h:.15,x,y,description:"东校区校内道路。"};
  });
  landmarks.push(...streetPlaces,...innerRoadPlaces);
  function contains(shape,x,y) {
    let inside=false;
    for(let i=0,j=shape.length-1;i<shape.length;j=i++) {
      const [xi,yi]=shape[i], [xj,yj]=shape[j];
      if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
    }
    return inside;
  }
  function canRoam(x,y) {
    if (tunnelAt(x,y) || contains(tunnel.westApproach,x,y)) return true;
    if (contains(outline,x,y)) return true;
    const fromCampus=Math.min(...outline.map((point,i) => segmentDistance(x,y,point,outline[(i+1)%outline.length])));
    if (fromCampus<=13) return true;
    if (fromCampus>105) return false;
    if (approaches.some(({points:[a,b]}) => segmentDistance(x,y,a,b)<=11)) return true;
    const street=nearestStreet(x,y);
    return !!street && street.distance<=street.width/2+15;
  }
  const {x:mottoX,y:mottoY}=placesById.get("motto");
  const mottoClearing=box(mottoX-15,mottoY-5.8,17,11.6);
  const oldLibrary=buildings.find(b=>b.id==="old-library").shape;
  const libraryEntryClearing=box(668.5,948,25.5,30);
  const noPlantAreas = [...waters,...plazas,...tunnel.ramps.map(ramp=>ramp.shape),squareScene.corridor,squareScene.patio,mottoClearing,westApron,teachingForecourt,libraryEntryClearing,
    ...parking.entrances,parking.outline,northStone,northBarrier,activityModel.apron,trackShape(0),
    ...pullUpBars.map(({x,y})=>box(x-4,y-4,8,12)),
    ...sportCourts.map(({shape})=>shape),...ornamentObstacles.map(({shape})=>shape),...buildings.map(building => building.shape)];
  function isPaved(x,y,clearance=0) {
    const nearPaving=shape=>contains(shape,x,y)||shape.some((a,i)=>
      segmentDistance(x,y,a,shape[(i+1)%shape.length])<clearance);
    // At the portal the surface road ends with a flat edge. Its centreline buffer
    // would otherwise extend beyond the pavement into the lawn over the tunnel.
    const onRoad=contains(tunnel.portalLawn,x,y)
      ? Object.values(roadSurfaces).some(shapes=>shapes.some(nearPaving))
      : vergeSegments.some(({a,b,half})=>segmentDistance(x,y,a,b)<half+clearance);
    return onRoad
      || extraPaving.some(({shape,left,right,top,bottom})=>
        x>=left-clearance&&x<=right+clearance&&y>=top-clearance&&y<=bottom+clearance &&
        nearPaving(shape));
  }
  function hasGroundClearance(x,y,clearance) {
    return contains(outline,x,y) && !isPaved(x,y,clearance)
      && !noPlantAreas.some(shape => contains(shape,x,y) || shape.some((a,i) =>
        segmentDistance(x,y,a,shape[(i+1)%shape.length])<clearance));
  }
  const signJunctions = new Map();
  for (const {name,points} of roads) {
    if (!name) continue;
    points.forEach((point,i)=>{
      const key=point.join(",");
      if (!signJunctions.has(key)) signJunctions.set(key,{point,directions:new Map()});
      const {directions}=signJunctions.get(key);
      if (directions.has(name)) return;
      const [a,b]=[points[Math.max(0,i-1)],points[Math.min(i+1,points.length-1)]];
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      if (length>.01) directions.set(name,{name,dx:dx/length,dy:dy/length});
    });
  }
  const roadSigns=[];
  for (const {point:[x,y],directions} of signJunctions.values()) {
    const centerOfRedWalk=x===666.47 && directions.has("红专路");
    if (directions.size<2 && !centerOfRedWalk) continue;
    for(const radius of [7.5,10,13,16,19]) {
      const candidate=Array.from({length:8},(_,i)=>{
        const angle=Math.PI/8+i*Math.PI/4;
        return [x+radius*Math.cos(angle),y+radius*Math.sin(angle)];
      }).find(([px,py])=>hasGroundClearance(px,py,1.7));
      if (!candidate) continue;
      const [px,py]=candidate;
      roadSigns.push({x:px,y:py,blades:[...directions.values()].slice(0,3)});
      break;
    }
  }
  function canPlant({x,y,r}) {
    return hasGroundClearance(x,y,r*.30+.55)
      && ![juniorEntry,officeEntry].some(({apron})=>apron.some((p,i)=>segmentDistance(x,y,p,apron[(i+1)%apron.length])<r*.72))
      && !oldLibrary.some((a,i)=>segmentDistance(x,y,a,oldLibrary[(i+1)%oldLibrary.length])<19+r)
      && !ornaments.some(ornament=>Math.hypot(x-ornament.x,y-ornament.y)<r+(ornament.id==="qian-linzhao"?7:3))
      && !roadSigns.some(sign=>Math.hypot(x-sign.x,y-sign.y)<r*.65+2.4);
  }
  const planting = [];
  function fitVerge(x,y,clearance,accept) {
    if (accept(x,y)) return [x,y];
    if (!isPaved(x,y,clearance)) return null;
    let nearest=Infinity, heading=0;
    for(const {a,b,half} of vergeSegments) {
      const [px,py]=nearestPoint(x,y,a,b), distance=Math.hypot(x-px,y-py);
      if(distance-half>=nearest) continue;
      nearest=distance-half;
      heading=distance>.01?Math.atan2(y-py,x-px):Math.atan2(b[0]-a[0],a[1]-b[1]);
    }
    for(const offset of [1,2,3,4.5,6]) for(const turn of [0,.45,-.45,.9,-.9]) {
      const px=x+Math.cos(heading+turn)*offset,py=y+Math.sin(heading+turn)*offset;
      if(accept(px,py)) return [px,py];
    }
    return null;
  }
  function plant(tree) {
    if (!canPlant(tree) || planting.some(({x,y}) => Math.hypot(tree.x-x,tree.y-y)<5.5)) return false;
    if (tree.x>774 && tree.x<900 && tree.y>648 && tree.y<697) {
      tree={...tree,plane:false,evergreen:false,heightScale:.66};
    }
    planting.push(tree);
    return true;
  }
  plant({x:764.1,y:1040,r:4.3,evergreen:true});
  plant(expertTree);
  for(const [x,y,r] of [[529,792,4.1],[535,818,4.5],[538,830,4.1],[540,842,4.7],
    [542,854,4.3],[544,866,4.6],[545,878,4.1],[546,890,4.6],[548,902,4.2]]) {
    plant({x,y,r,evergreen:y===842||y===890});
  }
  // Preserve a continuous walking surface along the actual centreline.
  for (let y=382;y<556;y+=12.4) {
    const i=cherryWalk.findIndex(([,py]) => py>=y);
    const [ax,ay]=cherryWalk[i-1], [bx,by]=cherryWalk[i];
    const x=ax+(bx-ax)*(y-ay)/(by-ay);
    for (const side of [-1,1]) {
      const r=5.5+random()*3.1;
      for (const offset of [9.85,11.45,13.05]) {
        if (plant({x:x+side*offset,y:y+(random()-.5)*1.5,r,cherry:true,heightScale:.70})) break;
      }
    }
  }
  for (const y of [650,663,687,701]) for(let x=581;x<=713;x+=10.3) {
    plant({x:x+(random()-.5)*3,y:y+(random()-.5)*2,r:6.8+random()*2.3,plane:true,heightScale:1.35});
  }
  function plantRoadside(points,width,spacing,appearance={}) {
    let next=spacing*.5;
    for(let i=1;i<points.length;i++) {
      const [x,y]=points[i-1], [nx,ny]=points[i];
      const length=Math.hypot(nx-x,ny-y);
      if (length<.01) continue;
      const dx=(nx-x)/length, dy=(ny-y)/length;
      for(;next<length;next+=spacing) for(const side of [-1,1]) {
        const r=(appearance.plane?7:5)+random()*2.4;
        const px=x+dx*next, py=y+dy*next;
        for(const verge of [4.4,7.3,10.3]) {
          const offset=side*(width/2+verge);
          if (plant({x:px-dy*offset,y:py+dx*offset,r,...appearance})) break;
        }
      }
      next-=length;
    }
  }
  const planeRows={plane:true,heightScale:1.35};
  for (const road of roads.filter(road=>road.name==="勤奋路" && road.points.at(-1)[0]<700)) plantRoadside(road.points,road.width,12,planeRows);
  plantRoadside([[620.83,676.89],[617.97,718.33],[625.36,812.67],[626.33,825.34]],3.8,15,planeRows);
  plantRoadside([[763.5,668.34],[766.17,704.74],[767.48,729.05],[770.6,786.76],[772.23,815.89]],8.5,13,planeRows);
  const lowTrees={heightScale:.66};
  for(const [x,y,r] of [[328,795,4],[341,794,4.4],[356,793,4],[370,792,4.5],[385,793,3.5],
    [312,820,3.3],[311,836,3],[312,851,3.4],[322,865,4],[336,866,4.6],
    [350,867,4],[361,855,3.7],[355,840,3.4],[372,831,3.9],[387,828,4.2]]) {
    plant({x,y,r,...lowTrees});
  }
  // Follow the outside of the retaining walls, leaving the flare and the portal sightline clear.
  const tunnelPlanting=[];
  const roofEdge=tunnel.segments.find(segment=>segment.covered);
  for(const along of [.24,.46,.68,.9]) for(const across of [.13,.31,.5,.69,.87]) {
    const point=roofEdge.a.edges[0].map((_,i)=>{
      const [l,r]=roofEdge.a.edges, [nl,nr]=roofEdge.b.edges;
      return (l[i]+(r[i]-l[i])*across)*(1-along)+(nl[i]+(nr[i]-nl[i])*across)*along;
    });
    if(hasGroundClearance(...point,1.1)) tunnelPlanting.push(point);
    if((along===.46 && across===.31) || (along===.68 && across===.87) ||
      (along===.9 && across===.13)) {
      plant({x:point[0],y:point[1],r:3.9,heightScale:.74});
    }
  }
  for(const [i,{a,b}] of tunnel.segments.slice(0,eastPortal+3).entries()) {
    for(const edge of [0,1]) {
      const [ax,ay]=a.edges[edge], [bx,by]=b.edges[edge];
      const length=Math.hypot(bx-ax,by-ay);
      for(let distance=3;distance<length-2;distance+=4.5) {
        const t=distance/length;
        const x=ax+(bx-ax)*t,y=ay+(by-ay)*t;
        const cx=a.point[0]+(b.point[0]-a.point[0])*t,cy=a.point[1]+(b.point[1]-a.point[1])*t;
        const nx=x-cx,ny=y-cy,span=Math.hypot(nx,ny);
        for(const offset of [3.2,7.2]) {
          const shrub=[x+nx*offset/span,y+ny*offset/span];
          if(hasGroundClearance(...shrub,1.4)) tunnelPlanting.push(shrub);
        }
        if((Math.floor(distance/4.5)+edge+i)%2===0) {
          for(const offset of [6,9,12,15]) {
            if(plant({x:x+nx*offset/span,y:y+ny*offset/span,r:4.2+(i%3)*.5,heightScale:.78})) break;
          }
        }
      }
    }
  }
  plantRoadside([[933.85,844.3],[847.08,851.75],[775.35,857.3]],6,9,lowTrees);
  plantRoadside([[902.67,649.67],[872.44,656.78],[787.03,665.83],[763.5,668.34]],8.5,10,lowTrees);
  plantRoadside([[678,392],[678,432],[672,481],[669,524]],4,9,lowTrees);
  const pomegranateGarden=poly(764.39,555.96,890,547.5,897.72,643.7,880.69,649.26,769.17,660.35);
  for(let y=558;y<651;y+=9) for(let x=776;x<892;x+=10) {
    const px=x+(random()-.5)*4, py=y+(random()-.5)*4;
    if (contains(pomegranateGarden,px,py)
        && random()<.69) plant({x:px,y:py,r:3.4+random()*1.8,...lowTrees});
  }
  for (const tree of trees) {
    const point=fitVerge(tree.x,tree.y,tree.r*.30+.55,(x,y)=>canPlant({...tree,x,y})&&
      !planting.some(other=>Math.hypot(x-other.x,y-other.y)<5.5));
    if(point) plant({...tree,x:point[0],y:point[1]});
  }
  for (const shore of waters) {
    const [cx,cy]=shore.reduce(([a,b],[x,y])=>[a+x/shore.length,b+y/shore.length],[0,0]);
    for(let i=1;i<shore.length;i+=4) {
      const [x,y]=shore[i], length=Math.hypot(x-cx,y-cy);
      const offset=5.4+random()*2.6;
      plant({x:x+(x-cx)*offset/length,y:y+(y-cy)*offset/length,r:5.4+random()*2.4});
    }
  }
  for (const name of ["红专路","郭沫若路","孺子牛路","东升路","瀚海路"]) {
    for (const road of roads.filter(road=>road.name===name)) plantRoadside(road.points,road.width,29);
  }
  for(const [x,y] of [[572,723],[583,730],[603,729],[613,711],[577,715],[608,742],[570,747],[585,744],[601,754]]) {
    plant({x,y,r:4.8+random()*2});
  }
  for (const {shape,height} of buildings) {
    if (height<10) continue;
    let added=0;
    shape.forEach(([x,y],i)=>{
      if (added>=2) return;
      const [nx,ny]=shape[(i+1)%shape.length], dx=nx-x,dy=ny-y,length=Math.hypot(dx,dy);
      if (length<22) return;
      const cx=(x+nx)/2,cy=(y+ny)/2;
      const normal=contains(shape,cx-dy/length,cy+dx/length)?-1:1;
      for(const fraction of [.43,.68]) {
        const r=3.5+random()*1.9, offset=(5.1+random()*2.2)*normal;
        const px=x+dx*fraction-dy*offset/length,py=y+dy*fraction+dx*offset/length;
        if (planting.some(tree=>Math.hypot(tree.x-px,tree.y-py)<8.8)) continue;
        if (plant({x:px,y:py,r})) { added++; break; }
      }
    });
  }
  for (const [x1,y1,x2,y2] of [[419,721,537,756],[446,850,540,947],[592,1143,670,1258],
    [778,1115,855,1180],[937,1140,1035,1234],[720,1414,814,1530]]) {
    for(let y=y1;y<=y2;y+=17) for(let x=x1;x<=x2;x+=18) {
      const px=x+(random()-.5)*11,py=y+(random()-.5)*10;
      if(planting.some(tree=>Math.hypot(tree.x-px,tree.y-py)<13.5)) continue;
      plant({x:px,y:py,r:4.5+random()*3,evergreen:random()<.28});
    }
  }
  for(let x=410;x<=536;x+=9.5) {
    const y=779-(x-410)*.027+(x<435?0:2.1);
    plant({x,y,r:3.5+random()*1.7});
    if(x<506) plant({x:x+1.5,y:829.3,r:3.2+random()*1.2});
  }
  for(let y=783;y<822;y+=9.5) {
    plant({x:402,y,r:3.3+random()});
    plant({x:540+(y-784)*.17,y,r:3.1+random()});
  }
  for(const [x,y,r] of [[752,419,5.4],[750,436,4.8],[752,453,5.1],[751,476,4.8],[748,500,5.1],[745,522,5.3],
    [779,417,4.6],[782,443,4.8],[781,463,5.3],[781,481,4.9],[778,505,5.2],[775,526,5.1]]) {
    plant({x,y,r,evergreen:y%3===0});
  }
  for(const [x,y,r] of [[591,1101,5.5],[600,1125,6.2],[616,1093,5],[637,1095,5.8],[654,1115,6.4],
    [608,1148,5.8],[621,1133,5.2],[645,1143,6.1],[650,1162,5.5],[636,1170,5.8],
    [662,1182,5.6],[677,1107,5.1],[679,1130,6.0],[681,1172,5.4],[597,1179,5.6]]) {
    plant({x,y,r,evergreen:y%3===0});
  }
  for(const [x,y,r] of [[815,355,4.9],[828,355,5.5],[841,354,5.2],[851,355,4.7],[858,367,4.4],[864,387,5.2],
    [785,352,5.7],[798,352,5.9],[809,345,5.5],[823,343,5.8],[836,343,5.2],[847,343,4.8],
    [791,365,6],[801,365,5.5],[792,378,5.4],[803,379,5.6],[802,391,5.4],[816,391,5.7],
    [829,391,5.1],[841,391,5.6],[853,391,5],[817,404,5.3],[829,404,5.2],[842,403,5.6],[853,402,5.1],
    [870,362,4.7],[876,369,4.4],[874,387,4.6],[875,398,4.6]]) plant({x,y,r,evergreen:(x+y)%4===0});
  for(const [x,y,r] of [[779,365,5.4],[779,384,5.6],[789,392,5.1],[793,401,5.6],[806,402,4.8],
    [809,383,4.6],[811,397,4.8],[822,397,4.9],[835,397,5.3],[849,397,5.1],[861,395,4.9],[864,405,4.5]]) {
    plant({x,y,r,evergreen:(x+y)%4===0});
  }
  for(const [x,y,r] of [[518,585,4.6],[524,594,5.1],[522,605,5.3],
    [494,561,4.7],[506,563,4.5],[517,558,4.9],[498,571,4.4]]) plant({x,y,r});
  for(const [x,y,r] of [[519,618,3.7],[520,628,4],[519.5,638,3.8],[518.9,649,3.8],[518,659,4.1]]) {
    plant({x,y,r,heightScale:1.85});
  }
  for(const [x,y,r] of [[552,584,5],[550,601,5.5],[551,619,5.8],[552,637,5.4],[553,655,4.8],
    [746,579,5.2],[748,595,5.7],[749,612,5.5],[750,628,5.7],[752,646,5.3],
    [678,235,5.7],[692,234,5.5],[706,234,5.8],[721,233,5.6],[735,233,5.2],
    [658,253,5.1],[658,270,5.4],[662,284,5.4],[681,296,5.3],[698,297,5.4],
    [716,295,5.4],[733,295,5.6],[750,294,5.1],[783,788,4],[784,805,4.2],[786,821,4.1]]) plant({x,y,r});
  for(const [x,y,r] of [[398,808,5.1],[397,821,5.4],[397,836,5.6],[399,851,5.3],[400,870,4.8],
    [413,890,4.6],[430,900,5.2],[449,906,4.6],[474,920,4.7],[496,918,4.9],[525,915,5.1],
    [550,813,5],[553,834,5.4],[556,852,5.2],[558,875,4.8],[559,896,5]]) plant({x,y,r});
  for(const [x,y,r] of [[389,800,4.4],[389,813,5.2],[389,828,5.4],[391,843,5.4],[390,858,5.5],
    [394,880,5.1],[411,901,4.7],[432,914,4.8],[445,920,5],[466,927,4.9],
    [484,929,5],[510,926,4.8],[535,922,5.1],[556,916,4.5],[568,884,4.5]]) plant({x,y,r});
  for(const [x,y,r] of [[789,739,4.5],[802,741,4.9],[815,738,4.7],[825,741,4.6],[837,739,4.5],
    [820,749,4.2],[833,746,4.6],[844,743,4.8],[852,741,4.2]]) plant({x,y,r});
  for(const [x,y,r] of [[568,819,5.1],[575,831,5.7],[589,833,5.1],[584,842,4.8],[598,842,4.8],
    [579,912,5],[591,912,4.8]]) {
    plant({x,y,r,evergreen:(x+y)%5===0});
  }
  // Stagger the rows of trees between the museum and Residence Hall 221.
  for(const [y,row] of [[1126,[709,724,741,757,785,801,815]],[1141,[714,730,746,758,783,796,812]],
    [1155,[708,722,738,753,770,784,799,815]],[1168,[705,719,732,746,764,776,790,804,818]]]) {
    row.forEach((x,i)=>plant({x,y,r:4.6+(i%3)*.35,evergreen:(x+y)%4===0}));
  }
  for(const [x,y,r] of [[795,658,4.6],[805,669,4.9],[820,651,4.5],[827,668,4.8],[847,650,4.4],[861,665,4.8],
    [878,648,4.4],[887,664,4.5],[737,1027,4.5],[748,1049,4.8],[775,1052,4.8],[794,1025,4.6],[808,1045,4.4]]) plant({x,y,r});
  const memorialGrove={motto:[[-13,-12,4.6],[-12,12,5],[-4,-16,4.4],[0,14,5.2],[6,23,4.1],[12,-6,4.6],[12,7,5.4]],
    "qian-linzhao":[[-14,-13,4.4],[-13,13,5],[-3,-15,4.5],[0,13,4.7],[6,22,4],[12,-7,4.6],[12,7,4.9]]};
  for(const [id,sites] of Object.entries(memorialGrove)) {
    const {x,y}=placesById.get(id);
    sites.forEach(([dx,dy,r],i)=>plant({x:x+dx,y:y+dy,r,evergreen:i%3===2}));
  }
  for(const [x,y,r,evergreen] of [[716,1018,4.8],[730,1017,4.2],[744,1015,5.1,true],[763,1012,4.7],
    [785,1012,5.3],[801,1012,4.5,true],[815,1017,4.5],[720,1036,5.8],[737,1040,4.9,true],
    [756,1035,5],[778,1033,4.6],[798,1041,5.1],[813,1035,5.1,true],[724,1061,4.5],
    [744,1063,4.3],[767,1066,5.2,true],[789,1061,4.8],[806,1060,4.2]]) {
    plant({x,y,r,evergreen});
  }
  // Grove between the library and the ox sculpture, north of the connecting footpath.
  for(const [x,y,r] of [[595,992,5.2],[612,1000,5.7],[637,992,5.4],[657,1003,5.8],
    [602,1020,5.5],[625,1023,5.8],[649,1028,5.2],[666,1038,5.6],
    [592,1046,5.3],[614,1053,5.4],[637,1048,5.9],[653,1056,5.1]]) {
    plant({x,y,r,evergreen:(x+y)%5===0});
  }
  for(const [x,y,r] of [[193,1530,5],[222,1541,5.2],[251,1545,4.7],[282,1548,5.1],
    [315,1554,5.2],[370,1555,5.3],[396,1560,5],[423,1564,5.8],[449,1566,4.6],
    [552,1571,5.7],[575,1576,5.4],[602,1581,5.6],[647,1590,4.8],[784,1580,5.1],
    [797,1491,4.3],[824,1471,4.2],[836,1510,4.6],[834,1526,4.3],
    [821,1558,4.5],[841,1565,4.2],[801,1592,4.8],[841,1599,4.6]]) plant({x,y,r});
  const gates = landmarks.filter(place => place.kind==="access").map(place => {
    const {x,y,id}=place;
    const sideFacing=id==="west"||id==="east";
    const old=id==="old-north", main=id==="west";
    const shape=(along,across,w,d)=>sideFacing ? box(x+across,y+along,d,w) : box(x+along,y+across,w,d);
    const part=(along,across,w,d,bottom,top,wall,roof)=>({shape:shape(along,across,w,d),bottom,top,wall,roof});
    if (id==="north") return {place,parts:[
      {shape:northBarrier,bottom:0,top:1.38,wall:"#666c65",roof:"#a7ada3"}
    ]};
    if (id==="south" || id==="small-south") {
      const large=id==="south", span=large?28:16, top=large?5.85:3.9;
      const piers=large?2.4:1.3, front=large?2.7:1.5;
      place.h=top;
      return {place,parts:[
        part(-span/2,-front,piers,front*2,0,top-.45,"#a9a99d","#c7c8bd"),
        part(span/2-piers,-front,piers,front*2,0,top-.45,"#a9a99d","#c7c8bd"),
        part(-span/2-.4,-front-.3,span+.8,front*2+.6,top-.52,top,"#717d7d","#bac4bf"),
        part(-span/2-3,-front+.25,2.5,front*1.8,0,large?3.8:2.8,"#88958f","#687f8d")
      ]};
    }
    if (main) {
      const scale=[1.10,1.14,1.10];
      const stone="#b7ac97", top="#c9c0ae", jamb="#744f43";
      const parts=[
        part(-14.5,-2.55,5.4,5.1,0,7.5,stone,top),
        part(9.1,-2.55,5.4,5.1,0,7.5,stone,top),
        part(-14.5,-2.55,29,5.1,7.5,11.4,stone,top),
        part(-14.55,-2.61,29.1,5.22,11.4,11.72,"#9d9586",top),
        part(-9.1,-2.6,1.12,5.2,0,7.5,jamb,"#906653"),
        part(7.98,-2.6,1.12,5.2,0,7.5,jamb,"#906653"),
        part(-8,-2.52,16,5.04,7.27,7.51,"#645749","#8e7d6a")
      ];
      for (const side of [-1,1]) {
        const along=side*12.13;
        parts.push(part(along-.83,-5.9,1.66,1.72,0,.62,"#8c8c81","#b5b3a5"));
      }
      place.h=11.72*scale[2];
      return {place,scale,parts:parts.map(({shape,bottom,top,...material})=>({
        shape:shape.map(([px,py])=>[x+(px-x)*scale[0],y+(py-y)*scale[1]]),
        bottom:bottom*scale[2],top:top*scale[2],...material
      }))};
    }
    const pierColor=old?"#cfb28a":"#b4ab8e";
    const capColor=old?"#ddc39a":"#c8baa0";
    const span=old ? 31 : 23;
    const thick=old ? 3.6 : 3.4;
    const clear=old ? 7.1 : 7;
    const parts=[
      part(-span/2,-2.6,thick,5.2,0,clear,pierColor,capColor),
      part(span/2-thick,-2.6,thick,5.2,0,clear,pierColor,capColor),
      part(-span/2-.55,-3.2,span+1.1,6.4,clear,clear+2.7,capColor,"#ded7c8")
    ];
    if (old) {
      const columns=[-span/2,span/2-thick,-7.3,5.2];
      for(const at of columns.slice(2)) parts.push(part(at,-2.6,2.1,5.2,0,clear,pierColor,capColor));
      parts.push(part(-span/2-.8,-3.44,span+1.6,6.88,clear+2.18,clear+2.55,"#cbb18a","#e3ceaa"));
      parts.push(part(-span/2-1,-3.56,span+2,7.12,clear+2.55,clear+2.84,capColor,"#e7d3b1"));
      for(const [i,at] of columns.entries()) {
        const width=i<2?thick:2.1;
        for(let level=1.2;level<clear;level+=1.32) {
          parts.push(part(at-.035,-2.635,width+.07,5.27,level,level+.045,"#ab906c",pierColor));
        }
      }
      place.h=clear+2.84;
    }
    return {place,parts};
  });
  const benchSites = [[570,533],[682,549],[609,791],[690,802],[601,708],[722,488],[754,693]];
  const canFurnish = (x,y,r) => hasGroundClearance(x,y,r)
    && !roadSigns.some(sign=>Math.hypot(sign.x-x,sign.y-y)<r+.6)
    && !planting.some(tree=>Math.hypot(tree.x-x,tree.y-y)<r+tree.r*.26);
  const benches=benchSites.flatMap(([x,y])=>{
    const cx=x+2.5,cy=y+.8;
    let nearest=Infinity, direction=[1,0];
    for(const {points,width} of pavedRoads) for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];
      const length=Math.hypot(dx,dy);
      if(length<.01) continue;
      const distance=segmentDistance(cx,cy,a,b)-width/2;
      if(distance<nearest) {
        nearest=distance;
        direction=[dx/length,dy/length];
      }
    }
    const [dx,dy]=direction;
    const position=(x,y,u,v)=>[x+(u-2.5)*dx-(v-.775)*dy,y+(u-2.5)*dy+(v-.775)*dx];
    const footprint=box(0,0,5,1.55);
    const center=fitVerge(cx,cy,2.8,(x,y)=>canFurnish(x,y,.45)&&
      footprint.every(([u,v])=>canFurnish(...position(x,y,u,v),.45)));
    if(!center) return [];
    const at=(u,v)=>position(...center,u,v);
    return [{at,shape:footprint.map(([u,v])=>at(u,v)),verticalScale:.7*unit/1.42}];
  });
  const lakeShrubs=[];
  for(const [x,y] of [[399,808],[399,815],[398,826],[399,840],[399,855],[401,868],
    [420,890],[427,894],[435,900],[445,905],[479,918],[486,917],[503,916],[513,915],[540,913],
    [550,824],[553,846],[556,867],[558,887],[560,897]]) {
    if(hasGroundClearance(x,y,1.3)&&!planting.some(tree=>Math.hypot(tree.x-x,tree.y-y)<2.4)) {
      lakeShrubs.push({x,y,r:1.28,h:.96});
    }
  }
  for(const [i,[x,y]] of parking.outline.entries()) {
    const [nx,ny]=parking.outline[(i+1)%parking.outline.length];
    const dx=nx-x,dy=ny-y,length=Math.hypot(dx,dy);
    for(let distance=4;distance<length-3;distance+=4.3) {
      const px=x+(dx*distance+dy*4)/length,py=y+(dy*distance-dx*4)/length;
      if(hasGroundClearance(px,py,1.3)&&!planting.some(t=>Math.hypot(t.x-px,t.y-py)<2.35)
        &&!lakeShrubs.some(s=>Math.hypot(s.x-px,s.y-py)<2.5)) lakeShrubs.push({x:px,y:py,r:1.21,h:.92});
    }
  }
  for(const [x,y] of [[785,813],[787,819],[789,825],[797,826],[804,828],[811,826],[816,821]]) {
    if(hasGroundClearance(x,y,1.4)&&!planting.some(tree=>Math.hypot(tree.x-x,tree.y-y)<2.2)) {
      lakeShrubs.push({x,y,r:1.35,h:.95});
    }
  }
  const gardenLane=roads.find(road=>road.id==="way/265583820");
  for(let i=1;i<gardenLane.points.length;i++) {
    const [x,y]=gardenLane.points[i-1],[nx,ny]=gardenLane.points[i];
    const length=Math.hypot(nx-x,ny-y);
    for(let along=4;along<length-2;along+=3.3) for(const side of [-1,1]) {
      const offset=side*(gardenLane.width/2+2.2);
      const px=x+((nx-x)*along-(ny-y)*offset)/length;
      const py=y+((ny-y)*along+(nx-x)*offset)/length;
      if(hasGroundClearance(px,py,1.25)&&!planting.some(t=>Math.hypot(t.x-px,t.y-py)<2.1)) {
        lakeShrubs.push({x:px,y:py,r:1.23,h:.92});
      }
    }
  }
  for(let y=413;y<=535;y+=4.3) {
    const [a,b]=y<479.58?[[764.73,411.82],[767.77,479.58]]:[[767.77,479.58],[758.22,550.48]];
    const center=a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);
    for(const side of [-1,1]) {
      const x=center+side*(8.3+Math.sin(y*.16)*.75);
      if(hasGroundClearance(x,y,1.5)) lakeShrubs.push({x,y,r:1.45,h:1.06+Math.sin(y)*.16});
    }
  }
  const oxShrubs=[];
  for(const [cx,cy,rx,ry] of [[621,1112,10,6],[650,1102,13,5],[665,1131,12,6],[628,1157,10,8],[652,1176,12,6]]) {
    for(let i=0;i<11;i++) {
      const angle=i*Math.PI*2/11, x=cx+Math.cos(angle)*rx,y=cy+Math.sin(angle)*ry;
      if(hasGroundClearance(x,y,1.8)&&!planting.some(t=>Math.hypot(t.x-x,t.y-y)<3.5)) {
        oxShrubs.push({x,y,r:1.55,h:.9+(i%3)*.17});
      }
    }
  }
  const memorialShrubs=[];
  const historyShrubs=[];
  for(const [x,y] of [[738,1010],[744,1013],[752,1023],[744,1054],[750,1057],[779,1025],[784,1028],
    [786,1049],[791,1050],[801,1068],[805,1069]]) {
    if(hasGroundClearance(x,y,1.4)&&!planting.some(tree=>Math.hypot(tree.x-x,tree.y-y)<3)) historyShrubs.push({x,y,r:1.35,h:1.07});
  }
  const historyPaths=roads.filter(({id})=>/^way\/28586041[3-8]$/.test(id));
  for(const {points,width} of historyPaths) {
    for(let i=1;i<points.length;i++) {
      const [x,y]=points[i-1], [nx,ny]=points[i];
      const length=Math.hypot(nx-x,ny-y), count=Math.ceil(length/2.1);
      const offset=width/2+1.55;
      for(let j=0;j<count;j++) for(const side of [-1,1]) {
        const t=(j+.5)/count;
        const px=x+(nx-x)*t-side*(ny-y)*offset/length;
        const py=y+(ny-y)*t+side*(nx-x)*offset/length;
        const r=1.18;
        if(!hasGroundClearance(px,py,r)||historyShrubs.some(shrub=>Math.hypot(px-shrub.x,py-shrub.y)<1.55)) continue;
        if(planting.some(tree=>Math.hypot(px-tree.x,py-tree.y)<r+tree.r*.18)) continue;
        historyShrubs.push({x:px,y:py,r,h:.92+(historyShrubs.length%3)*.09});
      }
    }
  }
  for(const id of ["motto","qian-linzhao"]) {
    const {x,y}=placesById.get(id);
    for(const radius of [7.5,11,15]) for(let i=0;i<14;i++) {
      const angle=(i+radius*.1)*2*Math.PI/14;
      const px=x+radius*Math.cos(angle),py=y+radius*Math.sin(angle);
      if(!hasGroundClearance(px,py,1.4)||!canFurnish(px,py,1.4)||
        benches.some(({shape})=>shape.some((p,j)=>segmentDistance(px,py,p,shape[(j+1)%4])<2.1))) continue;
      memorialShrubs.push({x:px,y:py,r:1.05+(i%4)*.15,h:.67+(i%3)*.20});
    }
  }
  tunnel.shrubs=tunnelPlanting.filter(([x,y])=>canFurnish(x,y,1.4))
    .map(([x,y],i)=>({x,y,r:1.05+(i%3)*.15,h:.62+(i%3)*.18}));
  // Remove generated trees from the paved courtyard after planting so no retry fills the gap.
  const expertCourtyardTrees=box(720,383,43,41);
  const courtyardTreeIndex=planting.findIndex(tree=>tree.whiteBase);
  for(let i=planting.length-1;i>=0;i--) {
    const {x,y}=planting[i];
    if(i!==courtyardTreeIndex && contains(expertCourtyardTrees,x,y)) planting.splice(i,1);
  }
  const obstacles=[
    ...pullUpBars.flatMap(({x,y,height})=>[y,y+4].map(postY=>({shape:box(x-.15,postY-.15,.3,.3),top:height}))),
    trackStage,...trackStage.walls.map(shape=>({shape,top:trackStage.roofHeight})),
    kindergarten.sign,
    ...kindergarten.playEquipment,
    ...bikeShelter.posts,...bikeShelter.bikes.map(({x,y})=>({shape:box(x-.42,y-1.32,.84,2.64),top:1.53})),
    ...busDepot.buses,...busDepot.supports,busDepot.backWall,
    ...contextBuildings,
    ...gates.flatMap(({parts})=>parts.filter(part=>part.bottom===0)),
    ...[...tunnel.apronFences,tunnel.portalGuard].map(([[x,y],[nx,ny]])=>{
      const length=Math.hypot(nx-x,ny-y), dx=(ny-y)*.09/length,dy=(x-nx)*.09/length;
      return {shape:poly(x+dx,y+dy,nx+dx,ny+dy,nx-dx,ny-dy,x-dx,y-dy),top:tunnel.fenceTop};
    }),
    ...benches.map(({shape,verticalScale})=>({shape,top:2.41*verticalScale})),
    {shape:squareScene.planter,top:1.08}, {shape:squareScene.pool,top:.35},
    ...[...parking.cars,...expertCars].map(([x,y])=>({shape:box(x-1.3,y-3.05,2.6,6.1),top:2.15})),
    ...squareScene.terraceTables.map(([x,y])=>({shape:box(x-.74,y-.74,1.48,1.48),top:1.12})),
    ...ornamentObstacles,
    ...activityModel.columns,activityModel.core,{shape:northStone,top:northStoneTop},
    ...roadSigns.map(({x,y,blades})=>({shape:box(x-.15,y-.15,.30,.30),top:3+blades.length*1.18}))
  ];
  function trackShape(inset) {
    return [971,1071].flatMap((y,index) => Array.from({length:21},(_,i) => {
      const a = (i/20+1-index)*Math.PI;
      const py = y+Math.sin(a)*(65-inset);
      return [360+Math.cos(a)*(65-inset)+(py-1014)*.07,py];
    }));
  }
  function wallWindows(length,height,style={}) {
    const columns = Math.floor(length/(style.spacing||8)), floors = style.floors||Math.max(1,Math.round(height/7));
    const halfWidth = (style.windowWidth||4.3)/(2*length);
    const halfHeight = Math.min(style.brick ? 2.55 : 1.8,height/floors*.35);
    const windows = [];
    for (let row=0;row<floors;row++) for (let col=0;col<columns;col++) {
      const t = (col+.5)/columns, z = (row+.5)*height/floors;
      const top=style.topTrim?Math.min(z+halfHeight,height-style.topTrim-.3):z+halfHeight;
      windows.push([t-halfWidth,t+halfWidth,z-halfHeight,top]);
    }
    return windows;
  }
  bikeShelter.shrubs=[...[359.8,386.3].flatMap(y=>Array.from({length:15},(_,i)=>({x:814+i*2.6,y,r:1.18,h:1.02}))),
    ...Array.from({length:10},(_,i)=>({x:809.4,y:364+i*2.8,r:1.24,h:.86+(i%3)*.11}))]
    .filter(({x,y,r})=>hasGroundClearance(x,y,r)&&!planting.some(tree=>Math.hypot(x-tree.x,y-tree.y)<r+tree.r*.18));
  return {reference,facadeSources,floorPlans,vrUrl,vrPlaces,outline,roads,surroundingRoads,approaches,roadSurfaces,roadColors,roadSigns,isPaved,nearestStreet,canRoam,segmentDistance,lawns,plazas,waters,buildings,contextBuildings,trees:planting,landmarks,ornaments,pavilion,box,poly,contains,cherryWalk,pavilionWalk,square,squarePoint,squareScene,parking,expertCars,gates,benches,memorialShrubs,historyShrubs,lakeShrubs,oxShrubs,busDepot,bikeShelter,libraryFront,sportCourts,obstacles,trackShape,wallWindows,activityModel,researchLinks,northStone,northStoneTop,northBarrier,northParking,kindergarten,hallFront,juniorEntry,officeEntry,trackStage,pullUpBars,hallParking,tunnel,tunnelAt};
})();

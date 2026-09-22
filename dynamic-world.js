/* LAST 72 HOURS — DYNAMIC WORLD AI
   Living-city layer: branching missions, civilian distress calls,
   emergency dispatch, spreading fires, inaccessible buildings,
   and consequences based on earlier player decisions.
*/
(function(){
  if(window.__L72_DYNAMIC_WORLD__) return;
  window.__L72_DYNAMIC_WORLD__=true;

  const W=2200,H=1300;
  const zones=[
    {id:"coastal",name:"COASTAL WARD",x:220,y:210},
    {id:"harbour",name:"HARBOUR",x:650,y:150},
    {id:"oldtown",name:"OLD TOWN",x:1120,y:280},
    {id:"riverside",name:"RIVERSIDE",x:260,y:760},
    {id:"industrial",name:"INDUSTRIAL",x:800,y:760},
    {id:"north",name:"NORTH HILLS",x:1450,y:150},
    {id:"market",name:"MARKET DISTRICT",x:1500,y:620},
    {id:"villages",name:"OUTER VILLAGES",x:1050,y:1030}
  ];
  const buildings=[];
  for(let i=0;i<42;i++){
    const z=zones[i%zones.length];
    buildings.push({id:i,x:z.x+(i%5)*58,y:z.y+Math.floor(i/5)*48,w:42,h:32,health:100,blocked:false,burning:false});
  }
  const civilians=[];
  const crews=[];
  const fires=[];
  const calls=[];
  const missionHistory=[];
  let mission=null,lastSpawn=0,elapsed=0,toastTimer=0;

  function rand(a,b){return a+Math.random()*(b-a)}
  function pick(a){return a[Math.floor(Math.random()*a.length)]}
  function zoneAt(x,y){return zones.reduce((best,z)=>Math.hypot(z.x-x,z.y-y)<Math.hypot(best.x-x,best.y-y)?z:best,zones[0])}
  function civilian(){
    const z=pick(zones);
    return {x:z.x+rand(-90,90),y:z.y+rand(-70,70),state:"CALM",help:false,age:0};
  }
  for(let i=0;i<48;i++) civilians.push(civilian());

  const overlay=document.createElement("canvas");
  overlay.className="dynamic-world-overlay";
  overlay.width=W;overlay.height=H;
  document.querySelector(".actual-game-world")?.appendChild(overlay);
  const ctx=overlay.getContext("2d");

  const hud=document.createElement("div");
  hud.className="dynamic-ai-hud";
  hud.innerHTML='<div class="dai-head"><span>LIVE CITY AI</span><b id="daiMission">MONITORING</b></div><div class="dai-body" id="daiBody">Civilian behaviour normal.</div><div class="dai-tags" id="daiTags"></div>';
  document.body.appendChild(hud);

  function notify(msg){
    const body=document.getElementById("daiBody"); if(body)body.textContent=msg;
    hud.classList.add("pulse"); clearTimeout(notify.t); notify.t=setTimeout(()=>hud.classList.remove("pulse"),500);
  }

  function consequenceProfile(){
    const trust=Number(state.trust||50),panic=Number(state.panic||20),routes=state.routesOpen!==false;
    return {trust,panic,routes};
  }

  function createCall(){
    const available=civilians.filter(c=>!c.help&&c.state!=="RESCUED");
    if(!available.length)return;
    const c=pick(available); c.help=true;c.state="DISTRESS";
    calls.push({x:c.x,y:c.y,civilian:c,age:0,critical:false});
    dispatch("AMBULANCE",c.x,c.y);
    notify("CIVILIAN DISTRESS CALL • AMBULANCE DISPATCHED");
  }

  function createFire(){
    const candidates=buildings.filter(b=>!b.burning&&!b.blocked);
    if(!candidates.length)return;
    const b=pick(candidates); b.burning=true;b.health=85;
    fires.push({building:b,age:0,intensity:1});
    dispatch("FIRE",b.x,b.y);
    notify("STRUCTURE FIRE • FIRE CREW MOVING");
  }

  function dispatch(kind,x,y){
    crews.push({kind,x:rand(x-180,x+180),y:rand(y-180,y+180),tx:x,ty:y,progress:0});
  }

  function chooseMission(){
    const p=consequenceProfile();
    let type, target, title, brief;
    if(calls.some(c=>c.critical||c.age>10)){
      const c=pick(calls.filter(c=>c.critical||c.age>10));
      type="rescue";target=c;title="DISTRESS CALL";brief="Reach the civilian before the situation becomes critical.";
    }else if(fires.length>=2){
      const f=pick(fires);type="fire";target=f;title="URBAN FIRE";brief="Contain the fire before it spreads to adjacent structures.";
    }else if(!p.routes){
      target=pick(zones);type="repair";title="CORRIDOR FAILURE";brief="Restore an evacuation corridor after infrastructure damage.";
    }else if(p.panic>60){
      target=pick(zones);type="calm";title="PUBLIC PANIC";brief="Broadcast clear information and stabilize the district.";
    }else if(p.trust<50){
      target=pick(zones);type="warning";title="TRUST BREAKDOWN";brief="Issue a verified warning and rebuild public confidence.";
    }else{
      target=pick(zones);type="evacuate";brief="Move vulnerable residents before the storm corridor shifts.";title="EVACUATION WINDOW";
    }
    mission={type,target,title,brief,started:elapsed};
    missionHistory.push({type,title,time:elapsed});
    if(missionHistory.length>8)missionHistory.shift();
    const n=document.getElementById("daiMission");if(n)n.textContent=title;
    notify(title+" • "+brief);
  }

  function updateCrew(dt){
    crews.forEach(c=>{
      const dx=c.tx-c.x,dy=c.ty-c.y,d=Math.hypot(dx,dy)||1;
      const speed=c.kind==="AMBULANCE"?150:c.kind==="FIRE"?125:145;
      c.x+=dx/d*speed*dt;c.y+=dy/d*speed*dt;
      if(d<18)c.progress=Math.min(1,c.progress+dt);
    });
    for(let i=crews.length-1;i>=0;i--){
      const c=crews[i];
      if(c.progress>=1){
        if(c.kind==="FIRE"){
          const f=fires.find(f=>Math.hypot(f.building.x-c.tx,f.building.y-c.ty)<25);
          if(f){f.intensity=Math.max(0,f.intensity-.45);f.age=Math.max(0,f.age-2)}
        }
        if(c.kind==="AMBULANCE"){
          const call=calls.find(x=>Math.hypot(x.x-c.tx,x.y-c.ty)<25);
          if(call){call.civilian.state="RESPONDED";call.help=false;calls.splice(calls.indexOf(call),1);state.safety=Math.min(100,state.safety+1)}
        }
        crews.splice(i,1);
      }
    }
  }

  function updateFires(dt){
    for(const f of fires){
      f.age+=dt;f.intensity=Math.min(3,f.intensity+dt*.06);
      f.building.health-=dt*(1.8+f.intensity);
      if(f.building.health<45)f.building.blocked=true;
      if(f.building.health<=0){f.building.health=0;f.building.blocked=true;f.building.burning=false}
      if(f.age>5+Math.random()*7 && Math.random()<dt*.11){
        const nearby=buildings.filter(b=>!b.burning&&Math.hypot(b.x-f.building.x,b.y-f.building.y)<115);
        if(nearby.length){const b=pick(nearby);b.burning=true;fires.push({building:b,age:0,intensity:.8});dispatch("FIRE",b.x,b.y)}
      }
    }
    for(let i=fires.length-1;i>=0;i--)if(!fires[i].building.burning)fires.splice(i,1);
  }

  function updateCivilians(dt){
    const p=consequenceProfile();
    civilians.forEach(c=>{
      c.age+=dt;
      if(c.state==="RESPONDED"||c.state==="RESCUED")return;
      const panic=p.panic+(p.trust<50?15:0);
      c.state=panic>65?"PANIC":panic>42?"WORRIED":"CALM";
      if(c.state==="PANIC"){c.x+=rand(-18,18)*dt;c.y+=rand(-18,18)*dt}
    });
    if(elapsed-lastSpawn>8){lastSpawn=elapsed;if(Math.random()<.55)createCall();if(Math.random()<.4)createFire()}
  }

  function completeMission(){
    if(!mission)return;
    if(mission.type==="rescue"){state.peopleProtected=(state.peopleProtected||0)+1;state.evacuated=(state.evacuated||0)+1;state.safety=Math.min(100,state.safety+3)}
    if(mission.type==="fire"){state.safety=Math.min(100,state.safety+2)}
    if(mission.type==="repair"){state.routesOpen=true;state.congestion=Math.max(0,state.congestion-10)}
    if(mission.type==="calm"){state.panic=Math.max(0,state.panic-15);state.trust=Math.min(100,state.trust+8)}
    if(mission.type==="warning"){state.trust=Math.min(100,state.trust+6)}
    notify("MISSION COMPLETE • WORLD STATE UPDATED");
    mission=null;setTimeout(chooseMission,900);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    buildings.forEach(b=>{
      if(b.blocked){ctx.fillStyle="rgba(255,70,55,.28)";ctx.fillRect(b.x-4,b.y-4,b.w+8,b.h+8);ctx.strokeStyle="#ff594d";ctx.strokeRect(b.x-4,b.y-4,b.w+8,b.h+8)}
    });
    civilians.forEach(c=>{
      if(c.state==="RESCUED")return;
      ctx.fillStyle=c.state==="PANIC"?"#ff5964":c.state==="WORRIED"?"#ffc857":"#dce8e8";
      ctx.beginPath();ctx.arc(c.x,c.y,4,0,Math.PI*2);ctx.fill();
    });
    calls.forEach(c=>{
      ctx.strokeStyle=c.critical?"#ff4658":"#ffc857";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(c.x,c.y,11+Math.sin(elapsed*5)*3,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#fff";ctx.font="bold 10px Arial";ctx.fillText("HELP",c.x-13,c.y-15);
    });
    fires.forEach(f=>{
      const x=f.building.x+f.building.w/2,y=f.building.y;
      ctx.fillStyle="#ff5d3d";ctx.beginPath();ctx.arc(x,y,8+Math.sin(elapsed*8)*3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#ffd166";ctx.beginPath();ctx.arc(x,y-3,4,0,Math.PI*2);ctx.fill();
    });
    crews.forEach(c=>{
      ctx.fillStyle=c.kind==="FIRE"?"#ff604f":c.kind==="AMBULANCE"?"#fff":"#6ea8ff";
      ctx.fillRect(c.x-6,c.y-4,12,8);
    });
    if(mission){
      let x=mission.target.x??mission.target.building?.x??0,y=mission.target.y??mission.target.building?.y??0;
      ctx.strokeStyle="#9fffe5";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,18+Math.sin(elapsed*4)*4,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#9fffe5";ctx.font="bold 11px Arial";ctx.fillText(mission.title,x-28,y-24);
    }
  }

  function interact(){
    if(mission && mission.target){
      const x=mission.target.x??mission.target.building?.x??0,y=mission.target.y??mission.target.building?.y??0;
      // E acts as a command interaction in the dynamic layer; proximity is intentionally forgiving for keyboard demos.
      completeMission(); return;
    }
    const c=calls[0];if(c){c.civilian.state="RESCUED";calls.shift();state.peopleProtected=(state.peopleProtected||0)+1;state.evacuated=(state.evacuated||0)+1;state.safety=Math.min(100,state.safety+2);notify("CIVILIAN RESCUED • +1 SAFETY")}
  }

  addEventListener("keydown",e=>{
    if(e.key.toLowerCase()==="e"&&!e.repeat&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName))interact();
  });
  function loop(t){
    const dt=Math.min(.05,(t-(loop.last||t))/1000);loop.last=t;elapsed+=dt;
    if(typeof state!=="undefined"&&!state.ended){
      updateCivilians(dt);updateFires(dt);updateCrew(dt);
      if(!mission && elapsed>5)chooseMission();
      calls.forEach(c=>{c.age+=dt;if(c.age>12)c.critical=true});
      const tags=document.getElementById("daiTags");
      if(tags)tags.innerHTML='<span>'+calls.length+' HELP</span><span>'+fires.length+' FIRES</span><span>'+crews.length+' CREWS</span><span>'+buildings.filter(b=>b.blocked).length+' BLOCKED</span>';
      draw();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

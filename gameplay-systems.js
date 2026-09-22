/* LAST 72 HOURS — GAMEPLAY SYSTEMS v1
   Adds live field systems without replacing the core canvas engine:
   dynamic incidents, civilian rescue, vehicle condition/fuel,
   infrastructure repair, flood pressure, command XP, autosave,
   event chaining and an in-game systems HUD.
*/
(function(){
  if(window.__L72_SYSTEMS__) return;
  window.__L72_SYSTEMS__=true;

  const S={
    xp:0, reputation:0, fuel:100, vehicleHealth:100, vehicleIndex:0,
    rescued:0, dispatched:0, repairs:0, scans:0, combo:0,
    flood:12, powerGrid:86, traffic:24, fires:0, medics:3,
    eventClock:7, autosaveClock:0, tick:0, lastAction:"",
    events:[], log:[], activeMission:0, audio:null
  };

  const fleet=[
    {name:"RESCUE SUV",fuel:1.00,armor:72,capacity:6},
    {name:"EVAC BUS",fuel:1.35,armor:84,capacity:36},
    {name:"AMBULANCE",fuel:.95,armor:58,capacity:4},
    {name:"RESCUE BOAT",fuel:1.15,armor:66,capacity:12},
    {name:"HELICOPTER",fuel:1.70,armor:42,capacity:8}
  ];

  const EVENTS=[
    {id:"flood",title:"FLASH FLOOD",detail:"Water is crossing a low-lying corridor. Deploy a pump crew.",key:"r",reward:90,
      solve(){S.flood=Math.max(0,S.flood-22);state.safety=Math.min(100,state.safety+4);state.congestion=Math.max(0,state.congestion-7);}},
    {id:"traffic",title:"TRAFFIC GRIDLOCK",detail:"Evacuation traffic is locking the eastern corridor.",key:"g",reward:75,
      solve(){S.traffic=Math.max(0,S.traffic-25);state.congestion=Math.max(0,state.congestion-14);state.vehicles=Math.max(0,state.vehicles-1);}},
    {id:"medical",title:"HOSPITAL SURGE",detail:"Emergency admissions are rising. Dispatch medical support.",key:"h",reward:100,
      solve(){state.medical=Math.min(100,state.medical+16);state.hospitalReady=Math.min(100,state.hospitalReady+10);S.medics=Math.max(0,S.medics-1);}},
    {id:"bridge",title:"BRIDGE FAILURE",detail:"A critical crossing is blocked. Send an engineering team.",key:"f",reward:110,
      solve(){state.routesOpen=true;state.congestion=Math.max(0,state.congestion-18);S.repairs++;}},
    {id:"blackout",title:"POWER BLACKOUT",detail:"A substation has failed. Restore the emergency grid.",key:"q",reward:95,
      solve(){S.powerGrid=Math.min(100,S.powerGrid+24);state.power=Math.min(100,state.power+14);state.communications=Math.min(100,state.communications+8);}},
    {id:"misinfo",title:"MISINFORMATION SPIKE",detail:"A false evacuation message is spreading. Broadcast a correction.",key:"b",reward:85,
      solve(){state.misinformation=Math.max(0,state.misinformation-24);state.trust=Math.min(100,state.trust+9);}},
    {id:"shelter",title:"SHELTER PANIC",detail:"A shelter is overcrowded. Move families to another facility.",key:"e",reward:80,
      solve(){state.shelterStress=Math.max(0,state.shelterStress-25);state.panic=Math.max(0,state.panic-12);state.food=Math.max(0,state.food-7);}}
  ];

  function el(tag,cls,text){
    const n=document.createElement(tag); if(cls)n.className=cls; if(text)n.textContent=text; return n;
  }
  function mount(){
    if(document.querySelector(".systems-hud")) return document.querySelector(".systems-hud");
    const layer=el("div","systems-hud");
    layer.innerHTML=
      '<div class="systems-top">'+
        '<div class="sys-brand"><b>FIELD SYSTEMS</b><span>LIVE SIMULATION</span></div>'+
        '<div class="sys-stat"><small>XP</small><b id="sysXP">0</b></div>'+
        '<div class="sys-stat"><small>REP</small><b id="sysRep">0</b></div>'+
        '<div class="sys-stat"><small>FUEL</small><b id="sysFuel">100%</b></div>'+
        '<div class="sys-stat"><small>VEHICLE</small><b id="sysVehicle">RESCUE SUV</b></div>'+
      '</div>'+
      '<div class="systems-left">'+
        '<div class="sys-panel"><div class="sys-title">ACTIVE EMERGENCIES <span id="sysEventCount">0</span></div><div id="sysEvents"></div></div>'+
        '<div class="sys-panel compact"><div class="sys-title">FIELD ACTIONS</div>'+
          '<div class="sys-controls"><kbd>R</kbd> PUMP FLOOD <kbd>F</kbd> REPAIR <kbd>G</kbd> CLEAR TRAFFIC <kbd>H</kbd> MEDICAL <kbd>B</kbd> BROADCAST <kbd>Q</kbd> GRID RESTORE</div>'+
        '</div>'+
      '</div>'+
      '<div class="systems-right">'+
        '<div class="sys-panel"><div class="sys-title">RESPONSE METERS</div>'+
          '<div class="meter"><span>FLOOD</span><i id="sysFlood"></i><b id="sysFloodV">12%</b></div>'+
          '<div class="meter"><span>TRAFFIC</span><i id="sysTraffic"></i><b id="sysTrafficV">24%</b></div>'+
          '<div class="meter"><span>POWER</span><i id="sysPower"></i><b id="sysPowerV">86%</b></div>'+
          '<div class="meter"><span>FIRE</span><i id="sysFire"></i><b id="sysFireV">0</b></div>'+
        '</div>'+
        '<div class="sys-panel compact"><div class="sys-title">COMMAND INVENTORY</div><div id="sysInventory"></div></div>'+
      '</div>'+
      '<div class="sys-toast" id="sysToast"></div>'+
      '<div class="sys-save" id="sysSave">AUTOSAVE • READY</div>';
    document.body.appendChild(layer);
    return layer;
  }
  const ui=mount();

  function toast(msg,good=false){
    const n=document.getElementById("sysToast"); if(!n)return;
    n.textContent=msg;n.classList.toggle("good",good);n.classList.add("show");
    clearTimeout(toast._t);toast._t=setTimeout(()=>n.classList.remove("show"),2200);
  }
  function beep(type="ok"){
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      const c=S.audio||(S.audio=new C()),o=c.createOscillator(),g=c.createGain();
      o.type=type==="alert"?"sawtooth":"sine";o.frequency.value=type==="alert"?150:type==="win"?720:430;
      g.gain.value=.025;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+(type==="alert"?.12:.08));
    }catch(e){}
  }
  function addLog(t){S.log.unshift(t);S.log=S.log.slice(0,5);}

  function spawnEvent(force=false){
    if(S.events.length>=2&&!force)return;
    const used=new Set(S.events.map(e=>e.id));
    const choices=EVENTS.filter(e=>!used.has(e.id));
    if(!choices.length)return;
    const base=choices[Math.floor(Math.random()*choices.length)];
    const e={...base,ttl:18+Math.random()*14,age:0};
    S.events.push(e); state.incidents=state.incidents||[];
    state.chainReactions=(state.chainReactions||0)+1;
    addLog("ALERT • "+e.title);
    toast("NEW INCIDENT • "+e.title); beep("alert");
  }

  function resolve(key){
    const i=S.events.findIndex(e=>e.key===key);
    if(i<0){toast("NO MATCHING FIELD INCIDENT");return;}
    const e=S.events[i];
    e.solve(); S.events.splice(i,1); S.xp+=e.reward; S.reputation+=Math.ceil(e.reward/10); S.combo++;
    S.lastAction=e.title;
    addLog("RESOLVED • "+e.title+" • +"+e.reward+" XP");
    toast("INCIDENT RESOLVED • +"+e.reward+" XP",true); beep("win");
    if(S.combo>=3){state.safety=Math.min(100,state.safety+3);toast("RESPONSE STREAK • SAFETY +3%",true);}
  }

  function cycleVehicle(){
    S.vehicleIndex=(S.vehicleIndex+1)%fleet.length;
    S.fuel=Math.min(100,S.fuel+8);
    S.vehicleHealth=Math.min(100,S.vehicleHealth+5);
    toast("FLEET SWITCH • "+fleet[S.vehicleIndex].name,true); beep();
  }

  function fieldAction(action){
    const costs={rescue:0,repair:8,convoy:6,drone:3,pump:5,broadcast:4};
    const cost=costs[action]||0;
    if(cost && state.budget<cost){toast("BUDGET BLOCKED • NEED ₹"+cost);return;}
    if(cost)state.budget-=cost;
    if(action==="rescue"){
      const cap=fleet[S.vehicleIndex].capacity;
      const gain=Math.min(cap,Math.max(2,Math.round(2+state.panic/20)));
      S.rescued+=gain;state.evacuated+=gain;state.peopleProtected+=gain;state.panic=Math.max(0,state.panic-5);state.safety=Math.min(100,state.safety+2);S.xp+=35;
      toast("CIVILIANS RESCUED • +"+gain,true);beep("win");
    }
    if(action==="repair"){
      state.routesOpen=true;state.congestion=Math.max(0,state.congestion-12);S.repairs++;S.xp+=45;toast("INFRASTRUCTURE REPAIRED • CORRIDOR OPEN",true);
    }
    if(action==="convoy"){
      state.vehicles=Math.max(0,state.vehicles-1);state.evacuated+=Math.min(10,fleet[S.vehicleIndex].capacity);state.congestion=Math.min(100,state.congestion+5);S.dispatched++;S.xp+=40;toast("EVACUATION CONVOY DEPLOYED",true);
    }
    if(action==="drone"){
      S.scans++;state.confidence=Math.min(95,state.confidence+5);state.landfallProb=Math.max(20,state.landfallProb-2);S.xp+=30;toast("DRONE SCAN • FORECAST UPDATED",true);
    }
    if(action==="pump"){
      state.budget=Math.max(0,state.budget);S.flood=Math.max(0,S.flood-18);state.safety=Math.min(100,state.safety+3);S.xp+=40;toast("PUMP CREW DEPLOYED • FLOOD REDUCED",true);
    }
    if(action==="broadcast"){
      state.misinformation=Math.max(0,state.misinformation-18);state.trust=Math.min(100,state.trust+7);state.communications=Math.min(100,state.communications+8);S.xp+=32;toast("PUBLIC CORRECTION BROADCAST",true);
    }
    persist();
  }

  function wrapCore(){
    const original=window.Last72TakeAction;
    if(typeof original!=="function")return;
    if(original.__l72Wrapped)return;
    function wrapped(action,source){
      const before={budget:state.budget,safety:state.safety};
      const result=original(action,source);
      S.xp+=20;S.dispatched++;
      if(action==="evacuate")S.rescued+=Math.min(6,fleet[S.vehicleIndex].capacity);
      if(action==="roads"){S.repairs++;state.routesOpen=true;}
      if(action==="hospital")S.medics=Math.max(0,S.medics-1);
      S.lastAction=action.toUpperCase();
      if(before.safety!==state.safety)S.combo=state.safety>before.safety?S.combo+1:0;
      persist();return result;
    }
    wrapped.__l72Wrapped=true;
    window.Last72TakeAction=wrapped;
  }

  function tick(dt){
    if(typeof state==="undefined")return;
    S.tick+=dt;S.eventClock-=dt;S.autosaveClock+=dt;
    if(S.eventClock<=0&&!state.ended){
      S.eventClock=8+Math.random()*7;
      const pressure=(100-state.confidence)+(state.panic*.35)+(state.congestion*.25)+(S.flood*.3);
      if(Math.random()*100<Math.min(92,28+pressure*.55))spawnEvent();
    }
    const moving=["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].some(k=>keys[k]);
    if(moving&&!state.ended){
      const drain=.42*fleet[S.vehicleIndex].fuel*dt;
      S.fuel=Math.max(0,S.fuel-drain);
      if(S.fuel<=0)toast("VEHICLE EMPTY • SWITCH OR REFUEL");
      if(state.congestion>70&&Math.random()<dt*.08)S.vehicleHealth=Math.max(0,S.vehicleHealth-1);
      if(S.vehicleHealth<25&&Math.random()<dt*.03){state.safety=Math.max(0,state.safety-1);toast("VEHICLE DAMAGE • RESPONSE SLOWDOWN");}
    }
    if(!state.ended){
      S.flood=Math.min(100,S.flood+dt*(state.rainfall>220?.7:.22));
      S.traffic=Math.min(100,S.traffic+dt*(state.congestion>65?.45:.12));
      S.powerGrid=Math.max(0,Math.min(100,S.powerGrid-dt*(state.power<60?.06:.015)));
      if(S.flood>65)state.congestion=Math.min(100,state.congestion+dt*.22);
      if(S.powerGrid<35)state.communications=Math.max(0,state.communications-dt*.08);
    }
    S.events.forEach(e=>e.age+=dt);
    for(let i=S.events.length-1;i>=0;i--){
      const e=S.events[i];
      if(e.age>=e.ttl){
        S.events.splice(i,1);S.combo=0;state.safety=Math.max(0,state.safety-3);state.panic=Math.min(100,state.panic+8);state.chainReactions=(state.chainReactions||0)+1;
        addLog("FAILED • "+e.title);toast("INCIDENT FAILED • "+e.title);beep("alert");
      }
    }
    if(S.autosaveClock>12){S.autosaveClock=0;persist();}
    render();
  }

  function render(){
    const set=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=v};
    set("sysXP",S.xp);set("sysRep",S.reputation);set("sysFuel",Math.round(S.fuel)+"%");
    set("sysVehicle",fleet[S.vehicleIndex].name);
    set("sysEventCount",S.events.length);
    set("sysFloodV",Math.round(S.flood)+"%");set("sysTrafficV",Math.round(S.traffic)+"%");set("sysPowerV",Math.round(S.powerGrid)+"%");set("sysFireV",S.fires);
    ["sysFlood","sysTraffic","sysPower","sysFire"].forEach((id,i)=>{const n=document.getElementById(id);if(n)n.style.width=[S.flood,S.traffic,S.powerGrid,Math.min(100,S.fires*20)][i]+"%"});
    const ev=document.getElementById("sysEvents");
    if(ev)ev.innerHTML=S.events.length?S.events.map(e=>'<div class="sys-event"><b>'+e.title+'</b><span>'+e.detail+'</span><em>'+Math.max(0,Math.ceil(e.ttl-e.age))+'s • press '+e.key.toUpperCase()+'</em></div>').join(""):'<div class="sys-clear">NO ACTIVE FIELD INCIDENTS</div>';
    const inv=document.getElementById("sysInventory");
    if(inv)inv.innerHTML='<span>RESCUED <b>'+S.rescued+'</b></span><span>REPAIRS <b>'+S.repairs+'</b></span><span>DRONE SCANS <b>'+S.scans+'</b></span><span>MEDICS <b>'+S.medics+'</b></span><span>VEHICLE HP <b>'+Math.round(S.vehicleHealth)+'%</b></span>';
  }

  function persist(){
    try{localStorage.setItem("last72_systems_v1",JSON.stringify({xp:S.xp,reputation:S.reputation,rescued:S.rescued,repairs:S.repairs,scans:S.scans}));document.getElementById("sysSave").textContent="AUTOSAVE • "+new Date().toLocaleTimeString();}catch(e){}
  }
  function restore(){
    try{const x=JSON.parse(localStorage.getItem("last72_systems_v1")||"null");if(x){S.xp=x.xp||0;S.reputation=x.reputation||0;S.rescued=x.rescued||0;S.repairs=x.repairs||0;S.scans=x.scans||0;}}catch(e){}
  }

  const keys=Object.create(null);
  addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();keys[k]=true;
    if(["r","f","g","h","b","q"].includes(k) && !e.repeat && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){resolve(k);e.preventDefault();}
    if(k==="v"&&!e.repeat&&!document.getElementById("actualGameCanvas")){cycleVehicle();}
    if(k==="x"&&!e.repeat){fieldAction("rescue");e.preventDefault();}
    if(k==="z"&&!e.repeat){fieldAction("convoy");e.preventDefault();}
    if(k==="t"&&!e.repeat){fieldAction("drone");e.preventDefault();}
    if(k==="p"&&!e.repeat){fieldAction("pump");e.preventDefault();}
    if(k==="c"&&!e.repeat){fieldAction("broadcast");e.preventDefault();}
  });
  addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});

  restore();wrapCore();render();toast("GAMEPLAY SYSTEMS ONLINE • Dynamic incidents enabled",true);
  let last=performance.now();
  function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;tick(dt);requestAnimationFrame(loop)}
  requestAnimationFrame(loop);
})();

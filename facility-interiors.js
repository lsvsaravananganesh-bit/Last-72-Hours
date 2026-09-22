(()=>{
  if(window.__L72_FACILITY_INTERIORS__)return;
  window.__L72_FACILITY_INTERIORS__=true;
  const shell=document.createElement("div"); shell.id="facilityInterior"; shell.innerHTML=
    '<div class="fi-backdrop"></div><div class="fi-shell"><header class="fi-head"><div><span class="fi-kicker">SURYA NAGAR // FACILITY INTERIOR</span><h2 id="fiTitle">FACILITY</h2><p id="fiSubtitle">Operational service area</p></div><div class="fi-head-right"><span id="fiStatus">ONLINE</span><button id="fiExit">EXIT TO CITY <b>ESC</b></button></div></header><main class="fi-main"><div class="fi-room" id="fiRoom"><div class="fi-grid"></div><div class="fi-door"></div><div class="fi-room-label" id="fiRoomLabel">SERVICE FLOOR</div><div class="fi-npcs" id="fiNpcs"></div><div class="fi-console" id="fiConsole"></div></div><aside class="fi-services"><div class="fi-mini">AVAILABLE SERVICES</div><div id="fiServices"></div><div class="fi-result" id="fiResult">Walk to a service point or select an operation.</div></aside></main><footer class="fi-footer"><span><b>WASD</b> MOVE IS DISABLED INSIDE • <b>E</b> USE SERVICE</span><span id="fiHint">FACILITY OPERATIONS</span></footer></div>';
  document.body.appendChild(shell);
  const title=document.getElementById("fiTitle"),subtitle=document.getElementById("fiSubtitle"),status=document.getElementById("fiStatus"),services=document.getElementById("fiServices"),result=document.getElementById("fiResult"),room=document.getElementById("fiRoom"),npcs=document.getElementById("fiNpcs"),consoleEl=document.getElementById("fiConsole");
  let active=null,open=false;
  const configs={
    eoc:{title:"EMERGENCY OPERATIONS CENTER",subtitle:"Command floor • mission control • intelligence",label:"COMMAND FLOOR",services:[["OPERATIONS DESK","Review active mission and command priorities",null],["PLANNING DESK","Reassess cyclone intelligence",null],["PUBLIC INFORMATION","Open warning network", "comms"]],npcs:["COMMANDER","PLANNER","DISPATCH"]},
    hospital:{title:"CITY HOSPITAL",subtitle:"Emergency department • medical continuity",label:"EMERGENCY DEPARTMENT",services:[["EMERGENCY INTAKE","Increase hospital readiness","hospital"],["MEDICAL TRIAGE","Stabilize incoming demand","hospital"],["AMBULANCE BAY","Prepare emergency response","hospital"]],npcs:["DOCTOR","PARAMEDIC","NURSE"]},
    police:{title:"POLICE STATION",subtitle:"Public order • traffic • evacuation support",label:"OPERATIONS ROOM",services:[["PUBLIC ORDER","Reduce panic in the city","police"],["TRAFFIC CONTROL","Coordinate emergency movement","roads"],["EVACUATION SUPPORT","Prepare police escort","police"]],npcs:["OFFICER","DISPATCH","TRAFFIC UNIT"]},
    fire:{title:"FIRE & RESCUE STATION",subtitle:"Fire suppression • rescue dispatch",label:"RESCUE BAY",services:[["DISPATCH FIRE CREW","Reduce active fire pressure","fire"],["EQUIPMENT CHECK","Prepare rescue resources","fire"],["RESCUE BRIEFING","Review active distress calls",null]],npcs:["FIRE CAPTAIN","RESCUE CREW","DISPATCH"]},
    shelter:{title:"EMERGENCY SHELTER",subtitle:"Reception • supplies • displaced families",label:"SHELTER HALL",services:[["OPEN CAPACITY","Relieve shelter pressure","shelter"],["SUPPLY DESK","Request food and medical supplies","market"],["REGISTRATION","Process incoming families",null]],npcs:["COORDINATOR","VOLUNTEER","FAMILY"]},
    fuel:{title:"EMERGENCY FUEL DEPOT",subtitle:"Fleet logistics • fuel reserve",label:"FUEL YARD",services:[["REFUEL FLEET","Restore emergency vehicle fuel","fuel"],["FLEET CHECK","Review vehicle readiness",null]],npcs:["LOGISTICS","FUEL TECH","DISPATCH"]},
    garage:{title:"RESCUE VEHICLE GARAGE",subtitle:"Vehicle maintenance • fleet deployment",label:"SERVICE BAY",services:[["REPAIR FLEET","Restore vehicle health","garage"],["DEPLOY SUV","Prepare rescue SUV","garage"],["FLEET STATUS","Inspect emergency fleet",null]],npcs:["MECHANIC","DRIVER","FLEET CHIEF"]},
    comms:{title:"COMMUNICATIONS TOWER",subtitle:"Warning network • public information",label:"SIGNAL CONTROL",services:[["RESTORE WARNING NETWORK","Reduce misinformation and restore trust","comms"],["BROADCAST ALERT","Send citywide warning","warning"],["SIGNAL CHECK","Inspect communications status",null]],npcs:["RADIO OPERATOR","PUBLIC INFORMATION","TECHNICIAN"]},
    power:{title:"POWER SUBSTATION",subtitle:"Grid continuity • critical infrastructure",label:"GRID CONTROL",services:[["STABILIZE GRID","Increase available power","power"],["ISOLATE FAILURE","Prevent cascading outage", "power"]],npcs:["GRID ENGINEER","TECHNICIAN"]},
    water:{title:"WATER PUMP STATION",subtitle:"Flood control • drainage",label:"PUMP CONTROL",services:[["ACTIVATE PUMPS","Lower flood pressure","water"],["DRAINAGE CHECK","Inspect water systems",null]],npcs:["WATER ENGINEER","OPERATOR"]},
    bus:{title:"EVACUATION BUS DEPOT",subtitle:"Mass evacuation • vehicle staging",label:"BUS DEPOT",services:[["READY EVAC BUS","Prepare evacuation vehicle","bus"],["LOAD SUPPLIES","Prepare convoy resources","market"]],npcs:["BUS DRIVER","LOGISTICS","EVAC COORDINATOR"]},
    harbor:{title:"RESCUE HARBOUR",subtitle:"Marine rescue • coastal evacuation",label:"MARINE RESPONSE",services:[["LAUNCH RESCUE BOAT","Prepare marine response","harbor"],["COASTAL RESCUE","Review harbour distress calls",null]],npcs:["BOAT CREW","HARBOUR MASTER","RESCUE DIVER"]},
    heli:{title:"EMERGENCY HELIPAD",subtitle:"Air rescue • rapid deployment",label:"HELIPAD CONTROL",services:[["READY HELICOPTER","Prepare rapid-response aircraft","heli"],["AIR RECON","Review city emergency picture",null]],npcs:["PILOT","AIR CREW"]},
    market:{title:"RELIEF SUPPLY MARKET",subtitle:"Food • medical supplies • relief logistics",label:"RELIEF WAREHOUSE",services:[["LOAD FOOD","Increase emergency food stock","market"],["LOAD MEDICAL KITS","Increase medical supplies","market"],["SUPPLY DISPATCH","Prepare relief shipment", "market"]],npcs:["WAREHOUSE LEAD","VOLUNTEER","SUPPLY DRIVER"]}
  };
  function render(c){
    title.textContent=c.title;subtitle.textContent=c.subtitle;document.getElementById("fiRoomLabel").textContent=c.label;
    npcs.innerHTML=c.npcs.map((n,i)=>'<span class="fi-npc n'+i+'"><i></i>'+n+'</span>').join('');
    consoleEl.innerHTML='<span class="fi-screen">LIVE</span><span class="fi-screen">OPERATIONS</span><span class="fi-screen">NETWORK</span>';
    services.innerHTML=c.services.map((s,i)=>'<button class="fi-service" data-service="'+i+'"><b>'+s[0]+'</b><span>'+s[1]+'</span><em>'+(s[2]?'USE':'INSPECT')+'</em></button>').join('');
    services.querySelectorAll(".fi-service").forEach((b,i)=>b.addEventListener("click",()=>act(c.services[i])));
  }
  function act(s){
    if(s[2]&&window.Last72FacilityService) window.Last72FacilityService(s[2]);
    const msg=s[2]?'SERVICE COMPLETE • '+s[0]:'INSPECTION COMPLETE • '+s[0];
    result.textContent=msg;result.classList.add("flash");setTimeout(()=>result.classList.remove("flash"),350);
    status.textContent=s[2]?"SERVICE COMPLETE":"INSPECTION";
    try{window.dispatchEvent(new CustomEvent("l72:feedback",{detail:msg}))}catch(e){}
  }
  function exit(){
    if(!open)return;open=false;shell.classList.remove("show");
    if(window.Last72Game){window.Last72Game.setPaused(false);if(active)window.Last72Game.setPlayerPosition(active.x,active.y+105)}
    active=null;status.textContent="ONLINE";
  }
  window.Last72Facility={enter(f){
    const c=configs[f.type]||{title:f.name,subtitle:"Emergency facility",label:"SERVICE AREA",services:[["INSPECT FACILITY","Review available operations",null]],npcs:["STAFF"]};
    active={...f};open=true;render(c);shell.classList.add("show");
    if(window.Last72Game){window.Last72Game.setPaused(true);window.Last72Game.setPlayerPosition(f.x,f.y+55)}
    status.textContent="FACILITY ACTIVE";result.textContent="ENTERED • "+c.title+" • Select a service.";sayFacility("ENTERED • "+c.title);
  }};
  function sayFacility(t){try{window.dispatchEvent(new CustomEvent("l72:feedback",{detail:t}))}catch(e){}}
  document.getElementById("fiExit").addEventListener("click",exit);
  addEventListener("keydown",e=>{if(!open)return;if(e.key==="Escape"){exit();e.preventDefault()}if(e.key.toLowerCase()==="e"){const first=services.querySelector(".fi-service");if(first)first.click();e.preventDefault()}});
})();
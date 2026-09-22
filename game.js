const zoneData = {
  coastal:{name:"Coastal Ward",risk:"CRITICAL",population:14200,vulnerable:4200,capacity:2400,evacuated:0,readiness:18},
  harbour:{name:"Harbour",risk:"CRITICAL",population:8600,vulnerable:1900,capacity:1600,evacuated:0,readiness:22},
  oldtown:{name:"Old Town",risk:"HIGH",population:11800,vulnerable:3100,capacity:2200,evacuated:0,readiness:30},
  riverside:{name:"Riverside",risk:"HIGH",population:9700,vulnerable:2800,capacity:1800,evacuated:0,readiness:25},
  industrial:{name:"Industrial",risk:"HIGH",population:7600,vulnerable:1100,capacity:900,evacuated:0,readiness:34},
  north:{name:"North Hills",risk:"MODERATE",population:6200,vulnerable:900,capacity:1700,evacuated:0,readiness:55},
  market:{name:"Market District",risk:"MODERATE",population:10400,vulnerable:2100,capacity:2500,evacuated:0,readiness:42},
  villages:{name:"Outer Villages",risk:"HIGH",population:13950,vulnerable:3600,capacity:2600,evacuated:0,readiness:28}
};

const initialZones = JSON.parse(JSON.stringify(zoneData));
const state = {
  hours:72,budget:100,safety:82,distance:720,confidence:61,wind:55,turn:1,ended:false,
  peopleProtected:0,evacuated:0,shelterCapacity:0,vehicles:18,teams:12,food:100,medical:100,communications:100,
  forecastShift:0,landfallZone:"coastal",history:[],routesOpen:true,hospitalReady:52,trust:62,panic:18,congestion:20,power:86,misinformation:12,shelterStress:0,chainReactions:0
};

const $=id=>document.getElementById(id);
const feed=$("feed");

function addFeed(message){
  const e=document.createElement("div");e.className="feed-item";e.textContent=message;
  feed.prepend(e);while(feed.children.length>7)feed.lastChild.remove();
}
function totalPopulation(){return Object.values(zoneData).reduce((n,z)=>n+z.population,0)}
function highRiskPopulation(){return Object.values(zoneData).filter(z=>z.risk==="CRITICAL"||z.risk==="HIGH").reduce((n,z)=>n+z.population,0)}
function phase(){return state.hours>48?"PREPARATION PHASE":state.hours>24?"ESCALATION PHASE":state.hours>0?"CRISIS PHASE":"LANDFALL"}

function updateRisk(){
  Object.entries(zoneData).forEach(([key,z])=>{
    const base={coastal:95,harbour:90,oldtown:72,riverside:78,industrial:68,north:38,market:48,villages:75}[key];
    const distanceFactor=Math.max(0,(720-state.distance)/7);
    z.riskScore=Math.min(100,Math.round(base+distanceFactor+(state.forecastShift===key?12:0)));
    z.risk=z.riskScore>=88?"CRITICAL":z.riskScore>=62?"HIGH":z.riskScore>=42?"MODERATE":"LOW";
  });
}

function render(){
  updateRisk();
  $("clock").textContent=String(Math.max(0,state.hours)).padStart(2,"0")+":00";
  $("turn").textContent="TURN "+Math.min(state.turn,12)+" / 12";
  $("budget").textContent="₹"+state.budget;
  $("safety").textContent=Math.max(0,Math.round(state.safety))+"%";
  $("distance").textContent=Math.max(0,state.distance)+" km";
  $("confidence").textContent=Math.round(state.confidence)+"%";
  $("wind").textContent="WIND "+Math.round(state.wind)+" km/h";
  $("phase").textContent=phase();

  const progress=Math.min(1,(720-state.distance)/720);
  const storm=$("storm");
  storm.style.right=(3+progress*45)+"%";storm.style.bottom=(5+progress*30)+"%";
  storm.style.transform="scale("+(1+progress*.8)+")";

  const costs={evacuate:15,shelter:10,warning:5,hospital:12,roads:8};
  document.querySelectorAll(".action").forEach(b=>b.disabled=state.ended||state.budget<costs[b.dataset.action]);

  document.querySelectorAll(".zone").forEach(z=>{
    const d=zoneData[z.dataset.zone],label=z.querySelector("i");
    label.textContent=d.risk+" RISK";z.classList.toggle("danger",d.risk==="CRITICAL");
  });

  ["routeA","routeB","routeC"].forEach(id=>$(id).classList.toggle("closed",!state.routesOpen));
  ["markerA","markerB","markerC"].forEach(id=>$(id).style.opacity=state.routesOpen?"1":".25");

  document.querySelectorAll(".hospital").forEach(h=>h.classList.toggle("closed",state.hospitalReady<35));

  $("decisionBox").innerHTML="<strong>OPERATIONS STATUS</strong><p>Evacuated: "+state.evacuated.toLocaleString("en-IN")+" / "+highRiskPopulation().toLocaleString("en-IN")+" high-risk residents.</p><p>Vehicles: "+state.vehicles+" • Teams: "+state.teams+" • Food: "+state.food+"% • Medical: "+state.medical+"% • Communications: "+state.communications+"%</p><p>Public trust: "+state.trust+"% • Panic: "+state.panic+"% • Traffic congestion: "+state.congestion+"% • Power: "+state.power+"% • Misinformation: "+state.misinformation+"%</p><p>Human response changes every decision. High panic, congestion and misinformation can trigger cascading failures.</p>";
}

function spend(cost){if(state.budget<cost){addFeed("COMMAND BLOCKED • Budget is insufficient.");return false}state.budget-=cost;return true}

function selectZone(key){
  document.querySelectorAll(".zone").forEach(x=>x.classList.remove("selected"));
  const node=document.querySelector('[data-zone="'+key+'"]');if(node)node.classList.add("selected");
  const z=zoneData[key];
  $("decisionBox").innerHTML="<strong>ZONE INTELLIGENCE</strong><p><b>"+z.name+"</b> — "+z.risk+" risk.</p><p>Population: "+z.population.toLocaleString("en-IN")+" • Vulnerable: "+z.vulnerable.toLocaleString("en-IN")+" • Shelter capacity: "+z.capacity.toLocaleString("en-IN")+" • Readiness: "+z.readiness+"%</p><p>Evacuated: "+z.evacuated.toLocaleString("en-IN")+"</p>";
  addFeed("MAP • "+z.name+" selected. Risk: "+z.risk+".");
}

function inspectFacility(type){
  if(type.startsWith("shelter")){
    const cap=Object.values(zoneData).reduce((n,z)=>n+z.capacity,0);
    $("decisionBox").innerHTML="<strong>SHELTER NETWORK</strong><p>Total capacity: "+cap.toLocaleString("en-IN")+" residents.</p><p>Current evacuation demand: "+state.evacuated.toLocaleString("en-IN")+" moved. Remaining food: "+state.food+"%.</p>";
    addFeed("FACILITY • Shelter network inspected.");
  }else{
    $("decisionBox").innerHTML="<strong>HOSPITAL NETWORK</strong><p>Hospital readiness: "+state.hospitalReady+"%.</p><p>Medical supplies: "+state.medical+"% • Emergency teams: "+state.teams+".</p>";
    addFeed("FACILITY • Hospital network inspected.");
  }
}

function runEvent(){
  const events=[
    {text:"Hospital generator failure. Medical capacity drops.",effect:()=>{state.medical=Math.max(0,state.medical-16);state.hospitalReady=Math.max(0,state.hospitalReady-18);state.safety-=4}},
    {text:"Heavy rainfall floods Riverside access roads.",effect:()=>{zoneData.riverside.readiness=Math.max(0,zoneData.riverside.readiness-12);state.routesOpen=false;state.safety-=3}},
    {text:"Bridge blockage isolates part of the Outer Villages.",effect:()=>{state.vehicles=Math.max(0,state.vehicles-2);state.routesOpen=false;state.safety-=3}},
    {text:"Mobile network congestion slows public warnings.",effect:()=>{state.communications=Math.max(0,state.communications-15);state.confidence-=4}},
    {text:"Community volunteers arrive with boats and supplies.",effect:()=>{state.vehicles+=2;state.food=Math.min(100,state.food+12);state.safety+=3}},
    {text:"Forecast models converge on a narrower landfall corridor.",effect:()=>{state.confidence=Math.min(96,state.confidence+10);state.forecastShift="coastal";state.safety+=2}},
    {text:"Power demand spikes across the city.",effect:()=>{state.power=Math.max(0,state.power-14);state.food=Math.max(0,state.food-7);state.medical=Math.max(0,state.medical-5);state.safety-=2}},
    {text:"Some families refuse evacuation after hearing conflicting messages.",effect:()=>{const refusal=Math.round((100-state.trust+state.misinformation+state.panic)*9);state.evacuated=Math.max(0,state.evacuated-refusal);state.trust=Math.max(0,state.trust-5);state.panic=Math.min(100,state.panic+9);state.safety-=4;state.chainReactions++}},
    {text:"False evacuation messages spread through local groups.",effect:()=>{state.misinformation=Math.min(100,state.misinformation+24);state.trust=Math.max(0,state.trust-8);state.panic=Math.min(100,state.panic+14);state.congestion=Math.min(100,state.congestion+10);state.safety-=4;state.chainReactions++}},
    {text:"Power failure disrupts water pumps and one shelter wing.",effect:()=>{state.power=Math.max(0,state.power-24);state.shelterStress=Math.min(100,state.shelterStress+15);state.food=Math.max(0,state.food-8);state.panic=Math.min(100,state.panic+8);state.safety-=4;state.chainReactions++}},
    {text:"Traffic congestion delays emergency convoys.",effect:()=>{state.congestion=Math.min(100,state.congestion+22);state.vehicles=Math.max(1,state.vehicles-2);state.safety-=3;state.chainReactions++}},
    {text:"Hospital emergency surge: patients arrive faster than expected.",effect:()=>{state.medical=Math.max(0,state.medical-18);state.hospitalReady=Math.max(0,state.hospitalReady-12);state.teams=Math.max(1,state.teams-2);state.panic=Math.min(100,state.panic+5);state.safety-=4;state.chainReactions++}},
    {text:"Trusted local volunteers calm residents and guide families to shelters.",effect:()=>{state.trust=Math.min(100,state.trust+12);state.panic=Math.max(0,state.panic-10);state.misinformation=Math.max(0,state.misinformation-8);state.congestion=Math.max(0,state.congestion-8);state.safety+=4}},
    {text:"Shelters begin to overcrowd as more families arrive.",effect:()=>{state.shelterStress=Math.min(100,state.shelterStress+18);state.food=Math.max(0,state.food-10);state.panic=Math.min(100,state.panic+7);state.safety-=3;state.chainReactions++}}
  ];
  const e=events[Math.floor(Math.random()*events.length)];e.effect();
  $("alert").textContent=e.text;addFeed("EVENT • "+e.text);
}

function evacuate(){
  if(!spend(15))return;
  const maxMove=Math.max(1,state.vehicles)*180;
  let remaining=maxMove;
  const priority=Object.entries(zoneData).sort((a,b)=>b[1].riskScore-a[1].riskScore);
  for(const [,z] of priority){
    if(remaining<=0)break;
    const need=Math.max(0,z.vulnerable-z.evacuated);
    const move=Math.min(need,remaining,z.capacity-z.evacuated);
    z.evacuated+=move;remaining-=move;
  }
  const moved=maxMove-remaining;
  state.evacuated+=moved;
  state.vehicles=Math.max(1,state.vehicles-Math.ceil(moved/360));
  state.congestion=Math.min(100,state.congestion+Math.round(moved/650));
  const complianceBonus=Math.max(0,(state.trust-state.misinformation-state.panic*.45)/18);
  state.safety+=Math.min(9,(moved/550)+complianceBonus);
  state.panic=Math.max(0,state.panic-4);
  if(!state.routesOpen)state.safety-=3;
  if(state.congestion>70){state.safety-=4;state.chainReactions++;addFeed("CASCADING EFFECT • Traffic congestion is delaying evacuation convoys.");}
  addFeed("COMMAND • Evacuation convoy moved "+moved.toLocaleString("en-IN")+" vulnerable residents.");
}

function shelter(){
  if(!spend(10))return;
  const added=1600;state.shelterCapacity+=added;state.food=Math.max(0,state.food-5);
  Object.values(zoneData).forEach(z=>z.capacity+=200);
  state.shelterStress=Math.max(0,state.shelterStress-18);state.panic=Math.max(0,state.panic-5);
  state.safety+=6;addFeed("COMMAND • "+added.toLocaleString("en-IN")+" emergency shelter places prepared.");
}

function warning(){
  if(!spend(5))return;
  state.communications=Math.min(100,state.communications+12);state.confidence=Math.min(96,state.confidence+4);state.trust=Math.min(100,state.trust+9);state.misinformation=Math.max(0,state.misinformation-14);state.panic=Math.max(0,state.panic-7);
  Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+5));
  state.safety+=4;addFeed("COMMAND • Public warning issued across radio, mobile and community channels.");
}

function hospital(){
  if(!spend(12))return;
  state.medical=Math.min(100,state.medical+22);state.hospitalReady=Math.min(100,state.hospitalReady+25);state.power=Math.min(100,state.power+10);state.panic=Math.max(0,state.panic-3);
  state.teams=Math.max(1,state.teams-1);state.safety+=7;
  addFeed("COMMAND • Hospitals reinforced with generator fuel, medicine and emergency teams.");
}

function roads(){
  if(!spend(8))return;
  state.vehicles=Math.min(24,state.vehicles+3);state.routesOpen=true;state.congestion=Math.max(0,state.congestion-28);
  Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+4));
  state.safety+=5;addFeed("COMMAND • Critical evacuation routes cleared; emergency vehicles repositioned.");
}

function takeAction(action){
  if(state.ended)return;
  const actions={evacuate,shelter,warning,hospital,roads};if(!actions[action])return;
  const before=state.safety;actions[action]();
  state.history.push({turn:state.turn,action,safety:state.safety});
  state.hours=Math.max(0,state.hours-6);state.turn++;
  state.distance=Math.max(0,state.distance-95);state.wind=Math.min(175,state.wind+8);
  state.confidence=Math.min(96,state.confidence+Math.floor(Math.random()*5));
  if(state.hours<=24)state.safety-=3;else state.safety-=1.5;
  if(state.turn%2===0)runEvent();
  if(state.communications<40)state.safety-=2;
  if(state.medical<35)state.safety-=2;
  if(state.power<35){state.safety-=3;state.chainReactions++;addFeed("CASCADING EFFECT • Power instability is affecting essential services.");}
  if(state.trust<35){state.safety-=3;state.panic=Math.min(100,state.panic+5);}
  if(state.misinformation>55){state.safety-=3;state.chainReactions++;addFeed("CASCADING EFFECT • Misinformation is disrupting public compliance.");}
  if(state.congestion>75){state.safety-=3;state.vehicles=Math.max(1,state.vehicles-1);}
  if(state.shelterStress>70){state.safety-=3;state.medical=Math.max(0,state.medical-4);}
  state.safety-=Math.max(0,(state.panic-60)/12);
  state.safety=Math.max(0,Math.min(100,state.safety));
  state.trust=Math.max(0,Math.min(100,state.trust));state.panic=Math.max(0,Math.min(100,state.panic));state.congestion=Math.max(0,Math.min(100,state.congestion));state.power=Math.max(0,Math.min(100,state.power));state.misinformation=Math.max(0,Math.min(100,state.misinformation));
  $("decisionBox").innerHTML="<strong>DECISION LOGGED</strong><p>"+action.toUpperCase()+" completed. Safety changed from "+Math.round(before)+"% to "+Math.round(state.safety)+"%.</p><p>"+state.hours+" hours remain until landfall.</p>";
  render();if(state.hours<=0)endGame();
}

function endGame(){
  state.ended=true;state.hours=0;
  const protectionRate=Math.max(0,Math.min(1,state.safety/100));
  const people=Math.round(totalPopulation()*protectionRate);state.peopleProtected=people;
  const humanFactor=Math.round((state.trust+(100-state.panic)+(100-state.misinformation)+(100-state.congestion)+state.power)/5);
  const grade=state.safety>=92?"A+":state.safety>=84?"A":state.safety>=74?"B":state.safety>=62?"C":"D";
  $("finalSafety").textContent=Math.round(state.safety)+"%";$("people").textContent=people.toLocaleString("en-IN");
  $("leftBudget").textContent="₹"+state.budget;$("grade").textContent=grade;
  $("reportText").textContent="Landfall has occurred. Your command protected an estimated "+people.toLocaleString("en-IN")+" of "+totalPopulation().toLocaleString("en-IN")+" residents. Human behaviour mattered: public trust "+state.trust+"%, panic "+state.panic+"%, misinformation "+state.misinformation+"%, congestion "+state.congestion+"%, power "+state.power+"%. Human-response index: "+humanFactor+"%. Cascading events triggered: "+state.chainReactions+". The outcome reflects evacuation capacity, medical readiness, communications, route availability, resource limits and community behaviour.";
  $("report").hidden=false;$("report").scrollIntoView({behavior:"smooth"});
  addFeed("LANDFALL • Final city safety: "+Math.round(state.safety)+"% • "+people.toLocaleString("en-IN")+" residents protected.");render();
}

document.querySelectorAll(".action").forEach(b=>b.addEventListener("click",()=>takeAction(b.dataset.action)));
document.querySelectorAll(".zone").forEach(z=>z.addEventListener("click",()=>selectZone(z.dataset.zone)));
document.querySelectorAll(".facility").forEach(f=>f.addEventListener("click",()=>inspectFacility(f.dataset.facility)));
$("restart").addEventListener("click",()=>{
  Object.keys(initialZones).forEach(k=>Object.assign(zoneData[k],JSON.parse(JSON.stringify(initialZones[k]))));
  Object.assign(state,{hours:72,budget:100,safety:82,distance:720,confidence:61,wind:55,turn:1,ended:false,peopleProtected:0,evacuated:0,shelterCapacity:0,vehicles:18,teams:12,food:100,medical:100,communications:100,forecastShift:0,landfallZone:"coastal",history:[],routesOpen:true,hospitalReady:52,trust:62,panic:18,congestion:20,power:86,misinformation:12,shelterStress:0,chainReactions:0});
  $("report").hidden=true;feed.innerHTML="";
  addFeed("SYSTEM • New emergency simulation initialized.");
  addFeed("FORECAST • Multiple models show different landfall corridors.");
  addFeed("COMMAND • Protect the city before the 72-hour clock reaches zero.");
  render();window.scrollTo({top:0,behavior:"smooth"});
});
addFeed("SYSTEM • Cyclone warning received. 72 hours until projected landfall.");
addFeed("FORECAST • Three models show different landfall corridors.");
addFeed("COMMAND • You control budget, preparedness and response.");
render();
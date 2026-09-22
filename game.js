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
  hours:72,budget:100,safety:82,distance:720,confidence:61,wind:55,turn:1,
  ended:false,peopleProtected:0,evacuated:0,shelterCapacity:0,
  vehicles:18,teams:12,food:100,medical:100,communications:100,
  forecastShift:0,landfallZone:"coastal",history:[]
};

const $ = id => document.getElementById(id);
const feed = $("feed");

function addFeed(message){
  const e=document.createElement("div");
  e.className="feed-item";
  e.textContent=message;
  feed.prepend(e);
  while(feed.children.length>7) feed.lastChild.remove();
}

function totalPopulation(){return Object.values(zoneData).reduce((n,z)=>n+z.population,0)}
function highRiskPopulation(){return Object.values(zoneData).filter(z=>z.risk==="CRITICAL"||z.risk==="HIGH").reduce((n,z)=>n+z.population,0)}

function phase(){
  if(state.hours>48) return "PREPARATION PHASE";
  if(state.hours>24) return "ESCALATION PHASE";
  if(state.hours>0) return "CRISIS PHASE";
  return "LANDFALL";
}

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
  storm.style.right=(3+progress*45)+"%";
  storm.style.bottom=(5+progress*30)+"%";
  storm.style.transform="scale("+(1+progress*.8)+")";

  const costs={evacuate:15,shelter:10,warning:5,hospital:12,roads:8};
  document.querySelectorAll(".action").forEach(b=>{
    b.disabled=state.ended || state.budget<costs[b.dataset.action];
  });

  document.querySelectorAll(".zone").forEach(z=>{
    const d=zoneData[z.dataset.zone];
    const label=z.querySelector("i");
    label.textContent=d.risk+" RISK";
    z.classList.toggle("danger",d.risk==="CRITICAL");
  });

  const stats=$("decisionBox");
  stats.innerHTML="<strong>OPERATIONS STATUS</strong><p>Evacuated: "+state.evacuated.toLocaleString("en-IN")+" / "+highRiskPopulation().toLocaleString("en-IN")+" high-risk residents.</p><p>Vehicles: "+state.vehicles+" • Teams: "+state.teams+" • Food: "+state.food+"% • Medical: "+state.medical+"% • Communications: "+state.communications+"%</p>";
}

function spend(cost){
  if(state.budget<cost){addFeed("COMMAND BLOCKED • Budget is insufficient.");return false}
  state.budget-=cost;return true;
}

function selectZone(key){
  document.querySelectorAll(".zone").forEach(x=>x.classList.remove("selected"));
  const node=document.querySelector('[data-zone="'+key+'"]');
  if(node) node.classList.add("selected");
  const z=zoneData[key];
  $("decisionBox").innerHTML="<strong>ZONE INTELLIGENCE</strong><p><b>"+z.name+"</b> — "+z.risk+" risk.</p><p>Population: "+z.population.toLocaleString("en-IN")+" • Vulnerable: "+z.vulnerable.toLocaleString("en-IN")+" • Shelter capacity: "+z.capacity.toLocaleString("en-IN")+" • Readiness: "+z.readiness+"%</p><p>Evacuated: "+z.evacuated.toLocaleString("en-IN")+"</p>";
  addFeed("MAP • "+z.name+" selected. Risk: "+z.risk+".");
}

function runEvent(){
  const events=[
    {text:"Hospital generator failure. Medical capacity drops.",effect:()=>{state.medical=Math.max(0,state.medical-16);state.safety-=4}},
    {text:"Heavy rainfall floods Riverside access roads.",effect:()=>{zoneData.riverside.readiness=Math.max(0,zoneData.riverside.readiness-12);state.safety-=3}},
    {text:"Bridge blockage isolates part of the Outer Villages.",effect:()=>{state.vehicles=Math.max(0,state.vehicles-2);state.safety-=3}},
    {text:"Mobile network congestion slows public warnings.",effect:()=>{state.communications=Math.max(0,state.communications-15);state.confidence-=4}},
    {text:"Community volunteers arrive with boats and supplies.",effect:()=>{state.vehicles+=2;state.food=Math.min(100,state.food+12);state.safety+=3}},
    {text:"Forecast models converge on a narrower landfall corridor.",effect:()=>{state.confidence=Math.min(96,state.confidence+10);state.forecastShift="coastal";state.safety+=2}},
    {text:"Power demand spikes across the city.",effect:()=>{state.food=Math.max(0,state.food-7);state.medical=Math.max(0,state.medical-5);state.safety-=2}}
  ];
  const e=events[Math.floor(Math.random()*events.length)];
  e.effect();
  $("alert").textContent=e.text;
  addFeed("EVENT • "+e.text);
}

function evacuate(){
  if(!spend(15))return;
  const availableVehicles=Math.max(1,state.vehicles);
  const maxMove=availableVehicles*180;
  let remaining=maxMove;
  const priority=Object.entries(zoneData).sort((a,b)=>b[1].riskScore-a[1].riskScore);
  for(const [,z] of priority){
    if(remaining<=0)break;
    const need=Math.max(0,z.vulnerable-z.evacuated);
    const move=Math.min(need,remaining,z.capacity-z.evacuated);
    z.evacuated+=move; remaining-=move;
  }
  const moved=maxMove-remaining;
  state.evacuated+=moved;
  state.vehicles=Math.max(1,state.vehicles-Math.ceil(moved/360));
  state.safety+=Math.min(9,moved/550);
  addFeed("COMMAND • Evacuation convoy moved "+moved.toLocaleString("en-IN")+" vulnerable residents.");
}

function shelter(){
  if(!spend(10))return;
  const added=1600;
  state.shelterCapacity+=added;
  state.food=Math.max(0,state.food-5);
  Object.values(zoneData).forEach(z=>z.capacity+=200);
  state.safety+=6;
  addFeed("COMMAND • "+added.toLocaleString("en-IN")+" emergency shelter places prepared.");
}

function warning(){
  if(!spend(5))return;
  state.communications=Math.min(100,state.communications+12);
  state.confidence=Math.min(96,state.confidence+4);
  Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+5));
  state.safety+=4;
  addFeed("COMMAND • Public warning issued across radio, mobile and community channels.");
}

function hospital(){
  if(!spend(12))return;
  state.medical=Math.min(100,state.medical+22);
  state.teams=Math.max(1,state.teams-1);
  state.safety+=7;
  addFeed("COMMAND • Hospitals reinforced with generator fuel, medicine and emergency teams.");
}

function roads(){
  if(!spend(8))return;
  state.vehicles=Math.min(24,state.vehicles+3);
  Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+4));
  state.safety+=5;
  addFeed("COMMAND • Critical evacuation routes cleared; emergency vehicles repositioned.");
}

function takeAction(action){
  if(state.ended)return;
  const actions={evacuate,shelter,warning,hospital,roads};
  const fn=actions[action];
  if(!fn)return;

  const before=state.safety;
  fn();
  state.history.push({turn:state.turn,action,safety:state.safety});
  state.hours=Math.max(0,state.hours-6);
  state.turn++;
  state.distance=Math.max(0,state.distance-95);
  state.wind=Math.min(175,state.wind+8);
  state.confidence=Math.min(96,state.confidence+Math.floor(Math.random()*5));
  if(state.hours<=24) state.safety-=3;
  else state.safety-=1.5;

  if(state.turn%2===0)runEvent();
  if(state.communications<40)state.safety-=2;
  if(state.medical<35)state.safety-=2;
  state.safety=Math.max(0,Math.min(100,state.safety));

  $("decisionBox").innerHTML="<strong>DECISION LOGGED</strong><p>"+action.toUpperCase()+" completed. Safety changed from "+Math.round(before)+"% to "+Math.round(state.safety)+"%.</p><p>"+state.hours+" hours remain until landfall.</p>";
  render();
  if(state.hours<=0)endGame();
}

function endGame(){
  state.ended=true;state.hours=0;
  const protectionRate=Math.max(0,Math.min(1,state.safety/100));
  const people=Math.round(totalPopulation()*protectionRate);
  state.peopleProtected=people;
  const grade=state.safety>=92?"A+":state.safety>=84?"A":state.safety>=74?"B":state.safety>=62?"C":"D";
  $("finalSafety").textContent=Math.round(state.safety)+"%";
  $("people").textContent=people.toLocaleString("en-IN");
  $("leftBudget").textContent="₹"+state.budget;
  $("grade").textContent=grade;
  $("reportText").textContent="Landfall has occurred. Your command protected an estimated "+people.toLocaleString("en-IN")+" of "+totalPopulation().toLocaleString("en-IN")+" residents. The final outcome reflects evacuation capacity, medical readiness, communications, resource limits and cascading events.";
  $("report").hidden=false;
  $("report").scrollIntoView({behavior:"smooth"});
  addFeed("LANDFALL • Final city safety: "+Math.round(state.safety)+"% • "+people.toLocaleString("en-IN")+" residents protected.");
  render();
}

document.querySelectorAll(".action").forEach(b=>b.addEventListener("click",()=>takeAction(b.dataset.action)));
document.querySelectorAll(".zone").forEach(z=>z.addEventListener("click",()=>selectZone(z.dataset.zone)));
$("restart").addEventListener("click",()=>{
  Object.keys(initialZones).forEach(k=>Object.assign(zoneData[k],JSON.parse(JSON.stringify(initialZones[k]))));
  Object.assign(state,{hours:72,budget:100,safety:82,distance:720,confidence:61,wind:55,turn:1,ended:false,peopleProtected:0,evacuated:0,shelterCapacity:0,vehicles:18,teams:12,food:100,medical:100,communications:100,forecastShift:0,landfallZone:"coastal",history:[]});
  $("report").hidden=true;
  feed.innerHTML="";
  addFeed("SYSTEM • New emergency simulation initialized.");
  addFeed("FORECAST • Multiple models show different landfall corridors.");
  addFeed("COMMAND • Protect the city before the 72-hour clock reaches zero.");
  render();
  window.scrollTo({top:0,behavior:"smooth"});
});

addFeed("SYSTEM • Cyclone warning received. 72 hours until projected landfall.");
addFeed("FORECAST • Three models show different landfall corridors.");
addFeed("COMMAND • You control budget, preparedness and response.");
render();

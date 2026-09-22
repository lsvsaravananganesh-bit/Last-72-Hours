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
const initialZones=JSON.parse(JSON.stringify(zoneData));
const GAME_MODES={
  standard:{name:"STANDARD",hours:72,budget:100,wind:55,confidence:61,description:"Full strategic campaign with balanced uncertainty and cascading events."},
  rapid:{name:"RAPID RESPONSE",hours:48,budget:82,wind:78,confidence:54,description:"Less time, tighter budget and faster escalation. Prioritise the highest-risk operations."},
  extreme:{name:"EXTREME STORM",hours:36,budget:70,wind:105,confidence:47,description:"Severe starting conditions, stronger uncertainty and harsher cascading consequences."},
  scenario:{name:"SCENARIO MODE",hours:48,budget:88,wind:82,confidence:52,description:"Choose a focused emergency challenge and adapt your strategy around it."}
};
const SCENARIOS={
  flood:{name:"FLOODED CITY",description:"Riverside and villages face severe rainfall. Roads and shelters are under pressure.",safety:-5,rain:80,congestion:12},
  hospital:{name:"HOSPITAL CRISIS",description:"Medical systems start stressed. Hospital reinforcement becomes critical.",safety:-4,rain:20,congestion:8},
  blackout:{name:"COMMUNICATION BLACKOUT",description:"Public warnings are unreliable. Trust and misinformation become the main threat.",safety:-6,rain:10,congestion:18},
  evacuation:{name:"MASS EVACUATION",description:"A huge vulnerable population must move quickly with limited vehicles.",safety:-3,rain:35,congestion:22},
  infrastructure:{name:"INFRASTRUCTURE FAILURE",description:"Routes, power and essential services begin the mission already damaged.",safety:-7,rain:45,congestion:20}
};
let selectedScenario="flood";
let selectedMode="standard";
const state={mode:"standard",initialHours:72,hours:72,budget:100,safety:82,distance:720,confidence:61,wind:55,turn:1,ended:false,peopleProtected:0,evacuated:0,shelterCapacity:0,vehicles:18,teams:12,food:100,medical:100,communications:100,forecastShift:0,landfallZone:"coastal",history:[],routesOpen:true,hospitalReady:52,trust:62,panic:18,congestion:20,power:86,misinformation:12,shelterStress:0,chainReactions:0,landfallProb:58,rainfall:110,stormRadius:180,trackShift:0,modelA:54,modelB:31,modelC:15,scenario:"Baseline Cyclone",scenarioLevel:1,forecastPressure:1008,objectives:{evacuate:false,shelter:false,warning:false,medical:false,roads:false},commandLog:[]};
const $=id=>document.getElementById(id),feed=$("feed");
function addFeed(message){const e=document.createElement("div");e.className="feed-item";e.textContent=message;feed.prepend(e);while(feed.children.length>7)feed.lastChild.remove()}
function totalPopulation(){return Object.values(zoneData).reduce((n,z)=>n+z.population,0)}
function highRiskPopulation(){return Object.values(zoneData).filter(z=>z.risk==="CRITICAL"||z.risk==="HIGH").reduce((n,z)=>n+z.population,0)}
function phase(){const h=state.hours, total=state.initialHours;return h>total*.66?"PREPARATION PHASE":h>total*.33?"ESCALATION PHASE":h>0?"CRISIS PHASE":"LANDFALL"}

function updateCycloneIntelligence(){
 const progress=Math.min(1,(state.initialHours-state.hours)/state.initialHours);
 const volatility=(100-state.confidence)/8;
 const phaseIndex=Math.min(4,Math.floor(progress*4)+(state.chainReactions>2?1:0));
 const scenarios=[["Baseline Cyclone",1],["Rapid Intensification",2],["Track Deviation",2],["Rainfall-Heavy System",2],["Infrastructure Stress Test",3]];
 const selected=scenarios[phaseIndex];
 state.scenario=selected[0];
 state.scenarioLevel=selected[1];

 const corridorCycle=["coastal","harbour","riverside","villages"];
 const corridorIndex=Math.min(corridorCycle.length-1,Math.floor(progress*4));
 state.landfallZone=corridorCycle[corridorIndex];
 state.forecastShift=state.landfallZone;
 state.trackShift=Math.round((corridorIndex-1.5)*18 + (state.scenarioLevel-1)*8);

 const intensityBonus=state.scenarioLevel===3?14:state.scenarioLevel===2?7:0;
 state.wind=Math.min(190,Math.round(55+progress*105+volatility+intensityBonus));
 state.rainfall=Math.round(110+progress*230+volatility*6+intensityBonus*4+(state.landfallZone==="riverside"?35:0));
 state.stormRadius=Math.round(180+progress*150+(state.wind>130?35:0));
 state.forecastPressure=Math.round(1008-progress*38-volatility-intensityBonus*.5);

 const base={coastal:48,harbour:24,riverside:16,villages:12}[state.landfallZone]||48;
 state.landfallProb=Math.max(35,Math.min(92,Math.round(base+(state.confidence-50)*.35+progress*8+intensityBonus*.35)));

 let a=Math.max(5,Math.round(state.landfallProb));
 let b=Math.max(5,Math.round((100-a)*.55));
 let c=Math.max(5,100-a-b);
 const total=a+b+c;
 state.modelA=Math.round(a*100/total);
 state.modelB=Math.round(b*100/total);
 state.modelC=100-state.modelA-state.modelB;
}
function renderForecast(){$("landfallProb").textContent=state.landfallProb+"%";$("rainfall").textContent=state.rainfall+" mm";$("stormRadius").textContent=state.stormRadius+" km";$("trackShift").textContent=(state.trackShift>=0?"+":"")+state.trackShift+" km";$("models").textContent="MODEL A • "+state.modelA+"%  MODEL B • "+state.modelB+"%  MODEL C • "+state.modelC+"% • "+state.scenario+" • Pressure "+state.forecastPressure+" hPa"}
function updateRisk(){Object.entries(zoneData).forEach(([key,z])=>{const base={coastal:95,harbour:90,oldtown:72,riverside:78,industrial:68,north:38,market:48,villages:75}[key],distanceFactor=Math.max(0,(720-state.distance)/7),corridorBoost=state.forecastShift===key?18:0,rainBoost=(key==="riverside"||key==="villages")?Math.max(0,(state.rainfall-150)/10):0,windBoost=state.wind>135?7:0;z.riskScore=Math.min(100,Math.round(base+distanceFactor+corridorBoost+rainBoost+windBoost));z.risk=z.riskScore>=88?"CRITICAL":z.riskScore>=62?"HIGH":z.riskScore>=42?"MODERATE":"LOW"})}
function renderObjectives(){const names={evacuate:"EVACUATION",shelter:"SHELTERS",warning:"PUBLIC WARNING",medical:"HOSPITALS",roads:"ROUTES"};const done=Object.values(state.objectives).filter(Boolean).length;const box=$("objectives");if(box)box.innerHTML=Object.entries(state.objectives).map(([k,v])=>`<div class="objective ${v?"done":""}"><span>${v?"✓":"○"}</span><b>${names[k]}</b></div>`).join("");const count=$("objectiveCount");if(count)count.textContent=done+"/5"}
function renderCommandLog(){const box=$("commandLog");if(box)box.innerHTML=state.commandLog.length?state.commandLog.slice(-5).reverse().map(x=>`<div><b>${x.action.toUpperCase()}</b><span>Turn ${x.turn} • ${x.result}</span></div>`).join(""):'<div class="empty-log">No commands executed yet.</div>'}
const achievements=[
 {id:"first-command",icon:"⚡",name:"FIRST RESPONSE",desc:"Execute your first command."},
 {id:"all-objectives",icon:"✓",name:"FULL COVERAGE",desc:"Complete all 5 mission objectives."},
 {id:"calm-city",icon:"◎",name:"CALM CITY",desc:"Finish with public trust above 75%."},
 {id:"resource-keeper",icon:"₹",name:"RESOURCE KEEPER",desc:"Finish with at least ₹25 budget."},
 {id:"clean-routes",icon:"↗",name:"OPEN CORRIDOR",desc:"Finish with all critical routes open."}
];
function renderAchievements(){
 const box=$("achievements"); if(!box)return;
 const unlocked={
  "first-command":state.turn>1,
  "all-objectives":Object.values(state.objectives).every(Boolean),
  "calm-city":state.trust>75,
  "resource-keeper":state.budget>=25,
  "clean-routes":state.routesOpen
 };
 box.innerHTML=achievements.map(a=>'<div class="achievement '+(unlocked[a.id]?"unlocked":"")+'"><span>'+a.icon+'</span><div><b>'+a.name+'</b><br>'+a.desc+'</div></div>').join("");
}
function playTone(type="click"){
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=type==="success"?660:type==="alert"?180:420;g.gain.value=.035;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+(type==="alert"?0.16:0.08));}catch(e){}
}
function showImpact(title,details){const box=$("impactPanel");if(box)box.innerHTML="<b>"+title+"</b><span>"+details+"</span>"}
function applyMode(mode){
  const cfg=GAME_MODES[mode]||GAME_MODES.standard;
  selectedMode=mode; state.mode=mode; state.initialHours=cfg.hours; state.hours=cfg.hours;
  state.budget=cfg.budget; state.wind=cfg.wind; state.confidence=cfg.confidence;
  state.distance=mode==="standard"?720:mode==="rapid"?560:mode==="extreme"?430:560;
  state.safety=mode==="extreme"?74:mode==="rapid"?78:mode==="scenario"?77:82;
  document.querySelectorAll(".mode-option").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  const d=$("modeDescription"); if(d)d.textContent=cfg.description;
  const picker=$("scenarioPicker"); if(picker)picker.hidden=mode!=="scenario";
  if(mode==="scenario")applyScenario(selectedScenario,false);
  const clock=$("clock"); if(clock)clock.textContent=cfg.hours+":00"; render();
}
function applyScenario(id,rerender=true){
  const sc=SCENARIOS[id]||SCENARIOS.flood; selectedScenario=id; state.scenario=sc.name; state.scenarioLevel=2;
  state.safety=Math.max(0,state.safety+sc.safety); state.rainfall+=sc.rain; state.congestion=Math.min(100,state.congestion+sc.congestion);
  if(id==="hospital"){state.medical=65;state.hospitalReady=38}
  if(id==="blackout"){state.communications=48;state.misinformation=34;state.trust=48}
  if(id==="evacuation"){state.vehicles=14}
  if(id==="infrastructure"){state.routesOpen=false;state.power=62;state.hospitalReady=42}
  const d=$("modeDescription"); if(d)d.textContent=sc.description; if(rerender)render();
}
document.querySelectorAll(".mode-option").forEach(b=>b.addEventListener("click",()=>applyMode(b.dataset.mode)));
$("scenarioSelect")?.addEventListener("change",e=>{selectedScenario=e.target.value;applyMode("scenario")});
document.querySelectorAll(".mode-option").forEach(b=>b.addEventListener("click",()=>applyMode(b.dataset.mode)));

function startMission(){ applyMode(selectedMode); $("briefingOverlay").classList.add("hidden"); playTone("success"); addFeed("MISSION • "+GAME_MODES[selectedMode].name+" mode activated."); render(); }
function runQuickDemo(){ if(state.ended)return;if(state.ended)return;const sequence=["warning","shelter","evacuate","hospital","roads"];let i=0;const tick=()=>{if(i<sequence.length&&!state.ended){takeAction(sequence[i],"DEMO");i++;setTimeout(tick,550)}};tick();addFeed("JUDGE DEMO • Running the recommended 5-command sequence.");} 
function openJudgeDemo(){const overlay=$("briefingOverlay");if(overlay)overlay.classList.remove("hidden");const card=overlay?.querySelector(".briefing-card");if(card)card.querySelector(".eyebrow").textContent="PROMPT & PLAY • JUDGE DEMO";}
function render(){
 updateCycloneIntelligence();renderObjectives();renderCommandLog();renderAchievements();updateRisk();renderForecast();$("clock").textContent=String(Math.max(0,state.hours)).padStart(2,"0")+":00";const progress=Math.round(((72-state.hours)/72)*100);$("stormProgress").style.width=progress+"%";$("progressLabel").textContent="MISSION PROGRESS • "+progress+"%";$("turn").textContent="TURN "+Math.min(state.turn,12)+" / 12";$("budget").textContent="₹"+state.budget;$("safety").textContent=Math.max(0,Math.round(state.safety))+"%";$("distance").textContent=Math.max(0,state.distance)+" km";$("confidence").textContent=Math.round(state.confidence)+"%";$("wind").textContent="WIND "+Math.round(state.wind)+" km/h • RAIN "+state.rainfall+" mm";$("phase").textContent=phase();
 const stormProgress=Math.min(1,(state.initialHours-state.hours)/state.initialHours),storm=$("storm");storm.style.right=(3+stormProgress*45)+"%";storm.style.bottom=(5+stormProgress*30)+"%";storm.style.transform="scale("+(1+stormProgress*.8)+")";
 const costs={evacuate:15,shelter:10,warning:5,hospital:12,roads:8};document.querySelectorAll(".action").forEach(b=>b.disabled=state.ended||state.budget<costs[b.dataset.action]);
 document.querySelectorAll(".zone").forEach(z=>{const d=zoneData[z.dataset.zone];z.querySelector("i").textContent=d.risk+" RISK";z.classList.toggle("danger",d.risk==="CRITICAL")});
 ["routeA","routeB","routeC"].forEach(id=>$(id).classList.toggle("closed",!state.routesOpen));["markerA","markerB","markerC"].forEach(id=>$(id).style.opacity=state.routesOpen?"1":".25");document.querySelectorAll(".hospital").forEach(h=>h.classList.toggle("closed",state.hospitalReady<35));
 $("decisionBox").innerHTML="<strong>OPERATIONS STATUS</strong><p>Evacuated: "+state.evacuated.toLocaleString("en-IN")+" / "+highRiskPopulation().toLocaleString("en-IN")+" high-risk residents.</p><p>Vehicles: "+state.vehicles+" • Teams: "+state.teams+" • Food: "+state.food+"% • Medical: "+state.medical+"% • Communications: "+state.communications+"%</p><p>Public trust: "+state.trust+"% • Panic: "+state.panic+"% • Traffic congestion: "+state.congestion+"% • Power: "+state.power+"% • Misinformation: "+state.misinformation+"%</p><p>Human response changes every decision. High panic, congestion and misinformation can trigger cascading failures.</p>";
}
function spend(cost){if(state.budget<cost){addFeed("COMMAND BLOCKED • Budget is insufficient.");return false}state.budget-=cost;return true}
function selectZone(key){document.querySelectorAll(".zone").forEach(x=>x.classList.remove("selected"));const node=document.querySelector('[data-zone="'+key+'"]');if(node)node.classList.add("selected");const z=zoneData[key];$("decisionBox").innerHTML="<strong>ZONE INTELLIGENCE</strong><p><b>"+z.name+"</b> — "+z.risk+" risk.</p><p>Population: "+z.population.toLocaleString("en-IN")+" • Vulnerable: "+z.vulnerable.toLocaleString("en-IN")+" • Shelter capacity: "+z.capacity.toLocaleString("en-IN")+" • Readiness: "+z.readiness+"%</p><p>Evacuated: "+z.evacuated.toLocaleString("en-IN")+"</p>";addFeed("MAP • "+z.name+" selected. Risk: "+z.risk+".")}
function inspectFacility(type){if(type.startsWith("shelter")){$("decisionBox").innerHTML="<strong>SHELTER NETWORK</strong><p>Total capacity: "+Object.values(zoneData).reduce((n,z)=>n+z.capacity,0).toLocaleString("en-IN")+" residents.</p><p>Current evacuation demand: "+state.evacuated.toLocaleString("en-IN")+" moved. Remaining food: "+state.food+"%.</p>";addFeed("FACILITY • Shelter network inspected.")}else{$("decisionBox").innerHTML="<strong>HOSPITAL NETWORK</strong><p>Hospital readiness: "+state.hospitalReady+"%.</p><p>Medical supplies: "+state.medical+"% • Emergency teams: "+state.teams+".</p>";addFeed("FACILITY • Hospital network inspected.")}}

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
 ];const e=events[Math.floor(Math.random()*events.length)];e.effect();$("alert").textContent=e.text;addFeed("EVENT • "+e.text)
}
function evacuate(){if(!spend(15))return;const maxMove=Math.max(1,state.vehicles)*180;let remaining=maxMove;const priority=Object.entries(zoneData).sort((a,b)=>b[1].riskScore-a[1].riskScore);for(const [,z] of priority){if(remaining<=0)break;const need=Math.max(0,z.vulnerable-z.evacuated),move=Math.min(need,remaining,z.capacity-z.evacuated);z.evacuated+=move;remaining-=move}const moved=maxMove-remaining;state.evacuated+=moved;state.vehicles=Math.max(1,state.vehicles-Math.ceil(moved/360));state.congestion=Math.min(100,state.congestion+Math.round(moved/650));const complianceBonus=Math.max(0,(state.trust-state.misinformation-state.panic*.45)/18);state.safety+=Math.min(9,moved/550+complianceBonus);state.panic=Math.max(0,state.panic-4);if(!state.routesOpen)state.safety-=3;if(state.congestion>70){state.safety-=4;state.chainReactions++;addFeed("CASCADING EFFECT • Traffic congestion is delaying evacuation convoys.")}addFeed("COMMAND • Evacuation convoy moved "+moved.toLocaleString("en-IN")+" vulnerable residents.");state.objectives.evacuate=true}
function shelter(){if(!spend(10))return;state.shelterCapacity+=1600;state.food=Math.max(0,state.food-5);Object.values(zoneData).forEach(z=>z.capacity+=200);state.shelterStress=Math.max(0,state.shelterStress-18);state.panic=Math.max(0,state.panic-5);state.safety+=6;addFeed("COMMAND • 1,600 emergency shelter places prepared.");state.objectives.shelter=true}
function warning(){if(!spend(5))return;state.communications=Math.min(100,state.communications+12);state.confidence=Math.min(96,state.confidence+4);state.trust=Math.min(100,state.trust+9);state.misinformation=Math.max(0,state.misinformation-14);state.panic=Math.max(0,state.panic-7);Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+5));state.safety+=4;addFeed("COMMAND • Public warning issued across radio, mobile and community channels.");state.objectives.warning=true}
function hospital(){if(!spend(12))return;state.medical=Math.min(100,state.medical+22);state.hospitalReady=Math.min(100,state.hospitalReady+25);state.power=Math.min(100,state.power+10);state.panic=Math.max(0,state.panic-3);state.teams=Math.max(1,state.teams-1);state.safety+=7;addFeed("COMMAND • Hospitals reinforced with generator fuel, medicine and emergency teams.");state.objectives.medical=true}
function roads(){if(!spend(8))return;state.vehicles=Math.min(24,state.vehicles+3);state.routesOpen=true;state.congestion=Math.max(0,state.congestion-28);Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+4));state.safety+=5;addFeed("COMMAND • Critical evacuation routes cleared; emergency vehicles repositioned.");state.objectives.roads=true}

function executeNaturalCommand(raw){
 const text=raw.toLowerCase().replace(/[^a-z0-9\s-]/g," ").replace(/\s+/g," ").trim();
 if(!text)return {ok:false,message:"Type an operational command first."};
 if(/^(help|commands|what can you do)/.test(text))return {ok:false,help:true,message:"Try: evacuate vulnerable residents; prepare shelters; send a public warning; reinforce hospitals; secure the roads; or ask for status."};
 if(/\b(status|situation|report|update)\b/.test(text))return {ok:false,status:true,message:"Current status: "+state.hours+" hours remain, safety "+Math.round(state.safety)+"%, budget ₹"+state.budget+", trust "+state.trust+"%, panic "+state.panic+"%."};
 const matches=[
  {action:"evacuate",keys:["evacuate","evacuation","move families","move residents","relocate"]},
  {action:"shelter",keys:["shelter","shelters","safe shelter","accommodation"]},
  {action:"warning",keys:["warning","warn residents","alert residents","broadcast","communication"]},
  {action:"hospital",keys:["hospital","hospitals","medical","ambulance","doctors"]},
  {action:"roads",keys:["road","roads","route","routes","traffic","convoy","clear roads"]}
 ];
 const found=matches.find(x=>x.keys.some(k=>text.includes(k)));
 if(!found)return {ok:false,message:"I could not map that instruction to an available operation. Try “evacuate vulnerable residents”, “prepare shelters”, “send a warning”, “reinforce hospitals”, or “secure the roads”."};
 const zones=Object.entries(zoneData).filter(([,z])=>text.includes(z.name.toLowerCase())).map(([k])=>k);
 if(zones.length) addFeed("AI COMMANDER • Target zones detected: "+zones.map(k=>zoneData[k].name).join(", ")+". Operation will use the current city-wide command logic.");
 return {ok:true,action:found.action,zones,message:"Interpreted as: "+found.action.toUpperCase()+". "+(zones.length?"Targeting "+zones.map(k=>zoneData[k].name).join(" and ")+".":"Using the available city-wide operation.")};
}
function takeAction(action,source="BUTTON"){
 if(state.ended)return;const actions={evacuate,shelter,warning,hospital,roads};if(!actions[action])return;const before=state.safety;playTone("click");const beforeBudget=state.budget;const beforePanic=state.panic;const beforeTrust=state.trust;const beforeCongestion=state.congestion;actions[action]();state.history.push({turn:state.turn,action,safety:state.safety});state.commandLog.push({turn:state.turn,action,result:"Safety "+Math.round(before)+"% → "+Math.round(state.safety)+"%"});if(state.commandLog.length>20)state.commandLog.shift();state.hours=Math.max(0,state.hours-6);state.turn++;state.distance=Math.max(0,state.distance-95);state.wind=Math.min(175,state.wind+8);state.confidence=Math.min(96,state.confidence+Math.floor(Math.random()*5));if(state.hours<=24)state.safety-=3;else state.safety-=1.5;if(state.turn%2===0)runEvent();if(state.scenarioLevel>=2&&state.turn%3===0){state.confidence=Math.max(34,state.confidence-3);state.safety-=2;addFeed("CYCLONE INTELLIGENCE • "+state.scenario+" is increasing uncertainty.")}if(state.wind>145){state.routesOpen=false;state.congestion=Math.min(100,state.congestion+8);addFeed("WEATHER ESCALATION • Extreme winds are forcing temporary route restrictions.")}if(state.rainfall>260){zoneData.riverside.readiness=Math.max(0,zoneData.riverside.readiness-8);state.shelterStress=Math.min(100,state.shelterStress+6)}if(state.communications<40)state.safety-=2;if(state.medical<35)state.safety-=2;if(state.power<35){state.safety-=3;state.chainReactions++;addFeed("CASCADING EFFECT • Power instability is affecting essential services.")}if(state.trust<35){state.safety-=3;state.panic=Math.min(100,state.panic+5)}if(state.misinformation>55){state.safety-=3;state.chainReactions++;addFeed("CASCADING EFFECT • Misinformation is disrupting public compliance.")}if(state.congestion>75){state.safety-=3;state.vehicles=Math.max(1,state.vehicles-1)}if(state.shelterStress>70){state.safety-=3;state.medical=Math.max(0,state.medical-4)}state.safety-=Math.max(0,(state.panic-60)/12);state.safety=Math.max(0,Math.min(100,state.safety));showImpact(action.toUpperCase()+" • DECISION IMPACT","Safety "+Math.round(before)+"% → "+Math.round(state.safety)+"% • Budget ₹"+beforeBudget+" → ₹"+state.budget+" • Trust "+Math.round(beforeTrust)+"% → "+Math.round(state.trust)+"% • Panic "+Math.round(beforePanic)+"% → "+Math.round(state.panic)+"% • Congestion "+Math.round(beforeCongestion)+"% → "+Math.round(state.congestion)+"%. Watch the feed for cascading effects.");state.trust=Math.max(0,Math.min(100,state.trust));state.panic=Math.max(0,Math.min(100,state.panic));state.congestion=Math.max(0,Math.min(100,state.congestion));state.power=Math.max(0,Math.min(100,state.power));state.misinformation=Math.max(0,Math.min(100,state.misinformation));$("decisionBox").innerHTML="<strong>DECISION LOGGED</strong><p>"+action.toUpperCase()+" completed. Safety changed from "+Math.round(before)+"% to "+Math.round(state.safety)+"%.</p><p>"+state.hours+" hours remain until landfall.</p>";render();if(state.hours<=0)endGame()}

function endGame(){state.ended=true;state.hours=0;const stage=$("landfallStage");if(stage){stage.hidden=false;setTimeout(()=>{stage.hidden=true;},3200);}const people=Math.round(totalPopulation()*Math.max(0,Math.min(1,state.safety/100)));const objectiveCount=Object.values(state.objectives).filter(Boolean).length;state.peopleProtected=people;const humanFactor=Math.round((state.trust+(100-state.panic)+(100-state.misinformation)+(100-state.congestion)+state.power)/5),grade=state.safety>=92?"A+":state.safety>=84?"A":state.safety>=74?"B":state.safety>=62?"C":"D";$("finalSafety").textContent=Math.round(state.safety)+"%";$("finalHighlights").innerHTML="<div class=\"final-highlight\"><b>"+objectiveCount+"/5</b><span>MISSION OBJECTIVES COMPLETED</span></div><div class=\"final-highlight\"><b>"+state.chainReactions+"</b><span>CASCADING EVENTS</span></div><div class=\"final-highlight\"><b>"+humanFactor+"%</b><span>HUMAN RESPONSE INDEX</span></div>";$("people").textContent=people.toLocaleString("en-IN");$("leftBudget").textContent="₹"+state.budget;$("grade").textContent=grade;$("reportText").textContent="Landfall has occurred. Your command protected an estimated "+people.toLocaleString("en-IN")+" of "+totalPopulation().toLocaleString("en-IN")+" residents. Human behaviour mattered: public trust "+state.trust+"%, panic "+state.panic+"%, misinformation "+state.misinformation+"%, congestion "+state.congestion+"%, power "+state.power+"%. Human-response index: "+humanFactor+"%. Cascading events triggered: "+state.chainReactions+". The outcome reflects evacuation capacity, medical readiness, communications, route availability, resource limits and community behaviour. Objective operations completed: "+objectiveCount+"/5.";$("report").hidden=false;$("report").scrollIntoView({behavior:"smooth"});playTone("success");addFeed("LANDFALL • Final city safety: "+Math.round(state.safety)+"% • "+people.toLocaleString("en-IN")+" residents protected.");render()}

document.querySelectorAll(".action").forEach(b=>b.addEventListener("click",()=>takeAction(b.dataset.action)));
document.querySelectorAll(".zone").forEach(z=>z.addEventListener("click",()=>selectZone(z.dataset.zone)));
document.querySelectorAll(".facility").forEach(f=>f.addEventListener("click",()=>inspectFacility(f.dataset.facility)));
$("commandForm").addEventListener("submit",e=>{e.preventDefault();const input=$("commandInput"),result=executeNaturalCommand(input.value);$("commandResult").textContent="COMMANDER • "+result.message;if(result.help||result.status){addFeed("AI COMMANDER • "+result.message)}else if(result.ok){addFeed("AI COMMANDER • "+result.message);takeAction(result.action,"AI")}else addFeed("AI COMMANDER • "+result.message);input.select()});
document.querySelectorAll(".example-command").forEach(b=>b.addEventListener("click",()=>{$("commandInput").value=b.textContent;$("commandInput").focus()}));
$("startMission").addEventListener("click",startMission);$("demoMode").addEventListener("click",openJudgeDemo);$("quickDemo").addEventListener("click",runQuickDemo);$("closeReport").addEventListener("click",()=>{$("report").hidden=true;window.scrollTo({top:0,behavior:"smooth"});});$("restart").addEventListener("click",()=>{Object.keys(initialZones).forEach(k=>Object.assign(zoneData[k],JSON.parse(JSON.stringify(initialZones[k]))));Object.assign(state,{mode:selectedMode,initialHours:GAME_MODES[selectedMode].hours,hours:GAME_MODES[selectedMode].hours,budget:GAME_MODES[selectedMode].budget,safety:selectedMode==="extreme"?74:selectedMode==="rapid"?78:82,distance:selectedMode==="standard"?720:selectedMode==="rapid"?560:430,confidence:GAME_MODES[selectedMode].confidence,wind:GAME_MODES[selectedMode].wind,turn:1,ended:false,peopleProtected:0,evacuated:0,shelterCapacity:0,vehicles:18,teams:12,food:100,medical:100,communications:100,forecastShift:0,landfallZone:"coastal",history:[],routesOpen:true,hospitalReady:52,trust:62,panic:18,congestion:20,power:86,misinformation:12,shelterStress:0,chainReactions:0,landfallProb:58,rainfall:110,stormRadius:180,trackShift:0,modelA:54,modelB:31,modelC:15,scenario:"Baseline Cyclone",scenarioLevel:1,forecastPressure:1008,objectives:{evacuate:false,shelter:false,warning:false,medical:false,roads:false},commandLog:[]});$("report").hidden=true;$("landfallStage").hidden=true;$("briefingOverlay").classList.add("hidden");showImpact("DECISION IMPACT","Execute an operation to see its immediate and cascading effects.");feed.innerHTML="";$("commandResult").textContent="COMMANDER READY • Awaiting your instruction.";addFeed("SYSTEM • New emergency simulation initialized.");addFeed("FORECAST • Multiple models show different landfall corridors.");addFeed("COMMAND • Protect the city before the 72-hour clock reaches zero.");addFeed("CYCLONE INTELLIGENCE • Track models will update after each command.");showImpact("MISSION BRIEFING","Execute an operation to see its immediate and cascading effects.");playTone("success");render();window.scrollTo({top:0,behavior:"smooth"})});
addFeed("FORECAST • Three models show different landfall corridors.");addFeed("COMMAND • You control budget, preparedness and response.");addFeed("CYCLONE INTELLIGENCE • Track models will update after each command.");render();
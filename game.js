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
const state={selectedZone:"coastal",mode:"standard",initialHours:72,hours:72,budget:100,safety:82,distance:720,confidence:61,wind:55,turn:1,ended:false,peopleProtected:0,evacuated:0,shelterCapacity:0,vehicles:18,teams:12,food:100,medical:100,communications:100,forecastShift:0,landfallZone:"coastal",history:[],routesOpen:true,hospitalReady:52,trust:62,panic:18,congestion:20,power:86,misinformation:12,shelterStress:0,chainReactions:0,landfallProb:58,rainfall:110,stormRadius:180,trackShift:0,modelA:54,modelB:31,modelC:15,scenario:"Baseline Cyclone",scenarioLevel:1,forecastPressure:1008,objectives:{evacuate:false,shelter:false,warning:false,medical:false,roads:false},commandLog:[],incidents:[],departments:{command:{readiness:86,load:22},operations:{readiness:78,load:34},planning:{readiness:91,load:18},logistics:{readiness:74,load:42},communications:{readiness:68,load:38}},resourceOrders:[]};
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
function updateDepartments(action){const d=state.departments;const effects={evacuate:["operations","logistics"],shelter:["operations","logistics"],warning:["communications","planning"],hospital:["operations","logistics"],roads:["operations","logistics"]}[action]||[];Object.keys(d).forEach(k=>{d[k].load=Math.min(100,Math.max(0,d[k].load+(effects.includes(k)?9:2)));d[k].readiness=Math.max(20,Math.min(100,d[k].readiness-(effects.includes(k)?2:0)))});if(state.incidents.length>2){d.planning.load=Math.min(100,d.planning.load+5);d.command.load=Math.min(100,d.command.load+4)}if(state.budget<25)d.logistics.readiness=Math.max(20,d.logistics.readiness-4)}
function renderDepartments(){const box=$("departmentBoard");if(!box)return;const names={command:"COMMAND",operations:"OPERATIONS",planning:"PLANNING & INTELLIGENCE",logistics:"LOGISTICS",communications:"PUBLIC INFORMATION"};box.innerHTML=Object.entries(state.departments).map(([k,v])=>'<div class="department-card"><div><b>'+names[k]+'</b><span>'+v.readiness+'% READY</span></div><div class="dept-bar"><i style="width:'+v.readiness+'%"></i></div><small>WORKLOAD '+v.load+'%</small></div>').join('')}
function refreshIncidents(){const next=[];const add=(id,title,type,severity,zone,detail)=>next.push({id,title,type,severity,zone,detail});if(state.communications<65||state.misinformation>30)add("comms","PUBLIC INFORMATION DISRUPTION","COMMUNICATION",state.misinformation>55?"CRITICAL":"HIGH","city","Warning channels are degraded or misinformation is spreading.");if(state.medical<72||state.hospitalReady<55)add("medical","MEDICAL CONTINUITY ALERT","MEDICAL",state.medical<40?"CRITICAL":"HIGH","hospital","Hospitals need reinforcement before emergency demand peaks.");if(!state.routesOpen||state.congestion>65)add("routes","EVACUATION CORRIDOR BLOCKED","LOGISTICS",state.congestion>80?"CRITICAL":"HIGH","network","Convoys are losing time because routes are blocked or congested.");if(state.shelterStress>45||state.food<55)add("shelter","SHELTER CAPACITY PRESSURE","SHELTER",state.shelterStress>75?"CRITICAL":"HIGH","shelters","Shelter demand is approaching operational limits.");if(state.trust<50||state.panic>55)add("public","PUBLIC COMPLIANCE RISK","PUBLIC","HIGH","city","Trust and panic are affecting voluntary compliance.");if(state.landfallProb>72||state.wind>125)add("weather","LANDFALL CORRIDOR ESCALATION","INTELLIGENCE","HIGH",state.landfallZone,"Forecast intensity requires another risk assessment.");state.incidents=next}
function renderIncidentBoard(){const box=$("incidentBoard");if(!box)return;refreshIncidents();if(!state.incidents.length){box.innerHTML='<div class="incident-clear">NO ACTIVE CRITICAL INCIDENTS • Continue monitoring.</div>';return}const rank={CRITICAL:3,HIGH:2,MEDIUM:1};state.incidents.sort((a,b)=>rank[b.severity]-rank[a.severity]);box.innerHTML=state.incidents.slice(0,6).map(x=>'<div class="incident-card '+x.severity.toLowerCase()+'"><div><span class="incident-severity">'+x.severity+'</span><b>'+x.title+'</b></div><small>'+x.detail+'</small><em>ZONE • '+x.zone.toUpperCase()+'</em></div>').join('')}
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
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=window.__L72_AUDIO||(window.__L72_AUDIO=new C());if(c.state==="suspended")c.resume();const o=c.createOscillator(),g=c.createGain();o.type=type==="alert"?"sawtooth":"sine";o.frequency.value=type==="success"?660:type==="alert"?180:420;g.gain.value=.028;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+(type==="alert"?0.16:0.08));}catch(e){}
}
function showImpact(title,details){const box=$("impactPanel");if(box)box.innerHTML="<b>"+title+"</b><span>"+details+"</span>"}
function applyMode(mode){
  const cfg=GAME_MODES[mode]||GAME_MODES.standard;
  selectedMode=mode; state.mode=mode; state.initialHours=cfg.hours; state.hours=cfg.hours;
  state.budget=cfg.budget; state.wind=cfg.wind; state.confidence=cfg.confidence;
  state.distance=mode==="standard"?720:mode==="rapid"?560:mode==="extreme"?430:560;
  state.safety=mode==="extreme"?74:mode==="rapid"?78:mode==="scenario"?77:82;
  state.rainfall=110; state.congestion=20; state.medical=100; state.hospitalReady=52; state.communications=100;
  state.misinformation=12; state.trust=62; state.panic=18; state.power=86; state.shelterStress=0; state.routesOpen=true; state.vehicles=18;
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

function startMission(){ applyMode(selectedMode); $("briefingOverlay").classList.add("hidden"); $("cinematicIntro")?.classList.add("hidden"); $("missionModeStrip")?.classList.add("active"); const label=$("activeModeLabel"); if(label)label.textContent=GAME_MODES[selectedMode].name; playTone("success"); addFeed("MISSION • "+GAME_MODES[selectedMode].name+" mode activated."); render(); }
function runQuickDemo(){ if(state.ended)return;if(state.ended)return;const sequence=["warning","shelter","evacuate","hospital","roads"];let i=0;const tick=()=>{if(i<sequence.length&&!state.ended){takeAction(sequence[i],"DEMO");i++;setTimeout(tick,550)}};tick();addFeed("JUDGE DEMO • Running the recommended 5-command sequence.");} 
function openJudgeDemo(){$("cinematicIntro")?.classList.add("hidden");const overlay=$("briefingOverlay");if(overlay)overlay.classList.remove("hidden");const card=overlay?.querySelector(".briefing-card");if(card)card.querySelector(".eyebrow").textContent="PROMPT & PLAY • JUDGE DEMO";}
function render(){
 updateCycloneIntelligence();renderIncidentBoard();renderDepartments();renderObjectives();renderCommandLog();renderAchievements();updateRisk();renderForecast();$("clock").textContent=String(Math.max(0,state.hours)).padStart(2,"0")+":00";const progress=Math.round(((state.initialHours-state.hours)/state.initialHours)*100);$("stormProgress").style.width=progress+"%";$("progressLabel").textContent="MISSION PROGRESS • "+progress+"%";$("turn").textContent="TURN "+Math.min(state.turn,12)+" / 12";$("budget").textContent="₹"+state.budget;$("safety").textContent=Math.max(0,Math.round(state.safety))+"%";$("distance").textContent=Math.max(0,state.distance)+" km";$("confidence").textContent=Math.round(state.confidence)+"%";$("wind").textContent="WIND "+Math.round(state.wind)+" km/h • RAIN "+state.rainfall+" mm";$("phase").textContent=phase();const selected=zoneData[state.selectedZone]||zoneData.coastal;const targetLabel=$("selectedZoneLabel");if(targetLabel)targetLabel.textContent=selected.name+" • "+selected.risk+" RISK";const hudMissionTitle=$("hudMissionTitle"),hudMissionBrief=$("hudMissionBrief"),hudTarget=$("hudTarget"),hudClock=$("hudClock"),hudSafety=$("hudSafety"),hudBudget=$("hudBudget"),hudObjectives=$("hudObjectives"),hudAlert=$("hudAlert");if(hudClock)hudClock.textContent=String(Math.max(0,state.hours)).padStart(2,"0")+":00";if(hudSafety)hudSafety.textContent=Math.max(0,Math.round(state.safety))+"%";if(hudBudget)hudBudget.textContent="₹"+state.budget;if(hudTarget)hudTarget.textContent=selected.name.toUpperCase()+" • "+selected.risk+" RISK";if(hudObjectives)hudObjectives.textContent=Object.values(state.objectives).filter(Boolean).length+" / 5";if(hudAlert)hudAlert.textContent=state.misinformation>45?"MISINFORMATION SPIKE":state.routesOpen?"FORECAST UNCERTAINTY":"EVACUATION CORRIDOR BLOCKED";
 const stormProgress=Math.min(1,(state.initialHours-state.hours)/state.initialHours),storm=$("storm");storm.style.right=(3+stormProgress*45)+"%";storm.style.bottom=(5+stormProgress*30)+"%";storm.style.transform="scale("+(1+stormProgress*.8)+")";
 const costs={evacuate:15,shelter:10,warning:5,hospital:12,roads:8};document.querySelectorAll(".action").forEach(b=>b.disabled=state.ended||state.budget<costs[b.dataset.action]);
 document.querySelectorAll(".zone").forEach(z=>{const d=zoneData[z.dataset.zone];z.querySelector("i").textContent=d.risk+" RISK";z.classList.toggle("danger",d.risk==="CRITICAL")});
 ["routeA","routeB","routeC"].forEach(id=>$(id).classList.toggle("closed",!state.routesOpen));["markerA","markerB","markerC"].forEach(id=>$(id).style.opacity=state.routesOpen?"1":".25");document.querySelectorAll(".hospital").forEach(h=>h.classList.toggle("closed",state.hospitalReady<35));
 $("decisionBox").innerHTML="<strong>OPERATIONS STATUS</strong><p>Evacuated: "+state.evacuated.toLocaleString("en-IN")+" / "+highRiskPopulation().toLocaleString("en-IN")+" high-risk residents.</p><p>Vehicles: "+state.vehicles+" • Teams: "+state.teams+" • Food: "+state.food+"% • Medical: "+state.medical+"% • Communications: "+state.communications+"%</p><p>Public trust: "+state.trust+"% • Panic: "+state.panic+"% • Traffic congestion: "+state.congestion+"% • Power: "+state.power+"% • Misinformation: "+state.misinformation+"%</p><p>Human response changes every decision. High panic, congestion and misinformation can trigger cascading failures.</p>";
}
function spend(cost){if(state.budget<cost){addFeed("COMMAND BLOCKED • Budget is insufficient.");return false}state.budget-=cost;return true}
function selectZone(key){state.selectedZone=key;document.querySelectorAll(".zone").forEach(x=>x.classList.remove("selected"));const node=document.querySelector('[data-zone="'+key+'"]');if(node)node.classList.add("selected");const z=zoneData[key];$("decisionBox").innerHTML="<strong>ZONE INTELLIGENCE</strong><p><b>"+z.name+"</b> — "+z.risk+" risk.</p><p>Population: "+z.population.toLocaleString("en-IN")+" • Vulnerable: "+z.vulnerable.toLocaleString("en-IN")+" • Shelter capacity: "+z.capacity.toLocaleString("en-IN")+" • Readiness: "+z.readiness+"%</p><p>Evacuated: "+z.evacuated.toLocaleString("en-IN")+"</p>";addFeed("MAP • "+z.name+" selected. Risk: "+z.risk+".")}
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
function evacuate(){
 if(!spend(15))return;
 const target=zoneData[state.selectedZone]||zoneData.coastal;
 const maxMove=Math.max(1,state.vehicles)*140;
 const need=Math.max(0,target.vulnerable-target.evacuated);
 const move=Math.min(need,maxMove,Math.max(0,target.capacity-target.evacuated));
 target.evacuated+=move;
 state.evacuated+=move;
 state.vehicles=Math.max(1,state.vehicles-Math.max(1,Math.ceil(move/420)));
 state.congestion=Math.min(100,state.congestion+Math.round(move/520));
 const compliance=Math.max(0,(state.trust-state.misinformation-state.panic*.45)/16);
 state.safety+=Math.min(10,move/480+compliance);
 state.panic=Math.max(0,state.panic-4);
 target.readiness=Math.min(100,target.readiness+Math.round(move/160));
 if(!state.routesOpen){state.safety-=3;addFeed("CASCADING EFFECT • "+target.name+" evacuation is slowed by a blocked corridor.")}
 if(state.congestion>70){state.safety-=4;state.chainReactions++;addFeed("CASCADING EFFECT • Traffic congestion is delaying evacuation convoys.")}
 addFeed("COMMAND • Evacuation convoy moved "+move.toLocaleString("en-IN")+" vulnerable residents from "+target.name+".");
 state.objectives.evacuate=true
}
function shelter(){
 if(!spend(10))return;
 const target=zoneData[state.selectedZone]||zoneData.north;
 state.shelterCapacity+=1600;
 state.food=Math.max(0,state.food-5);
 target.capacity+=400;
 target.readiness=Math.min(100,target.readiness+12);
 state.shelterStress=Math.max(0,state.shelterStress-18);
 state.panic=Math.max(0,state.panic-5);
 state.safety+=6;
 addFeed("COMMAND • "+target.name+" shelter network expanded by 400 places.");
 state.objectives.shelter=true;
 state.incidents=state.incidents.filter(x=>x.id!=="shelter")
}
function warning(){if(!spend(5))return;state.communications=Math.min(100,state.communications+12);state.confidence=Math.min(96,state.confidence+4);state.trust=Math.min(100,state.trust+9);state.misinformation=Math.max(0,state.misinformation-14);state.panic=Math.max(0,state.panic-7);Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+5));state.safety+=4;addFeed("COMMAND • Public warning issued across radio, mobile and community channels.");state.objectives.warning=true;state.incidents=state.incidents.filter(x=>x.id!=="comms"&&x.id!=="public")}
function hospital(){if(!spend(12))return;state.medical=Math.min(100,state.medical+22);state.hospitalReady=Math.min(100,state.hospitalReady+25);state.power=Math.min(100,state.power+10);state.panic=Math.max(0,state.panic-3);state.teams=Math.max(1,state.teams-1);state.safety+=7;addFeed("COMMAND • Hospital network reinforced for "+(zoneData[state.selectedZone]?.name||"city-wide")+" operations with generator fuel, medicine and emergency teams.");state.objectives.medical=true;state.incidents=state.incidents.filter(x=>x.id!=="medical")}
function roads(){if(!spend(8))return;state.vehicles=Math.min(24,state.vehicles+3);state.routesOpen=true;state.congestion=Math.max(0,state.congestion-28);Object.values(zoneData).forEach(z=>z.readiness=Math.min(100,z.readiness+4));state.safety+=5;addFeed("COMMAND • Critical corridors serving "+(zoneData[state.selectedZone]?.name||"the city")+" cleared; emergency vehicles repositioned.");state.objectives.roads=true;state.incidents=state.incidents.filter(x=>x.id!=="routes")}

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
 if(zones.length){state.selectedZone=zones[0];addFeed("AI COMMANDER • Target zone selected: "+zoneData[zones[0]].name+".");}
 return {ok:true,action:found.action,zones,message:"Interpreted as: "+found.action.toUpperCase()+". "+(zones.length?"Targeting "+zones.map(k=>zoneData[k].name).join(" and ")+".":"Using the available city-wide operation.")};
}
function takeAction(action,source="BUTTON"){
 if(state.ended)return;const actions={evacuate,shelter,warning,hospital,roads};if(!actions[action])return;const before=state.safety;const targetName=(zoneData[state.selectedZone]||zoneData.coastal).name;playTone("click");const beforeBudget=state.budget;const beforePanic=state.panic;const beforeTrust=state.trust;const beforeCongestion=state.congestion;actions[action]();updateDepartments(action);state.history.push({turn:state.turn,action,safety:state.safety});state.commandLog.push({turn:state.turn,action,result:targetName+" • Safety "+Math.round(before)+"% → "+Math.round(state.safety)+"%"});if(state.commandLog.length>20)state.commandLog.shift();state.hours=Math.max(0,state.hours-6);state.turn++;state.distance=Math.max(0,state.distance-95);state.wind=Math.min(175,state.wind+8);state.confidence=Math.min(96,state.confidence+Math.floor(Math.random()*5));if(state.hours<=24)state.safety-=3;else state.safety-=1.5;if(state.turn%2===0)runEvent();if(state.scenarioLevel>=2&&state.turn%3===0){state.confidence=Math.max(34,state.confidence-3);state.safety-=2;addFeed("CYCLONE INTELLIGENCE • "+state.scenario+" is increasing uncertainty.")}if(state.wind>145){state.routesOpen=false;state.congestion=Math.min(100,state.congestion+8);addFeed("WEATHER ESCALATION • Extreme winds are forcing temporary route restrictions.")}if(state.rainfall>260){zoneData.riverside.readiness=Math.max(0,zoneData.riverside.readiness-8);state.shelterStress=Math.min(100,state.shelterStress+6)}if(state.communications<40)state.safety-=2;if(state.medical<35)state.safety-=2;if(state.power<35){state.safety-=3;state.chainReactions++;addFeed("CASCADING EFFECT • Power instability is affecting essential services.")}if(state.trust<35){state.safety-=3;state.panic=Math.min(100,state.panic+5)}if(state.misinformation>55){state.safety-=3;state.chainReactions++;addFeed("CASCADING EFFECT • Misinformation is disrupting public compliance.")}if(state.congestion>75){state.safety-=3;state.vehicles=Math.max(1,state.vehicles-1)}if(state.shelterStress>70){state.safety-=3;state.medical=Math.max(0,state.medical-4)}state.safety-=Math.max(0,(state.panic-60)/12);state.safety=Math.max(0,Math.min(100,state.safety));if(state.safety<=0){state.safety=0;addFeed("CRITICAL FAILURE • City safety has collapsed before landfall.");endGame("FAILURE")}showImpact(action.toUpperCase()+" • DECISION IMPACT","Safety "+Math.round(before)+"% → "+Math.round(state.safety)+"% • Budget ₹"+beforeBudget+" → ₹"+state.budget+" • Trust "+Math.round(beforeTrust)+"% → "+Math.round(state.trust)+"% • Panic "+Math.round(beforePanic)+"% → "+Math.round(state.panic)+"% • Congestion "+Math.round(beforeCongestion)+"% → "+Math.round(state.congestion)+"%. Watch the feed for cascading effects.");state.trust=Math.max(0,Math.min(100,state.trust));state.panic=Math.max(0,Math.min(100,state.panic));state.congestion=Math.max(0,Math.min(100,state.congestion));state.power=Math.max(0,Math.min(100,state.power));state.misinformation=Math.max(0,Math.min(100,state.misinformation));$("decisionBox").innerHTML="<strong>DECISION LOGGED</strong><p>"+action.toUpperCase()+" completed. Safety changed from "+Math.round(before)+"% to "+Math.round(state.safety)+"%.</p><p>"+state.hours+" hours remain until landfall.</p>";render();if(state.hours<=0)endGame()}

function endGame(outcome="LANDFALL"){state.ended=true;state.hours=0;const stage=$("landfallStage");if(stage){stage.hidden=false;setTimeout(()=>{stage.hidden=true;},3200);}const people=Math.round(totalPopulation()*Math.max(0,Math.min(1,state.safety/100)));const outcomeLabel=outcome==="FAILURE"?"CRITICAL FAILURE":"LANDFALL";const objectiveCount=Object.values(state.objectives).filter(Boolean).length;state.peopleProtected=people;const humanFactor=Math.round((state.trust+(100-state.panic)+(100-state.misinformation)+(100-state.congestion)+state.power)/5),grade=state.safety>=92?"A+":state.safety>=84?"A":state.safety>=74?"B":state.safety>=62?"C":"D";$("finalSafety").textContent=Math.round(state.safety)+"%";$("finalHighlights").innerHTML="<div class=\"final-highlight\"><b>"+objectiveCount+"/5</b><span>MISSION OBJECTIVES COMPLETED</span></div><div class=\"final-highlight\"><b>"+state.chainReactions+"</b><span>CASCADING EVENTS</span></div><div class=\"final-highlight\"><b>"+humanFactor+"%</b><span>HUMAN RESPONSE INDEX</span></div>";$("people").textContent=people.toLocaleString("en-IN");$("leftBudget").textContent="₹"+state.budget;$("grade").textContent=grade;$("reportText").textContent=(outcome==="FAILURE"?"The emergency response collapsed before the final landfall window.":"Landfall has occurred.")+"  Your command protected an estimated "+people.toLocaleString("en-IN")+" of "+totalPopulation().toLocaleString("en-IN")+" residents. Human behaviour mattered: public trust "+state.trust+"%, panic "+state.panic+"%, misinformation "+state.misinformation+"%, congestion "+state.congestion+"%, power "+state.power+"%. Human-response index: "+humanFactor+"%. Cascading events triggered: "+state.chainReactions+". The outcome reflects evacuation capacity, medical readiness, communications, route availability, resource limits and community behaviour. Objective operations completed: "+objectiveCount+"/5.";$("report").hidden=false;$("report").scrollIntoView({behavior:"smooth"});playTone("success");addFeed(outcomeLabel+" • Final city safety: "+Math.round(state.safety)+"% • "+people.toLocaleString("en-IN")+" residents protected.");render()}

document.querySelectorAll(".action").forEach(b=>b.addEventListener("click",()=>takeAction(b.dataset.action)));
document.querySelectorAll(".zone").forEach(z=>z.addEventListener("click",()=>selectZone(z.dataset.zone)));
document.querySelectorAll(".facility").forEach(f=>f.addEventListener("click",()=>inspectFacility(f.dataset.facility)));
$("commandForm").addEventListener("submit",e=>{e.preventDefault();const input=$("commandInput"),result=executeNaturalCommand(input.value);$("commandResult").textContent="COMMANDER • "+result.message;if(result.help||result.status){addFeed("AI COMMANDER • "+result.message)}else if(result.ok){addFeed("AI COMMANDER • "+result.message);takeAction(result.action,"AI")}else addFeed("AI COMMANDER • "+result.message);input.select()});
document.querySelectorAll(".example-command").forEach(b=>b.addEventListener("click",()=>{$("commandInput").value=b.textContent;$("commandInput").focus()}));
$("startMission").addEventListener("click",startMission);$("enterCommand")?.addEventListener("click",()=>{const intro=$("cinematicIntro");if(intro)intro.classList.add("hidden");$("briefingOverlay").classList.remove("hidden");playTone("success");});$("demoMode").addEventListener("click",openJudgeDemo);$("quickDemo").addEventListener("click",runQuickDemo);$("closeReport").addEventListener("click",()=>{$("report").hidden=true;window.scrollTo({top:0,behavior:"smooth"});});$("restart").addEventListener("click",()=>{Object.keys(initialZones).forEach(k=>Object.assign(zoneData[k],JSON.parse(JSON.stringify(initialZones[k]))));Object.assign(state,{selectedZone:"coastal",mode:selectedMode,initialHours:GAME_MODES[selectedMode].hours,hours:GAME_MODES[selectedMode].hours,budget:GAME_MODES[selectedMode].budget,safety:selectedMode==="extreme"?74:selectedMode==="rapid"?78:82,distance:selectedMode==="standard"?720:selectedMode==="rapid"?560:430,confidence:GAME_MODES[selectedMode].confidence,wind:GAME_MODES[selectedMode].wind,turn:1,ended:false,peopleProtected:0,evacuated:0,shelterCapacity:0,vehicles:18,teams:12,food:100,medical:100,communications:100,forecastShift:0,landfallZone:"coastal",history:[],routesOpen:true,hospitalReady:52,trust:62,panic:18,congestion:20,power:86,misinformation:12,shelterStress:0,chainReactions:0,landfallProb:58,rainfall:110,stormRadius:180,trackShift:0,modelA:54,modelB:31,modelC:15,scenario:"Baseline Cyclone",scenarioLevel:1,forecastPressure:1008,objectives:{evacuate:false,shelter:false,warning:false,medical:false,roads:false},commandLog:[],incidents:[],departments:{command:{readiness:86,load:22},operations:{readiness:78,load:34},planning:{readiness:91,load:18},logistics:{readiness:74,load:42},communications:{readiness:68,load:38}},resourceOrders:[]});$("report").hidden=true;$("landfallStage").hidden=true;$("briefingOverlay").classList.add("hidden");$("cinematicIntro")?.classList.add("hidden");const modeLabel=$("activeModeLabel");if(modeLabel)modeLabel.textContent=GAME_MODES[selectedMode].name;showImpact("DECISION IMPACT","Execute an operation to see its immediate and cascading effects.");feed.innerHTML="";$("commandResult").textContent="COMMANDER READY • Awaiting your instruction.";addFeed("SYSTEM • New emergency simulation initialized.");addFeed("FORECAST • Multiple models show different landfall corridors.");addFeed("COMMAND • Protect the city before the 72-hour clock reaches zero.");addFeed("CYCLONE INTELLIGENCE • Track models will update after each command.");showImpact("MISSION BRIEFING","Execute an operation to see its immediate and cascading effects.");playTone("success");render();window.scrollTo({top:0,behavior:"smooth"})});
addFeed("FORECAST • Three models show different landfall corridors.");addFeed("COMMAND • You control budget, preparedness and response.");addFeed("CYCLONE INTELLIGENCE • Track models will update after each command.");render();

/* PUBLIC GAME API
   Keep the simulation state/actions behind a small runtime boundary.
   Other systems should call these exports instead of reaching into UI DOM. */
window.Last72State=state;
window.Last72ZoneData=zoneData;
window.Last72TakeAction=takeAction;
window.Last72SelectZone=selectZone;

/* ============================================================
   LAST 72 HOURS — ACTUAL GAMEPLAY ENGINE
   Top-down open-world emergency response layer.
   The canvas is the game; the old dashboard becomes pause/map UI.
   ============================================================ */
(function bootActualGame(){
  const map=document.getElementById("fieldWorld");
  if(!map || window.__actualGameBooted)return;
  window.__actualGameBooted=true;

  const oldNodes=[...map.children].filter(n=>!n.classList.contains("game-hud"));
  oldNodes.forEach(n=>n.style.display="none");
  document.querySelector(".dashboard>.briefing")?.style.setProperty("display","none","important");
  document.querySelector(".dashboard>.actions")?.style.setProperty("display","none","important");
  document.querySelector(".dashboard>.map-panel>.panel-title")?.style.setProperty("display","none","important");
  document.querySelector(".hero")?.style.setProperty("display","none","important");
  document.querySelector(".mission-mode-strip")?.style.setProperty("display","none","important");
  document.querySelector(".topbar")?.style.setProperty("display","none","important");

  map.classList.add("actual-game-world");
  const canvas=document.createElement("canvas");
  canvas.id="actualGameCanvas";
  canvas.setAttribute("aria-label","LAST 72 HOURS playable emergency response city");
  map.appendChild(canvas);
  const ctx=canvas.getContext("2d");
  const W=2200,H=1300;
  const keys=Object.create(null);
  const mouse={x:0,y:0,down:false};
  let camera={x:0,y:0},paused=false,mapOpen=false,toastText="",toastUntil=0;
  let selectedVehicle="SUV",vehicleActive=false,selectedVehicleIndex=0,interactCooldown=0,last=performance.now();
  let bridgeDown=false,floodLevel=0,fireHotspots=0;
  // Dynamic emergency-world simulation state.
  const cityAI={
    fires:[],helpCalls:[],rescueTargets:[],crews:[],blockedBuildings:new Set(),
    eventClock:16,missionClock:0,missionHistory:[],lastDynamicMission:"",
    nextId:1
  };
  const crewTypes=[
    {kind:"POLICE",color:"#72a8ff",speed:145},
    {kind:"FIRE",color:"#ff725c",speed:125},
    {kind:"AMBULANCE",color:"#f4f4f4",speed:155}
  ];
  const trafficVehicles=Array.from({length:16},(_,i)=>({x:80+i*135,y:i%2?548:928,dir:i%2?1:-1,speed:55+(i%4)*18,type:["CAR","VAN","BUS","TRUCK"][i%4],color:["#d7e2e4","#6fc7ff","#ffc857","#ff7b8a"][i%4]}));
  let missionIndex=0,score=0;
  const player={x:430,y:940,r:15,angle:-.4,speed:210,health:100,stamina:100};
  const vehicles=[
    {name:"RESCUE SUV",type:"SUV",x:480,y:885,w:54,h:30,color:"#8fffe2",speed:310,capacity:6,fuel:100,health:100},
    {name:"EVAC BUS",type:"BUS",x:650,y:1010,w:82,h:34,color:"#ffc857",speed:205,capacity:36,fuel:100,health:100},
    {name:"AMBULANCE",type:"AMB",x:1120,y:620,w:58,h:30,color:"#ff7b8a",speed:275,capacity:4,fuel:100,health:100},
    {name:"RESCUE BOAT",type:"BOAT",x:1720,y:1040,w:58,h:30,color:"#61c8ff",speed:245,capacity:12,fuel:100,health:100},
    {name:"HELICOPTER",type:"HELI",x:1650,y:270,w:64,h:30,color:"#b99cff",speed:390,capacity:8,fuel:100,health:100}
  ];
  const missions=[
    {title:"FIRST WARNING",zone:"coastal",x:300,y:300,action:"warning",text:"Reach Coastal Ward and broadcast the first warning.",reward:100},
    {title:"EVACUATION RUN",zone:"harbour",x:760,y:270,action:"evacuate",text:"Reach Harbour and evacuate vulnerable families.",reward:180},
    {title:"BRIDGE COLLAPSE",zone:"riverside",x:380,y:780,action:"roads",text:"Secure Riverside and reopen the emergency corridor.",reward:160},
    {title:"HOSPITAL CRISIS",zone:"oldtown",x:1110,y:470,action:"hospital",text:"Reinforce Old Town hospital before the surge.",reward:180},
    {title:"SHELTER OVERLOAD",zone:"villages",x:1040,y:1060,action:"shelter",text:"Expand shelter capacity in Outer Villages.",reward:160}
  ];
  const zones=[
    {key:"coastal",name:"COASTAL WARD",x:260,y:260,w:300,h:190,risk:"CRITICAL"},
    {key:"harbour",name:"HARBOUR",x:650,y:170,w:310,h:185,risk:"CRITICAL"},
    {key:"oldtown",name:"OLD TOWN",x:1010,y:370,w:330,h:210,risk:"HIGH"},
    {key:"riverside",name:"RIVERSIDE",x:180,y:700,w:330,h:210,risk:"HIGH"},
    {key:"industrial",name:"INDUSTRIAL",x:690,y:690,w:340,h:210,risk:"HIGH"},
    {key:"north",name:"NORTH HILLS",x:1390,y:170,w:350,h:210,risk:"LOW"},
    {key:"market",name:"MARKET DISTRICT",x:1390,y:560,w:360,h:220,risk:"MODERATE"},
    {key:"villages",name:"OUTER VILLAGES",x:850,y:960,w:390,h:220,risk:"HIGH"}
  ];
  const buildings=[];
  for(let i=0;i<55;i++){
    const col=i%11,row=Math.floor(i/11);
    const x=60+col*185+(row%2)*40,y=80+row*225;
    buildings.push({x,y,w:100+(i%3)*28,h:70+(i%4)*18});
  }
  const roads=[
    {x:0,y:520,w:2200,h:72},{x:0,y:900,w:2200,h:70},{x:560,y:0,w:72,h:1300},
    {x:1270,y:0,w:72,h:1300},{x:360,y:350,w:1120,h:54},{x:760,y:180,w:54,h:1020}
  ];
  const npcs=[];
  const npcKinds=["CIVILIAN","FAMILY","DOCTOR","PARAMEDIC","VOLUNTEER","SHOPKEEPER","FIRE CREW"];
  for(let i=0;i<42;i++){
    npcs.push({x:120+Math.random()*1880,y:90+Math.random()*1110,kind:npcKinds[i%npcKinds.length],vx:0,vy:0,state:"CALM",panic:0,rescued:false});
  }
  const particles=[];
  function resize(){canvas.width=map.clientWidth||innerWidth;canvas.height=map.clientHeight||innerHeight}
  addEventListener("resize",resize);resize();
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function say(t){toastText=t;toastUntil=performance.now()+2200;try{window.dispatchEvent(new CustomEvent("l72:feedback",{detail:String(t)}))}catch(e){}}
  function zoneAt(x,y){return zones.find(z=>x>z.x&&x<z.x+z.w&&y>z.y&&y<z.y+z.h)}
  function mission(){return missions[missionIndex]||null}
  function dynamicTargetAt(x,y,r=55){
    return cityAI.rescueTargets.find(t=>!t.rescued&&Math.hypot(t.x-x,t.y-y)<r);
  }
  function spawnHelpCall(){
    const n=npcs.find(n=>!n.rescued&&n.kind!=="FIRE CREW");
    if(!n)return;
    const id=cityAI.nextId++;
    const call={id,x:n.x,y:n.y,kind:n.kind,age:0,priority:Math.random()>0.65?"CRITICAL":"HIGH",status:"WAITING"};
    cityAI.helpCalls.push(call);
    cityAI.rescueTargets.push(call);
    say("DISTRESS CALL • "+call.kind+" REQUESTING HELP");
  }
  function spawnFire(){
    const b=buildings[Math.floor(Math.random()*buildings.length)];
    if(!b)return;
    const id=cityAI.nextId++;
    cityAI.fires.push({id,x:b.x+b.w/2,y:b.y+b.h/2,age:0,spread:0,building:b});
    cityAI.blockedBuildings.add(id);
    fireHotspots=cityAI.fires.length;
    say("FIRE REPORTED • BUILDING ACCESS RESTRICTED");
  }
  function spawnCrew(type,x,y,target){
    const t=crewTypes.find(v=>v.kind===type)||crewTypes[0];
    cityAI.crews.push({id:cityAI.nextId++,kind:t.kind,color:t.color,speed:t.speed,x,y,target,mode:"RESPONDING"});
  }
  function chooseDynamicMission(){
    const candidates=[];
    if(cityAI.helpCalls.length)candidates.push({title:"DISTRESS CALL",text:"Reach a civilian requesting help and rescue them.",kind:"rescue"});
    if(cityAI.fires.length)candidates.push({title:"FIRE RESPONSE",text:"Reach the burning building before the fire spreads.",kind:"fire"});
    if(state.hospitalReady<55)candidates.push({title:"MEDICAL EMERGENCY",text:"Escort an ambulance to the medical district.",kind:"medical"});
    if(bridgeDown||!state.routesOpen)candidates.push({title:"BROKEN CORRIDOR",text:"Reach the blocked corridor and restore access.",kind:"roads"});
    if(!candidates.length)return null;
    return candidates[Math.floor(Math.random()*candidates.length)];
  }
  function dynamicMissionStep(){
    const m=chooseDynamicMission();
    if(!m)return;
    cityAI.lastDynamicMission=m.title;
    cityAI.missionHistory.push(m.title);
    cityAI.missionHistory=cityAI.missionHistory.slice(-6);
    if(m.kind==="rescue"){const t=cityAI.helpCalls[0];if(t){t.status="ACTIVE";say("MISSION CHANGED • "+m.title)}}
    else if(m.kind==="fire")say("MISSION CHANGED • "+m.title);
    else say("MISSION CHANGED • "+m.title);
  }
  function nearestActiveTarget(){
    return cityAI.rescueTargets.find(t=>!t.rescued&&t.status!=="RESCUED")||null;
  }
  function updateEmergencyAI(dt){
    cityAI.eventClock-=dt; cityAI.missionClock+=dt;
    const pressure=(100-state.confidence)*.5+state.panic*.35+state.congestion*.2+floodLevel*.18;
    if(cityAI.eventClock<=0&&!state.ended){
      cityAI.eventClock=7+Math.random()*9;
      if(Math.random()<Math.min(.72,.20+pressure/150))spawnHelpCall();
      if(Math.random()<Math.min(.48,.10+state.wind/420))spawnFire();
      if(Math.random()<.45)dynamicMissionStep();
    }
    // Fire spreads to nearby buildings and raises danger.
    for(const f of cityAI.fires){
      f.age+=dt; f.spread+=dt;
      if(f.spread>6 && cityAI.fires.length<6){
        f.spread=0;
        const b=buildings.find(b=>Math.hypot(b.x+b.w/2-f.x,b.y+b.h/2-f.y)<230&&!cityAI.blockedBuildings.has(b.x));
        if(b){
          const id=cityAI.nextId++; cityAI.fires.push({id,x:b.x+b.w/2,y:b.y+b.h/2,age:0,spread:0,building:b});
          cityAI.blockedBuildings.add(id); fireHotspots=cityAI.fires.length;
          state.safety=Math.max(0,state.safety-.5);
        }
      }
      if(f.age>28){cityAI.fires.splice(cityAI.fires.indexOf(f),1);fireHotspots=cityAI.fires.length;}
    }
    // Dispatch the right emergency crew automatically.
    if(cityAI.fires.length && !cityAI.crews.some(c=>c.kind==="FIRE"&&c.mode!=="DONE")){
      const f=cityAI.fires[0];spawnCrew("FIRE",f.x+90,f.y+90,f);
    }
    if(cityAI.helpCalls.length && !cityAI.crews.some(c=>c.kind==="AMBULANCE"&&c.mode!=="DONE")){
      const h=cityAI.helpCalls[0];spawnCrew("AMBULANCE",h.x-90,h.y-90,h);
    }
    if(state.panic>55 && !cityAI.crews.some(c=>c.kind==="POLICE"&&c.mode!=="DONE")){
      const h=cityAI.helpCalls[0]||{x:player.x+120,y:player.y};spawnCrew("POLICE",h.x+120,h.y,h);
    }
    for(const c of cityAI.crews){
      if(c.mode==="DONE"||!c.target)continue;
      const dx=c.target.x-c.x,dy=c.target.y-c.y,d=Math.hypot(dx,dy)||1;
      if(d<18){
        c.mode="ON SCENE";
        if(c.kind==="FIRE"&&c.target.age>2){c.target.age=Math.max(0,c.target.age-12);state.safety=Math.min(100,state.safety+1);}
        if(c.kind==="AMBULANCE"&&c.target.status==="WAITING"){c.target.status="RESPONDED";state.safety=Math.min(100,state.safety+1);}
        if(c.kind==="POLICE")state.panic=Math.max(0,state.panic-3);
      }else{c.x+=dx/d*c.speed*dt;c.y+=dy/d*c.speed*dt;}
    }
    // Buildings become inaccessible when fire/flood reaches them.
    if(floodLevel>62)bridgeDown=true;
    for(const b of buildings){
      if(cityAI.fires.some(f=>Math.hypot(f.x-(b.x+b.w/2),f.y-(b.y+b.h/2))<18)) b.inaccessible=true;
      if(b.inaccessible&&Math.random()<dt*.02)b.inaccessible=false;
    }
    // Dynamic rescue targets follow civilians who requested help.
    cityAI.helpCalls.forEach(h=>{h.age+=dt;if(h.age>35&&!h.rescued){h.status="CRITICAL";state.safety=Math.max(0,state.safety-.6);}});
    if(cityAI.helpCalls.length>8)cityAI.helpCalls.splice(0,cityAI.helpCalls.length-8);
    fireHotspots=cityAI.fires.length;
  }
  function rescueDynamicTarget(){
    const t=dynamicTargetAt(player.x,player.y,65);
    if(!t){say("NO RESCUE TARGET IN RANGE");return false;}
    t.rescued=true;t.status="RESCUED";
    state.peopleProtected=(state.peopleProtected||0)+1;
    state.evacuated=(state.evacuated||0)+1;
    state.safety=Math.min(100,state.safety+2);
    score+=75;
    say("RESCUE COMPLETE • CIVILIAN SAFE • +75 XP");
    return true;
  }
  function collideBuilding(x,y,r){
    for(const b of buildings){
      if(x> b.x-r && x<b.x+b.w+r && y>b.y-r && y<b.y+b.h+r)return true;
    }
    return false;
  }
  function movePlayer(dt){
    if(paused)return;
    let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
    let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    if(!dx&&!dy)return;
    const len=Math.hypot(dx,dy)||1;
    const v=vehicleActive?vehicles.find(v=>v.type===selectedVehicle)?.speed||260:player.speed;
    dx/=len;dy/=len;player.angle=Math.atan2(dy,dx);
    const nx=clamp(player.x+dx*v*dt,25,W-25),ny=clamp(player.y+dy*v*dt,25,H-25);
    const radius=vehicleActive?20:player.r;
    const blockedBridge=bridgeDown && nx>1180 && nx<1420 && player.y>495 && player.y<600;
    if(!collideBuilding(nx,player.y,radius) && !blockedBridge)player.x=nx;
    if(!collideBuilding(player.x,ny,radius))player.y=ny;
    if(vehicleActive){const v=vehicles[selectedVehicleIndex];v.x=player.x;v.y=player.y;v.fuel=Math.max(0,v.fuel-dt*(v.type==="HELI"?1.8:.65));if(v.fuel<=0){vehicleActive=false;say("VEHICLE OUT OF FUEL • RETURN TO DEPOT")}}
  }
  function updateTraffic(dt){
    for(const t of trafficVehicles){
      t.x += t.dir*t.speed*dt;
      if(t.dir>0 && t.x>W+80)t.x=-80;
      if(t.dir<0 && t.x<-80)t.x=W+80;
    }
  }
  function updateNPC(dt){
    for(const n of npcs){
      const d=dist(n,player);
      if(d<250 && (state.panic>45||state.misinformation>45)){n.state="PANIC";n.panic=clamp(n.panic+dt*4,0,100);const a=Math.atan2(n.y-player.y,n.x-player.x);n.vx=Math.cos(a)*35;n.vy=Math.sin(a)*35}
      else {n.state="CALM";if(Math.random()<.015){n.vx=(Math.random()-.5)*28;n.vy=(Math.random()-.5)*28}}
      n.x=clamp(n.x+n.vx*dt,25,W-25);n.y=clamp(n.y+n.vy*dt,25,H-25);
      if(!n.rescued && dist(n,player)<32 && vehicleActive){
        n.rescued=true;n.state="RESCUED";n.vx=0;n.vy=0;score+=20;
        say("CIVILIAN RESCUED • +20 RESPONSE XP");
        try{state.evacuated=(state.evacuated||0)+1;state.peopleProtected=(state.peopleProtected||0)+1;state.safety=Math.min(100,state.safety+1)}catch(e){}
      }
    }
  }
  function completeMission(){
    const m=mission();if(!m)return;
    if(dist(player,m)>95){say("GET CLOSER • "+m.title);return}
    window.Last72SelectZone(m.zone);
    window.Last72TakeAction(m.action,"FIELD MISSION");
    score+=m.reward;missionIndex++;
    particles.push({x:player.x,y:player.y,t:0});
    say("MISSION COMPLETE • +"+m.reward+" COMMAND XP");
    if(missionIndex>=missions.length){say("CAMPAIGN OBJECTIVE COMPLETE • LANDFALL PREPARED");}else{const next=missions[missionIndex];setTimeout(()=>{if(!state.ended&&next)say("NEXT OBJECTIVE • "+next.title+" • "+next.zone.toUpperCase())},650);}
  }
  function interact(){
    if(interactCooldown>0)return;
    interactCooldown=.5;
    const m=mission();
    if(dynamicTargetAt(player.x,player.y,70)){rescueDynamicTarget();return}
    if(m&&dist(player,m)<100){completeMission();return}
    const nearV=vehicles.find(v=>dist(player,v)<75);
    if(nearV){selectedVehicleIndex=vehicles.indexOf(nearV);selectedVehicle=nearV.type;vehicleActive=true;player.x=nearV.x;player.y=nearV.y;say("VEHICLE ENTERED • "+nearV.name);return}
    const z=zoneAt(player.x,player.y);
    if(z){window.Last72SelectZone(z.key);say("ZONE SELECTED • "+z.name+" • "+z.risk+" RISK");return}
    say("NO INTERACTION IN RANGE");
  }
  function useAction(n){
    const actions=["warning","shelter","evacuate","hospital","roads"];
    if(actions[n]){window.Last72TakeAction(actions[n],"QUICK ACTION");score+=25;say("COMMAND EXECUTED • "+actions[n].toUpperCase())}
  }
  function worldToScreen(x,y){return{x:x-camera.x,y:y-camera.y}}
  function drawRoads(){
    ctx.fillStyle="#172d35";
    roads.forEach(r=>{ctx.fillRect(r.x-camera.x,r.y-camera.y,r.w,r.h)});
    if(bridgeDown){ctx.fillStyle="#44252b";ctx.fillRect(1180-camera.x,495-camera.y,240,105);ctx.fillStyle="#ff6978";ctx.font="bold 11px Arial";ctx.fillText("BRIDGE CLOSED",1200-camera.x,545-camera.y)}
    ctx.strokeStyle="#36535a";ctx.lineWidth=2;ctx.setLineDash([16,18]);
    roads.forEach(r=>{ctx.beginPath();if(r.w>r.h){ctx.moveTo(r.x-camera.x,r.y+r.h/2-camera.y);ctx.lineTo(r.x+r.w-camera.x,r.y+r.h/2-camera.y)}else{ctx.moveTo(r.x+r.w/2-camera.x,r.y-camera.y);ctx.lineTo(r.x+r.w/2-camera.x,r.y+r.h-camera.y)}ctx.stroke()});ctx.setLineDash([]);
  }
  function drawBuildings(){
    buildings.forEach((b,i)=>{const x=b.x-camera.x,y=b.y-camera.y;ctx.fillStyle=i%3===0?"#132630":"#10212a";ctx.fillRect(x,y,b.w,b.h);ctx.strokeStyle="#28424b";ctx.strokeRect(x,y,b.w,b.h);for(let wx=x+12;wx<x+b.w-8;wx+=24){ctx.fillStyle="#47626a";ctx.fillRect(wx,y+12,7,5)}});
  }
  function drawFlood(){
    if(floodLevel<8)return;
    const alpha=Math.min(.38,floodLevel/260);
    ctx.fillStyle="rgba(45,145,205,"+alpha+")";
    const waterY=920-floodLevel*2.4;
    ctx.fillRect(0,waterY-camera.y,W,360+camera.y);
    ctx.strokeStyle="rgba(130,220,255,.45)";ctx.lineWidth=2;
    for(let i=0;i<6;i++){const yy=waterY+30+i*42-camera.y;ctx.beginPath();for(let x=0;x<canvas.width;x+=55){ctx.quadraticCurveTo(x+14,yy-5,x+28,yy);ctx.quadraticCurveTo(x+42,yy+5,x+55,yy)}ctx.stroke()}
    ctx.fillStyle="#b9efff";ctx.font="bold 10px Arial";ctx.fillText("FLOOD LEVEL "+Math.round(floodLevel)+"%",24,canvas.height-34);
  }
  function drawZones(){
    zones.forEach(z=>{const x=z.x-camera.x,y=z.y-camera.y;ctx.fillStyle=z.risk==="CRITICAL"?"rgba(255,74,91,.10)":z.risk==="HIGH"?"rgba(255,170,70,.08)":"rgba(85,225,190,.055)";ctx.fillRect(x,y,z.w,z.h);ctx.strokeStyle=z.key===state.selectedZone?"#9fffe5":"rgba(120,160,170,.25)";ctx.lineWidth=z.key===state.selectedZone?3:1;ctx.strokeRect(x,y,z.w,z.h);ctx.fillStyle="#cfe1e5";ctx.font="bold 14px Arial";ctx.fillText(z.name,x+12,y+24);ctx.fillStyle=z.risk==="CRITICAL"?"#ff6978":z.risk==="HIGH"?"#ffc857":"#72e6c4";ctx.font="10px Arial";ctx.fillText(z.risk+" RISK",x+12,y+42)});
  }
  function drawNPCs(){
    npcs.forEach(n=>{if(n.rescued)return;const p=worldToScreen(n.x,n.y);ctx.fillStyle=n.state==="PANIC"?"#ff6978":n.kind==="DOCTOR"||n.kind==="PARAMEDIC"?"#ff9ca8":n.kind==="VOLUNTEER"||n.kind==="FIRE CREW"?"#72e6c4":"#f5d477";ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();});
  }
  function drawTraffic(){trafficVehicles.forEach(t=>{const p=worldToScreen(t.x,t.y);ctx.fillStyle=t.color;ctx.fillRect(p.x-16,p.y-7,32,14);ctx.fillStyle="#0a1519";ctx.fillRect(p.x-7,p.y-4,14,5)})}
  function drawVehicles(){
    vehicles.forEach((v,idx)=>{const p=worldToScreen(v.x,v.y);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=v.color;ctx.fillRect(-v.w/2,-v.h/2,v.w,v.h);ctx.fillStyle="#071016";ctx.fillRect(-v.w*.28,-v.h*.25,v.w*.56,v.h*.32);ctx.restore();ctx.fillStyle="#dbecee";ctx.font="9px Arial";ctx.fillText(v.type,p.x-v.w/2,p.y+v.h/2+12);if(idx===selectedVehicleIndex && vehicleActive){ctx.strokeStyle="#9fffe5";ctx.strokeRect(p.x-v.w/2-5,p.y-v.h/2-5,v.w+10,v.h+10)}});
  }
  function drawEmergencyWorld(){
    // Fires, emergency crews, distress markers and inaccessible buildings.
    for(const b of buildings){
      if(!b.inaccessible)continue;
      const p=worldToScreen(b.x,b.y);
      ctx.fillStyle="rgba(255,55,55,.22)";ctx.fillRect(p.x,p.y,b.w,b.h);
      ctx.strokeStyle="#ff6978";ctx.lineWidth=2;ctx.strokeRect(p.x,p.y,b.w,b.h);
      ctx.fillStyle="#ff6978";ctx.font="bold 9px Arial";ctx.fillText("INACCESSIBLE",p.x+6,p.y+14);
    }
    for(const f of cityAI.fires){
      const p=worldToScreen(f.x,f.y),pulse=10+Math.sin(performance.now()/90)*4;
      ctx.fillStyle="rgba(255,80,30,.18)";ctx.beginPath();ctx.arc(p.x,p.y,30+pulse,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#ff5a36";ctx.beginPath();ctx.arc(p.x,p.y,10+pulse*.35,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#ffd166";ctx.font="bold 9px Arial";ctx.fillText("FIRE",p.x-10,p.y-18);
    }
    for(const c of cityAI.crews){
      if(c.mode==="DONE")continue;
      const p=worldToScreen(c.x,c.y);ctx.fillStyle=c.color;ctx.fillRect(p.x-9,p.y-7,18,14);
      ctx.fillStyle="#07131a";ctx.font="bold 7px Arial";ctx.fillText(c.kind==="AMBULANCE"?"A":c.kind==="FIRE"?"F":"P",p.x-3,p.y+3);
      ctx.strokeStyle=c.color;ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.stroke();
    }
    for(const h of cityAI.rescueTargets){
      if(h.rescued)continue;
      const p=worldToScreen(h.x,h.y),pulse=12+Math.sin(performance.now()/140)*4;
      ctx.strokeStyle=h.status==="CRITICAL"?"#ff5367":"#9fffe5";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(p.x,p.y,pulse,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=h.status==="CRITICAL"?"#ff5367":"#9fffe5";ctx.font="bold 9px Arial";ctx.fillText("HELP",p.x-12,p.y-17);
    }
    if(cityAI.lastDynamicMission){
      ctx.fillStyle="rgba(2,8,12,.72)";ctx.fillRect(18,canvas.height-76,390,46);
      ctx.fillStyle="#ffcf6e";ctx.font="bold 9px Arial";ctx.fillText("DYNAMIC MISSION",30,canvas.height-57);
      ctx.fillStyle="#fff";ctx.font="bold 13px Arial";ctx.fillText(cityAI.lastDynamicMission,30,canvas.height-39);
      ctx.fillStyle="#91aab2";ctx.font="9px Arial";ctx.fillText("WORLD STATE CHANGED • RESPOND NOW",190,canvas.height-39);
    }
  }
  function drawMission(){
    const m=mission();if(!m)return;const p=worldToScreen(m.x,m.y),pulse=8+Math.sin(performance.now()/180)*4;ctx.strokeStyle="#9fffe5";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,pulse+12,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#9fffe5";ctx.beginPath();ctx.moveTo(p.x,p.y-10);ctx.lineTo(p.x-7,p.y+5);ctx.lineTo(p.x+7,p.y+5);ctx.closePath();ctx.fill();ctx.fillStyle="#eafff9";ctx.font="bold 11px Arial";ctx.fillText(m.title,p.x+18,p.y+4);ctx.font="9px Arial";ctx.fillStyle="#8ca6ad";ctx.fillText("E  INTERACT",p.x+18,p.y+17)}
  function drawPlayer(){
    const p=worldToScreen(player.x,player.y);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.angle);ctx.fillStyle=vehicleActive?"#9fffe5":"#f3fbfa";ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-12,-10);ctx.lineTo(-8,0);ctx.lineTo(-12,10);ctx.closePath();ctx.fill();ctx.restore();ctx.strokeStyle="#9fffe5";ctx.beginPath();ctx.arc(p.x,p.y,26+Math.sin(performance.now()/120)*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#dff";ctx.font="bold 10px Arial";ctx.fillText(vehicleActive?selectedVehicle:"COMMANDER",p.x-34,p.y+40)}
  function drawStorm(){
    const progress=1-(state.hours/Math.max(1,state.initialHours));const sx=1850-progress*620,sy=930-progress*300;const p=worldToScreen(sx,sy);const r=130+progress*150;const g=ctx.createRadialGradient(p.x,p.y,10,p.x,p.y,r);g.addColorStop(0,"rgba(255,190,80,.28)");g.addColorStop(.5,"rgba(113,92,190,.12)");g.addColorStop(1,"rgba(113,92,190,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,194,92,.35)";ctx.setLineDash([8,12]);ctx.beginPath();ctx.arc(p.x,p.y,r*.7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#ffc857";ctx.font="bold 11px Arial";ctx.fillText("CYCLONE",p.x-30,p.y+4)}
  function drawParticles(){
    particles.forEach(p=>{p.t+=.016;const q=worldToScreen(p.x,p.y-p.t*80);ctx.globalAlpha=Math.max(0,1-p.t);ctx.fillStyle="#9fffe5";ctx.beginPath();ctx.arc(q.x,q.y,3+p.t*4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1});for(let i=particles.length-1;i>=0;i--)if(particles[i].t>1)particles.splice(i,1)
  }
  function drawUI(){
    const m=mission();ctx.fillStyle="rgba(2,8,12,.72)";ctx.fillRect(18,18,370,100);ctx.fillStyle="#9fffe5";ctx.font="bold 11px Arial";ctx.fillText("LAST 72 HOURS  //  FIELD COMMAND",32,39);ctx.fillStyle="#fff";ctx.font="bold 21px Arial";ctx.fillText(m?m.title:"LANDFALL PREPARATION",32,66);ctx.fillStyle="#91aab2";ctx.font="11px Arial";ctx.fillText(m?m.text:"All primary field objectives completed.",32,88);ctx.fillText("WASD MOVE   E INTERACT   V VEHICLE   1-5 COMMANDS   ESC PAUSE",32,106);
    ctx.fillStyle="rgba(2,8,12,.72)";ctx.fillRect(canvas.width-310,18,292,86);ctx.fillStyle="#9aaeb4";ctx.font="10px Arial";ctx.fillText("TIME TO LANDFALL",canvas.width-292,37);ctx.fillStyle="#fff";ctx.font="bold 24px Arial";ctx.fillText(String(Math.max(0,state.hours)).padStart(2,"0")+":00",canvas.width-292,65);ctx.font="11px Arial";ctx.fillText("SAFETY "+Math.round(state.safety)+"%     BUDGET ₹"+state.budget,canvas.width-292,87);
    if(toastUntil>performance.now()){ctx.fillStyle="rgba(0,20,18,.9)";ctx.fillRect(canvas.width/2-180,canvas.height-86,360,42);ctx.fillStyle="#dff";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText(toastText,canvas.width/2,canvas.height-61);ctx.textAlign="left"}
    if(paused){ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#fff";ctx.font="bold 34px Arial";ctx.textAlign="center";ctx.fillText("PAUSED",canvas.width/2,canvas.height/2-45);ctx.font="12px Arial";ctx.fillStyle="#9fffe5";ctx.fillText("ESC RESUME  •  M MAP / OPERATIONS",canvas.width/2,canvas.height/2);ctx.textAlign="left"}
    if(mapOpen){ctx.fillStyle="rgba(2,7,11,.94)";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#fff";ctx.font="bold 26px Arial";ctx.fillText("TACTICAL CITY MAP",35,50);zones.forEach((z,i)=>{const sx=35+(z.x/W)*(canvas.width-70),sy=80+(z.y/H)*(canvas.height-120);ctx.fillStyle=z.key===state.selectedZone?"#9fffe5":"#37505a";ctx.fillRect(sx,sy,Math.max(80,z.w/W*canvas.width),Math.max(40,z.h/H*canvas.height));ctx.fillStyle="#fff";ctx.font="9px Arial";ctx.fillText(z.name,sx+5,sy+15)});ctx.fillStyle="#8da5ad";ctx.font="11px Arial";ctx.fillText("M / ESC  CLOSE MAP",35,canvas.height-25)}
  }
  function frame(now){
    const dt=Math.min(.033,(now-last)/1000);last=now;interactCooldown=Math.max(0,interactCooldown-dt);
    if(!paused&&!mapOpen){movePlayer(dt);updateNPC(dt);updateTraffic(dt);updateEmergencyAI(dt);floodLevel=Math.min(100,floodLevel+dt*(state.rainfall>220?.7:.18));if(floodLevel>62)bridgeDown=true;}
    camera.x=clamp(player.x-canvas.width/2,0,Math.max(0,W-canvas.width));camera.y=clamp(player.y-canvas.height/2,0,Math.max(0,H-canvas.height));window.Last72Camera={x:camera.x,y:camera.y,width:canvas.width,height:canvas.height};
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#07131a";ctx.fillRect(0,0,canvas.width,canvas.height);
    drawRoads();drawFlood();drawBuildings();drawZones();drawTraffic();drawVehicles();drawNPCs();drawEmergencyWorld();drawMission();drawStorm();drawPlayer();drawParticles();drawUI();
    requestAnimationFrame(frame);
  }
  window.Last72Game={getMission:()=>mission(),getMissionIndex:()=>missionIndex,getScore:()=>score,getPlayer:()=>({...player}),getCamera:()=>({...camera}),isPaused:()=>paused,isMapOpen:()=>mapOpen};
  addEventListener("keydown",e=>{
    if(["input","textarea","select"].includes(document.activeElement?.tagName?.toLowerCase()))return;
    const k=e.key.toLowerCase();
    if(k==="escape"){if(mapOpen){mapOpen=false;say("RETURNED TO FIELD")}else{paused=!paused;say(paused?"GAME PAUSED":"RESUMED")}e.preventDefault();return}
    if(k==="m"){mapOpen=!mapOpen;paused=false;say(mapOpen?"TACTICAL MAP • CLICK A ZONE TO TARGET":"RETURNED TO FIELD");e.preventDefault();return}
    if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)){keys[k]=true;e.preventDefault()}
    if(k==="e"&&!mapOpen){interact();e.preventDefault()}
    if(k==="v"&&!mapOpen){if(vehicleActive){vehicleActive=false;say("EXIT VEHICLE • ON FOOT")}else{const v=vehicles.findIndex(v=>Math.hypot(v.x-player.x,v.y-player.y)<90);if(v>=0){selectedVehicleIndex=v;selectedVehicle=vehicles[v].type;vehicleActive=true;say("ENTERED • "+vehicles[v].name)}else say("NO EMERGENCY VEHICLE NEARBY")}e.preventDefault()}
    if("12345".includes(k)&&!mapOpen){useAction(Number(k)-1);e.preventDefault()}
  });
  addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
  canvas.addEventListener("click",e=>{
    const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;
    if(mapOpen){const wx=camera.x+mouse.x,wy=camera.y+mouse.y;const z=zoneAt(wx,wy);if(z){window.Last72SelectZone(z.key);mapOpen=false;say("TARGET LOCKED • "+z.name)}}
  });
  canvas.addEventListener("mousemove",e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top});
  say("FIELD COMMAND ONLINE • Reach the glowing mission marker.");
  requestAnimationFrame(frame);
})();

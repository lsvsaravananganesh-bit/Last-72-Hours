/* LAST 72 HOURS — FINAL COMPETITION POLISH
   Mission flow, judge-demo pacing, feedback audio, visual hierarchy and
   lightweight performance coordination. This layer never owns core gameplay.
*/
(function(){
  if(window.__L72_FINAL_POLISH__) return;
  window.__L72_FINAL_POLISH__=true;

  const CORE=[
    ["FIRST WARNING","COASTAL WARD","Reach the first command marker and broadcast the warning."],
    ["EVACUATION RUN","HARBOUR","Move vulnerable families before the storm corridor shifts."],
    ["BRIDGE COLLAPSE","RIVERSIDE","Secure the emergency corridor."],
    ["HOSPITAL CRISIS","OLD TOWN","Reinforce medical readiness."],
    ["SHELTER OVERLOAD","OUTER VILLAGES","Expand emergency shelter capacity."]
  ];

  const rail=document.createElement("div");
  rail.className="final-mission-rail";
  rail.innerHTML='<div class="fmr-head"><span>CAMPAIGN</span><b id="fmrStep">MISSION 1 / 5</b></div><div class="fmr-list">'+
    CORE.map((m,i)=>'<div class="fmr-item" data-i="'+i+'"><i>'+(i+1)+'</i><span><b>'+m[0]+'</b><small>'+m[1]+'</small></span></div>').join("")+
    '</div>';
  document.body.appendChild(rail);

  const tip=document.createElement("div");
  tip.className="final-demo-tip";
  tip.innerHTML='<b>OPENING OBJECTIVE</b><span id="finalTipText">Follow the glowing marker. Press E when you reach it.</span>';
  document.body.appendChild(tip);

  function getGame(){
    return window.Last72Game||null;
  }
  let lastIndex=-1,lastFeedback="",started=performance.now();

  function render(){
    const g=getGame();
    if(!g)return;
    const i=Math.max(0,Math.min(CORE.length-1,g.getMissionIndex()));
    rail.querySelectorAll(".fmr-item").forEach((n,j)=>{
      n.classList.toggle("active",j===i);
      n.classList.toggle("done",j<i);
    });
    const step=document.getElementById("fmrStep");
    if(step)step.textContent=i<CORE.length?"MISSION "+(i+1)+" / "+CORE.length:"LANDFALL READY";
    const m=CORE[i];
    const liveMission=g.getMission();
    const stepIndex=(g.getMissionStep?g.getMissionStep():0);
    const stepData=(g.getMissionProcedure?g.getMissionProcedure():null);
    const title=document.getElementById("hudMissionTitle");
    const brief=document.getElementById("hudMissionBrief");
    const target=document.getElementById("hudTarget");
    if(title&&liveMission) title.textContent=liveMission.title;
    if(brief&&liveMission) brief.textContent=(stepData&&stepData[0] ? "STEP "+(stepIndex+1)+"/"+(liveMission.procedure?.length||1)+" • "+stepData[0] : liveMission.text);
    if(target&&liveMission) target.textContent=liveMission.zone.toUpperCase()+" • E TO INTERACT";
    const text=document.getElementById("finalTipText");
    if(text&&m)text.textContent=m[2]+"  •  E = interact";
    if(i!==lastIndex){
      if(lastIndex>=0 && i>lastIndex) flash("MISSION COMPLETE","Next objective: "+(m?m[0]:"LANDFALL PREPARATION"),"success");
      lastIndex=i;
    }

    const events=document.getElementById("sysEventCount");
    document.body.classList.toggle("final-has-incidents",!!events&&Number(events.textContent)>0);

    // Give the first 90 seconds a clean learning curve without disabling systems.
    const elapsed=(performance.now()-started)/1000;
    document.body.classList.toggle("final-opening",elapsed<90);
  }

  function flash(title,text,type){
    const n=document.createElement("div");
    n.className="final-feedback "+(type||"");
    n.innerHTML="<b>"+title+"</b><span>"+text+"</span>";
    document.body.appendChild(n);
    requestAnimationFrame(()=>n.classList.add("show"));
    setTimeout(()=>{n.classList.remove("show");setTimeout(()=>n.remove(),250)},1900);
  }

  function tone(kind){
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      const c=window.__L72_AUDIO||(window.__L72_AUDIO=new C());
      if(c.state==="suspended")c.resume();
      const o=c.createOscillator(),g=c.createGain();
      const win=kind==="success",alert=kind==="alert";
      o.type=alert?"sawtooth":"sine";
      o.frequency.value=win?740:alert?190:440;
      g.gain.value=.018;o.connect(g);g.connect(c.destination);
      o.start();o.stop(c.currentTime+(alert?.11:.07));
    }catch(e){}
  }

  window.addEventListener("pointerdown",()=>{try{window.__L72_AUDIO?.resume()}catch(e){}},{once:true});
  window.addEventListener("keydown",()=>{try{window.__L72_AUDIO?.resume()}catch(e){}},{once:true});

  window.addEventListener("l72:feedback",e=>{
    const msg=String(e.detail||"");
    if(!msg||msg===lastFeedback)return;
    lastFeedback=msg;
    const lower=msg.toLowerCase();
    const kind=/complete|success|safe|opened|prepared/.test(lower)?"success":/failed|blocked|critical|closed|alert/.test(lower)?"alert":"normal";
    tone(kind);
    if(/mission complete|next objective|campaign objective/.test(lower))flash("COMMAND UPDATE",msg,kind);
  });

  // UI coordination is intentionally throttled; the gameplay canvas owns the frame loop.
  setInterval(()=>{
    render();
    const dw=window.Last72DynamicWorld;
    if(dw){
      const s=dw.getStats();
      const hud=document.querySelector(".dynamic-ai-hud");
      if(hud)hud.classList.toggle("urgent",(s.help||0)>0||(s.fires||0)>0);
    }
  },120);

  setTimeout(()=>tip.classList.add("soft-hide"),95000);
})();
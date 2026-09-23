/* LAST 72 HOURS — RUNTIME CORE
   Shared lifecycle, events, timers and safe persistence for all game layers.
*/
(()=> {
  if(window.Last72Runtime) return;
  const listeners=new Map(), loops=new Map(), timers=new Map();
  const api={
    version:"2.0",
    on(name,fn){ if(!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name).add(fn); return ()=>api.off(name,fn); },
    off(name,fn){ const set=listeners.get(name); if(set) set.delete(fn); },
    emit(name,detail){ const set=listeners.get(name); if(set) for(const fn of [...set]){ try{fn(detail)}catch(e){console.error("[Last72Runtime]",name,e)} } },
    once(name,fn){ const off=api.on(name,(d)=>{off();fn(d)}); return off; },
    every(name,ms,fn){ if(timers.has(name)) clearInterval(timers.get(name)); const id=setInterval(()=>{try{fn()}catch(e){console.error("[Last72Runtime]",name,e)}},ms); timers.set(name,id); return ()=>{clearInterval(id);timers.delete(name)}; },
    after(name,ms,fn){ if(timers.has(name)) clearTimeout(timers.get(name)); const id=setTimeout(()=>{timers.delete(name);try{fn()}catch(e){console.error("[Last72Runtime]",name,e)}},ms); timers.set(name,id); return ()=>{clearTimeout(id);timers.delete(name)}; },
    frame(name,fn){ if(loops.has(name)) cancelAnimationFrame(loops.get(name)); let last=performance.now(),active=true;
      const step=(now)=>{if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;try{fn(dt,now)}catch(e){console.error("[Last72Runtime]",name,e)}loops.set(name,requestAnimationFrame(step))};
      loops.set(name,requestAnimationFrame(step)); return ()=>{active=false;if(loops.has(name))cancelAnimationFrame(loops.get(name));loops.delete(name)};
    },
    stop(name){ if(loops.has(name)){cancelAnimationFrame(loops.get(name));loops.delete(name)} if(timers.has(name)){clearTimeout(timers.get(name));clearInterval(timers.get(name));timers.delete(name)} },
    clamp(v,min,max){return Math.max(min,Math.min(max,v))},
    dist(a,b){return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0))},
    read(key,fallback=null){try{const v=localStorage.getItem(key);return v==null?fallback:JSON.parse(v)}catch(e){return fallback}},
    write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}}
  };
  window.Last72Runtime=api;
  window.dispatchEvent(new CustomEvent("l72:runtime-ready"));
})();

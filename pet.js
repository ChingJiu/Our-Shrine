
const STAGES = [
  { name:"EGG",    minLvl:1,  maxLvl:3  },
  { name:"BABY",   minLvl:4,  maxLvl:10  },
  { name:"CHILD",  minLvl:11,  maxLvl:15  },
  { name:"TEEN",   minLvl:16, maxLvl:20 },
  { name:"ADULT",  minLvl:21, maxLvl:35 },
  { name:"MASTER", minLvl:36, maxLvl:99 },
];
const XP_PER_LEVEL = 100;
const REWARDS = {
  task:  { happiness:8,  hunger:0,  energy:0,   health:2,  xp:5  },
  habit: { happiness:4,  hunger:0,  energy:3,   health:6,  xp:4  },
  focus: { happiness:5,  hunger:-4, energy:-5,  health:2,  xp:8  },
  plan:  { happiness:5,  hunger:0,  energy:0,   health:2,  xp:3  },
  feed:  { happiness:5,  hunger:25, energy:5,   health:3,  xp:1  },
  play:  { happiness:20, hunger:-8, energy:-10, health:2,  xp:3  },
  sleep: { happiness:5,  hunger:-5, energy:40,  health:5,  xp:2  },
  clean: { happiness:8,  hunger:0,  energy:0,   health:15, xp:2  },
  study: { happiness:3,  hunger:-5, energy:-8,  health:0,  xp:10 },
};
const MESSAGES = {
  feed:   ["YUMMY!","NOM NOM!","THANKS!","SO GOOD!"],
  play:   ["WHEEE!","FUN FUN!","AGAIN!","YIPPEE!"],
  sleep:  ["ZZZ...","GOOD NIGHT","SO COMFY","*YAWN*"],
  clean:  ["SO FRESH!","SPARKLY!","CLEAN!"],
  study:  ["BRAIN++","LEARNING!","SMART!","WOW MUCH INFO"],
  hungry: ["FEED ME...","HUNGRY...","STOMACH GROWL"],
  sad:    ["LONELY...","PLAY WITH ME","*SIGH*"],
  tired:  ["SO SLEEPY...","NEED REST...","YAWN..."],
  sick:   ["NOT WELL...","HELP ME...","OW..."],
  happy:  ["HAPPY!",":D","LIFE IS GOOD","LOVE YOU!"],
  idle:   ["HELLO!","WHAT'S UP?","I EXIST!","BORED...","HI THERE!"],
};

function todayStr() { return new Date().toISOString().slice(0,10); }
function defaultPet() {
  return { name:"BUDDY", happiness:80, hunger:70, energy:60, health:90,
    xp:0, level:1, stage:"EGG", age:0, born:new Date().toISOString(),
    lastFed:null, lastTick:new Date().toISOString(),
    tasksToday:0, habitsToday:0, focusToday:0, lastResetDate:todayStr() };
}
function loadPet() {
  try { const r=localStorage.getItem("petData"); if(r) return Object.assign(defaultPet(),JSON.parse(r)); }
  catch(e){}
  return defaultPet();
}
function savePet(p) { localStorage.setItem("petData",JSON.stringify(p)); }
function clamp(v)   { return Math.max(0,Math.min(100,Math.round(v))); }

function applyDecay(p) {
  const now=new Date(), last=new Date(p.lastTick||now);
  const h=Math.min((now-last)/3600000,24);
  if(h<0.1) return p;
  const d=h*2;
  p.happiness=Math.max(0,p.happiness-d*0.8);
  p.hunger=Math.max(0,p.hunger-d*1.2);
  p.energy=Math.max(0,p.energy-d*0.5);
  if(p.hunger<20) p.health=Math.max(0,p.health-d*1.5);
  p.age=Math.floor((now-new Date(p.born))/86400000);
  p.lastTick=now.toISOString();
  if(p.lastResetDate!==todayStr()){p.tasksToday=0;p.habitsToday=0;p.focusToday=0;p.lastResetDate=todayStr();}
  return p;
}

function addXP(p,amount) {
  p.xp+=amount;
  while(p.xp>=XP_PER_LEVEL){p.xp-=XP_PER_LEVEL;p.level+=1;showToast("LEVEL UP! NOW LVL "+p.level);}
  for(const s of STAGES){if(p.level>=s.minLvl&&p.level<=s.maxLvl){p.stage=s.name;break;}}
  return p;
}
function applyReward(p,type) {
  const r=REWARDS[type]; if(!r) return p;
  p.happiness=clamp(p.happiness+r.happiness); p.hunger=clamp(p.hunger+r.hunger);
  p.energy=clamp(p.energy+r.energy); p.health=clamp(p.health+r.health);
  return addXP(p,r.xp);
}

function getStageSprite(stage,mood) {
  const s={
    EGG:`<rect x="5" y="2" width="6" height="1" fill="#c8b4f0"/><rect x="3" y="3" width="10" height="1" fill="#c8b4f0"/><rect x="2" y="4" width="12" height="6" fill="#d4c4f8"/><rect x="3" y="10" width="10" height="2" fill="#c8b4f0"/><rect x="5" y="12" width="6" height="1" fill="#c8b4f0"/><rect x="6" y="6" width="2" height="2" fill="#7c6af7"/><rect x="9" y="6" width="2" height="2" fill="#7c6af7"/><rect x="6" y="9" width="5" height="1" fill="#7c6af7"/>`,
    BABY:`<rect x="4" y="1" width="8" height="2" fill="#f7c4d4"/><rect x="3" y="3" width="10" height="7" fill="#f7d4e4"/><rect x="2" y="4" width="1" height="4" fill="#f7c4d4"/><rect x="13" y="4" width="1" height="4" fill="#f7c4d4"/><rect x="4" y="10" width="3" height="2" fill="#f7c4d4"/><rect x="9" y="10" width="3" height="2" fill="#f7c4d4"/><rect x="5" y="5" width="2" height="2" fill="#333"/><rect x="9" y="5" width="2" height="2" fill="#333"/><rect x="${mood==='happy'?'5':'6'}" y="8" width="${mood==='happy'?'6':'4'}" height="1" fill="#f76a8a"/>${mood==='happy'?'<rect x="5" y="7" width="1" height="1" fill="#f76a8a"/><rect x="10" y="7" width="1" height="1" fill="#f76a8a"/>':''}`,
    CHILD:`<rect x="4" y="1" width="8" height="1" fill="#6af7c8"/><rect x="3" y="2" width="10" height="8" fill="#7af8d4"/><rect x="2" y="3" width="1" height="5" fill="#6af7c8"/><rect x="13" y="3" width="1" height="5" fill="#6af7c8"/><rect x="4" y="10" width="3" height="3" fill="#6af7c8"/><rect x="9" y="10" width="3" height="3" fill="#6af7c8"/><rect x="5" y="4" width="2" height="2" fill="#0a2a20"/><rect x="9" y="4" width="2" height="2" fill="#0a2a20"/><rect x="6" y="7" width="4" height="1" fill="#0a2a20"/>${mood==='happy'?'<rect x="5" y="7" width="1" height="1" fill="#0a2a20"/><rect x="10" y="7" width="1" height="1" fill="#0a2a20"/>':''}`,
    TEEN:`<rect x="3" y="0" width="10" height="2" fill="#7c6af7"/><rect x="2" y="2" width="12" height="8" fill="#8c7cf7"/><rect x="1" y="3" width="1" height="6" fill="#7c6af7"/><rect x="14" y="3" width="1" height="6" fill="#7c6af7"/><rect x="3" y="10" width="3" height="4" fill="#7c6af7"/><rect x="10" y="10" width="3" height="4" fill="#7c6af7"/><rect x="5" y="4" width="2" height="2" fill="#1a0a4a"/><rect x="9" y="4" width="2" height="2" fill="#1a0a4a"/><rect x="6" y="7" width="4" height="1" fill="#1a0a4a"/><rect x="5" y="0" width="6" height="1" fill="#f76a8a"/>`,
    ADULT:`<rect x="3" y="0" width="10" height="3" fill="#f7d46a"/><rect x="2" y="3" width="12" height="9" fill="#f7e4a4"/><rect x="1" y="4" width="1" height="6" fill="#f7d46a"/><rect x="14" y="4" width="1" height="6" fill="#f7d46a"/><rect x="3" y="12" width="4" height="3" fill="#f7d46a"/><rect x="9" y="12" width="4" height="3" fill="#f7d46a"/><rect x="5" y="5" width="2" height="2" fill="#2a1a00"/><rect x="9" y="5" width="2" height="2" fill="#2a1a00"/><rect x="6" y="8" width="4" height="1" fill="#2a1a00"/><rect x="5" y="7" width="1" height="1" fill="#2a1a00"/><rect x="10" y="7" width="1" height="1" fill="#2a1a00"/><rect x="4" y="1" width="2" height="2" fill="#f76a8a"/><rect x="10" y="1" width="2" height="2" fill="#f76a8a"/>`,
    MASTER:`<rect x="3" y="0" width="10" height="3" fill="#6af7c8"/><rect x="2" y="3" width="12" height="10" fill="#a4f8e4"/><rect x="1" y="4" width="1" height="7" fill="#6af7c8"/><rect x="14" y="4" width="1" height="7" fill="#6af7c8"/><rect x="3" y="13" width="4" height="3" fill="#6af7c8"/><rect x="9" y="13" width="4" height="3" fill="#6af7c8"/><rect x="5" y="5" width="2" height="2" fill="#042c1a"/><rect x="9" y="5" width="2" height="2" fill="#042c1a"/><rect x="5" y="4" width="2" height="1" fill="#7c6af7"/><rect x="9" y="4" width="2" height="1" fill="#7c6af7"/><rect x="6" y="8" width="4" height="1" fill="#042c1a"/><rect x="5" y="7" width="1" height="1" fill="#042c1a"/><rect x="10" y="7" width="1" height="1" fill="#042c1a"/><rect x="0" y="5" width="1" height="2" fill="#f7d46a"/><rect x="15" y="5" width="1" height="2" fill="#f7d46a"/><rect x="6" y="0" width="1" height="1" fill="#f7d46a"/><rect x="9" y="0" width="1" height="1" fill="#f7d46a"/>`,
  };
  return s[stage]||s.EGG;
}

function getMood(p){
  if(p.health<25)  return"sick";
  if(p.hunger<20)  return"hungry";
  if(p.energy<15)  return"tired";
  if(p.happiness<30) return"sad";
  if(p.happiness>75&&p.health>70) return"happy";
  return"normal";
}
function getMoodStr(p){
  return{sick:"ILL",hungry:"HUNGRY",tired:"SLEEPY",sad:"SAD",happy:"HAPPY",normal:"OKAY"}[getMood(p)]||"OKAY";
}
function getIdleMsg(p){
  const pool=MESSAGES[getMood(p)]||MESSAGES.idle;
  return pool[Math.floor(Math.random()*pool.length)];
}

function render(p){
  if(!p) p=loadPet();
  const mood=getMood(p);
  document.getElementById("petSvg").innerHTML=getStageSprite(p.stage,mood==="happy"?"happy":"normal");
  const set=(id,val)=>{
    document.getElementById(id+"Bar").style.width=val+"%";
    document.getElementById(id+"Val").textContent=val;
  };
  set("happy",clamp(p.happiness)); set("hunger",clamp(p.hunger));
  set("energy",clamp(p.energy));   set("health",clamp(p.health));
  const xpPct=Math.round((p.xp/XP_PER_LEVEL)*100);
  document.getElementById("xpFill").style.width=xpPct+"%";
  document.getElementById("xpText").textContent=p.xp+" / "+XP_PER_LEVEL;
  document.getElementById("levelBadge").textContent="LVL "+p.level+" — "+p.stage;
  document.getElementById("petNameDisplay").textContent=p.name;
  document.getElementById("petNameInput").value=p.name;
  document.getElementById("infoAge").textContent=p.age+" days";
  document.getElementById("infoStage").textContent=p.stage;
  document.getElementById("infoMood").textContent=getMoodStr(p);
  document.getElementById("infoLastFed").textContent=p.lastFed?timeAgo(p.lastFed):"NEVER";
  document.getElementById("infoTasks").textContent=p.tasksToday||0;
  document.getElementById("infoHabits").textContent=p.habitsToday||0;
  document.getElementById("infoFocus").textContent=p.focusToday||0;
  document.getElementById("petMsg").textContent=getIdleMsg(p);
}

function timeAgo(iso){
  const d=(Date.now()-new Date(iso))/60000;
  if(d<1) return"JUST NOW";
  if(d<60) return Math.round(d)+" MIN AGO";
  if(d<1440) return Math.round(d/60)+" HR AGO";
  return Math.round(d/1440)+" DAYS AGO";
}

function action(type){
  let p=loadPet(); p=applyReward(p,type);
  if(type==="feed") p.lastFed=new Date().toISOString();
  const msg=MESSAGES[type][Math.floor(Math.random()*MESSAGES[type].length)];
  document.getElementById("petMsg").textContent=msg;
  animatePet(type==="play"?"happy":"default");
  showToast(msg); savePet(p); render(p);
}

function animatePet(cls){
  const el=document.getElementById("petSprite");
  el.className="pet";
  requestAnimationFrame(()=>{
    el.className="pet "+cls;
    setTimeout(()=>{el.className="pet default";},1200);
  });
}

window.PetAPI={
  reward:function(type){
    try{
      const raw=localStorage.getItem("petData");
      let p=raw?Object.assign({},JSON.parse(raw)):null; if(!p) return;
      const r={task:{happiness:8,energy:0,health:2,xp:5,hunger:0},habit:{happiness:4,energy:3,health:6,xp:4,hunger:0},focus:{happiness:5,energy:-5,health:2,xp:8,hunger:-4},plan:{happiness:5,energy:0,health:2,xp:3,hunger:0}}[type];
      if(!r) return;
      const cl=v=>Math.max(0,Math.min(100,Math.round(v)));
      p.happiness=cl(p.happiness+r.happiness);p.hunger=cl(p.hunger+r.hunger);
      p.energy=cl(p.energy+r.energy);p.health=cl(p.health+r.health);
      p.xp=(p.xp||0)+r.xp;
      while(p.xp>=100){p.xp-=100;p.level=(p.level||1)+1;}
      const stages=["EGG","BABY","CHILD","TEEN","ADULT","MASTER"],thresh=[1,3,6,10,15,20];
      for(let i=thresh.length-1;i>=0;i--){if(p.level>=thresh[i]){p.stage=stages[i];break;}}
      if(type==="task") p.tasksToday=(p.tasksToday||0)+1;
      if(type==="habit") p.habitsToday=(p.habitsToday||0)+1;
      if(type==="focus") p.focusToday=(p.focusToday||0)+1;
      localStorage.setItem("petData",JSON.stringify(p));
    }catch(e){}
  },
  getStatus:function(){try{return JSON.parse(localStorage.getItem("petData")||"null");}catch(e){return null;}}
};

function syncFromDashboard(){
  let p=loadPet();
  try{
    const tasks=parseInt(localStorage.getItem("todayTasksDone")||"0");
    const habits=parseInt(localStorage.getItem("todayHabitsDone")||"0");
    const focus=parseInt(localStorage.getItem("todayFocusDone")||"0");
    const nt=Math.max(0,tasks-(p.tasksToday||0));
    const nh=Math.max(0,habits-(p.habitsToday||0));
    const nf=Math.max(0,focus-(p.focusToday||0));
    for(let i=0;i<nt;i++) p=applyReward(p,"task");
    for(let i=0;i<nh;i++) p=applyReward(p,"habit");
    for(let i=0;i<nf;i++) p=applyReward(p,"focus");
    p.tasksToday=tasks;p.habitsToday=habits;p.focusToday=focus;
    savePet(p);render(p);
    showToast("SYNCED! +"+(nt+nh+nf)+" REWARDS");
    animatePet("happy");
  }catch(e){showToast("NOTHING TO SYNC");}
}

function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  clearTimeout(t._to);
  t._to=setTimeout(()=>t.classList.remove("show"),2200);
}

document.getElementById("petNameInput").addEventListener("change",function(){
  let p=loadPet(); p.name=this.value.toUpperCase().slice(0,8)||"BUDDY";
  savePet(p); render(p);
});

setInterval(()=>{
  document.getElementById("petMsg").textContent=getIdleMsg(loadPet());
},5000);

// Init
let pet=loadPet(); pet=applyDecay(pet); savePet(pet); render(pet);

// Firebase re-render hooks
window.addEventListener('firebaseDataLoaded',()=>render(loadPet()));
window.addEventListener('firebaseKeyUpdated',(e)=>{if(e.detail.key==='petData') render(loadPet());});

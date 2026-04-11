  
// ─────────────────────────────────────────────
// QUOTES
// ─────────────────────────────────────────────
const QUOTES = [
  { text: "A small daily task, if it really be daily, will beat the labours of a spasmodic Hercules.", author: "— TROLLOPE" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "— ARISTOTLE" },
  { text: "The secret of getting ahead is getting started.", author: "— MARK TWAIN" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "— CARNEGIE" },
  { text: "It's not about having time. It's about making time.", author: "— UNKNOWN" },
  { text: "Your pet believes in you. Don't let them down.", author: "— YOUR DASHBOARD" },
  { text: "One day or day one. You decide.", author: "— UNKNOWN" },
  { text: "Focus on being productive instead of being busy.", author: "— TIM FERRISS" },
  { text: "Small progress is still progress.", author: "— UNKNOWN" },
  { text: "Done is better than perfect.", author: "— SHERYL SANDBERG" },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0,10); }

function loadPet() {
  try { const r = localStorage.getItem('petData'); return r?JSON.parse(r):null; } catch(e){ return null; }
}
function loadTasks() {
  try { return JSON.parse(localStorage.getItem('tasks')||'[]'); } catch(e){ return []; }
}
function loadHabits() {
  try { return JSON.parse(localStorage.getItem('habits')||'[]'); } catch(e){ return []; }
}
function loadHabitLog() {
  try { return JSON.parse(localStorage.getItem('habitLog')||'{}'); } catch(e){ return {}; }
}
function loadEvents() {
  try { return JSON.parse(localStorage.getItem('plannerEvents')||'[]'); } catch(e){ return []; }
}

// ─────────────────────────────────────────────
// HERO DATE + GREETING
// ─────────────────────────────────────────────
function renderHero() {
  const now  = new Date();
  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  document.getElementById('heroDate').textContent =
    `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const h = now.getHours();
  const greet = h<12?'MORNING':h<17?'AFTERNOON':'EVENING';
  document.getElementById('greeting').textContent = greet;

  const pet = loadPet();
  document.getElementById('petNameGreet').textContent = pet?.name || 'PLAYER';

  // Motivational sub line
  const tasks   = loadTasks().filter(t=>!t.done).length;
  const habits  = loadHabits().length;
  const habDone = (loadHabitLog()[todayKey()]||[]).length;
  const subs = [
    tasks>0  ? `${tasks} TASKS WAITING FOR YOU` : 'ALL TASKS DONE! GREAT WORK!',
    habits>0 ? `${habDone}/${habits} HABITS DONE TODAY` : 'ADD SOME HABITS TO TRACK',
  ];
  document.getElementById('heroSub').textContent = '// ' + subs[Math.floor(Math.random()*subs.length)];
}

// ─────────────────────────────────────────────
// PET CARD
// ─────────────────────────────────────────────
const PET_SPRITES = {
  EGG:   `<rect x="5" y="2" width="6" height="1" fill="#c8b4f0"/><rect x="3" y="3" width="10" height="1" fill="#c8b4f0"/><rect x="2" y="4" width="12" height="6" fill="#d4c4f8"/><rect x="3" y="10" width="10" height="2" fill="#c8b4f0"/><rect x="5" y="12" width="6" height="1" fill="#c8b4f0"/><rect x="6" y="6" width="2" height="2" fill="#7c6af7"/><rect x="9" y="6" width="2" height="2" fill="#7c6af7"/><rect x="6" y="9" width="5" height="1" fill="#7c6af7"/>`,
  BABY:  `<rect x="4" y="1" width="8" height="2" fill="#f7c4d4"/><rect x="3" y="3" width="10" height="7" fill="#f7d4e4"/><rect x="2" y="4" width="1" height="4" fill="#f7c4d4"/><rect x="13" y="4" width="1" height="4" fill="#f7c4d4"/><rect x="4" y="10" width="3" height="2" fill="#f7c4d4"/><rect x="9" y="10" width="3" height="2" fill="#f7c4d4"/><rect x="5" y="5" width="2" height="2" fill="#333"/><rect x="9" y="5" width="2" height="2" fill="#333"/><rect x="6" y="8" width="4" height="1" fill="#f76a8a"/>`,
  CHILD: `<rect x="4" y="1" width="8" height="1" fill="#6af7c8"/><rect x="3" y="2" width="10" height="8" fill="#7af8d4"/><rect x="2" y="3" width="1" height="5" fill="#6af7c8"/><rect x="13" y="3" width="1" height="5" fill="#6af7c8"/><rect x="4" y="10" width="3" height="3" fill="#6af7c8"/><rect x="9" y="10" width="3" height="3" fill="#6af7c8"/><rect x="5" y="4" width="2" height="2" fill="#0a2a20"/><rect x="9" y="4" width="2" height="2" fill="#0a2a20"/><rect x="5" y="7" width="1" height="1" fill="#0a2a20"/><rect x="10" y="7" width="1" height="1" fill="#0a2a20"/>`,
  TEEN:  `<rect x="3" y="0" width="10" height="2" fill="#7c6af7"/><rect x="2" y="2" width="12" height="8" fill="#8c7cf7"/><rect x="1" y="3" width="1" height="6" fill="#7c6af7"/><rect x="14" y="3" width="1" height="6" fill="#7c6af7"/><rect x="3" y="10" width="3" height="4" fill="#7c6af7"/><rect x="10" y="10" width="3" height="4" fill="#7c6af7"/><rect x="5" y="4" width="2" height="2" fill="#1a0a4a"/><rect x="9" y="4" width="2" height="2" fill="#1a0a4a"/><rect x="6" y="7" width="4" height="1" fill="#1a0a4a"/>`,
  ADULT: `<rect x="3" y="0" width="10" height="3" fill="#f7d46a"/><rect x="2" y="3" width="12" height="9" fill="#f7e4a4"/><rect x="1" y="4" width="1" height="6" fill="#f7d46a"/><rect x="14" y="4" width="1" height="6" fill="#f7d46a"/><rect x="3" y="12" width="4" height="3" fill="#f7d46a"/><rect x="9" y="12" width="4" height="3" fill="#f7d46a"/><rect x="5" y="5" width="2" height="2" fill="#2a1a00"/><rect x="9" y="5" width="2" height="2" fill="#2a1a00"/><rect x="5" y="7" width="1" height="1" fill="#2a1a00"/><rect x="10" y="7" width="1" height="1" fill="#2a1a00"/>`,
  MASTER:`<rect x="3" y="0" width="10" height="3" fill="#6af7c8"/><rect x="2" y="3" width="12" height="10" fill="#a4f8e4"/><rect x="1" y="4" width="1" height="7" fill="#6af7c8"/><rect x="14" y="4" width="1" height="7" fill="#6af7c8"/><rect x="3" y="13" width="4" height="3" fill="#6af7c8"/><rect x="9" y="13" width="4" height="3" fill="#6af7c8"/><rect x="5" y="5" width="2" height="2" fill="#042c1a"/><rect x="9" y="5" width="2" height="2" fill="#042c1a"/><rect x="0" y="5" width="1" height="2" fill="#f7d46a"/><rect x="15" y="5" width="1" height="2" fill="#f7d46a"/>`,
};

function renderPetCard() {
  const p = loadPet();
  if (!p) {
    document.getElementById('petSpriteSm').innerHTML = PET_SPRITES.EGG;
    document.getElementById('petStageLbl').textContent = 'NO PET YET';
    document.getElementById('petNameCard').textContent = '???';
    document.getElementById('petLvlCard').textContent  = 'LVL 1';
    document.getElementById('petMoodCard').textContent = 'VISIT PET.HTML →';
    document.getElementById('petBars').innerHTML = '<span style="font-size:6px;color:var(--muted);">NO PET DATA — VISIT pet.html</span>';
    return;
  }

  document.getElementById('petSpriteSm').innerHTML = PET_SPRITES[p.stage]||PET_SPRITES.EGG;
  document.getElementById('petStageLbl').textContent = p.stage||'EGG';
  document.getElementById('petNameCard').textContent  = p.name||'BUDDY';
  document.getElementById('petLvlCard').textContent   = `LVL ${p.level||1}`;

  const mood = p.health<25?'ILL 😰':p.happiness>75?'HAPPY 😄':p.energy<20?'TIRED 😴':p.hunger<20?'HUNGRY 😟':'OKAY 🙂';
  document.getElementById('petMoodCard').textContent = mood;

  const bars = [
    { label:'HAPPY', val: Math.round(p.happiness||0), cls:'--pink' },
    { label:'HUNGER', val: Math.round(p.hunger||0),   cls:'--purple' },
    { label:'ENERGY', val: Math.round(p.energy||0),   cls:'--teal' },
    { label:'HEALTH', val: Math.round(p.health||0),   cls:'--amber' },
  ];
  document.getElementById('petBars').innerHTML = bars.map(b=>`
    <div class="pet-bar-row">
      <span class="lbl">${b.label}</span>
      <div class="px-bar" style="height:6px;">
        <div class="px-bar-fill px-bar-fill${b.cls}" style="width:${b.val}%"></div>
      </div>
      <span class="val">${b.val}</span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// TODAY SUMMARY CARDS
// ─────────────────────────────────────────────
function renderSummary() {
  const today  = todayKey();
  const tasks  = loadTasks();
  const habits = loadHabits();
  const log    = loadHabitLog();
  const events = loadEvents();
  const pet    = loadPet();

  // Tasks
  const pending  = tasks.filter(t=>!t.done).length;
  const doneToday= tasks.filter(t=>t.done&&t.doneDate===today).length;
  const total    = tasks.length;
  document.getElementById('sumTasks').textContent     = pending;
  document.getElementById('sumTasksSub').textContent  = `${doneToday} done today`;
  document.getElementById('sumTasksBar').style.width  = total ? Math.round(doneToday/total*100)+'%' : '0%';

  // Habits
  const habDone  = (log[today]||[]).length;
  const habTotal = habits.length;
  document.getElementById('sumHabits').textContent    = habDone;
  document.getElementById('sumHabitsSub').textContent = `${habTotal} total habits`;
  document.getElementById('sumHabitsBar').style.width = habTotal ? Math.round(habDone/habTotal*100)+'%' : '0%';

  // Events today
  const todayEvs = events.filter(e=>e.date===today);
  document.getElementById('sumEvents').textContent    = todayEvs.length;
  document.getElementById('sumEventsBar').style.width = Math.min(todayEvs.length*15,100)+'%';

  // Pet
  if (pet) {
    document.getElementById('sumPetHappy').textContent = Math.round(pet.happiness||0);
    document.getElementById('sumPetBar').style.width   = Math.round(pet.happiness||0)+'%';
    document.getElementById('sumPetSub').textContent   = `${pet.stage||'EGG'} · LVL ${pet.level||1}`;
  }

  // Streak counters
  document.getElementById('streakTasks').textContent  = doneToday;
  document.getElementById('streakPetLvl').textContent = pet?.level||1;

  // Habit streak
  let streak=0;
  const d2=new Date(); d2.setHours(0,0,0,0);
  for(let i=0;i<365;i++){
    d2.setDate(d2.getDate()-1);
    const k=d2.toISOString().slice(0,10);
    if((log[k]||[]).length>0) streak++;
    else break;
  }
  document.getElementById('streakHabits').textContent = streak;
}

// ─────────────────────────────────────────────
// TODAY'S EVENTS
// ─────────────────────────────────────────────
function renderEvents() {
  const today  = todayKey();
  const events = loadEvents()
    .filter(e=>e.date===today)
    .sort((a,b)=>a.start.localeCompare(b.start));

  const strip = document.getElementById('eventsStrip');
  if (!events.length) {
    strip.innerHTML = '<div class="no-events">NO EVENTS TODAY — <a href="planner.html" style="color:var(--amber);text-decoration:none;">OPEN PLANNER →</a></div>';
    return;
  }
  strip.innerHTML = events.map(e=>`
    <div class="event-row cat-${e.cat||'other'}">
      <span class="er-time">${e.start}</span>
      <span class="er-title">${esc(e.title)}</span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// QUOTE
// ─────────────────────────────────────────────
function renderQuote() {
  const idx = new Date().getDate() % QUOTES.length;
  const q   = QUOTES[idx];
  document.getElementById('quoteText').textContent   = `"${q.text}"`;
  document.getElementById('quoteAuthor').textContent = q.author;
}

// ─────────────────────────────────────────────
// QUICK ADD TASK
// ─────────────────────────────────────────────
function quickAdd() {
  const text = document.getElementById('quickInput').value.trim();
  if (!text) { document.getElementById('quickInput').focus(); return; }
  const tasks = loadTasks();
  tasks.push({
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    text, priority:'low', cat:'personal',
    due:null, done:false,
    added: Date.now(), addedDate: todayKey(), doneDate:null
  });
  localStorage.setItem('tasks', JSON.stringify(tasks));
  document.getElementById('quickInput').value = '';
  renderSummary();
  showToast('TASK ADDED → TASKS PAGE');
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.remove('show'), 2400);
}

function esc(s){ return (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const quickInput = document.getElementById('quickInput');
  if (quickInput) {
    quickInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') quickAdd();
    });
  }

  renderHero();
  renderPetCard();
  renderSummary();
  renderEvents();
  renderQuote();
});

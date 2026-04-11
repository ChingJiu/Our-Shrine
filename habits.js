// ──────────────────────────────────────────────
// DATA SCHEMA
// localStorage keys:
//   "habits"        → array of habit objects
//   "habitLog"      → { "YYYY-MM-DD": [habitId, ...] }
//   "todayHabitsDone" → number (for pet.html sync)
// ──────────────────────────────────────────────

const ICONS = ['💧','📚','🧘','🥗','💤','🎯','✏️','🏋️','🧹','📵'];

function todayKey() { return new Date().toISOString().slice(0,10); }
function uid()      { return Date.now().toString(36)+Math.random().toString(36).slice(2,5); }

function loadHabits() {
  try { return JSON.parse(localStorage.getItem('habits')||'[]'); } catch(e) { return []; }
}
function saveHabits(h) { localStorage.setItem('habits', JSON.stringify(h)); }

function loadLog() {
  try { return JSON.parse(localStorage.getItem('habitLog')||'{}'); } catch(e) { return {}; }
}
function saveLog(l) { localStorage.setItem('habitLog', JSON.stringify(l)); }

// Streak = consecutive days (going backwards from yesterday) where at least 1 habit was done
function calcStreak(habits, log) {
  let streak = 0;
  const d = new Date(); d.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    d.setDate(d.getDate()-1);
    const k = d.toISOString().slice(0,10);
    if ((log[k]||[]).length > 0) streak++;
    else break;
  }
  return streak;
}

function habitDoneToday(id, log) {
  return (log[todayKey()]||[]).includes(id);
}

function calcHabitStreak(id, log) {
  let s = 0;
  const d = new Date(); d.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    const k = d.toISOString().slice(0,10);
    if ((log[k]||[]).includes(id)) { s++; d.setDate(d.getDate()-1); }
    else break;
  }
  return s;
}

// ── SELECTED DATE ──
let selectedDate = todayKey();

// ── ICON PICKER ──
let pickedIcon = ICONS[0];
function buildIconGrid() {
  const grid = document.getElementById('iconGrid');
  grid.innerHTML = '';
  ICONS.forEach(ic => {
    const b = document.createElement('div');
    b.className = 'icon-opt' + (ic === pickedIcon ? ' picked' : '');
    b.textContent = ic;
    b.onclick = () => {
      pickedIcon = ic;
      document.querySelectorAll('.icon-opt').forEach(x => x.classList.remove('picked'));
      b.classList.add('picked');
    };
    grid.appendChild(b);
  });
}

// ── DATE STRIP ──
function buildDateStrip() {
  const strip = document.getElementById('dateStrip');
  strip.innerHTML = '';
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  for (let i = -6; i <= 0; i++) {
    const d = new Date(); d.setDate(d.getDate()+i); d.setHours(0,0,0,0);
    const k = d.toISOString().slice(0,10);
    const cell = document.createElement('div');
    cell.className = 'date-cell' +
      (k===todayKey()?' today':'') +
      (k===selectedDate?' selected':'');
    cell.innerHTML = `<div class="dc-day">${days[d.getDay()]}</div><div class="dc-num">${d.getDate()}</div>`;
    cell.onclick = () => { selectedDate = k; buildDateStrip(); renderHabits(); };
    strip.appendChild(cell);
  }
  document.getElementById('todayDateLabel').textContent =
    selectedDate === todayKey() ? 'TODAY' : selectedDate;
}

// ── RENDER HABITS ──
function renderHabits() {
  const habits = loadHabits();
  const log    = loadLog();
  const list   = document.getElementById('habitList');
  list.innerHTML = '';

  const doneIds = log[selectedDate]||[];
  const doneCount = doneIds.length;
  const total     = habits.length;

  // Ring
  const pct = total ? Math.round((doneCount/total)*100) : 0;
  const circ = 175.9;
  document.getElementById('ringFg').setAttribute('stroke-dashoffset', circ - (circ*pct/100));
  document.getElementById('ringPct').textContent = pct+'%';
  document.getElementById('ringTitle').textContent = `${doneCount} / ${total} done today`;

  // Stats
  document.getElementById('statStreak').textContent = calcStreak(habits, log);
  document.getElementById('statToday').textContent  = doneCount;
  document.getElementById('statTotal').textContent  = total;

  // Pet badge
  const pet = loadPet();
  document.getElementById('petMoodBadge').textContent = pet ? `PET: ${petMood(pet)}` : 'PET: --';
  document.getElementById('petStatDisplay').innerHTML = pet
    ? `Health: ${Math.round(pet.health||0)}<br>Energy: ${Math.round(pet.energy||0)}`
    : 'Health: —<br>Energy: —';

  if (habits.length === 0) {
    list.innerHTML = '<div style="font-size:8px;color:var(--muted);text-align:center;padding:24px 0;letter-spacing:0.08em;">NO HABITS YET — ADD ONE BELOW!</div>';
    return;
  }

  habits.forEach((h, idx) => {
    const done   = doneIds.includes(h.id);
    const streak = calcHabitStreak(h.id, log);

    const row = document.createElement('div');
    row.className = 'habit-row' + (done?' done':'');
    row.style.animationDelay = (idx*0.05)+'s';

    const chk = document.createElement('div');
    chk.className = 'habit-check' + (done?' checked':'');
    chk.onclick = () => toggleHabit(h.id);

    const info = document.createElement('div');
    info.className = 'habit-info';
    info.innerHTML = `<div class="habit-name">${h.icon||'🎯'} ${esc(h.name)}</div>
      <div class="habit-meta">${h.freq.toUpperCase()} · STREAK ${streak}</div>`;

    const badge = document.createElement('div');
    badge.className = 'streak-badge' + (streak>=7?' hot':'');
    badge.textContent = streak>=7 ? `🔥${streak}` : `${streak}d`;

    const del = document.createElement('button');
    del.className = 'habit-del';
    del.textContent = '×';
    del.title = 'Delete habit';
    del.onclick = e => { e.stopPropagation(); deleteHabit(h.id); };

    row.appendChild(chk);
    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(del);
    list.appendChild(row);
  });

  buildHeatmap();
}

function esc(s) { return (s||'').replace(/</g,'&lt;'); }

// ── TOGGLE HABIT ──
function toggleHabit(id) {
  const log = loadLog();
  const key = selectedDate;
  if (!log[key]) log[key] = [];
  const idx = log[key].indexOf(id);
  if (idx === -1) {
    log[key].push(id);
    rewardPet();
    // Update daily counter for pet.html sync
    const prev = parseInt(localStorage.getItem('todayHabitsDone')||'0');
    localStorage.setItem('todayHabitsDone', prev+1);
    showToast('HABIT DONE! PET +6 HEALTH');
  } else {
    log[key].splice(idx,1);
    const prev = Math.max(0, parseInt(localStorage.getItem('todayHabitsDone')||'0')-1);
    localStorage.setItem('todayHabitsDone', prev);
  }
  saveLog(log);
  renderHabits();
}

// ── ADD HABIT ──
function addHabit() {
  const name = document.getElementById('habitInput').value.trim();
  if (!name) { document.getElementById('habitInput').focus(); return; }
  const freq = document.getElementById('habitFreq').value;
  const habits = loadHabits();
  habits.push({ id: uid(), name, icon: pickedIcon, freq, created: todayKey() });
  saveHabits(habits);
  document.getElementById('habitInput').value = '';
  renderHabits();
  showToast('HABIT ADDED!');
}

// ── DELETE HABIT ──
function deleteHabit(id) {
  const habits = loadHabits().filter(h => h.id !== id);
  saveHabits(habits);
  // Also clean log
  const log = loadLog();
  Object.keys(log).forEach(k => {
    log[k] = log[k].filter(x => x !== id);
  });
  saveLog(log);
  renderHabits();
}

// ── HEATMAP (84 days = 12 weeks) ──
function buildHeatmap() {
  const log    = loadLog();
  const habits = loadHabits();
  const total  = Math.max(habits.length, 1);
  const hm     = document.getElementById('heatmap');
  hm.innerHTML = '';
  for (let i = 83; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    const k = d.toISOString().slice(0,10);
    const done = (log[k]||[]).length;
    const ratio = done/total;
    const cell = document.createElement('div');
    cell.className = 'hm-cell' + (ratio===0?'':ratio<0.34?' l1':ratio<0.67?' l2':ratio<1?' l3':' l4');
    cell.title = `${k}: ${done} habits`;
    hm.appendChild(cell);
  }
}

// ── PET INTEGRATION ──
function loadPet() {
  try { const r = localStorage.getItem('petData'); return r?JSON.parse(r):null; } catch(e){ return null; }
}
function petMood(p) {
  if (!p) return '--';
  if (p.health<25) return 'ILL 😰';
  if (p.happiness>75) return 'HAPPY 😄';
  if (p.energy<20) return 'TIRED 😴';
  return 'OKAY 🙂';
}
function rewardPet() {
  try {
    const p = loadPet(); if(!p) return;
    const cl = v => Math.max(0,Math.min(100,Math.round(v)));
    p.health  = cl((p.health||90)  + 6);
    p.energy  = cl((p.energy||60)  + 3);
    p.happiness=cl((p.happiness||80)+4);
    p.xp = (p.xp||0)+4;
    while(p.xp>=100){p.xp-=100;p.level=(p.level||1)+1;}
    const stages=['EGG','BABY','CHILD','TEEN','ADULT','MASTER'];
    const thresh=[1,3,6,10,15,20];
    for(let i=thresh.length-1;i>=0;i--){if(p.level>=thresh[i]){p.stage=stages[i];break;}}
    p.habitsToday=(p.habitsToday||0)+1;
    localStorage.setItem('petData',JSON.stringify(p));
  } catch(e){}
}

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.remove('show'),2200);
}

// ── KEYBOARD ──
document.getElementById('habitInput').addEventListener('keydown', e => {
  if (e.key==='Enter') addHabit();
});

// ── INIT ──
buildIconGrid();
buildDateStrip();
renderHabits()

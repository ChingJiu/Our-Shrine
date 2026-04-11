// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const START_H = 7, END_H = 22;
const DAYS_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const SLOT_H = 40; // px per 30-min row

let weekOffset  = 0;
let activeFilters = new Set();
let editingId   = null;
let pendingSlot = null;

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
function loadEvents() {
  try { return JSON.parse(localStorage.getItem('plannerEvents')||'[]'); } catch(e){ return []; }
}
function saveEvents(evs) { localStorage.setItem('plannerEvents', JSON.stringify(evs)); }
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function todayKey() { return new Date().toISOString().slice(0,10); }
function esc(s) { return (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─────────────────────────────────────────────
// WEEK MATHS
// ─────────────────────────────────────────────
function getWeekDays(offset) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - dow + 1 + offset * 7);
  mon.setHours(0,0,0,0);
  return Array.from({length:7}, (_,i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate()+i);
    return d;
  });
}
function dateKey(d) { return d.toISOString().slice(0,10); }

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
function render() {
  const days   = getWeekDays(weekOffset);
  const events = loadEvents();
  const grid   = document.getElementById('weekGrid');
  grid.innerHTML = '';

  // Week label
  const ws = days[0], we = days[6];
  document.getElementById('weekLabel').textContent =
    `${ws.getDate()} ${MONTHS[ws.getMonth()]} – ${we.getDate()} ${MONTHS[we.getMonth()]} ${we.getFullYear()}`;

  // ── HEADER ROW ──
  grid.appendChild(makeEl('div','day-header corner'));
  days.forEach((d,i) => {
    const hdr = makeEl('div','day-header'+(dateKey(d)===todayKey()?' today':''));
    hdr.innerHTML = `<div class="dh-name">${DAYS_SHORT[(i+1)%7]}</div><div class="dh-num">${d.getDate()}</div>`;
    grid.appendChild(hdr);
  });

  // ── TIME ROWS ──
  for (let h = START_H; h < END_H; h++) {
    [0, 30].forEach(min => {
      const half = min===30;

      // Time label
      const lbl = makeEl('div','time-label'+(half?' half':''));
      lbl.textContent = half ? '' : `${String(h).padStart(2,'0')}:00`;
      grid.appendChild(lbl);

      // Day slots
      days.forEach((d, di) => {
        const slot = makeEl('div','slot'+(half?' half-hour':''));
        slot.title = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')} — ${DAYS_SHORT[(di+1)%7]} ${d.getDate()}`;
        slot.addEventListener('click', e => {
          if (e.target.closest('.ev-block')) return;
          openModal(null, { date: dateKey(d), hour: h, minute: min });
        });

        // Events starting in this slot
        const slotEvs = events.filter(ev => {
          if (ev.date !== dateKey(d)) return false;
          if (activeFilters.size && !activeFilters.has(ev.cat)) return false;
          const [sh,sm] = ev.start.split(':').map(Number);
          return sh===h && (min===0 ? sm<30 : sm>=30);
        });

        slotEvs.forEach(ev => {
          const [sh,sm] = ev.start.split(':').map(Number);
          const [eh,em] = ev.end.split(':').map(Number);
          const mins = (eh*60+em)-(sh*60+sm);
          const h_px = Math.max(18, (mins/30)*SLOT_H - 2);

          const block = makeEl('div', `ev-block cat-${ev.cat||'other'}`);
          block.style.height = h_px+'px';
          block.innerHTML = `<span class="evb-title">${esc(ev.title)}</span><span class="evb-time">${ev.start}–${ev.end}</span>`;
          block.addEventListener('click', e => { e.stopPropagation(); openModal(ev.id); });
          slot.appendChild(block);
        });

        grid.appendChild(slot);
      });
    });
  }

  renderSummary(events, days);
}

function makeEl(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function renderSummary(events, days) {
  const keys = new Set(days.map(dateKey));
  const weekEvs = events.filter(e => keys.has(e.date));
  const cats = {};
  weekEvs.forEach(e => { cats[e.cat||'other'] = (cats[e.cat||'other']||0)+1; });
  document.getElementById('summaryStrip').innerHTML =
    `<div class="sum-pill"><strong>${weekEvs.length}</strong>THIS WEEK</div>` +
    Object.entries(cats).map(([c,n])=>`<div class="sum-pill"><strong>${n}</strong>${c.toUpperCase()}</div>`).join('');
}

// ─────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────
function shiftWeek(d) { weekOffset+=d; render(); }
function goToday()    { weekOffset=0;  render(); }

// ─────────────────────────────────────────────
// FILTER
// ─────────────────────────────────────────────
function toggleFilter(cat) {
  if (activeFilters.has(cat)) {
    activeFilters.delete(cat);
  } else {
    activeFilters.add(cat);
  }
  document.querySelectorAll('.cat-pill').forEach(p => {
    const c = p.dataset.cat;
    p.classList.toggle('faded', activeFilters.size>0 && !activeFilters.has(c));
  });
  if (activeFilters.size===0) document.querySelectorAll('.cat-pill').forEach(p=>p.classList.remove('faded'));
  render();
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function openModal(id, slot) {
  editingId   = id || null;
  pendingSlot = slot || null;
  const events = loadEvents();
  const ev     = id ? events.find(e=>e.id===id) : null;

  document.getElementById('modalTitle').textContent = ev ? 'EDIT EVENT' : 'NEW EVENT';
  document.getElementById('evTitle').value  = ev ? ev.title : '';
  document.getElementById('evNotes').value  = ev ? ev.notes||'' : '';
  document.getElementById('evStart').value  = ev ? ev.start : (slot ? `${String(slot.hour).padStart(2,'0')}:${String(slot.minute).padStart(2,'0')}` : '09:00');
  document.getElementById('evEnd').value    = ev ? ev.end   : addHour(document.getElementById('evStart').value, 1);
  document.getElementById('btnDel').style.display = ev ? 'block' : 'none';

  const cat = ev ? ev.cat||'work' : 'work';
  document.querySelectorAll('#catPicker .cat-opt').forEach(o => {
    o.classList.toggle('selected', o.dataset.cat===cat);
  });

  document.getElementById('modalBg').classList.add('open');
  setTimeout(()=>document.getElementById('evTitle').focus(),50);
}

function closeModal() {
  document.getElementById('modalBg').classList.remove('open');
  editingId=null; pendingSlot=null;
}

function addHour(t,h) {
  const [hh,mm]=t.split(':').map(Number);
  const tot=hh*60+mm+h*60;
  return `${String(Math.min(Math.floor(tot/60),23)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`;
}

document.querySelectorAll('#catPicker .cat-opt').forEach(opt => {
  opt.addEventListener('click', ()=>{
    document.querySelectorAll('#catPicker .cat-opt').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
  });
});

function saveEvent() {
  const title = document.getElementById('evTitle').value.trim();
  if (!title) { document.getElementById('evTitle').focus(); return; }
  const cat   = document.querySelector('#catPicker .cat-opt.selected')?.dataset.cat||'other';
  const start = document.getElementById('evStart').value;
  const end   = document.getElementById('evEnd').value;
  const notes = document.getElementById('evNotes').value.trim();
  const events = loadEvents();

  let date = pendingSlot?.date;
  if (!date && editingId) date = events.find(e=>e.id===editingId)?.date;
  if (!date) date = dateKey(getWeekDays(weekOffset)[0]);

  if (editingId) {
    const idx = events.findIndex(e=>e.id===editingId);
    if (idx>-1) events[idx] = {...events[idx], title, cat, start, end, notes};
  } else {
    events.push({ id:uid(), date, title, cat, start, end, notes });
    rewardPet();
    showToast('EVENT ADDED · PET +5 HAPPY');
  }
  saveEvents(events);
  closeModal();
  render();
}

function deleteEvent() {
  if (!editingId) return;
  saveEvents(loadEvents().filter(e=>e.id!==editingId));
  closeModal();
  render();
  showToast('EVENT DELETED');
}

document.getElementById('modalBg').addEventListener('click', function(e){
  if(e.target===this) closeModal();
});

// ─────────────────────────────────────────────
// PET INTEGRATION
// ─────────────────────────────────────────────
function rewardPet() {
  try {
    const p = JSON.parse(localStorage.getItem('petData')||'null'); if(!p) return;
    const cl = v=>Math.max(0,Math.min(100,Math.round(v)));
    p.happiness=cl((p.happiness||80)+5);
    p.health=cl((p.health||90)+2);
    p.xp=(p.xp||0)+3;
    while(p.xp>=100){p.xp-=100;p.level=(p.level||1)+1;}
    localStorage.setItem('petData',JSON.stringify(p));
  } catch(e){}
}
function syncPet() {
  const days  = getWeekDays(weekOffset);
  const keys  = new Set(days.map(dateKey));
  const count = loadEvents().filter(e=>keys.has(e.date)).length;
  for(let i=0;i<Math.min(count,6);i++) rewardPet();
  showToast(`SYNCED! ${Math.min(count,6)} EVENTS REWARDED`);
}

// ─────────────────────────────────────────────
// TOAST + KEYBOARD
// ─────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._to);
  t._to=setTimeout(()=>t.classList.remove('show'),2400);
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
render();

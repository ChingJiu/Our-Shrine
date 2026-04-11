
// ──────────────────────────────────────────────
// DATA
// localStorage: "tasks" → Task[]
// localStorage: "todayTasksDone" → number (for pet sync)
// ──────────────────────────────────────────────

let currentFilter = 'all';
let currentSort   = 'added';
let currentPrio   = 'low';

function uid()      { return Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function todayKey() { return new Date().toISOString().slice(0,10); }

function loadTasks() {
  try { return JSON.parse(localStorage.getItem('tasks')||'[]'); } catch(e) { return []; }
}
function saveTasks(t) { localStorage.setItem('tasks', JSON.stringify(t)); }

const PRIO_ORDER = { high:0, medium:1, low:2 };

// ── FILTER + SORT ──
function filterTasks(tasks) {
  const today = todayKey();
  switch(currentFilter) {
    case 'pending': return tasks.filter(t => !t.done);
    case 'done':    return tasks.filter(t => t.done);
    case 'high':    return tasks.filter(t => t.priority==='high' && !t.done);
    case 'overdue': return tasks.filter(t => !t.done && t.due && t.due < today);
    default:        return tasks;
  }
}
function sortTasks(tasks) {
  return [...tasks].sort((a,b) => {
    if (currentSort==='priority') return (PRIO_ORDER[a.priority]||2)-(PRIO_ORDER[b.priority]||2);
    if (currentSort==='due') {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    }
    if (currentSort==='alpha') return a.text.localeCompare(b.text);
    return b.added - a.added; // newest first
  });
}

// ── RENDER ──
function render() {
  const all    = loadTasks();
  const today  = todayKey();
  const done   = all.filter(t=>t.done && t.doneDate===today).length;
  const pending= all.filter(t=>!t.done).length;
  const overdue= all.filter(t=>!t.done&&t.due&&t.due<today).length;

  // Stats
  document.getElementById('statTotal').textContent   = all.length;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statOverdue').textContent = overdue;

  // Progress
  const todayTasks = all.filter(t => t.addedDate===today || (t.done&&t.doneDate===today));
  const todayDone  = todayTasks.filter(t=>t.done&&t.doneDate===today).length;
  const todayTotal = todayTasks.length;
  const pct = todayTotal ? Math.round(todayDone/todayTotal*100) : 0;
  document.getElementById('progressBar').style.width = pct+'%';
  document.getElementById('progressLabel').textContent = `${todayDone} / ${todayTotal}`;

  // Pet reward count
  const petDone = parseInt(localStorage.getItem('todayTasksDone')||'0');
  document.getElementById('petRewardCount').textContent = `+${petDone} TODAY`;

  // Pet mood badge
  try {
    const p = JSON.parse(localStorage.getItem('petData')||'null');
    if (p) {
      const mood = p.health<25?'ILL 😰':p.happiness>75?'HAPPY 😄':p.energy<20?'TIRED 😴':'OKAY 🙂';
      document.getElementById('petMini').textContent = `PET: ${mood}`;
    }
  } catch(e){}

  // Filtered + sorted tasks
  const visible = sortTasks(filterTasks(all));
  const container = document.getElementById('taskContainer');
  container.innerHTML = '';

  if (visible.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="es-icon">📋</span>
      ${currentFilter==='all'?'NO TASKS YET<br>ADD ONE ABOVE!':
        currentFilter==='done'?'NOTHING DONE YET<br>GET TO WORK!':
        currentFilter==='overdue'?'ALL CAUGHT UP!<br>NO OVERDUE TASKS 🎉':
        'NOTHING HERE!'}
    </div>`;
    return;
  }

  // Group by: pending / done
  const groups = currentFilter!=='all' ? [{ label:null, items:visible }] : [
    { label:'PENDING', items: visible.filter(t=>!t.done) },
    { label:'COMPLETED', items: visible.filter(t=>t.done) },
  ].filter(g=>g.items.length);

  groups.forEach((g, gi) => {
    const section = document.createElement('div');
    section.className = 'section-group';

    if (g.label) {
      const hdr = document.createElement('div');
      hdr.className = 'group-header';
      hdr.innerHTML = `<span>// ${g.label}</span><span class="group-count">${g.items.length}</span>`;
      section.appendChild(hdr);
    }

    const list = document.createElement('div');
    list.className = 'task-list';

    g.items.forEach((t, i) => {
      const el = buildTaskEl(t, today);
      el.style.animationDelay = (i*0.04)+'s';
      list.appendChild(el);
    });

    section.appendChild(list);
    container.appendChild(section);
  });
}

function buildTaskEl(t, today) {
  const isOverdue = !t.done && t.due && t.due < today;
  const isToday   = !t.done && t.due === today;
  const item = document.createElement('div');
  item.className = `task-item p-${t.priority||'low'}${t.done?' done':''}`;

  const check = document.createElement('div');
  check.className = 'task-check'+(t.done?' checked':'');
  check.onclick = () => toggleTask(t.id);

  const body = document.createElement('div');
  body.className = 'task-body';

  let metaHtml = `<span class="task-tag cat-${t.cat||'other'}">${(t.cat||'other').toUpperCase()}</span>`;
  if (t.priority==='high')   metaHtml += `<span class="task-tag" style="border-color:var(--accent2);color:var(--accent2);">!! HIGH</span>`;
  if (t.priority==='medium') metaHtml += `<span class="task-tag" style="border-color:var(--amber);color:var(--amber);">MED</span>`;
  if (t.due) {
    const cls = isOverdue?'overdue':isToday?'today-due':'';
    const label = isOverdue?'OVERDUE':isToday?'TODAY':t.due;
    metaHtml += `<span class="task-due ${cls}">${label}</span>`;
  }
  if (t.done && t.doneDate) metaHtml += `<span class="task-tag" style="color:var(--accent3);border-color:var(--accent3);">DONE ${t.doneDate===todayKey()?'TODAY':t.doneDate}</span>`;

  body.innerHTML = `<div class="task-title">${esc(t.text)}</div><div class="task-meta">${metaHtml}</div>`;

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  const del = document.createElement('button');
  del.className = 'task-del';
  del.textContent = '×';
  del.title = 'Delete task';
  del.onclick = e => { e.stopPropagation(); deleteTask(t.id); };
  actions.appendChild(del);

  item.appendChild(check);
  item.appendChild(body);
  item.appendChild(actions);
  return item;
}

function esc(s){ return (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── ADD TASK ──
function addTask() {
  const text = document.getElementById('taskInput').value.trim();
  if (!text) { document.getElementById('taskInput').focus(); return; }
  const cat = document.getElementById('taskCat').value;
  const due = document.getElementById('taskDue').value || null;
  const tasks = loadTasks();
  tasks.push({
    id: uid(), text, priority: currentPrio, cat, due,
    done: false, added: Date.now(), addedDate: todayKey(), doneDate: null
  });
  saveTasks(tasks);
  document.getElementById('taskInput').value = '';
  document.getElementById('taskDue').value = '';
  render();
  showToast('TASK ADDED!');
}

// ── TOGGLE TASK ──
function toggleTask(id) {
  const tasks  = loadTasks();
  const idx    = tasks.findIndex(t=>t.id===id);
  if (idx<0) return;
  const task   = tasks[idx];
  const wasDone = task.done;
  task.done     = !wasDone;
  task.doneDate = task.done ? todayKey() : null;
  saveTasks(tasks);

  if (task.done) {
    rewardPet(task);
    const prev = parseInt(localStorage.getItem('todayTasksDone')||'0');
    localStorage.setItem('todayTasksDone', prev+1);
    showToast('TASK COMPLETE! PET +8 HAPPY');
    spawnConfetti();
    // Check all done bonus
    const remaining = loadTasks().filter(t=>!t.done && t.addedDate===todayKey()).length;
    if (remaining===0) {
      setTimeout(()=>{
        rewardPetBonus();
        showToast('ALL DONE! BONUS +15 XP FOR PET!');
      }, 600);
    }
  } else {
    const prev = Math.max(0, parseInt(localStorage.getItem('todayTasksDone')||'0')-1);
    localStorage.setItem('todayTasksDone', prev);
  }
  render();
}

// ── DELETE ──
function deleteTask(id) {
  saveTasks(loadTasks().filter(t=>t.id!==id));
  render();
}

// ── PRIORITY ──
function setPrio(p) {
  currentPrio = p;
  document.querySelectorAll('.prio-dot').forEach(d => {
    d.classList.toggle('sel', d.dataset.p===p);
  });
}

// ── FILTER ──
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.className = 'filter-tab' + (t.dataset.f===f ? ` active${f==='done'?' active-teal':f==='high'?' active-pink':f==='overdue'?' active-amber':''}` : '');
  });
  render();
}

// ── SORT ──
function setSort(s, el) {
  currentSort = s;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.s===s));
  render();
}

// ── PET INTEGRATION ──
function rewardPet(task) {
  try {
    const p = JSON.parse(localStorage.getItem('petData')||'null');
    if (!p) return;
    const cl = v => Math.max(0,Math.min(100,Math.round(v)));
    p.happiness = cl((p.happiness||80)+8);
    p.health    = cl((p.health||90)+2);
    p.xp        = (p.xp||0)+5;
    while(p.xp>=100){p.xp-=100;p.level=(p.level||1)+1;}
    const stages=['EGG','BABY','CHILD','TEEN','ADULT','MASTER'];
    const thresh=[1,3,6,10,15,20];
    for(let i=thresh.length-1;i>=0;i--){if(p.level>=thresh[i]){p.stage=stages[i];break;}}
    p.tasksToday=(p.tasksToday||0)+1;
    localStorage.setItem('petData',JSON.stringify(p));
  } catch(e){}
}
function rewardPetBonus() {
  try {
    const p = JSON.parse(localStorage.getItem('petData')||'null');
    if (!p) return;
    p.xp = (p.xp||0)+15;
    p.happiness = Math.min(100, Math.round((p.happiness||80)+10));
    while(p.xp>=100){p.xp-=100;p.level=(p.level||1)+1;}
    localStorage.setItem('petData',JSON.stringify(p));
  } catch(e){}
}

// ── CONFETTI ──
function spawnConfetti() {
  const colors = ['#7c6af7','#f76a8a','#6af7c8','#f7d46a'];
  for (let i=0;i<12;i++) {
    const d = document.createElement('div');
    d.className = 'confetti-piece';
    d.style.cssText = `left:${20+Math.random()*60}%; top:${80+Math.random()*10}%; background:${colors[i%4]}; animation-delay:${Math.random()*0.3}s;`;
    document.body.appendChild(d);
    setTimeout(()=>d.remove(), 1200);
  }
}

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.remove('show'), 2300);
}

// ── KEYBOARD ──
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key==='Enter') addTask();
});

// ── INIT ──
render();

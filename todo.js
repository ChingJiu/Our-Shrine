
 const TASKS_KEY = 'tasks';
 const PET_DONE_KEY = 'todayTasksDone';
 
+let currentFilter = 'all';
+let currentSort = 'added';
+let currentPrio = 'low';
+
+function uid() {
+  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
+}
+
+function todayKey() {
+  return new Date().toISOString().slice(0, 10);
+}
+
 function readJson(key, fallback) {
-  try { return JSON.parse(localStorage.getItem(key) || fallback); } catch(e) { return JSON.parse(fallback); }
+  try {
+    return JSON.parse(localStorage.getItem(key) || fallback);
+  } catch (e) {
+    return JSON.parse(fallback);
+  }
 }
 
+function loadTasks() {
   const tasks = readJson(TASKS_KEY, '[]');
   return Array.isArray(tasks) ? tasks : [];
 }
 
 function saveTasks(tasks) {
   localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
+}
+
+const PRIO_ORDER = { high: 0, medium: 1, low: 2 };
+
+function filterTasks(tasks) {
+  const today = todayKey();
+  switch (currentFilter) {
+    case 'pending':
+      return tasks.filter((t) => !t.done);
+    case 'done':
+      return tasks.filter((t) => t.done);
+    case 'high':
+      return tasks.filter((t) => t.priority === 'high' && !t.done);
+    case 'overdue':
+      return tasks.filter((t) => !t.done && t.due && t.due < today);
+    default:
+      return tasks;
+  }
+}
+
+function sortTasks(tasks) {
+  return [...tasks].sort((a, b) => {
+    if (currentSort === 'priority') {
+      return (PRIO_ORDER[a.priority] || 2) - (PRIO_ORDER[b.priority] || 2);
+    }
+
+    if (currentSort === 'due') {
+      if (!a.due && !b.due) return 0;
+      if (!a.due) return 1;
+      if (!b.due) return -1;
+      return a.due.localeCompare(b.due);
+    }
+
+    if (currentSort === 'alpha') {
+      return a.text.localeCompare(b.text);
+    }
+
+    return b.added - a.added;
+  });
+}
+
+function render() {
+  const all = loadTasks();
+  const today = todayKey();
+  const done = all.filter((t) => t.done && t.doneDate === today).length;
+  const pending = all.filter((t) => !t.done).length;
+  const overdue = all.filter((t) => !t.done && t.due && t.due < today).length;
+
+  document.getElementById('statTotal').textContent = all.length;
+  document.getElementById('statDone').textContent = done;
+  document.getElementById('statPending').textContent = pending;
+  document.getElementById('statOverdue').textContent = overdue;
+
+  const todayTasks = all.filter((t) => t.addedDate === today || (t.done && t.doneDate === today));
+  const todayDone = todayTasks.filter((t) => t.done && t.doneDate === today).length;
+  const todayTotal = todayTasks.length;
+  const pct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0;
+  document.getElementById('progressBar').style.width = `${pct}%`;
+  document.getElementById('progressLabel').textContent = `${todayDone} / ${todayTotal}`;
+
+  const petDone = parseInt(localStorage.getItem(PET_DONE_KEY) || '0', 10);
+  document.getElementById('petRewardCount').textContent = `+${petDone} TODAY`;
+
+  try {
     const p = readJson('petData', 'null');
+    if (p) {
+      const mood = p.health < 25 ? 'ILL 😰' : p.happiness > 75 ? 'HAPPY 😄' : p.energy < 20 ? 'TIRED 😴' : 'OKAY 🙂';
+      document.getElementById('petMini').textContent = `PET: ${mood}`;
+    }
+  } catch (e) {
+    // ignore malformed pet state
+  }
+
+  const visible = sortTasks(filterTasks(all));
+  const container = document.getElementById('taskContainer');
+  container.innerHTML = '';
+
+  if (visible.length === 0) {
+    container.innerHTML = `<div class="empty-state">
+      <span class="es-icon">📋</span>
+      ${
+        currentFilter === 'all'
+          ? 'NO TASKS YET<br>ADD ONE ABOVE!'
+          : currentFilter === 'done'
+            ? 'NOTHING DONE YET<br>GET TO WORK!'
+            : currentFilter === 'overdue'
+              ? 'ALL CAUGHT UP!<br>NO OVERDUE TASKS 🎉'
+              : 'NOTHING HERE!'
+      }
+    </div>`;
+    return;
+  }
+
+  const groups =
+    currentFilter !== 'all'
+      ? [{ label: null, items: visible }]
+      : [
+          { label: 'PENDING', items: visible.filter((t) => !t.done) },
+          { label: 'DONE', items: visible.filter((t) => t.done) },
+        ];
+
+  for (const group of groups) {
+    if (!group.items.length) continue;
+
+    if (group.label) {
+      const h = document.createElement('div');
+      h.className = 'task-group-label';
+      h.textContent = group.label;
+      container.appendChild(h);
+    }
+
+    group.items.forEach((task) => {
+      const row = document.createElement('div');
+      row.className = `task-row ${task.done ? 'done' : ''} prio-${task.priority || 'low'}`;
+
+      const dueTag = task.due
+        ? `<span class="task-due ${!task.done && task.due < today ? 'overdue' : ''}">${task.due}</span>`
+        : '';
+
+      row.innerHTML = `
+        <button class="task-check ${task.done ? 'on' : ''}" onclick="toggleTask('${task.id}')">${task.done ? '✓' : ''}</button>
+        <div class="task-main">
+          <div class="task-text">${escapeHtml(task.text || '')}</div>
+          <div class="task-meta">
+            <span class="task-cat">${(task.cat || 'other').toUpperCase()}</span>
+            <span class="task-prio">${(task.priority || 'low').toUpperCase()}</span>
+            ${dueTag}
+          </div>
+        </div>
+        <button class="task-del" onclick="deleteTask('${task.id}')">✕</button>
+      `;
+
+      container.appendChild(row);
+    });
+  }
+}
+
+function escapeHtml(str) {
+  return str
+    .replaceAll('&', '&amp;')
+    .replaceAll('<', '&lt;')
+    .replaceAll('>', '&gt;')
+    .replaceAll('"', '&quot;')
+    .replaceAll("'", '&#39;');
+}
+
+function addTask() {
+  const input = document.getElementById('taskInput');
+  const catInput = document.getElementById('taskCat');
+  const dueInput = document.getElementById('taskDue');
+
+  const text = input.value.trim();
+  if (!text) {
+    showToast('ENTER A TASK FIRST!');
+    return;
+  }
+
+  const cat = catInput.value || 'other';
+  const due = dueInput.value || '';
+
+  const tasks = loadTasks();
+  tasks.push({
+    id: uid(),
+    text,
+    priority: currentPrio,
+    cat,
+    due,
+    done: false,
+    added: Date.now(),
+    addedDate: todayKey(),
+    doneDate: null,
+  });
+
+  saveTasks(tasks);
+  input.value = '';
+  dueInput.value = '';
+  render();
+  showToast('TASK ADDED!');
+}
+
+function toggleTask(id) {
+  const tasks = loadTasks();
+  const idx = tasks.findIndex((t) => t.id === id);
+  if (idx < 0) return;
+
+  const task = tasks[idx];
+  const wasDone = task.done;
+  task.done = !wasDone;
+  task.doneDate = task.done ? todayKey() : null;
+  saveTasks(tasks);
+
+  if (task.done) {
+    rewardPet(task);
+    const prev = parseInt(localStorage.getItem(PET_DONE_KEY) || '0', 10);
+    localStorage.setItem(PET_DONE_KEY, String(prev + 1));
+    showToast('TASK COMPLETE! PET +8 HAPPY');
+    spawnConfetti();
+
+    const remaining = loadTasks().filter((t) => !t.done && t.addedDate === todayKey()).length;
+    if (remaining === 0) {
+      setTimeout(() => {
+        rewardPetBonus();
+        showToast('ALL DONE! BONUS +15 XP FOR PET!');
+      }, 600);
+    }
+  } else {
+    const prev = Math.max(0, parseInt(localStorage.getItem(PET_DONE_KEY) || '0', 10) - 1);
+    localStorage.setItem(PET_DONE_KEY, String(prev));
+  }
+
+  render();
+}
+
+function deleteTask(id) {
+  saveTasks(loadTasks().filter((t) => t.id !== id));
+  render();
+}
+
+function setPrio(p) {
+  currentPrio = p;
+  document.querySelectorAll('.prio-dot').forEach((d) => {
+    d.classList.toggle('sel', d.dataset.p === p);
+  });
+}
+
+function setFilter(f) {
+  currentFilter = f;
+  document.querySelectorAll('.filter-tab').forEach((t) => {
+    t.className =
+      'filter-tab' +
+      (t.dataset.f === f
+        ? ` active${f === 'done' ? ' active-teal' : f === 'high' ? ' active-pink' : f === 'overdue' ? ' active-amber' : ''}`
+        : '');
+  });
+  render();
+}
+
+function setSort(s) {
+  currentSort = s;
+  document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('active', b.dataset.s === s));
+  render();
+}
+
+function rewardPet() {
+  try {
+    if (!p) return;
+    const cl = (v) => Math.max(0, Math.min(100, Math.round(v)));
+    p.happiness = cl((p.happiness || 80) + 8);
+    p.health = cl((p.health || 90) + 2);
+    p.xp = (p.xp || 0) + 5;
+    while (p.xp >= 100) {
+      p.xp -= 100;
+      p.level = (p.level || 1) + 1;
+    }
+    const stages = ['EGG', 'BABY', 'CHILD', 'TEEN', 'ADULT', 'MASTER'];
+    const thresh = [1, 3, 6, 10, 15, 20];
+    for (let i = thresh.length - 1; i >= 0; i -= 1) {
+      if (p.level >= thresh[i]) {
+        p.stage = stages[i];
+        break;
+      }
+    }
+    p.tasksToday = (p.tasksToday || 0) + 1;
+    localStorage.setItem('petData', JSON.stringify(p));
+  } catch (e) {
+    // ignore malformed pet state
+  }
+}
+
+function rewardPetBonus() {
+  try {
     const p = readJson('petData', 'null');

+    if (!p) return;
+    p.xp = (p.xp || 0) + 15;
+    p.happiness = Math.min(100, Math.round((p.happiness || 80) + 10));
+    while (p.xp >= 100) {
+      p.xp -= 100;
+      p.level = (p.level || 1) + 1;
+    }
+    localStorage.setItem('petData', JSON.stringify(p));
+  } catch (e) {
+    // ignore malformed pet state
+  }
+}
+
+function spawnConfetti() {
+  const colors = ['#7c6af7', '#f76a8a', '#6af7c8', '#f7d46a'];
+  for (let i = 0; i < 12; i += 1) {
+    const d = document.createElement('div');
+    d.className = 'confetti-piece';
+    d.style.cssText = `left:${20 + Math.random() * 60}%; top:${80 + Math.random() * 10}%; background:${colors[i % 4]}; animation-delay:${Math.random() * 0.3}s;`;
+    document.body.appendChild(d);
+    setTimeout(() => d.remove(), 1200);
+  }
+}
+
+function showToast(msg) {
+  const t = document.getElementById('toast');
+  t.textContent = msg;
+  t.classList.add('show');
+  clearTimeout(t._to);
+  t._to = setTimeout(() => t.classList.remove('show'), 2300);
+}
+
+document.getElementById('taskInput').addEventListener('keydown', (e) => {
+  if (e.key === 'Enter') addTask();
+});
+
 window.addEventListener('firebaseDataLoaded', () => render());
 window.addEventListener('firebaseKeyUpdated', (e) => {
   const key = e?.detail?.key;
   if (key === TASKS_KEY || key === PET_DONE_KEY || key === 'petData') render();
 });
 window.addEventListener('storage', (e) => {
   if (e.key === TASKS_KEY || e.key === PET_DONE_KEY || e.key === 'petData') render();
 });
 
 Object.assign(window, {
   render,
   addTask,
+  toggleTask,
+  deleteTask,
   setPrio,
   setFilter,
   setSort,
 });
 
+render();
 
EOF
)

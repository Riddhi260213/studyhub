/**
 * StudyHub Application — main controller.
 */
const App = (() => {
  const state = { subjects: [], tasks: [], stats: null, view: 'dashboard',
    filters: { search: '', subject: '', priority: '', status: '', sort: 'due_date' } };
  const VIEWS = ['dashboard','subjects','tasks','progress'];
  const TITLES = { dashboard:'Dashboard', subjects:'Subjects', tasks:'Tasks', progress:'Progress' };
  const { $, $$, el, esc, toast, openModal, closeModal, confirmDialog, dueLabel, PRIORITY_RANK, emptyState } = UI;

  function switchView(name) {
    if (!VIEWS.includes(name)) return;
    state.view = name;
    VIEWS.forEach(v => {
      const s = document.getElementById(`view-${v}`); s.hidden = v !== name; s.classList.toggle('active', v === name);
    });
    document.getElementById('view-title').textContent = TITLES[name];
    $$('.nav-item').forEach(btn => {
      const a = btn.dataset.view === name; btn.classList.toggle('active', a); btn.setAttribute('aria-current', a ? 'page' : 'false');
    });
    closeSidebar(); renderCurrentView();
  }
  function renderCurrentView() {
    switch (state.view) {
      case 'dashboard': renderDashboard(); break;
      case 'subjects': renderSubjects(); break;
      case 'tasks': renderTasks(); break;
      case 'progress': renderProgress(); break;
    }
  }
  function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').hidden = false; document.getElementById('menu-toggle').setAttribute('aria-expanded','true'); }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').hidden = true; document.getElementById('menu-toggle').setAttribute('aria-expanded','false'); }

  async function loadAll() {
    try {
      const [subjects, tasks, stats] = await Promise.all([API.getSubjects(), API.getTasks(), API.getStats()]);
      state.subjects = subjects; state.tasks = tasks; state.stats = stats;
    } catch (err) { toast(err.message, 'error', 5000); }
  }
  async function refreshSubjects() { state.subjects = await API.getSubjects(); populateSubjectFilter(); renderCurrentView(); }
  async function refreshTasks() { state.tasks = await API.getTasks(); renderCurrentView(); }
  async function refreshStats() { state.stats = await API.getStats(); renderSidebarStats(); if (state.view==='dashboard'||state.view==='progress') renderCurrentView(); }

  /* Dashboard */
  function renderDashboard() {
    if (!state.stats) return; const s = state.stats;
    const cards = [
      { label:'Subjects', value:s.total_subjects, icon:'🎒', cls:'icon-blue' },
      { label:'Total Tasks', value:s.total_tasks, icon:'📋', cls:'icon-purple' },
      { label:'Pending', value:s.pending_tasks, icon:'⏳', cls:'icon-warning' },
      { label:'Completed', value:s.completed_tasks, icon:'✓', cls:'icon-success' },
      { label:'Completion', value:`${s.completion_pct}%`, icon:'📊', cls:'icon-indigo' },
    ];
    const grid = $('#stat-grid'); grid.innerHTML = '';
    cards.forEach(c => grid.appendChild(el('div', { class:`stat-card ${c.cls}` },
      el('div', { class:'stat-icon', html:c.icon }),
      el('div', { class:'stat-value', textContent:String(c.value) }),
      el('div', { class:'stat-label', textContent:c.label })
    )));
    const recentWrap = $('#dashboard-recent-tasks'); const recent = [...state.tasks].slice(0, 5);
    if (recent.length === 0) { recentWrap.innerHTML = ''; recentWrap.appendChild(emptyState({ icon:'🎯', title:'No tasks yet', message:'Create your first task to get started.', actionLabel:'New Task', onAction:() => openTaskForm() })); }
    else { recentWrap.innerHTML = ''; recent.forEach(t => recentWrap.appendChild(buildMiniTaskRow(t))); }
    const spWrap = $('#dashboard-subject-progress'); const sp = s.subjects_progress || [];
    if (sp.length === 0) { spWrap.innerHTML = ''; spWrap.appendChild(emptyState({ icon:'🎒', title:'No subjects', message:'Add a subject to track progress.' })); }
    else { spWrap.innerHTML = ''; sp.slice(0, 5).forEach(sub => spWrap.appendChild(buildSubjectProgressMini(sub))); }
  }
  function buildMiniTaskRow(t) {
    const due = dueLabel(t.due_date);
    return el('div', { class:`mini-task-row ${t.completed?'completed':''}` },
      el('span', { class:'dot', style:{ background: t.subject_color || '#cbd5e1' } }),
      el('span', { class:'mini-title', textContent:t.title }),
      el('span', { class:`mini-due ${due.cls||''}`, textContent:due.text })
    );
  }
  function buildSubjectProgressMini(sub) {
    return el('div', { class:'subject-progress-item' },
      el('div', { class:'sp-header' },
        el('span', { class:'sp-name' }, el('span', { class:'subject-color-dot', style:{ background:sub.color } }), esc(sub.name)),
        el('span', { class:'sp-count', textContent:`${sub.completed}/${sub.total}` })
      ), buildProgressBar(sub.completion_pct, sub.color)
    );
  }
  function buildProgressBar(pct, color) {
    return el('div', { class:'bar-track' }, el('div', { class:'bar-fill', style:{ width:`${pct}%`, background: color || 'var(--primary)' } }));
  }

  /* Subjects */
  function renderSubjects() {
    const grid = $('#subjects-grid'); grid.innerHTML = '';
    if (state.subjects.length === 0) { grid.appendChild(emptyState({ icon:'🎒', title:'No subjects yet', message:'Add your first subject to start organizing tasks.', actionLabel:'Add Subject', onAction:openSubjectForm })); return; }
    state.subjects.forEach(sub => {
      const tc = state.tasks.filter(t => t.subject_id === sub.id).length;
      const dc = state.tasks.filter(t => t.subject_id === sub.id && t.completed).length;
      grid.appendChild(el('div', { class:'subject-card', style:{ borderLeftColor: sub.color } },
        el('div', { class:'subject-name' }, el('span', { class:'subject-color-dot', style:{ background: sub.color } }), esc(sub.name)),
        el('div', { class:'subject-desc', textContent: sub.description || 'No description' }),
        el('div', { class:'subject-meta' },
          el('span', { textContent: `${tc} task${tc!==1?'s':''} · ${dc} done` }),
          el('span', { textContent: tc ? `${Math.round(dc/tc*100)}%` : '—' })
        ),
        el('div', { class:'subject-actions' },
          el('button', { class:'btn btn-ghost btn-sm', onclick:() => openSubjectForm(sub) }, 'Edit'),
          el('button', { class:'btn btn-danger btn-sm', onclick:() => deleteSubject(sub) }, 'Delete')
        )
      ));
    });
  }

  /* Tasks */
  function renderTasks() {
    const list = $('#tasks-list'); list.innerHTML = '';
    let filtered = applyFilters(state.tasks); filtered = applySort(filtered, state.filters.sort);
    $('#result-count').textContent = `${filtered.length} task${filtered.length!==1?'s':''} ${filtered.length!==state.tasks.length?`(${state.tasks.length} total)`:''}`;
    if (filtered.length === 0) {
      const hf = state.filters.search || state.filters.subject || state.filters.priority || state.filters.status;
      list.appendChild(emptyState(hf ? { icon:'🔍', title:'No matching tasks', message:'Try adjusting your filters or search term.', actionLabel:'Clear Filters', onAction:clearFilters }
        : { icon:'📝', title:'No tasks yet', message:'Create a task to start tracking your work.', actionLabel:'New Task', onAction:openTaskForm }));
      return;
    }
    filtered.forEach(t => list.appendChild(buildTaskItem(t)));
  }
  function applyFilters(tasks) {
    const { search, subject, priority, status } = state.filters;
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (subject && t.subject_id !== parseInt(subject, 10)) return false;
      if (priority && t.priority !== priority) return false;
      if (status === 'pending' && t.completed) return false;
      if (status === 'completed' && !t.completed) return false;
      return true;
    });
  }
  function applySort(tasks, sortBy) {
    const arr = [...tasks];
    switch (sortBy) {
      case 'due_date': arr.sort((a,b) => { if(!a.due_date&&!b.due_date) return 0; if(!a.due_date) return 1; if(!b.due_date) return -1; return a.due_date.localeCompare(b.due_date); }); break;
      case 'priority': arr.sort((a,b) => PRIORITY_RANK[b.priority]-PRIORITY_RANK[a.priority]); break;
      case 'status': arr.sort((a,b) => Number(a.completed)-Number(b.completed)); break;
      case 'title': arr.sort((a,b) => a.title.localeCompare(b.title)); break;
    }
    return arr;
  }
  function buildTaskItem(t) {
    const due = dueLabel(t.due_date); const prioCls = t.priority.toLowerCase();
    const subjectTag = t.subject_name ? el('span', { class:'task-subject-tag', style:{ background:`${t.subject_color}22`, color:t.subject_color } },
      el('span', { class:'subject-color-dot', style:{ background:t.subject_color, width:'8px', height:'8px' } }), esc(t.subject_name)) : null;
    const item = el('div', { class:`task-item ${t.completed?'completed':''}`, dataset:{ id:t.id } },
      el('button', { class:'task-check', onclick:() => toggleComplete(t), 'aria-label':t.completed?'Mark task as pending':'Mark task as completed', 'aria-pressed':t.completed }),
      el('div', { class:'task-main' },
        el('div', { class:'task-title', textContent:t.title }),
        el('div', { class:'task-meta' }, subjectTag, el('span', { class:`priority-badge ${prioCls}`, textContent:t.priority }),
          el('span', { class:`meta-item ${due.cls||''}`, textContent:'📅 '+due.text }))
      ),
      el('div', { class:'task-actions' },
        el('button', { class:'btn btn-ghost btn-sm', onclick:() => openTaskForm(t) }, 'Edit'),
        el('button', { class:'btn btn-danger btn-sm', onclick:() => deleteTask(t) }, 'Delete')
      )
    );
    if (t.description) item.querySelector('.task-main').appendChild(el('div', { style:{ color:'var(--text-muted)', fontSize:'13px', marginTop:'4px' }, textContent:t.description }));
    return item;
  }

  /* Progress */
  function renderProgress() {
    if (!state.stats) return; const s = state.stats;
    renderRing($('#overall-ring'), s.completion_pct);
    $('#overall-caption').textContent = `${s.completed_tasks} of ${s.total_tasks} tasks done`;
    const statusBars = $('#status-bars'); statusBars.innerHTML = ''; const total = s.total_tasks || 1;
    [{ label:'Completed', count:s.completed_tasks, color:'var(--success)' }, { label:'Pending', count:s.pending_tasks, color:'var(--warning)' }].forEach(d => {
      statusBars.appendChild(el('div', { class:'bar-row' }, el('div', { class:'bar-label' }, el('span', { textContent:d.label }), el('span', { textContent:`${d.count}` })),
        el('div', { class:'bar-track' }, el('div', { class:'bar-fill', style:{ width:`${(d.count/total)*100}%`, background:d.color } }))));
    });
    const prioBars = $('#priority-bars'); prioBars.innerHTML = '';
    const pc = { High:0, Medium:0, Low:0 }; state.tasks.forEach(t => { pc[t.priority]++; });
    const maxP = Math.max(...Object.values(pc), 1); const pColors = { High:'var(--prio-high)', Medium:'var(--prio-medium)', Low:'var(--prio-low)' };
    Object.entries(pc).forEach(([p, count]) => {
      prioBars.appendChild(el('div', { class:'bar-row' }, el('div', { class:'bar-label' }, el('span', { textContent:p }), el('span', { textContent:`${count}` })),
        el('div', { class:'bar-track' }, el('div', { class:'bar-fill', style:{ width:`${(count/maxP)*100}%`, background:pColors[p] } }))));
    });
    const spList = $('#subject-progress-list'); spList.innerHTML = '';
    const sp = s.subjects_progress || [];
    if (sp.length === 0) spList.appendChild(emptyState({ icon:'🎒', title:'No subjects yet', message:'Add subjects to see per-subject progress.' }));
    else sp.forEach(sub => {
      spList.appendChild(el('div', { class:'subject-progress-item' },
        el('div', { class:'sp-header' }, el('span', { class:'sp-name' }, el('span', { class:'subject-color-dot', style:{ background:sub.color } }), esc(sub.name)),
          el('span', { class:'sp-count', textContent:`${sub.completed}/${sub.total} done (${sub.completion_pct}%)` })),
        buildProgressBar(sub.completion_pct, sub.color)
      ));
    });
  }
  function renderRing(container, pct) {
    const size=160, stroke=14, r=(size-stroke)/2, circ=2*Math.PI*r, offset=circ*(1-pct/100);
    container.innerHTML = `<svg width="${size}" height="${size}"><circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"></circle><circle class="ring-fill" cx="${size/2}" cy="${size/2}" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle></svg><div class="ring-label"><span class="ring-pct">${pct}%</span></div>`;
  }

  function renderSidebarStats() {
    if (!state.stats) return; const s = state.stats; const wrap = $('#sidebar-stats'); wrap.innerHTML = '';
    [['Subjects', s.total_subjects], ['Tasks', s.total_tasks], ['Pending', s.pending_tasks], ['Done', `${s.completion_pct}%`]].forEach(([l, v]) => {
      wrap.appendChild(el('div', { class:'mini-stat-row' }, el('span', { textContent:l }), el('strong', { textContent:String(v) })));
    });
  }

  /* Subject CRUD */
  function openSubjectForm(subject = null) {
    const body = Forms.subjectFormBody(subject);
    openModal({ title: subject ? 'Edit Subject' : 'Add Subject', bodyNode: body, submitLabel: subject ? 'Update' : 'Create',
      onSave: async () => {
        const data = Forms.collectSubject(); if (!data) return;
        if (subject) { await API.updateSubject(subject.id, data); toast('Subject updated.', 'success'); }
        else { await API.createSubject(data); toast('Subject created.', 'success'); }
        closeModal(); await refreshSubjects(); await refreshStats();
      }
    });
    Forms.wireSubjectForm();
  }
  async function deleteSubject(subject) {
    const c = await confirmDialog({ title:'Delete Subject', message:`Delete <strong>${esc(subject.name)}</strong>? Its tasks will be kept but unlinked from this subject.`, confirmLabel:'Delete' });
    if (!c) return;
    try { await API.deleteSubject(subject.id); toast('Subject deleted.', 'success'); await refreshSubjects(); await refreshTasks(); await refreshStats(); }
    catch (err) { toast(err.message, 'error'); }
  }

  /* Task CRUD */
  function openTaskForm(task = null) {
    if (state.subjects.length === 0 && !task) toast('Add a subject first to organise your tasks.', 'info');
    const body = Forms.taskFormBody(task, state.subjects);
    openModal({ title: task ? 'Edit Task' : 'New Task', bodyNode: body, submitLabel: task ? 'Update' : 'Create',
      onSave: async () => {
        const data = Forms.collectTask(); if (!data) return;
        if (task) { data.completed = task.completed; await API.updateTask(task.id, data); toast('Task updated.', 'success'); }
        else { await API.createTask(data); toast('Task created.', 'success'); }
        closeModal(); await refreshTasks(); await refreshStats();
      }
    });
  }
  async function toggleComplete(task) {
    try { await API.patchTask(task.id, { completed: !task.completed }); task.completed = !task.completed;
      const local = state.tasks.find(t => t.id === task.id); if (local) local.completed = task.completed;
      renderTasks(); await refreshStats();
    } catch (err) { toast(err.message, 'error'); }
  }
  async function deleteTask(task) {
    const c = await confirmDialog({ title:'Delete Task', message:`Delete <strong>${esc(task.title)}</strong>? This cannot be undone.`, confirmLabel:'Delete' });
    if (!c) return;
    try { await API.deleteTask(task.id); toast('Task deleted.', 'success'); await refreshTasks(); await refreshStats(); }
    catch (err) { toast(err.message, 'error'); }
  }

  /* Filters */
  function populateSubjectFilter() {
    const sel = $('#filter-subject'); const cur = sel.value; sel.innerHTML = '<option value="">All subjects</option>';
    state.subjects.forEach(s => sel.appendChild(el('option', { value:s.id, textContent:s.name }))); sel.value = cur;
  }
  function clearFilters() {
    state.filters = { search:'', subject:'', priority:'', status:'', sort:'due_date' };
    $('#task-search').value=''; $('#filter-subject').value=''; $('#filter-priority').value=''; $('#filter-status').value=''; $('#sort-by').value='due_date';
    renderTasks();
  }

  function wireEvents() {
    $$('.nav-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
    document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) switchView(g.dataset.goto); });
    $('#quick-add-btn').addEventListener('click', () => openTaskForm());
    $('#add-subject-btn').addEventListener('click', () => openSubjectForm());
    $('#add-task-btn').addEventListener('click', () => openTaskForm());
    $('#menu-toggle').addEventListener('click', () => { const sb = $('#sidebar'); sb.classList.contains('open') ? closeSidebar() : openSidebar(); });
    $('#sidebar-overlay').addEventListener('click', closeSidebar);
    $('#task-search').addEventListener('input', (e) => { state.filters.search = e.target.value; renderTasks(); });
    $('#filter-subject').addEventListener('change', (e) => { state.filters.subject = e.target.value; renderTasks(); });
    $('#filter-priority').addEventListener('change', (e) => { state.filters.priority = e.target.value; renderTasks(); });
    $('#filter-status').addEventListener('change', (e) => { state.filters.status = e.target.value; renderTasks(); });
    $('#sort-by').addEventListener('change', (e) => { state.filters.sort = e.target.value; renderTasks(); });
    $('#clear-filters').addEventListener('click', clearFilters);
  }

  async function init() { wireEvents(); await loadAll(); populateSubjectFilter(); renderSidebarStats(); renderCurrentView(); }
  return { init };
})();
const { $, $$ } = UI;
document.addEventListener('DOMContentLoaded', App.init);

/**
 * StudyHub Forms & Frontend Validation
 */
const Forms = (() => {
  const COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];
  const PRIORITIES = ['Low','Medium','High'];

  function showError(fieldId, msg) {
    const errEl = document.getElementById(`${fieldId}-error`);
    const input = document.getElementById(fieldId);
    if (errEl) errEl.textContent = msg;
    if (input) input.classList.toggle('invalid', !!msg);
  }
  function validateNonEmpty(value, field, maxLen) {
    if (!value || !value.trim()) return `${field} is required.`;
    if (value.trim().length > maxLen) return `${field} is too long (max ${maxLen} characters).`;
    return null;
  }
  function validateDate(value) {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Date must be in YYYY-MM-DD format.';
    const d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return 'Invalid date.';
    if (d.toISOString().slice(0,10) !== value) return 'Invalid date.';
    return null;
  }
  function validatePriority(value) { return PRIORITIES.includes(value) ? null : 'Invalid priority.'; }

  function subjectFormBody(subject = null) {
    const sc = subject ? subject.color : COLORS[0];
    const colorOptions = COLORS.map(c => `<div class="color-option ${c===sc?'selected':''}" data-color="${c}" style="background:${c}" role="button" tabindex="0" aria-label="Select color ${c}"></div>`).join('');
    return UI.el('div', {},
      UI.el('div', { class: 'form-field' },
        UI.el('label', { for: 'sf-name' }, 'Subject Name ', UI.el('span', { class: 'req' }, '*')),
        UI.el('input', { type: 'text', id: 'sf-name', maxlength: 120, value: subject ? UI.esc(subject.name) : '', placeholder: 'e.g. Mathematics' }),
        UI.el('div', { class: 'field-error', id: 'sf-name-error' })
      ),
      UI.el('div', { class: 'form-field' },
        UI.el('label', { for: 'sf-desc' }, 'Description'),
        UI.el('textarea', { id: 'sf-desc', maxlength: 1000, placeholder: 'Brief description (optional)' }, subject ? UI.esc(subject.description) : ''),
        UI.el('div', { class: 'field-error', id: 'sf-desc-error' })
      ),
      UI.el('div', { class: 'form-field' },
        UI.el('label', {}, 'Color'),
        UI.el('div', { class: 'color-picker', id: 'sf-color-picker', html: colorOptions }),
        UI.el('input', { type: 'hidden', id: 'sf-color', value: sc })
      )
    );
  }
  function wireSubjectForm() {
    const picker = document.getElementById('sf-color-picker'); const hidden = document.getElementById('sf-color');
    if (picker) {
      picker.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
          picker.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected'); hidden.value = opt.dataset.color;
        });
        opt.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); } });
      });
    }
  }
  function collectSubject() {
    const name = document.getElementById('sf-name').value;
    const description = document.getElementById('sf-desc').value;
    const color = document.getElementById('sf-color').value;
    let err = validateNonEmpty(name, 'Subject name', 120);
    if (err) { showError('sf-name', err); return null; }
    if (description && description.length > 1000) { showError('sf-desc', 'Description is too long (max 1000 characters).'); return null; }
    return { name: name.trim(), description: description.trim(), color };
  }

  function taskFormBody(task = null, subjects = []) {
    const subjectOptions = subjects.map(s => `<option value="${s.id}" ${task && task.subject_id === s.id ? 'selected' : ''}>${UI.esc(s.name)}</option>`).join('');
    const prioRadios = PRIORITIES.map(p => `<label class="priority-option"><input type="radio" name="tf-priority" value="${p}" ${(!task && p==='Medium')||(task && task.priority===p)?'checked':''}><span>${p}</span></label>`).join('');
    return UI.el('div', {},
      UI.el('div', { class: 'form-field' },
        UI.el('label', { for: 'tf-title' }, 'Task Title ', UI.el('span', { class: 'req' }, '*')),
        UI.el('input', { type: 'text', id: 'tf-title', maxlength: 200, value: task ? UI.esc(task.title) : '', placeholder: 'e.g. Finish calculus problem set' }),
        UI.el('div', { class: 'field-error', id: 'tf-title-error' })
      ),
      UI.el('div', { class: 'form-field' },
        UI.el('label', { for: 'tf-desc' }, 'Description'),
        UI.el('textarea', { id: 'tf-desc', maxlength: 1000, placeholder: 'Details (optional)' }, task ? UI.esc(task.description) : ''),
        UI.el('div', { class: 'field-error', id: 'tf-desc-error' })
      ),
      UI.el('div', { class: 'form-field' },
        UI.el('label', { for: 'tf-subject' }, 'Subject'),
        UI.el('select', { id: 'tf-subject', html: `<option value="">No subject</option>${subjectOptions}` })
      ),
      UI.el('div', { class: 'form-field' },
        UI.el('label', { for: 'tf-due' }, 'Due Date'),
        UI.el('input', { type: 'date', id: 'tf-due', value: task && task.due_date ? task.due_date : '' }),
        UI.el('div', { class: 'field-error', id: 'tf-due-error' })
      ),
      UI.el('div', { class: 'form-field' },
        UI.el('label', {}, 'Priority'),
        UI.el('div', { class: 'priority-radio', html: prioRadios })
      )
    );
  }
  function collectTask() {
    const title = document.getElementById('tf-title').value;
    const description = document.getElementById('tf-desc').value;
    const subjectRaw = document.getElementById('tf-subject').value;
    const due = document.getElementById('tf-due').value;
    const priorityEl = document.querySelector('input[name="tf-priority"]:checked');
    const priority = priorityEl ? priorityEl.value : 'Medium';
    let err = validateNonEmpty(title, 'Task title', 200);
    if (err) { showError('tf-title', err); return null; }
    if (description && description.length > 1000) { showError('tf-desc', 'Description is too long (max 1000 characters).'); return null; }
    err = validateDate(due); if (err) { showError('tf-due', err); return null; }
    err = validatePriority(priority); if (err) return null;
    return { title: title.trim(), description: description.trim(), subject_id: subjectRaw ? parseInt(subjectRaw, 10) : null, due_date: due || null, priority, completed: false };
  }

  return { subjectFormBody, wireSubjectForm, collectSubject, taskFormBody, collectTask, COLORS, PRIORITIES };
})();

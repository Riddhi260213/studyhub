/**
 * StudyHub UI Helpers — DOM utilities, toasts, modal system, theme toggle.
 */
const UI = (() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') { for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv; }
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k in node && k !== 'list') node[k] = v;
      else node.setAttribute(k, v);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function esc(str) {
    if (str === null || str === undefined) return '';
    const d = document.createElement('div'); d.textContent = String(str); return d.innerHTML;
  }

  function toast(message, type = 'info', duration = 3000) {
    const container = $('#toast-container');
    const t = el('div', { class: `toast ${type}`, role: 'status' },
      el('span', { class: 'toast-msg', textContent: message })
    );
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, duration);
  }

  let modalCloseCallback = null;
  function openModal({ title, bodyNode, onSave, submitLabel = 'Save' }) {
    const backdrop = $('#modal-backdrop'); const modal = $('#modal');
    $('#modal-title').textContent = title; $('#modal-save').textContent = submitLabel;
    const bodyEl = $('#modal-body'); bodyEl.innerHTML = ''; bodyEl.appendChild(bodyNode);
    $('#modal-error').hidden = true; $('#modal-error').textContent = '';
    backdrop.hidden = false; modal.hidden = false; modalCloseCallback = onSave;
    setTimeout(() => { const first = modal.querySelector('input, select, textarea, button'); if (first) first.focus(); }, 50);
  }
  function closeModal() {
    $('#modal-backdrop').hidden = true; $('#modal').hidden = true;
    $('#modal-body').innerHTML = ''; $('#modal-error').hidden = true; modalCloseCallback = null;
  }
  function showModalError(msg) { const e = $('#modal-error'); e.textContent = msg; e.hidden = false; }

  function confirmDialog({ title, message, confirmLabel = 'Delete', danger = true }) {
    return new Promise((resolve) => {
      const body = el('div', { class: 'confirm-body' }, el('p', { html: message }));
      const saveBtn = $('#modal-save'); const originalText = saveBtn.textContent; const originalClass = saveBtn.className;
      saveBtn.textContent = confirmLabel;
      if (danger) saveBtn.className = 'btn btn-danger';
      openModal({ title, bodyNode: body, submitLabel: confirmLabel, onSave: () => { closeModal(); resolve(true); } });
      const restore = () => { saveBtn.textContent = originalText; saveBtn.className = originalClass; };
      $('#modal-close').addEventListener('click', restore, { once: true });
      $('#modal-cancel').addEventListener('click', () => { restore(); resolve(false); }, { once: true });
    });
  }

  const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
  function dueLabel(isoDate) {
    if (!isoDate) return { text: 'No due date', overdue: false, soon: false, cls: '' };
    const due = new Date(isoDate + 'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((due - today) / 86400000);
    let text = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); let cls = '';
    if (diff < 0) { text += ` · ${Math.abs(diff)}d overdue`; cls = 'due-overdue'; }
    else if (diff === 0) { text += ' · Today'; cls = 'due-soon'; }
    else if (diff === 1) { text += ' · Tomorrow'; cls = 'due-soon'; }
    else if (diff <= 3) { text += ` · in ${diff}d`; cls = 'due-soon'; }
    return { text, overdue: diff < 0, soon: diff >= 0 && diff <= 3, cls };
  }

  function spinner() { return el('div', { class: 'loading-overlay' }, el('div', { class: 'spinner' })); }
  function emptyState({ icon, title, message, actionLabel, onAction }) {
    const children = [el('div', { class: 'empty-icon', html: icon }), el('h3', { textContent: title }), el('p', { textContent: message })];
    if (actionLabel) children.push(el('button', { class: 'btn btn-primary', onclick: onAction }, actionLabel));
    return el('div', { class: 'empty-state' }, ...children);
  }

  /* ---------- Theme toggle ---------- */
  function getTheme() { return document.documentElement.getAttribute('data-theme') || 'light'; }
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studyhub-theme', theme);
    updateThemeIcons(theme);
  }
  function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }
  function updateThemeIcons(theme) {
    const icon = theme === 'dark' ? '☀️' : '🌙';
    const label = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    const sidebarIcon = document.querySelector('#theme-toggle .theme-toggle-icon');
    const sidebarLabel = document.querySelector('#theme-toggle .theme-toggle-label');
    if (sidebarIcon) sidebarIcon.textContent = icon;
    if (sidebarLabel) sidebarLabel.textContent = label;
    const topIcon = $('#theme-icon-top');
    if (topIcon) topIcon.textContent = icon;
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal-cancel').addEventListener('click', closeModal);
    $('#modal-backdrop').addEventListener('click', (e) => { if (e.target === $('#modal-backdrop')) closeModal(); });
    $('#modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (modalCloseCallback) {
        $('#modal-save').disabled = true;
        try { await modalCloseCallback(); } catch (err) { showModalError(err.message); }
        finally { $('#modal-save').disabled = false; }
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal-backdrop').hidden) closeModal(); });
    updateThemeIcons(getTheme());
    const sb = $('#theme-toggle'); if (sb) sb.addEventListener('click', toggleTheme);
    const tb = $('#theme-toggle-top'); if (tb) tb.addEventListener('click', toggleTheme);
  });

  return { $, $$, el, esc, toast, openModal, closeModal, showModalError, confirmDialog,
    dueLabel, PRIORITY_RANK, spinner, emptyState, getTheme, setTheme, toggleTheme };
})();

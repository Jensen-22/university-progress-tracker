// app.js - DOM rendering and event wiring for the University Progress Tracker.
// Imports pure logic from model.js and persistence from store.js.

import {
  WEEK_STATUS,
  createModule,
  addModule,
  removeModule,
  setWeekStatus,
  setModuleExamDate,
  moduleProgress,
  upcomingExams,
} from './model.js';
import { loadState, saveState } from './store.js';

let state = loadState();

// ---- helpers --------------------------------------------------------------

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatExamDate(iso) {
  // Render yyyy-mm-dd in a readable form without timezone surprises.
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!parts) return iso || '';
  const d = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function daysUntilLabel(daysUntil) {
  if (daysUntil <= 0) return 'today';
  if (daysUntil === 1) return 'in 1 day';
  return `in ${daysUntil} days`;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('data-')) node.setAttribute(key, value);
    else if (value != null) node.setAttribute(key, value);
  });
  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (child == null) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

function commit(newState) {
  state = newState;
  saveState(state);
  render();
}

// ---- rendering ------------------------------------------------------------

function renderUpcoming() {
  const panel = document.getElementById('upcoming-list');
  panel.innerHTML = '';
  const exams = upcomingExams(state, todayISO());
  if (exams.length === 0) {
    panel.appendChild(el('p', { class: 'empty', text: 'No upcoming exams scheduled.' }));
    return;
  }
  const list = el('ul', { class: 'upcoming' });
  exams.forEach((m) => {
    list.appendChild(
      el('li', { class: 'upcoming-item' }, [
        el('div', { class: 'upcoming-main' }, [
          el('span', { class: 'upcoming-name', text: m.code ? `${m.name} (${m.code})` : m.name }),
          el('span', { class: 'upcoming-date', text: formatExamDate(m.examDate) }),
        ]),
        el('span', { class: 'badge', text: daysUntilLabel(m.daysUntil) }),
      ])
    );
  });
  panel.appendChild(list);
}

function renderModuleCard(module) {
  const progress = moduleProgress(module);
  const pct = Math.round(progress.percentComplete);

  const weekGrid = el('div', { class: 'week-grid' });
  module.weeks.forEach((w) => {
    const isUp = w.status === WEEK_STATUS.UP_TO_DATE;
    weekGrid.appendChild(
      el(
        'button',
        {
          type: 'button',
          class: `week ${isUp ? 'up-to-date' : 'to-catch-up'}`,
          'data-action': 'toggle-week',
          'data-module': module.id,
          'data-week': String(w.number),
          title: isUp ? 'Up to date - click to mark as to catch up' : 'To catch up - click to mark as up to date',
          text: String(w.number),
        }
      )
    );
  });

  if (module.weeks.length === 0) {
    weekGrid.appendChild(el('p', { class: 'empty', text: 'No weeks defined for this module.' }));
  }

  return el('article', { class: 'module-card' }, [
    el('header', { class: 'module-header' }, [
      el('div', {}, [
        el('h3', { class: 'module-name', text: module.name || 'Untitled module' }),
        module.code ? el('span', { class: 'module-code', text: module.code }) : null,
      ]),
      el('button', {
        type: 'button',
        class: 'remove-btn',
        'data-action': 'remove-module',
        'data-module': module.id,
        text: 'Remove',
      }),
    ]),
    el('div', { class: 'progress-summary' }, [
      el('span', { class: 'progress-text', text: `${progress.upToDate} of ${progress.total} weeks up to date (${pct}%)` }),
      el('div', { class: 'progress-bar' }, [
        el('div', { class: 'progress-fill', style: `width:${pct}%` }),
      ]),
    ]),
    el('label', { class: 'exam-field' }, [
      'Exam date: ',
      el('input', {
        type: 'date',
        value: module.examDate || '',
        'data-action': 'set-exam',
        'data-module': module.id,
      }),
    ]),
    el('div', { class: 'weeks-wrap' }, [
      el('span', { class: 'weeks-label', text: 'Weeks (click to toggle):' }),
      weekGrid,
    ]),
  ]);
}

function renderModules() {
  const container = document.getElementById('modules-list');
  container.innerHTML = '';
  if (!state.modules || state.modules.length === 0) {
    container.appendChild(el('p', { class: 'empty', text: 'No modules yet. Add one above to get started.' }));
    return;
  }
  state.modules.forEach((m) => container.appendChild(renderModuleCard(m)));
}

function render() {
  renderUpcoming();
  renderModules();
}

// ---- events ---------------------------------------------------------------

function wireAddForm() {
  const form = document.getElementById('add-module-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return;
    const code = form.elements.code.value.trim();
    const weeks = parseInt(form.elements.weeks.value, 10);
    const examDate = form.elements.examDate.value || null;
    const module = createModule(name, code, Number.isFinite(weeks) ? weeks : 0, examDate);
    commit(addModule(state, module));
    form.reset();
    form.elements.name.focus();
  });
}

function wireModuleEvents() {
  const container = document.getElementById('modules-list');

  container.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const moduleId = target.getAttribute('data-module');
    if (action === 'toggle-week') {
      const weekNumber = Number(target.getAttribute('data-week'));
      const module = state.modules.find((m) => m.id === moduleId);
      if (!module) return;
      const week = module.weeks.find((w) => w.number === weekNumber);
      const next = week && week.status === WEEK_STATUS.UP_TO_DATE
        ? WEEK_STATUS.TO_CATCH_UP
        : WEEK_STATUS.UP_TO_DATE;
      commit(setWeekStatus(state, moduleId, weekNumber, next));
    } else if (action === 'remove-module') {
      commit(removeModule(state, moduleId));
    }
  });

  container.addEventListener('change', (event) => {
    const target = event.target.closest('[data-action="set-exam"]');
    if (!target) return;
    const moduleId = target.getAttribute('data-module');
    commit(setModuleExamDate(state, moduleId, target.value || null));
  });
}

function init() {
  wireAddForm();
  wireModuleEvents();
  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

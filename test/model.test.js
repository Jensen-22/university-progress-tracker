import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  WEEK_STATUS,
  createModule,
  addModule,
  removeModule,
  setWeekStatus,
  setModuleExamDate,
  moduleProgress,
  upcomingExams,
} from '../src/js/model.js';

test('createModule builds the right number of weeks with default statuses', () => {
  const m = createModule('Databases', 'CS201', 4, '2099-01-15');
  assert.equal(m.name, 'Databases');
  assert.equal(m.code, 'CS201');
  assert.equal(m.examDate, '2099-01-15');
  assert.equal(m.weeks.length, 4);
  assert.deepEqual(m.weeks.map((w) => w.number), [1, 2, 3, 4]);
  assert.ok(m.weeks.every((w) => w.status === WEEK_STATUS.TO_CATCH_UP));
  assert.ok(typeof m.id === 'string' && m.id.length > 0);
});

test('createModule handles zero/omitted weeks and null exam date', () => {
  const m = createModule('Seminar');
  assert.equal(m.weeks.length, 0);
  assert.equal(m.code, '');
  assert.equal(m.examDate, null);
});

test('addModule is immutable and adds the module', () => {
  const state = { modules: [] };
  const m = createModule('Algorithms', '', 2);
  const next = addModule(state, m);
  assert.equal(state.modules.length, 0, 'original state not mutated');
  assert.equal(next.modules.length, 1);
  assert.equal(next.modules[0].id, m.id);
  assert.notEqual(next, state);
});

test('removeModule removes only the targeted module and is immutable', () => {
  const a = createModule('A', '', 1);
  const b = createModule('B', '', 1);
  const state = { modules: [a, b] };
  const next = removeModule(state, a.id);
  assert.equal(state.modules.length, 2, 'original state not mutated');
  assert.equal(next.modules.length, 1);
  assert.equal(next.modules[0].id, b.id);
});

test('setWeekStatus changes only the targeted week and does not mutate input', () => {
  const m = createModule('Networks', '', 3);
  const state = { modules: [m] };
  const next = setWeekStatus(state, m.id, 2, WEEK_STATUS.UP_TO_DATE);

  // original untouched
  assert.ok(state.modules[0].weeks.every((w) => w.status === WEEK_STATUS.TO_CATCH_UP));

  const updated = next.modules[0];
  assert.equal(updated.weeks.find((w) => w.number === 2).status, WEEK_STATUS.UP_TO_DATE);
  assert.equal(updated.weeks.find((w) => w.number === 1).status, WEEK_STATUS.TO_CATCH_UP);
  assert.equal(updated.weeks.find((w) => w.number === 3).status, WEEK_STATUS.TO_CATCH_UP);
});

test('setModuleExamDate updates the date immutably', () => {
  const m = createModule('Ethics', '', 0);
  const state = { modules: [m] };
  const next = setModuleExamDate(state, m.id, '2099-06-01');
  assert.equal(state.modules[0].examDate, null, 'original state not mutated');
  assert.equal(next.modules[0].examDate, '2099-06-01');

  const cleared = setModuleExamDate(next, m.id, null);
  assert.equal(cleared.modules[0].examDate, null);
});

test('moduleProgress counts statuses and percentComplete', () => {
  const m = createModule('Stats', '', 4);
  const s1 = setWeekStatus({ modules: [m] }, m.id, 1, WEEK_STATUS.UP_TO_DATE);
  const s2 = setWeekStatus(s1, m.id, 2, WEEK_STATUS.UP_TO_DATE);
  const p = moduleProgress(s2.modules[0]);
  assert.deepEqual(p, { total: 4, upToDate: 2, toCatchUp: 2, percentComplete: 50 });
});

test('moduleProgress handles the zero-weeks edge case', () => {
  const m = createModule('Zero', '', 0);
  const p = moduleProgress(m);
  assert.deepEqual(p, { total: 0, upToDate: 0, toCatchUp: 0, percentComplete: 0 });
});

test('upcomingExams filters past, includes today, sorts ascending and computes daysUntil', () => {
  const from = '2099-01-10';
  const past = createModule('Past', '', 0, '2099-01-05');
  const today = createModule('Today', '', 0, '2099-01-10');
  const soon = createModule('Soon', '', 0, '2099-01-12');
  const later = createModule('Later', '', 0, '2099-02-10');
  const none = createModule('None', '', 0, null);
  const state = { modules: [later, past, soon, none, today] };

  const result = upcomingExams(state, from);
  assert.deepEqual(result.map((m) => m.name), ['Today', 'Soon', 'Later']);
  assert.equal(result[0].daysUntil, 0);
  assert.equal(result[1].daysUntil, 2);
  assert.equal(result[2].daysUntil, 31);
});

test('upcomingExams returns empty for invalid fromDate', () => {
  const m = createModule('X', '', 0, '2099-01-01');
  assert.deepEqual(upcomingExams({ modules: [m] }, 'not-a-date'), []);
});

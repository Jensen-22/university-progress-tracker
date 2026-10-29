// model.js - Pure data model and logic for the University Progress Tracker.
// No DOM access here so these functions can be unit-tested with node:test.
// All functions are pure: they return new state and never mutate their inputs.

export const WEEK_STATUS = Object.freeze({
  UP_TO_DATE: 'up_to_date',
  TO_CATCH_UP: 'to_catch_up',
});

/**
 * Generate a unique id. Uses crypto.randomUUID when available (browser or
 * Node 19+) and falls back to a simple random/time based id otherwise.
 * @returns {string}
 */
export function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_err) {
    // fall through to the manual fallback below
  }
  return (
    'id-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Create a module with weeks 1..totalWeeks, each defaulting to 'to_catch_up'.
 * @param {string} name
 * @param {string} [code]
 * @param {number} [totalWeeks]
 * @param {string|null} [examDate] ISO yyyy-mm-dd string or null
 * @returns {{id:string,name:string,code:string,examDate:string|null,weeks:Array<{number:number,status:string}>}}
 */
export function createModule(name, code = '', totalWeeks = 0, examDate = null) {
  const count = Number.isFinite(totalWeeks) && totalWeeks > 0 ? Math.floor(totalWeeks) : 0;
  const weeks = [];
  for (let i = 1; i <= count; i += 1) {
    weeks.push({ number: i, status: WEEK_STATUS.TO_CATCH_UP });
  }
  return {
    id: generateId(),
    name: String(name == null ? '' : name),
    code: String(code == null ? '' : code),
    examDate: examDate || null,
    weeks,
  };
}

/**
 * Return a new state with the given module appended.
 * @param {{modules:Array}} state
 * @param {object} module
 * @returns {{modules:Array}}
 */
export function addModule(state, module) {
  const modules = (state && Array.isArray(state.modules)) ? state.modules : [];
  return { ...state, modules: [...modules, module] };
}

/**
 * Return a new state with the module of the given id removed.
 * @param {{modules:Array}} state
 * @param {string} moduleId
 * @returns {{modules:Array}}
 */
export function removeModule(state, moduleId) {
  const modules = (state && Array.isArray(state.modules)) ? state.modules : [];
  return { ...state, modules: modules.filter((m) => m.id !== moduleId) };
}

/**
 * Return a new state with the targeted week's status changed. Only the
 * targeted module and week are replaced; all other objects are left intact.
 * @param {{modules:Array}} state
 * @param {string} moduleId
 * @param {number} weekNumber
 * @param {string} status 'up_to_date' | 'to_catch_up'
 * @returns {{modules:Array}}
 */
export function setWeekStatus(state, moduleId, weekNumber, status) {
  const modules = (state && Array.isArray(state.modules)) ? state.modules : [];
  return {
    ...state,
    modules: modules.map((m) => {
      if (m.id !== moduleId) return m;
      return {
        ...m,
        weeks: m.weeks.map((w) =>
          w.number === weekNumber ? { ...w, status } : w
        ),
      };
    }),
  };
}

/**
 * Return a new state with the targeted module's exam date updated.
 * @param {{modules:Array}} state
 * @param {string} moduleId
 * @param {string|null} examDate ISO yyyy-mm-dd string or null
 * @returns {{modules:Array}}
 */
export function setModuleExamDate(state, moduleId, examDate) {
  const modules = (state && Array.isArray(state.modules)) ? state.modules : [];
  return {
    ...state,
    modules: modules.map((m) =>
      m.id === moduleId ? { ...m, examDate: examDate || null } : m
    ),
  };
}

/**
 * Compute progress for a single module.
 * @param {{weeks:Array<{status:string}>}} module
 * @returns {{total:number,upToDate:number,toCatchUp:number,percentComplete:number}}
 */
export function moduleProgress(module) {
  const weeks = (module && Array.isArray(module.weeks)) ? module.weeks : [];
  const total = weeks.length;
  const upToDate = weeks.filter((w) => w.status === WEEK_STATUS.UP_TO_DATE).length;
  const toCatchUp = total - upToDate;
  const percentComplete = total === 0 ? 0 : (upToDate / total) * 100;
  return { total, upToDate, toCatchUp, percentComplete };
}

/**
 * Parse a yyyy-mm-dd date string into a UTC date at midnight.
 * Returns null for an invalid/empty value.
 * @param {string} dateStr
 * @returns {Date|null}
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Return modules that have an examDate on or after fromDate, sorted ascending
 * by examDate, each annotated with daysUntil (whole days from fromDate).
 * @param {{modules:Array}} state
 * @param {string} fromDate ISO yyyy-mm-dd string
 * @returns {Array<object & {daysUntil:number}>}
 */
export function upcomingExams(state, fromDate) {
  const modules = (state && Array.isArray(state.modules)) ? state.modules : [];
  const from = parseDate(fromDate);
  if (!from) return [];
  return modules
    .filter((m) => {
      const exam = parseDate(m.examDate);
      return exam !== null && exam.getTime() >= from.getTime();
    })
    .map((m) => {
      const exam = parseDate(m.examDate);
      const daysUntil = Math.round((exam.getTime() - from.getTime()) / MS_PER_DAY);
      return { ...m, daysUntil };
    })
    .sort((a, b) => {
      if (a.examDate < b.examDate) return -1;
      if (a.examDate > b.examDate) return 1;
      return 0;
    });
}

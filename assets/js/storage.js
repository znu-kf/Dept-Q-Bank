/**
 * ============================================================
 * DEPT. Q. BANK — storage.js  (v2 — sub-subject support)
 * ============================================================
 */

const STORAGE_KEYS = {
  STATS:          'dqb_stats',
  PROGRESS:       'dqb_progress',
  INCORRECT:      'dqb_incorrect',
  FLAGGED:        'dqb_flagged',
  EXAM_HISTORY:   'dqb_exam_history',
  CURRENT_EXAM:   'dqb_current_exam',
  LAST_PAGE:      'dqb_last_page',
  SETTINGS:       'dqb_settings',
};

const Storage = {

  _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[Storage] Failed to read "${key}":`, e);
      return null;
    }
  },

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[Storage] Failed to write "${key}":`, e);
    }
  },

  _delete(key) { localStorage.removeItem(key); },

  // ─── Stats ────────────────────────────────────────────────────────────────

  getStats() {
    return this._get(STORAGE_KEYS.STATS) || {
      totalAttempted: 0, totalCorrect: 0, totalIncorrect: 0,
      completedExams: 0, totalTimeSpentSec: 0,
    };
  },

  updateStats(delta) {
    const stats = this.getStats();
    Object.keys(delta).forEach(k => { if (typeof stats[k] === 'number') stats[k] += delta[k]; });
    this._set(STORAGE_KEYS.STATS, stats);
    return stats;
  },

  // ─── Progress — now keyed by module|examType|subject|subSubject ───────────

  getProgress() {
    return this._get(STORAGE_KEYS.PROGRESS) || {};
  },

  setSubjectProgress(module, examType, subject, subSubject, data) {
    const progress = this.getProgress();
    const key = `${module}|${examType}|${subject}|${subSubject}`;
    progress[key] = { ...(progress[key] || {}), ...data, updatedAt: Date.now() };
    this._set(STORAGE_KEYS.PROGRESS, progress);
  },

  getSubjectProgress(module, examType, subject, subSubject) {
    const key = `${module}|${examType}|${subject}|${subSubject}`;
    return (this.getProgress())[key] || null;
  },

  // ─── Incorrect questions ──────────────────────────────────────────────────

  getIncorrect() { return this._get(STORAGE_KEYS.INCORRECT) || []; },

  addIncorrect(entry) {
    const list = this.getIncorrect();
    const uid  = `${entry.module}|${entry.examType}|${entry.subject}|${entry.subSubject}|${entry.id}`;
    const idx  = list.findIndex(q => q.uid === uid);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry, updatedAt: Date.now() };
    } else {
      list.push({ ...entry, uid, addedAt: Date.now() });
    }
    this._set(STORAGE_KEYS.INCORRECT, list);
  },

  removeIncorrect(uid) {
    this._set(STORAGE_KEYS.INCORRECT, this.getIncorrect().filter(q => q.uid !== uid));
  },

  clearAllIncorrect() { this._set(STORAGE_KEYS.INCORRECT, []); },

  // ─── Flagged ──────────────────────────────────────────────────────────────

  getFlagged() { return this._get(STORAGE_KEYS.FLAGGED) || []; },

  toggleFlag(entry) {
    const uid   = `${entry.module}|${entry.examType}|${entry.subject}|${entry.subSubject}|${entry.id}`;
    let flags   = this.getFlagged();
    const idx   = flags.findIndex(f => f.uid === uid);
    if (idx >= 0) {
      flags.splice(idx, 1);
      this._set(STORAGE_KEYS.FLAGGED, flags);
      return false;
    } else {
      flags.push({ ...entry, uid, flaggedAt: Date.now() });
      this._set(STORAGE_KEYS.FLAGGED, flags);
      return true;
    }
  },

  // ─── Exam history ─────────────────────────────────────────────────────────

  getExamHistory() { return this._get(STORAGE_KEYS.EXAM_HISTORY) || []; },

  addExamResult(result) {
    const history = this.getExamHistory();
    history.unshift({ ...result, id: Date.now() });
    if (history.length > 100) history.length = 100;
    this._set(STORAGE_KEYS.EXAM_HISTORY, history);
  },

  // ─── Current exam ────────────────────────────────────────────────────────

  saveCurrentExam(state)  { this._set(STORAGE_KEYS.CURRENT_EXAM, state); },
  loadCurrentExam()       { return this._get(STORAGE_KEYS.CURRENT_EXAM); },
  clearCurrentExam()      { this._delete(STORAGE_KEYS.CURRENT_EXAM); },

  // ─── Settings ─────────────────────────────────────────────────────────────

  getSettings()           { return this._get(STORAGE_KEYS.SETTINGS) || {}; },
  saveSetting(key, value) {
    const s = this.getSettings(); s[key] = value; this._set(STORAGE_KEYS.SETTINGS, s);
  },

  // ─── Last page ────────────────────────────────────────────────────────────

  saveLastPage(page)  { this._set(STORAGE_KEYS.LAST_PAGE, page); },
  loadLastPage()      { return this._get(STORAGE_KEYS.LAST_PAGE); },

  resetAll() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  },

  // Wipe all history but keep flagged questions
  wipeHistory() {
    const flagged = this.getFlagged();
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    if (flagged.length > 0) this._set(STORAGE_KEYS.FLAGGED, flagged);
  },
};

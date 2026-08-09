/**
 * ============================================================
 * DEPT. Q. BANK — progressManager.js  (Phase 1 + Phase 2)
 * ============================================================
 * Unified read/write layer. Every write mirrors into the local
 * `Storage` cache (storage.js) so every existing read call in
 * app.js / ui.js — Storage.getStats(), Storage.getFlagged(),
 * Storage.getIncorrect(), Storage.getProgress(), etc. — keeps
 * working completely unchanged. When a session exists, writes
 * ALSO go to Supabase, and `hydrateFromCloud()` pulls Supabase
 * state down into that same local cache so a second device sees
 * it immediately, through the exact same unmodified read calls.
 *
 * uid format (unchanged from Phase 1, produced by exam.js):
 *   module|examType|subject|subSubject|id
 *
 * Depends on: supabaseClient.js, auth.js, storage.js (loaded first).
 */

const ProgressManager = {

  // ════════════════════════════════════════════════════════════
  // Phase 1 — per-question correct/incorrect state
  // ════════════════════════════════════════════════════════════

  /**
   * @param {string} questionUid
   * @param {boolean} isCorrect
   * @param {object} entry  module, examType, subject, subSubject,
   *        subSubjectLabel, id, question, options, answer,
   *        explanation, userAnswer.
   */
  async saveQuestionState(questionUid, isCorrect, entry = {}) {
    const session = await Auth.getSession();

    if (session) {
      const { error } = await supabaseClient
        .from('question_progress')
        .upsert(
          {
            user_id: session.user.id,
            question_uid: questionUid,
            module: entry.module ?? null,
            exam_type: entry.examType ?? null,
            is_correct: isCorrect,
            question_data: entry,
            last_attempted_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,question_uid' }
        );

      if (error) {
        console.warn('[ProgressManager] Supabase save failed, falling back to localStorage:', error);
        this._saveLocalQuestionState(questionUid, isCorrect, entry);
        return { success: false, backend: 'localStorage-fallback', error };
      }
      // Mirror into local cache too, so the same device's review page
      // reflects the change immediately without waiting on a re-fetch.
      this._saveLocalQuestionState(questionUid, isCorrect, entry);
      return { success: true, backend: 'supabase' };
    }

    this._saveLocalQuestionState(questionUid, isCorrect, entry);
    return { success: true, backend: 'localStorage' };
  },

  async getQuestionState(questionUid) {
    const session = await Auth.getSession();

    if (session) {
      const { data, error } = await supabaseClient
        .from('question_progress')
        .select('is_correct, last_attempted_at')
        .eq('user_id', session.user.id)
        .eq('question_uid', questionUid)
        .maybeSingle();

      if (error) {
        console.warn('[ProgressManager] Supabase read failed, falling back to localStorage:', error);
        return this._getLocalQuestionState(questionUid);
      }
      if (!data) return null;
      return { isCorrect: data.is_correct, lastAttemptedAt: data.last_attempted_at };
    }

    return this._getLocalQuestionState(questionUid);
  },

  _saveLocalQuestionState(questionUid, isCorrect, entry = {}) {
    if (isCorrect) {
      Storage.removeIncorrect(questionUid);
      return;
    }
    const [module, examType, subject, subSubject, id] = questionUid.split('|');
    Storage.addIncorrect({
      module:          entry.module          ?? module,
      examType:        entry.examType        ?? examType,
      subject:         entry.subject         ?? subject,
      subSubject:      entry.subSubject      ?? subSubject,
      subSubjectLabel: entry.subSubjectLabel,
      id:              entry.id              ?? id,
      question:        entry.question,
      options:         entry.options,
      answer:          entry.answer,
      explanation:     entry.explanation,
      userAnswer:      entry.userAnswer,
    });
  },

  _getLocalQuestionState(questionUid) {
    const entry = Storage.getIncorrect().find(q => q.uid === questionUid);
    if (!entry) return null;
    return { isCorrect: false, lastAttemptedAt: new Date(entry.updatedAt || entry.addedAt).toISOString() };
  },

  // ════════════════════════════════════════════════════════════
  // Phase 2 — flags, exam history, aggregate stats, subject
  // progress, and the paused/active exam
  // ════════════════════════════════════════════════════════════

  /**
   * @param {object} entry  module, examType, subject, subSubject, id,
   *        question, options, answer, explanation — same shape
   *        exam.js already builds for Storage.toggleFlag.
   * @returns {Promise<boolean>} true if now flagged, false if unflagged
   */
  async toggleFlag(entry) {
    // Local cache is the immediate source of truth for the UI —
    // Storage.toggleFlag() is synchronous and already used this way
    // by exam.js's return value contract.
    const nowFlagged = Storage.toggleFlag(entry);

    const session = await Auth.getSession();
    if (!session) return nowFlagged;

    const uid = `${entry.module}|${entry.examType}|${entry.subject}|${entry.subSubject}|${entry.id}`;

    const op = nowFlagged
      ? supabaseClient.from('user_flags').upsert(
          {
            user_id: session.user.id,
            question_uid: uid,
            question_data: entry,
            flagged_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,question_uid' }
        )
      : supabaseClient.from('user_flags').delete()
          .eq('user_id', session.user.id)
          .eq('question_uid', uid);

    op.then(({ error }) => {
      if (error) console.warn('[ProgressManager] toggleFlag cloud sync failed:', error);
    });

    return nowFlagged;
  },

  /** @param {object} result  same shape exam.js passes to Storage.addExamResult */
  async addExamResult(result) {
    Storage.addExamResult(result);

    const session = await Auth.getSession();
    if (!session) return;

    const { error } = await supabaseClient.from('exam_history').insert({
      user_id:     session.user.id,
      module:      result.module,
      exam_type:   result.examType,
      subject:     result.subject,
      sub_subject: result.subSubject,
      scope:       result.scope,
      score:       result.score,
      correct:     result.correct,
      total:       result.total,
      time_sec:    result.timeSec,
    });

    if (error) console.warn('[ProgressManager] addExamResult cloud sync failed:', error);
  },

  /** @param {object} delta  same shape exam.js passes to Storage.updateStats */
  async updateStats(delta) {
    const stats = Storage.updateStats(delta);

    const session = await Auth.getSession();
    if (!session) return stats;

    const { error } = await supabaseClient.rpc('increment_user_stats', {
      p_attempted:       delta.totalAttempted    || 0,
      p_correct:         delta.totalCorrect      || 0,
      p_incorrect:       delta.totalIncorrect    || 0,
      p_completed_exams: delta.completedExams    || 0,
      p_time_spent_sec:  delta.totalTimeSpentSec || 0,
    });

    if (error) console.warn('[ProgressManager] updateStats cloud sync failed:', error);
    return stats;
  },

  async setSubjectProgress(module, examType, subject, subSubject, data) {
    Storage.setSubjectProgress(module, examType, subject, subSubject, data);

    const session = await Auth.getSession();
    if (!session) return;

    const { error } = await supabaseClient.from('subject_progress').upsert(
      {
        user_id:      session.user.id,
        module, exam_type: examType, subject, sub_subject: subSubject,
        completed:    data.completed ?? true,
        attempted:    data.attempted,
        correct:      data.correct,
        total:        data.total,
        score:        data.score,
        last_attempt: new Date(data.lastAttempt || Date.now()).toISOString(),
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'user_id,module,exam_type,subject,sub_subject' }
    );

    if (error) console.warn('[ProgressManager] setSubjectProgress cloud sync failed:', error);
  },

  /**
   * Cloud-first read: a paused exam started on another device only
   * exists in Supabase, not in this device's localStorage, so the
   * logged-in branch checks Supabase before ever touching the
   * local cache.
   */
  async loadCurrentExam() {
    const session = await Auth.getSession();

    if (session) {
      const { data, error } = await supabaseClient
        .from('active_exams')
        .select('exam_data')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.warn('[ProgressManager] loadCurrentExam cloud read failed, falling back to localStorage:', error);
      } else if (data) {
        return data.exam_data;
      }
    }

    return Storage.loadCurrentExam();
  },

  async saveCurrentExam(state) {
    Storage.saveCurrentExam(state);

    const session = await Auth.getSession();
    if (!session) return;

    const { error } = await supabaseClient.from('active_exams').upsert(
      {
        user_id:    session.user.id,
        exam_data:  state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) console.warn('[ProgressManager] saveCurrentExam cloud sync failed:', error);
  },

  async clearCurrentExam() {
    Storage.clearCurrentExam();

    const session = await Auth.getSession();
    if (!session) return;

    const { error } = await supabaseClient.from('active_exams')
      .delete()
      .eq('user_id', session.user.id);

    if (error) console.warn('[ProgressManager] clearCurrentExam cloud sync failed:', error);
  },

  // ════════════════════════════════════════════════════════════
  // Cloud → local hydration
  // ════════════════════════════════════════════════════════════

  /**
   * Pulls stats, subject progress, flags, and incorrect questions
   * down from Supabase and overwrites the local cache directly
   * (bypassing Storage's public per-item methods, which are built
   * for incremental updates, not bulk replace). Supabase is treated
   * as the source of truth for a logged-in user: local-only entries
   * from another session are intentionally overwritten, not merged.
   *
   * Call on app init (if a session already exists) and again right
   * after SIGNED_IN, so a guest who logs in mid-session gets pulled
   * up to date immediately.
   *
   * @returns {Promise<boolean>} true if hydration ran (session existed)
   */
  async hydrateFromCloud() {
    const session = await Auth.getSession();
    if (!session) return false;
    const userId = session.user.id;

    const [statsRes, progressRes, flagsRes, incorrectRes] = await Promise.all([
      supabaseClient.from('user_stats').select('*').eq('user_id', userId).maybeSingle(),
      supabaseClient.from('subject_progress').select('*').eq('user_id', userId),
      supabaseClient.from('user_flags').select('*').eq('user_id', userId),
      supabaseClient.from('question_progress').select('*').eq('user_id', userId).eq('is_correct', false),
    ]);

    if (!statsRes.error && statsRes.data) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify({
        totalAttempted:    statsRes.data.total_attempted,
        totalCorrect:      statsRes.data.total_correct,
        totalIncorrect:    statsRes.data.total_incorrect,
        completedExams:    statsRes.data.completed_exams,
        totalTimeSpentSec: statsRes.data.total_time_spent_sec,
      }));
    } else if (statsRes.error) {
      console.warn('[ProgressManager] hydrate: user_stats failed:', statsRes.error);
    }

    if (!progressRes.error && progressRes.data) {
      const progress = {};
      progressRes.data.forEach(row => {
        const key = `${row.module}|${row.exam_type}|${row.subject}|${row.sub_subject}`;
        progress[key] = {
          completed:   row.completed,
          attempted:   row.attempted,
          correct:     row.correct,
          total:       row.total,
          score:       row.score,
          lastAttempt: row.last_attempt ? new Date(row.last_attempt).getTime() : null,
          updatedAt:   row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
        };
      });
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    } else if (progressRes.error) {
      console.warn('[ProgressManager] hydrate: subject_progress failed:', progressRes.error);
    }

    if (!flagsRes.error && flagsRes.data) {
      const flags = flagsRes.data.map(row => ({
        ...(row.question_data || {}),
        uid: row.question_uid,
        flaggedAt: row.flagged_at ? new Date(row.flagged_at).getTime() : Date.now(),
      }));
      localStorage.setItem(STORAGE_KEYS.FLAGGED, JSON.stringify(flags));
    } else if (flagsRes.error) {
      console.warn('[ProgressManager] hydrate: user_flags failed:', flagsRes.error);
    }

    if (!incorrectRes.error && incorrectRes.data) {
      const incorrect = incorrectRes.data.map(row => ({
        ...(row.question_data || {}),
        uid: row.question_uid,
        updatedAt: row.last_attempted_at ? new Date(row.last_attempted_at).getTime() : Date.now(),
      }));
      localStorage.setItem(STORAGE_KEYS.INCORRECT, JSON.stringify(incorrect));
    } else if (incorrectRes.error) {
      console.warn('[ProgressManager] hydrate: question_progress failed:', incorrectRes.error);
    }

    return true;
  },
};

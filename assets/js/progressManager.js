/**
 * ============================================================
 * DEPT. Q. BANK — progressManager.js
 * ============================================================
 * Unified read/write layer. Every call checks for a live
 * Supabase session first; if none exists (guest mode), it falls
 * straight through to the existing `Storage` localStorage layer
 * from storage.js — no data-model duplication, same `uid` keys
 * exam.js already produces (module|examType|subject|subSubject|id).
 *
 * Depends on: supabaseClient.js, auth.js, storage.js (loaded first).
 */

const ProgressManager = {

  /**
   * @param {string} questionUid  e.g. "GIT|final_exam|anatomy|rectum|q12"
   * @param {boolean} isCorrect
   * @param {{module?: string, examType?: string}} meta  optional, for the
   *        Supabase row's module/exam_type columns (used for admin analytics
   *        later; safe to omit).
   */
  async saveQuestionState(questionUid, isCorrect, meta = {}) {
    const session = await Auth.getSession();

    if (session) {
      const { error } = await supabaseClient
        .from('question_progress')
        .upsert(
          {
            user_id: session.user.id,
            question_uid: questionUid,
            module: meta.module ?? null,
            exam_type: meta.examType ?? null,
            is_correct: isCorrect,
            last_attempted_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,question_uid' }
        );

      if (error) {
        console.warn('[ProgressManager] Supabase save failed, falling back to localStorage:', error);
        this._saveLocal(questionUid, isCorrect);
        return { success: false, backend: 'localStorage-fallback', error };
      }
      return { success: true, backend: 'supabase' };
    }

    // Guest mode / no session
    this._saveLocal(questionUid, isCorrect);
    return { success: true, backend: 'localStorage' };
  },

  /**
   * @param {string} questionUid
   * @returns {Promise<{isCorrect: boolean, lastAttemptedAt: string} | null>}
   */
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
        return this._getLocal(questionUid);
      }
      if (!data) return null;
      return { isCorrect: data.is_correct, lastAttemptedAt: data.last_attempted_at };
    }

    return this._getLocal(questionUid);
  },

  // ─── localStorage branch — reuses the existing incorrect-questions
  //     store from storage.js instead of a third parallel key. ──────
  _saveLocal(questionUid, isCorrect) {
    const [module, examType, subject, subSubject, id] = questionUid.split('|');
    if (isCorrect) {
      Storage.removeIncorrect(questionUid);
    } else {
      Storage.addIncorrect({ module, examType, subject, subSubject, id });
    }
  },

  _getLocal(questionUid) {
    const entry = Storage.getIncorrect().find(q => q.uid === questionUid);
    if (!entry) return null;
    return { isCorrect: false, lastAttemptedAt: new Date(entry.updatedAt || entry.addedAt).toISOString() };
  },
};

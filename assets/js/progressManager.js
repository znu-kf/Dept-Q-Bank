/**
 * ============================================================
 * DEPT. Q. BANK — progressManager.js
 * ============================================================
 * Unified read/write layer. Every call checks for a live
 * Supabase session first; if none exists (guest mode), it falls
 * straight through to the existing `Storage` localStorage layer
 * from storage.js — same `uid` format exam.js already produces:
 *   module|examType|subject|subSubject|id
 *
 * `entry` carries the full question payload (question text,
 * options, answer, explanation, subSubjectLabel, userAnswer).
 * Supabase only needs the uid + correctness — question content
 * already lives in the static JSON files. But the localStorage
 * "Incorrect Questions" review page (app.js) renders directly
 * from what's stored, so the guest-mode branch still needs the
 * full entry to keep that page working exactly as before.
 *
 * Depends on: supabaseClient.js, auth.js, storage.js (loaded first).
 */

const ProgressManager = {

  /**
   * @param {string} questionUid  e.g. "GIT|final_exam|anatomy|rectum|q12"
   * @param {boolean} isCorrect
   * @param {object} entry  optional. module, examType, subject, subSubject,
   *        subSubjectLabel, id, question, options, answer, explanation,
   *        userAnswer — only module/examType are used for the Supabase row;
   *        the rest are used for the localStorage guest-mode fallback.
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
            last_attempted_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,question_uid' }
        );

      if (error) {
        console.warn('[ProgressManager] Supabase save failed, falling back to localStorage:', error);
        this._saveLocal(questionUid, isCorrect, entry);
        return { success: false, backend: 'localStorage-fallback', error };
      }
      return { success: true, backend: 'supabase' };
    }

    // Guest mode / no session
    this._saveLocal(questionUid, isCorrect, entry);
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
  _saveLocal(questionUid, isCorrect, entry = {}) {
    if (isCorrect) {
      // Answering a previously-missed question correctly "masters" it,
      // same behavior as the manual "Mark as Mastered" review button.
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

  _getLocal(questionUid) {
    const entry = Storage.getIncorrect().find(q => q.uid === questionUid);
    if (!entry) return null;
    return { isCorrect: false, lastAttemptedAt: new Date(entry.updatedAt || entry.addedAt).toISOString() };
  },
};

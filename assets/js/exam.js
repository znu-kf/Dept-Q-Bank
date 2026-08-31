/**
 * ============================================================
 * DEPT. Q. BANK — exam.js  (v3 — subject & exam-type wide exams)
 * ============================================================
 */

const ExamEngine = {

  config: null,
  questions: [],
  state: {
    currentIndex: 0,
    answers: {},
    flagged: new Set(),
    startTime: null,
    endTime: null,
    submitted: false,
  },

  async init(config) {
    this.config = config;
    let data;
    if (config.scope === 'subject') {
      // Load all sub-subjects for a given module+examType+subject
      data = await this._loadQuestionsForSubject(config);
    } else if (config.scope === 'examtype') {
      // Load all subjects+sub-subjects for a given module+examType
      data = await this._loadQuestionsForExamType(config);
    } else {
      data = await this._loadQuestions(config);
    }
    this.questions = config.randomize ? this._shuffle([...data]) : [...data];
    this.state = {
      currentIndex: 0,
      answers: {},
      flagged: new Set(),
      startTime: Date.now(),
      endTime: null,
      submitted: false,
    };
    Storage.clearCurrentExam();
    return this.questions.length;
  },

  async resume() {
    const saved = Storage.loadCurrentExam();
    if (!saved) return false;
    this.config    = saved.config;
    this.questions = saved.questions;
    this.state     = { ...saved.state, flagged: new Set(saved.state.flagged) };
    return true;
  },

  save() {
    if (!this.config || this.state.submitted) return;
    Storage.saveCurrentExam({
      config:    this.config,
      questions: this.questions,
      state:     { ...this.state, flagged: [...this.state.flagged] },
    });
  },

  goTo(index) {
    if (index >= 0 && index < this.questions.length) {
      this.state.currentIndex = index;
      this.save();
    }
  },

  next() { this.goTo(this.state.currentIndex + 1); },
  prev() { this.goTo(this.state.currentIndex - 1); },

  answer(optionIndex) {
    if (this.state.submitted) return null;
    this.state.answers[this.state.currentIndex] = optionIndex;
    this.save();
    const q = this.questions[this.state.currentIndex];
    return {
      correct:      q.answer === optionIndex,
      correctIndex: q.answer,
      explanation:  q.explanation,
    };
  },

  toggleFlag(index) {
    if (this.state.flagged.has(index)) {
      this.state.flagged.delete(index);
    } else {
      this.state.flagged.add(index);
    }
    const q = this.questions[index];
    Storage.toggleFlag({
      module:      this.config.module,
      examType:    this.config.examType,
      subject:     this.config.subject || q._subject,
      subSubject:  this.config.subSubject || q._subSubject,
      id:          q.id,
      question:    q.question,
      options:     q.options,
      answer:      q.answer,
      explanation: q.explanation,
    });
    this.save();
    return this.state.flagged.has(index);
  },

  submit() {
    if (this.state.submitted) return null;
    this.state.submitted = true;
    this.state.endTime   = Date.now();

    const results = {
      config:      this.config,
      questions:   this.questions,
      answers:     { ...this.state.answers },
      score:       0,
      total:       this.questions.length,
      correct:     0,
      incorrect:   0,
      unanswered:  0,
      timeSec:     Math.round((this.state.endTime - this.state.startTime) / 1000),
      completedAt: this.state.endTime,
      perQuestion: [],
    };

    this.questions.forEach((q, i) => {
      const userAns = this.state.answers[i];
      const answered = userAns !== undefined;
      const correct  = answered && userAns === q.answer;

      results.perQuestion.push({
        question:         q.question,
        options:          q.options,
        answer:           q.answer,
        explanation:      q.explanation,
        userAnswer:       userAns,
        correct,
        answered,
        flagged:          this.state.flagged.has(i),
        _subject:         q._subject,
        _subSubject:      q._subSubject,
        _subSubjectLabel: q._subSubjectLabel,
      });

      if (!answered)    results.unanswered++;
      else if (correct) results.correct++;
      else              results.incorrect++;

      if (!correct && answered) {
        Storage.addIncorrect({
          module:           this.config.module,
          examType:         this.config.examType,
          subject:          q._subject         || this.config.subject,
          subSubject:       q._subSubject      || this.config.subSubject,
          subSubjectLabel:  q._subSubjectLabel || this.config.subSubjectLabel,
          id:               q.id,
          question:         q.question,
          options:          q.options,
          answer:           q.answer,
          explanation:      q.explanation,
          userAnswer:       userAns,
        });
      }
    });

    results.score = results.total > 0
      ? Math.round((results.correct / results.total) * 100) : 0;

    Storage.updateStats({
      totalAttempted:    results.total - results.unanswered,
      totalCorrect:      results.correct,
      totalIncorrect:    results.incorrect,
      completedExams:    1,
      totalTimeSpentSec: results.timeSec,
    });

    // Only save per-subsubject progress for single sub-subject exams
    if (!this.config.scope) {
      Storage.setSubjectProgress(
        this.config.module,
        this.config.examType,
        this.config.subject,
        this.config.subSubject,
        {
          completed:   true,
          attempted:   results.total - results.unanswered,
          correct:     results.correct,
          total:       results.total,
          score:       results.score,
          lastAttempt: results.completedAt,
        }
      );
    }

    Storage.addExamResult({
      module:      this.config.module,
      examType:    this.config.examType,
      subject:     this.config.subject,
      subSubject:  this.config.subSubject,
      scope:       this.config.scope,
      score:       results.score,
      correct:     results.correct,
      total:       results.total,
      timeSec:     results.timeSec,
    });

    Storage.clearCurrentExam();
    return results;
  },

  getCurrent()      { return this.questions[this.state.currentIndex] || null; },
  getCurrentAnswer(){ return this.state.answers[this.state.currentIndex]; },
  isAnswered(index) { return this.state.answers[index] !== undefined; },
  isFlagged(index)  { return this.state.flagged.has(index); },

  getProgress() {
    const answered   = Object.keys(this.state.answers).length;
    const flagged    = this.state.flagged.size;
    const unanswered = this.questions.length - answered;
    return { answered, unanswered, flagged, total: this.questions.length };
  },

  // ─── Question loaders ────────────────────────────────────────────────────

  // Load a single sub-subject file
  async _loadQuestions(config) {
    const path = `data/${config.module}/${config.examType}/${config.subject}/${config.subSubject}.json`;
    try {
      const res = await fetch(path);
      if (!res.ok) return [];
      const data = await res.json();
      const qs = Array.isArray(data.questions) ? data.questions : [];
      return qs.map(q => ({ ...q, _subject: config.subject, _subSubject: config.subSubject, _subSubjectLabel: config.subSubjectLabel }));
    } catch (e) {
      console.warn(`[ExamEngine] Could not load ${path}:`, e);
      return [];
    }
  },

  // Load all sub-subjects for one subject under one exam type
  async _loadQuestionsForSubject(config) {
    // config.subSubjectList = [{ id, label, icon }, ...]
    const list = config.subSubjectList || [];
    const batches = await Promise.all(
      list.map(ss => this._loadOneSubSubject(config.module, config.examType, config.subject, ss))
    );
    return batches.flat();
  },

  // Load all subjects + sub-subjects for one exam type
  async _loadQuestionsForExamType(config) {
    // config.subjectMap = { subjectId: [{ id, label, icon }, ...], ... }
    const subjectMap = config.subjectMap || {};
    const allBatches = await Promise.all(
      Object.entries(subjectMap).map(([subjectId, ssList]) =>
        Promise.all(ssList.map(ss =>
          this._loadOneSubSubject(config.module, config.examType, subjectId, ss)
        )).then(b => b.flat())
      )
    );
    return allBatches.flat();
  },

  async _loadOneSubSubject(moduleId, examType, subjectId, ss) {
    const path = `data/${moduleId}/${examType}/${subjectId}/${ss.id}.json`;
    try {
      const res = await fetch(path);
      if (!res.ok) return [];
      const data = await res.json();
      const qs = Array.isArray(data.questions) ? data.questions : [];
      return qs.map(q => ({ ...q, _subject: subjectId, _subSubject: ss.id, _subSubjectLabel: ss.label }));
    } catch { return []; }
  },

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },
};

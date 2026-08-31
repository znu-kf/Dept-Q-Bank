/**
 * ============================================================
 * DEPT. Q. BANK — app.js  (v3 — subject & exam-type wide exams)
 * ============================================================
 */

const App = {

  config: null,
  currentPage: null,
  currentParams: {},
  lastResults: null,

  // ─── Bootstrap ───────────────────────────────────────────────────────────

  async init() {
    UI.loading('Loading Dept. Q. Bank…');
    try {
      this.config = await this._loadConfig();
      document.title = this.config.siteTitle;
    } catch (e) {
      UI.setContent(`<div class="error-screen">
        <h2>⚠️ Configuration Error</h2>
        <p>Could not load <code>config/modules.json</code>. Check the file exists and is valid JSON.</p>
        <pre>${e.message}</pre>
      </div>`);
      return;
    }

    this._initTheme();
    document.addEventListener('click', e => this._handleGlobalClick(e));

    window.addEventListener('popstate', e => {
      if (e.state && e.state.page) {
        this._navigateWithoutHistory(e.state.page, e.state.params || {});
      } else {
        this._navigateWithoutHistory('dashboard', {});
      }
    });

    const last = Storage.loadLastPage();
    if (last && last.page) {
      this.navigate(last.page, last.params);
    } else {
      this.navigate('dashboard');
    }
  },

  // ─── Theme toggle ────────────────────────────────────────────────────────

  _initTheme() {
    const saved = localStorage.getItem('dqb_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this._applyThemeIcon(saved);
  },

  _applyThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.classList.toggle('theme-toggle--dark', theme === 'dark');
  },

  _toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dqb_theme', next);
    this._applyThemeIcon(next);
  },

  // ─── Navigation ──────────────────────────────────────────────────────────

  navigate(page, params = {}) {
    this.currentPage   = page;
    this.currentParams = params;
    Storage.saveLastPage({ page, params });
    history.pushState({ page, params }, '', '#' + page);
    this._renderPage(page, params);
  },

  _navigateWithoutHistory(page, params = {}) {
    this.currentPage   = page;
    this.currentParams = params;
    Storage.saveLastPage({ page, params });
    this._renderPage(page, params);
  },

  async _renderPage(page, params) {
    switch (page) {

      case 'dashboard': {
        const progress = Storage.getProgress();
        const stats    = Storage.getStats();
        UI.loading('Loading…');
        const countMap = await this._buildCountMap(this.config);
        UI.setContent(UI.renderDashboard(this.config, progress, stats, countMap));
        this._applyThemeIcon(document.documentElement.getAttribute('data-theme') || 'light');
        break;
      }

      case 'module': {
        const mod = this._getModule(params.moduleId);
        if (!mod) { this.navigate('dashboard'); break; }
        const progress = Storage.getProgress();
        UI.loading('Loading…');
        const countMap = await this._buildCountMap(this.config, mod);
        UI.setContent(UI.renderModule(mod, this.config, progress, countMap));
        break;
      }

      // Subject page: shows sub-subjects + a "Start Subject Exam" button
      case 'subject': {
        const mod     = this._getModule(params.moduleId);
        const subject = params.subject;
        const et      = params.examType;
        if (!mod) { this.navigate('dashboard'); break; }
        const subSubjects = (mod.subSubjects && mod.subSubjects[et] && mod.subSubjects[et][subject]) || [];
        const progress    = Storage.getProgress();
        UI.loading('Loading…');
        const countMap = await this._buildCountMap(this.config, mod);
        UI.setContent(UI.renderSubject(mod, et, subject, subSubjects, progress, this.config, countMap));
        this._bindSubjectPageEvents(mod, et, subject, subSubjects, countMap);
        break;
      }

      // Sub-subject page (individual topic exam start)
      case 'subsubject': {
        const mod        = this._getModule(params.moduleId);
        const subject    = params.subject;
        const et         = params.examType;
        const subSubject = params.subSubject;
        if (!mod) { this.navigate('dashboard'); break; }
        UI.loading('Loading…');
        const count    = await this._getQuestionCount(mod, et, subject, subSubject);
        const progress = Storage.getSubjectProgress(mod.id, et, subject, subSubject);
        UI.setContent(UI.renderSubSubject(mod, et, subject, subSubject, count, progress, this.config));
        this._bindSubSubjectEvents(mod, et, subject, subSubject);
        break;
      }

      // ── NEW: Wide exam start screen (subject-level or examtype-level) ──
      case 'wide-exam-start': {
        const mod = this._getModule(params.moduleId);
        if (!mod) { this.navigate('dashboard'); break; }
        UI.loading('Loading…');
        const countMap  = await this._buildCountMap(this.config, mod);
        const totalCount = await this._getWideQuestionCount(mod, params.examType, params.subject, params.scope, countMap);
        UI.setContent(UI.renderWideExamStart(mod, params, totalCount, this.config));
        this._bindWideExamStartEvents(mod, params);
        break;
      }

      case 'exam': {
        UI.loading('Preparing exam…');
        const started = await this._startExam(params);
        if (!started) {
          // Go back to appropriate page
          if (params.scope === 'examtype') {
            this.navigate('module', { moduleId: params.moduleId });
          } else if (params.scope === 'subject') {
            this.navigate('subject', { moduleId: params.moduleId, examType: params.examType, subject: params.subject });
          } else {
            this.navigate('subsubject', params);
          }
          break;
        }
        UI.setContent(UI.renderExam(ExamEngine, this.config));
        this._bindExamEvents();
        break;
      }

      case 'results': {
        if (!this.lastResults) { this.navigate('dashboard'); break; }
        UI.setContent(UI.renderResults(this.lastResults, this.config));
        this._bindResultsEvents();
        break;
      }

      case 'review': {
        const incorrect = Storage.getIncorrect();
        UI.setContent(UI.renderReview(incorrect, this.config));
        this._bindReviewEvents();
        break;
      }

      case 'scoped-review': {
        const filter    = params;
        const incorrect = Storage.getIncorrect().filter(q =>
          q.module     === filter.moduleId   &&
          q.examType   === filter.examType   &&
          q.subject    === filter.subject    &&
          q.subSubject === filter.subSubject
        );
        UI.setContent(UI.renderReview(incorrect, this.config, filter));
        this._bindReviewEvents();
        break;
      }

      case 'flagged-review': {
        const flagged = Storage.getFlagged();
        UI.setContent(UI.renderFlagged(flagged, this.config));
        this._bindFlaggedReviewEvents();
        break;
      }

      case 'scoped-flagged': {
        const filter  = params;
        const flagged = Storage.getFlagged().filter(q =>
          q.module     === filter.moduleId   &&
          q.examType   === filter.examType   &&
          q.subject    === filter.subject    &&
          q.subSubject === filter.subSubject
        );
        UI.setContent(UI.renderFlagged(flagged, this.config, filter));
        this._bindFlaggedReviewEvents();
        break;
      }

      case 'search': {
        UI.setContent(UI.renderSearch(this.config));
        this._bindSearchEvents();
        break;
      }

      default:
        this.navigate('dashboard');
    }
  },

  // ─── Global click delegation ─────────────────────────────────────────────

  _handleGlobalClick(e) {
    if (e.target.closest('#theme-toggle')) {
      this._toggleTheme();
      return;
    }

    // Wipe history button — show modal
    if (e.target.closest('#wipe-history-btn')) {
      const modal = document.getElementById('wipe-modal');
      if (modal) modal.style.display = 'flex';
      return;
    }

    // Wipe modal — cancel
    if (e.target.closest('#wipe-cancel-btn')) {
      const modal = document.getElementById('wipe-modal');
      if (modal) modal.style.display = 'none';
      return;
    }

    // Wipe modal — confirm
    if (e.target.closest('#wipe-confirm-btn')) {
      Storage.wipeHistory();
      const modal = document.getElementById('wipe-modal');
      if (modal) modal.style.display = 'none';
      UI.toast('Progress reset. Flagged questions kept.', 'success');
      this.navigate('dashboard');
      return;
    }
    const el = e.target.closest('[data-nav]');
    if (!el) return;
    e.preventDefault();
    const page = el.dataset.nav;
    let params = {};
    try { params = JSON.parse(el.dataset.params || '{}'); } catch {}
    this.navigate(page, params);
  },

  // ─── Subject page events (adds "Start Subject Exam" button) ──────────────

  _bindSubjectPageEvents(mod, examType, subject, subSubjects, countMap) {
    const btn = document.getElementById('start-subject-exam-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const visibleSubSubs = subSubjects.filter(ss =>
          (countMap[`${mod.id}|${examType}|${subject}|${ss.id}`] || 0) > 0
        );
        if (visibleSubSubs.length === 0) {
          UI.toast('No questions available for this subject yet.', 'info');
          return;
        }
        this.navigate('wide-exam-start', {
          moduleId:  mod.id,
          examType,
          subject,
          scope:     'subject',
        });
      });
    }
  },

  // ─── Sub-subject page events ──────────────────────────────────────────────

  _bindSubSubjectEvents(mod, examType, subject, subSubject) {
    const startBtn = document.getElementById('start-exam-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.navigate('exam', {
          moduleId:           mod.id,
          examType,
          subject,
          subSubject,
          immediateFeedback:  true,
          randomize:          false,
          retryIncorrectOnly: false,
        });
      });
    }
    const retryBtn = document.getElementById('retry-exam-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.navigate('exam', {
          moduleId:           mod.id,
          examType,
          subject,
          subSubject,
          immediateFeedback:  true,
          randomize:          false,
          retryIncorrectOnly: false,
        });
      });
    }
  },

  // ─── Wide exam start page events ─────────────────────────────────────────

  _bindWideExamStartEvents(mod, params) {
    const startBtn = document.getElementById('start-wide-exam-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.navigate('exam', {
          ...params,
          immediateFeedback:  true,
          randomize:          true,
          retryIncorrectOnly: false,
        });
      });
    }
  },

  // ─── Exam events ──────────────────────────────────────────────────────────

  _bindExamEvents() {
    if (this._examClickHandler) {
      document.removeEventListener('click', this._examClickHandler);
      this._examClickHandler = null;
    }

    document.addEventListener('click', this._examClickHandler = e => {
      const optBtn = e.target.closest('.option:not([disabled])');
      if (optBtn) {
        const idx    = parseInt(optBtn.dataset.option, 10);
        const result = ExamEngine.answer(idx);
        if (result) {
          const opts = document.querySelectorAll('.option');
          opts.forEach((btn, i) => {
            btn.disabled = true;
            if (i === result.correctIndex)         btn.classList.add('option--correct');
            else if (i === idx && !result.correct) btn.classList.add('option--wrong');
          });
          this._updatePalette();
          if (ExamEngine.config.immediateFeedback) {
            const existing = document.querySelector('.explanation-box');
            if (!existing) {
              const box = document.createElement('div');
              box.className = `explanation-box ${result.correct ? 'explanation-box--correct' : 'explanation-box--wrong'}`;

              // Show topic label for wide exams
              const q = ExamEngine.getCurrent();
              const topicBadge = (ExamEngine.config.scope && q._subSubjectLabel)
                ? `<div class="explanation-box__topic">📌 ${q._subSubjectLabel}</div>`
                : '';

              box.innerHTML = `
                <div class="explanation-box__header">
                  ${result.correct ? '✅ Correct!' : `❌ Incorrect — Correct answer: <strong>${['A','B','C','D'][result.correctIndex]}</strong>`}
                </div>
                ${topicBadge}
                <p class="explanation-box__text">${result.explanation}</p>`;
              document.querySelector('.options-list').after(box);
            }
          }
        }
      }

      const palBtn = e.target.closest('.palette-btn');
      if (palBtn && palBtn.dataset.goto !== undefined) {
        ExamEngine.goTo(parseInt(palBtn.dataset.goto, 10));
        UI.setContent(UI.renderExam(ExamEngine, this.config));
      }

      if (e.target.id === 'next-btn') {
        ExamEngine.next();
        UI.setContent(UI.renderExam(ExamEngine, this.config));
      }
      if (e.target.id === 'prev-btn') {
        ExamEngine.prev();
        UI.setContent(UI.renderExam(ExamEngine, this.config));
      }

      if (e.target.id === 'flag-btn' || e.target.closest('#flag-btn')) {
        const nowFlagged = ExamEngine.toggleFlag(ExamEngine.state.currentIndex);
        const btn = document.getElementById('flag-btn');
        if (btn) {
          btn.classList.toggle('flag-btn--active', nowFlagged);
          const label = btn.querySelector('.flag-btn__label');
          if (label) label.textContent = nowFlagged ? 'Flagged' : 'Flag';
        }
        this._updatePalette();
        UI.toast(nowFlagged ? 'Question flagged.' : 'Flag removed.', 'info', 1500);
      }

      if (e.target.closest('.submit-exam-trigger')) {
        const unanswered = ExamEngine.getProgress().unanswered;
        if (unanswered > 0) {
          const ok = confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`);
          if (!ok) return;
        }
        this._submitExam();
      }
    });

    this._cleanupExamListeners = () => {
      document.removeEventListener('click', this._examClickHandler);
    };
  },

  _updatePalette() {
    const palette = document.querySelector('.palette');
    if (!palette) return;
    ExamEngine.questions.forEach((_, i) => {
      const btn = palette.querySelector(`[data-goto="${i}"]`);
      if (!btn) return;
      btn.className = 'palette-btn';
      if (i === ExamEngine.state.currentIndex) btn.classList.add('palette-btn--current');
      else if (ExamEngine.isAnswered(i))       btn.classList.add('palette-btn--answered');
      if (ExamEngine.isFlagged(i))             btn.classList.add('palette-btn--flagged');
    });
    const info = document.querySelector('.exam-progress-info');
    if (info) {
      const p = ExamEngine.getProgress();
      info.innerHTML = `<span>${p.answered}/${p.total} answered</span>${p.flagged > 0 ? `<span>🚩 ${p.flagged}</span>` : ''}`;
    }
    const fill = document.querySelector('.exam-sidebar .progress-bar__fill');
    if (fill) {
      const p = ExamEngine.getProgress();
      fill.style.width = `${p.total ? Math.round((p.answered / p.total) * 100) : 0}%`;
    }
  },

  _submitExam() {
    if (this._cleanupExamListeners) this._cleanupExamListeners();
    this.lastResults = ExamEngine.submit();
    this.navigate('results');
  },

  // ─── Results events ───────────────────────────────────────────────────────

  _bindResultsEvents() {
    document.addEventListener('click', e => {
      if (e.target.id === 'retry-incorrect-btn' || e.target.closest('#retry-incorrect-btn')) {
        const btn = e.target.closest('#retry-incorrect-btn') || e.target;
        this.navigate('exam', {
          moduleId:           btn.dataset.module,
          examType:           btn.dataset.examType,
          subject:            btn.dataset.subject,
          subSubject:         btn.dataset.subSubject,
          immediateFeedback:  true,
          randomize:          true,
          retryIncorrectOnly: true,
        });
      }
      if (e.target.id === 'retry-all-btn' || e.target.closest('#retry-all-btn')) {
        const btn = e.target.closest('#retry-all-btn') || e.target;
        this.navigate('exam', {
          moduleId:           btn.dataset.module,
          examType:           btn.dataset.examType,
          subject:            btn.dataset.subject || null,
          subSubject:         btn.dataset.subSubject || null,
          scope:              btn.dataset.scope || null,
          immediateFeedback:  true,
          randomize:          true,
          retryIncorrectOnly: false,
        });
      }
    }, { once: true });
  },

  // ─── Review events ────────────────────────────────────────────────────────

  _bindReviewEvents() {
    const list    = document.getElementById('review-list');
    const search  = document.getElementById('review-search');
    const fMod    = document.getElementById('review-filter-module');
    const fSub    = document.getElementById('review-filter-subject');
    const clearAll = document.getElementById('clear-all-review');

    const filterAndRender = () => {
      let items = Storage.getIncorrect();
      const q = search?.value.toLowerCase() ?? '';
      const m = fMod?.value ?? '';
      const s = fSub?.value ?? '';
      if (q) items = items.filter(i => i.question.toLowerCase().includes(q));
      if (m) items = items.filter(i => i.module === m);
      if (s) items = items.filter(i => i.subject === s);
      if (list) {
        list.innerHTML = items.length === 0
          ? UI.emptyState('No Matches', 'Try adjusting your filters.', '🔍')
          : items.map(q => {
              const sub = this.config.subjects.find(s => s.id === q.subject);
              const et  = this.config.examTypes.find(e => e.id === q.examType);
              return `<div class="review-item" data-uid="${q.uid}">
                <div class="review-item__meta">
                  <span class="badge" style="background:${sub?.color}20;color:${sub?.color}">${sub?.icon} ${sub?.label}</span>
                  <span class="badge badge--ghost">${q.module}</span>
                  ${q.subSubjectLabel ? `<span class="badge badge--ghost">${q.subSubjectLabel}</span>` : ''}
                  <span class="badge badge--ghost">${et?.label}</span>
                </div>
                <p class="review-item__question">${q.question}</p>
                <div class="review-item__options">
                  ${q.options.map((opt, i) => `<span class="review-opt ${i === q.answer ? 'review-opt--correct' : i === q.userAnswer ? 'review-opt--wrong' : ''}">${['A','B','C','D'][i]}. ${opt}</span>`).join('')}
                </div>
                <div class="review-item__explanation">${q.explanation}</div>
                <button class="btn btn--ghost btn--sm review-item__remove" data-remove-uid="${q.uid}">✓ Mark as Mastered</button>
              </div>`;
            }).join('');
      }
    };

    search?.addEventListener('input', filterAndRender);
    fMod?.addEventListener('change', filterAndRender);
    fSub?.addEventListener('change', filterAndRender);

    clearAll?.addEventListener('click', () => {
      if (confirm('Remove all questions from review? This cannot be undone.')) {
        Storage.clearAllIncorrect();
        this.navigate('review');
      }
    });

    list?.addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-uid]');
      if (btn) {
        Storage.removeIncorrect(btn.dataset.removeUid);
        btn.closest('.review-item')?.remove();
        UI.toast('Marked as mastered.', 'success');
      }
    });
  },

  // ─── Flagged review events ───────────────────────────────────────────────

  _bindFlaggedReviewEvents() {
    const list    = document.getElementById('flagged-list');
    const search  = document.getElementById('flagged-search');
    const fMod    = document.getElementById('flagged-filter-module');
    const fSub    = document.getElementById('flagged-filter-subject');
    const clearAll = document.getElementById('clear-all-flagged');

    const filterAndRender = () => {
      let items = Storage.getFlagged();
      const q = search?.value.toLowerCase() ?? '';
      const m = fMod?.value ?? '';
      const s = fSub?.value ?? '';
      if (q) items = items.filter(i => i.question.toLowerCase().includes(q));
      if (m) items = items.filter(i => i.module === m);
      if (s) items = items.filter(i => i.subject === s);
      if (list) {
        list.innerHTML = items.length === 0
          ? UI.emptyState('No Matches', 'Try adjusting your filters.', '🔍')
          : items.map(q => {
              const sub = this.config.subjects.find(s => s.id === q.subject);
              const et  = this.config.examTypes.find(e => e.id === q.examType);
              return `<div class="review-item" data-uid="${q.uid}">
                <div class="review-item__meta">
                  <span class="badge" style="background:${sub?.color}20;color:${sub?.color}">${sub?.icon} ${sub?.label}</span>
                  <span class="badge badge--ghost">${q.module}</span>
                  ${q.subSubjectLabel ? `<span class="badge badge--ghost">${q.subSubjectLabel}</span>` : ''}
                  <span class="badge badge--ghost">${et?.label}</span>
                  <span class="badge" style="background:#4A9E8E20;color:#4A9E8E">🚩 Flagged</span>
                </div>
                <p class="review-item__question">${q.question}</p>
                <div class="review-item__options">
                  ${q.options.map((opt, i) => `<span class="review-opt ${i === q.answer ? 'review-opt--correct' : ''}">${['A','B','C','D'][i]}. ${opt}</span>`).join('')}
                </div>
                <div class="review-item__explanation">${q.explanation}</div>
                <button class="btn btn--ghost btn--sm review-item__remove" data-remove-uid="${q.uid}">🚩 Remove Flag</button>
              </div>`;
            }).join('');
      }
    };

    search?.addEventListener('input', filterAndRender);
    fMod?.addEventListener('change', filterAndRender);
    fSub?.addEventListener('change', filterAndRender);

    clearAll?.addEventListener('click', () => {
      if (confirm('Remove all flags? This cannot be undone.')) {
        Storage.getFlagged().forEach(f => Storage.toggleFlag(f));
        this.navigate('dashboard');
      }
    });

    list?.addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-uid]');
      if (btn) {
        const item = Storage.getFlagged().find(f => f.uid === btn.dataset.removeUid);
        if (item) Storage.toggleFlag(item);
        btn.closest('.review-item')?.remove();
        UI.toast('Flag removed.', 'info');
      }
    });
  },

  // ─── Search events ────────────────────────────────────────────────────────

  _bindSearchEvents() {
    const input   = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input || !results) return;
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this._runSearch(input.value, results), 300);
    });
  },

  async _runSearch(query, container) {
    if (!query || query.trim().length < 2) {
      container.innerHTML = '<p class="search-hint">Start typing to search across all available questions.</p>';
      return;
    }
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
    const q = query.toLowerCase().trim();
    const found = [];

    this.config.modules.forEach(mod => {
      if (mod.title.toLowerCase().includes(q) || mod.fullTitle.toLowerCase().includes(q)) {
        found.push({ type: 'module', label: mod.title, sub: mod.fullTitle, nav: 'module', params: { moduleId: mod.id } });
      }
    });
    this.config.subjects.forEach(sub => {
      if (sub.label.toLowerCase().includes(q)) {
        found.push({ type: 'subject', label: sub.label, sub: 'Subject', nav: 'dashboard', params: {} });
      }
    });
    Storage.getIncorrect().forEach(iq => {
      if (iq.question.toLowerCase().includes(q)) {
        found.push({ type: 'question', label: iq.question, sub: `${iq.module} · ${iq.subject}`, nav: 'review', params: {} });
      }
    });

    if (found.length === 0) {
      container.innerHTML = `<p class="search-hint">No results for "<strong>${query}</strong>".</p>`;
      return;
    }
    container.innerHTML = found.slice(0, 30).map(r => `
      <div class="search-result-item" data-nav="${r.nav}" data-params='${JSON.stringify(r.params)}'>
        <span class="search-result-item__type">${r.type}</span>
        <div>
          <div class="search-result-item__label">${r.label}</div>
          <div class="search-result-item__sub">${r.sub}</div>
        </div>
      </div>`).join('');
  },

  // ─── Exam start helper ───────────────────────────────────────────────────

  async _startExam(params) {
    if (params.retryIncorrectOnly) {
      const all = Storage.getIncorrect().filter(
        q => q.module === params.moduleId &&
             q.examType === params.examType &&
             q.subject === params.subject &&
             q.subSubject === params.subSubject
      );
      if (all.length === 0) {
        UI.toast('No incorrect questions to retry.', 'info');
        return false;
      }
      ExamEngine.config = {
        module:            params.moduleId,
        examType:          params.examType,
        subject:           params.subject,
        subSubject:        params.subSubject,
        immediateFeedback: true,
        randomize:         params.randomize ?? false,
      };
      ExamEngine.questions = params.randomize ? ExamEngine._shuffle([...all]) : all;
      ExamEngine.state = {
        currentIndex: 0,
        answers: {},
        flagged: new Set(),
        startTime: Date.now(),
        endTime: null,
        submitted: false,
      };
      return true;
    }

    // Wide exam (subject or exam-type scope)
    if (params.scope === 'subject' || params.scope === 'examtype') {
      const mod = this._getModule(params.moduleId);
      if (!mod) return false;

      let examConfig;
      if (params.scope === 'subject') {
        const subSubjectList = (mod.subSubjects?.[params.examType]?.[params.subject]) || [];
        examConfig = {
          module:            params.moduleId,
          examType:          params.examType,
          subject:           params.subject,
          scope:             'subject',
          subSubjectList,
          immediateFeedback: true,
          randomize:         true,
        };
      } else {
        // examtype scope — collect all subjects and their sub-subjects
        const subjectMap = {};
        (this.config.subjects || []).forEach(sub => {
          const ssList = (mod.subSubjects?.[params.examType]?.[sub.id]) || [];
          if (ssList.length > 0) subjectMap[sub.id] = ssList;
        });
        examConfig = {
          module:            params.moduleId,
          examType:          params.examType,
          scope:             'examtype',
          subjectMap,
          immediateFeedback: true,
          randomize:         true,
        };
      }

      const count = await ExamEngine.init(examConfig);
      if (count === 0) {
        UI.toast('No questions available yet.', 'info');
        return false;
      }
      return true;
    }

    // Standard single sub-subject exam
    const count = await ExamEngine.init({
      module:            params.moduleId,
      examType:          params.examType,
      subject:           params.subject,
      subSubject:        params.subSubject,
      immediateFeedback: true,
      randomize:         params.randomize ?? false,
    });

    if (count === 0) {
      UI.toast('No questions available for this sub-subject yet.', 'info');
      return false;
    }
    return true;
  },

  // ─── Config / data loaders ────────────────────────────────────────────────

  async _loadConfig() {
    const res = await fetch('config/modules.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async _buildCountMap(config, mod = null) {
    const mods = mod ? [mod] : (config.modules || []);
    const entries = [];
    for (const m of mods) {
      for (const et of (config.examTypes || [])) {
        for (const sub of (config.subjects || [])) {
          const subs = (m.subSubjects && m.subSubjects[et.id] && m.subSubjects[et.id][sub.id]) || [];
          for (const ss of subs) {
            entries.push({ key: `${m.id}|${et.id}|${sub.id}|${ss.id}`, m, et: et.id, sub: sub.id, ss: ss.id });
          }
        }
      }
    }
    const results = await Promise.all(
      entries.map(e => this._getQuestionCount(e.m, e.et, e.sub, e.ss).then(n => [e.key, n]))
    );
    return Object.fromEntries(results);
  },

  async _getQuestionCount(mod, examType, subject, subSubject) {
    const path = `data/${mod.dataPath}/${examType}/${subject}/${subSubject}.json`;
    try {
      const res = await fetch(path);
      if (!res.ok) return 0;
      const data = await res.json();
      return Array.isArray(data.questions) ? data.questions.length : 0;
    } catch { return 0; }
  },

  // Get total question count for wide exams using already-built countMap
  async _getWideQuestionCount(mod, examType, subject, scope, countMap) {
    if (scope === 'subject') {
      const ssList = (mod.subSubjects?.[examType]?.[subject]) || [];
      return ssList.reduce((acc, ss) => acc + (countMap[`${mod.id}|${examType}|${subject}|${ss.id}`] || 0), 0);
    } else if (scope === 'examtype') {
      return Object.entries(countMap)
        .filter(([k]) => k.startsWith(`${mod.id}|${examType}|`))
        .reduce((acc, [, n]) => acc + n, 0);
    }
    return 0;
  },

  _getModule(id) {
    return this.config?.modules?.find(m => m.id === id) ?? null;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());

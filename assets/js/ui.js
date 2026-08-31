/**
 * ============================================================
 * DEPT. Q. BANK — ui.js  (v3 — subject & exam-type wide exams)
 * ============================================================
 */

const UI = {

  get root() { return document.getElementById('app'); },

  setContent(html) {
    this.root.innerHTML = html;
    this.root.classList.remove('page-enter');
    void this.root.offsetWidth;
    this.root.classList.add('page-enter');
  },

  toast(message, type = 'info', duration = 2800) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerHTML = `<span class="toast__icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>${message}`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--visible'));
    setTimeout(() => { t.classList.remove('toast--visible'); setTimeout(() => t.remove(), 400); }, duration);
  },

  breadcrumb(crumbs) {
    if (!crumbs || crumbs.length === 0) return '';
    const items = crumbs.map((c, i) => {
      if (i === crumbs.length - 1) return `<span class="breadcrumb__current">${c.label}</span>`;
      return `<a class="breadcrumb__link" data-nav="${c.nav}" data-params='${JSON.stringify(c.params || {})}'>${c.label}</a>`;
    });
    return `<nav class="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb__home"><svg class="icon icon--sm" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
      ${items.join('<span class="breadcrumb__sep"><svg class="icon icon--sm" viewBox="0 0 24 24" style="opacity:.5"><polyline points="9 18 15 12 9 6"/></svg></span>')}
    </nav>`;
  },

  backBtn(nav, params = {}) {
    return `<button class="btn btn--ghost btn--sm back-btn" data-nav="${nav}" data-params='${JSON.stringify(params)}'>
      <svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> Back
    </button>`;
  },

  loading(message = 'Loading…') {
    this.setContent(`<div class="loading-screen">
      <div class="spinner"></div>
      <p class="loading-screen__text">${message}</p>
    </div>`);
  },

  emptyState(title, body, icon = '📭') {
    return `<div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <h3 class="empty-state__title">${title}</h3>
      <p class="empty-state__body">${body}</p>
    </div>`;
  },

  statCard(label, value, icon, color) {
    return `<div class="stat-card" style="--accent:${color}">
      <div class="stat-card__icon">${icon}</div>
      <div class="stat-card__value">${value}</div>
      <div class="stat-card__label">${label}</div>
    </div>`;
  },

  progressBar(percent, color = 'var(--primary)') {
    const p = Math.min(100, Math.max(0, percent));
    return `<div class="progress-bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar__fill" style="width:${p}%;background:${color}"></div>
    </div>`;
  },

  scoreRing(percent) {
    const r = 52, circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    const color  = percent >= 70 ? 'var(--success)' : percent >= 50 ? 'var(--warning)' : 'var(--danger)';
    return `<div class="score-ring">
      <svg viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 60 60)"
          style="transition:stroke-dashoffset 1s ease"/>
      </svg>
      <div class="score-ring__label">
        <span class="score-ring__value" style="color:${color}">${percent}%</span>
      </div>
    </div>`;
  },

  // ─── Dashboard ────────────────────────────────────────────────────────────

  renderDashboard(config, progressMap, stats, countMap = null) {
    const accuracy  = stats.totalAttempted > 0
      ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;
    const incorrect = Storage.getIncorrect();
    const flagged   = Storage.getFlagged();

    const statsHTML = [
      { label: 'Attempted',  value: stats.totalAttempted },
      { label: 'Correct',    value: stats.totalCorrect },
      { label: 'Incorrect',  value: stats.totalIncorrect },
      { label: 'Accuracy',   value: `${accuracy}%` },
      { label: 'Exams',      value: stats.completedExams },
      { label: 'Flagged',    value: flagged.length },
      { label: 'For Review', value: incorrect.length },
    ].map(s => `<div class="stat-pill"><div class="stat-pill__value">${s.value}</div><div class="stat-pill__label">${s.label}</div></div>`).join('');

    const modulesHTML = config.modules.filter(mod => {
      if (!countMap) return true;
      return Object.keys(countMap).some(k => k.startsWith(mod.id + '|') && countMap[k] > 0);
    }).map(mod => {
      const modProgress = this._calcModuleProgress(mod, config, progressMap);
      return `<div class="module-card" data-nav="module" data-params='${JSON.stringify({ moduleId: mod.id })}' style="--mod-color:${mod.color}" tabindex="0" role="button" aria-label="Open ${mod.title}">
        <div class="module-card__header">
          <span class="module-card__icon">${mod.icon}</span>
          <div class="module-card__meta">
            <h3 class="module-card__title">${mod.title}</h3>
            <p class="module-card__subtitle">${mod.fullTitle}</p>
          </div>
          <span class="module-card__arrow"><svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
        <div class="module-card__body">
          <div class="module-card__info">
            <span>${modProgress.setsCompleted}/${modProgress.totalSets} sets completed</span>
            <span>${modProgress.percent}%</span>
          </div>
          ${this.progressBar(modProgress.percent, mod.color)}
        </div>
      </div>`;
    }).join('');

    const reviewBtn = incorrect.length > 0
      ? `<button class="btn btn--danger review-btn" data-nav="review">
          <svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Review Incorrect
          <span class="badge badge--count">${incorrect.length}</span>
        </button>` : '';

    const flaggedBtn = flagged.length > 0
      ? `<button class="btn btn--ghost review-btn" data-nav="flagged-review" style="border-color:var(--success);color:var(--success)">
          <svg class="icon icon--sm" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Flagged
          <span class="badge" style="background:var(--success);color:#fff">${flagged.length}</span>
        </button>` : '';

    return `
    <div class="dashboard">
      <div class="dashboard__intro">
        <div>
          <h1 class="dashboard__greeting">Welcome back</h1>
          <p class="dashboard__subgreeting">ZNU medical students, the A⁺ is waiting...</p>
        </div>
        <div class="dashboard__actions">
          ${reviewBtn}
          ${flaggedBtn}
        </div>
      </div>
      <div class="stats-strip" style="margin-bottom:28px">${statsHTML}</div>
      <section class="section">
        <h2 class="section__title">Modules</h2>
        <div class="modules-grid">${modulesHTML}</div>
      </section>
      <footer class="dashboard__footer">
        <p>Made by <strong>Kareem Farouk</strong> · Questions by Department Heads</p>
        <p>Visit the <a href="https://harvest-programme.web.app/index.html" target="_blank" rel="noopener noreferrer" class="harvest-link">Harvest Programme</a> for exam simulation & more</p>
      </footer>
    </div>
    `;
  },

  // ─── Module page ──────────────────────────────────────────────────────────

  renderModule(mod, config, progressMap, countMap = null) {
    const examTypesHTML = config.examTypes.map(et => {
      const subjectsHTML = config.subjects.filter(sub => {
        if (!countMap) return true;
        const subSubs = (mod.subSubjects && mod.subSubjects[et.id] && mod.subSubjects[et.id][sub.id]) || [];
        return subSubs.some(ss => (countMap[`${mod.id}|${et.id}|${sub.id}|${ss.id}`] || 0) > 0);
      }).map(sub => {
        const subSubs   = (mod.subSubjects && mod.subSubjects[et.id] && mod.subSubjects[et.id][sub.id]) || [];
        const completed = subSubs.filter(ss => {
          const key = `${mod.id}|${et.id}|${sub.id}|${ss.id}`;
          return progressMap[key]?.completed;
        }).length;

        return `<div class="subject-card" data-nav="subject"
          data-params='${JSON.stringify({ moduleId: mod.id, examType: et.id, subject: sub.id })}'
          tabindex="0" role="button">
          <div class="subject-card__left">
            <span class="subject-card__icon" style="background:${sub.color}20;color:${sub.color}">${sub.icon}</span>
            <div>
              <div class="subject-card__name">${sub.label}</div>
              <div class="subject-card__score">${subSubs.length > 0 ? `${completed}/${subSubs.length} topics` : 'No topics yet'}</div>
            </div>
          </div>
          <div class="subject-card__right">
            ${completed === subSubs.length && subSubs.length > 0 ? `<span class="badge badge--success">Done</span>` : ''}
            <span class="subject-card__arrow"><svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
        </div>`;
      }).join('');

      if (!subjectsHTML) return '';

      // Total questions for this exam type
      const etTotalQ = countMap
        ? Object.entries(countMap)
            .filter(([k]) => k.startsWith(`${mod.id}|${et.id}|`))
            .reduce((acc, [, n]) => acc + n, 0)
        : null;

      const fullExamBtn = etTotalQ > 0
        ? `<button class="btn btn--primary wide-exam-btn"
            data-nav="wide-exam-start"
            data-params='${JSON.stringify({ moduleId: mod.id, examType: et.id, scope: 'examtype' })}'>
            Start Full ${et.label} <span class="badge badge--count">${etTotalQ} Q</span>
          </button>`
        : '';

      return `<div class="exam-type-section">
        <div class="exam-type-header" style="--et-color:${et.color}">
          <div class="exam-type-header__top">
            <div>
              <h3 class="exam-type-header__title">${et.label}</h3>
              <p class="exam-type-header__desc">${et.description}</p>
            </div>
            ${fullExamBtn}
          </div>
        </div>
        <div class="subjects-list">${subjectsHTML}</div>
      </div>`;
    }).join('');

    return `
    <div class="page module-page">
      ${this.backBtn('dashboard')}
      ${this.breadcrumb([
        { label: 'Dashboard', nav: 'dashboard' },
        { label: mod.title },
      ])}
      <header class="page__header" style="--mod-color:${mod.color}">
        <span class="page__icon">${mod.icon}</span>
        <div>
          <h1 class="page__title">${mod.title}</h1>
          <p class="page__subtitle">${mod.fullTitle}</p>
        </div>
      </header>
      ${examTypesHTML}
    </div>`;
  },

  // ─── Subject page — shows sub-subject cards + "Start Subject Exam" ────────

  renderSubject(mod, examType, subjectId, subSubjects, progressMap, config, countMap = null) {
    const sub = config.subjects.find(s => s.id === subjectId);
    const et  = config.examTypes.find(e => e.id === examType);

    const visibleSubSubs = subSubjects.filter(ss =>
      !countMap || (countMap[`${mod.id}|${examType}|${subjectId}|${ss.id}`] || 0) > 0
    );

    const totalSubjectQ = countMap
      ? visibleSubSubs.reduce((acc, ss) => acc + (countMap[`${mod.id}|${examType}|${subjectId}|${ss.id}`] || 0), 0)
      : 0;

    const subjectExamBtn = totalSubjectQ > 0
      ? `<button class="btn btn--primary wide-exam-btn" id="start-subject-exam-btn">
          Start Full ${sub.label} Exam <span class="badge badge--count">${totalSubjectQ} Q</span>
        </button>`
      : '';

    const content = visibleSubSubs.length === 0
      ? this.emptyState('No Topics Yet', `No questions added yet for ${sub.label} in ${mod.title}.`, sub.icon)
      : `${subjectExamBtn ? `<div class="wide-exam-cta">${subjectExamBtn}</div>` : ''}
         <div class="subsubjects-grid">
          ${visibleSubSubs.map(ss => {
            const prog = progressMap[`${mod.id}|${examType}|${subjectId}|${ss.id}`] || {};
            const pct  = prog.total ? Math.round((prog.correct / prog.total) * 100) : 0;
            const qCount = countMap ? (countMap[`${mod.id}|${examType}|${subjectId}|${ss.id}`] || 0) : '';
            return `<div class="subsubject-card" data-nav="subsubject"
              data-params='${JSON.stringify({ moduleId: mod.id, examType, subject: subjectId, subSubject: ss.id })}'
              tabindex="0" role="button">
              <div class="subsubject-card__icon">${ss.icon}</div>
              <div class="subsubject-card__name">${ss.label}</div>
              ${qCount ? `<div class="subsubject-card__qcount">${qCount} Q</div>` : ''}
              ${prog.completed
                ? `<div class="subsubject-card__score" style="color:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'}">${pct}%</div>
                   <span class="badge badge--success" style="font-size:.7rem">Done</span>`
                : `<div class="subsubject-card__score" style="color:var(--text-4)">Not attempted</div>`
              }
              <span class="subsubject-card__arrow">›</span>
            </div>`;
          }).join('')}
        </div>`;

    return `
    <div class="page subject-page">
      ${this.backBtn('module', { moduleId: mod.id })}
      ${this.breadcrumb([
        { label: 'Dashboard', nav: 'dashboard' },
        { label: mod.title, nav: 'module', params: { moduleId: mod.id } },
        { label: et.label, nav: 'module', params: { moduleId: mod.id } },
        { label: sub.label },
      ])}
      <header class="page__header" style="--mod-color:${sub.color}">
        <span class="page__icon">${sub.icon}</span>
        <div>
          <h1 class="page__title">${sub.label}</h1>
          <p class="page__subtitle">${mod.title} · ${et.label} — Choose a topic</p>
        </div>
      </header>
      ${content}
    </div>`;
  },

  // ─── Sub-subject page — exam start screen ────────────────────────────────

  renderSubSubject(mod, examType, subjectId, subSubjectId, questionCount, progress, config) {
    const sub    = config.subjects.find(s => s.id === subjectId);
    const et     = config.examTypes.find(e => e.id === examType);
    const subSubs = (mod.subSubjects && mod.subSubjects[examType] && mod.subSubjects[examType][subjectId]) || [];
    const ss     = subSubs.find(s => s.id === subSubjectId) || { label: subSubjectId, icon: '📄' };
    const pct    = progress && progress.total ? Math.round((progress.correct / progress.total) * 100) : 0;
    const noQ    = questionCount === 0;

    return `
    <div class="page subsubject-page">
      ${this.backBtn('subject', { moduleId: mod.id, examType, subject: subjectId })}
      ${this.breadcrumb([
        { label: 'Dashboard', nav: 'dashboard' },
        { label: mod.title, nav: 'module', params: { moduleId: mod.id } },
        { label: et.label, nav: 'module', params: { moduleId: mod.id } },
        { label: sub.label, nav: 'subject', params: { moduleId: mod.id, examType, subject: subjectId } },
        { label: ss.label },
      ])}
      <header class="page__header" style="--mod-color:${sub.color}">
        <span class="page__icon">${ss.icon}</span>
        <div>
          <h1 class="page__title">${ss.label}</h1>
          <p class="page__subtitle">${mod.title} · ${sub.label} · ${et.label}</p>
        </div>
      </header>

      ${noQ
        ? this.emptyState(
            'No Questions Yet',
            `Add questions to <code>data/${mod.dataPath}/${examType}/${subjectId}/${subSubjectId}.json</code> in your repo.`,
            ss.icon
          )
        : `<div class="subject-info-cards">
            <div class="info-card">
              <div class="info-card__label">Questions Available</div>
              <div class="info-card__value">${questionCount}</div>
            </div>
            ${progress ? `
            <div class="info-card">
              <div class="info-card__label">Last Score</div>
              <div class="info-card__value" style="color:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'}">${pct}%</div>
            </div>
            <div class="info-card">
              <div class="info-card__label">Last Attempt</div>
              <div class="info-card__value info-card__value--sm">${new Date(progress.lastAttempt).toLocaleDateString()}</div>
            </div>` : ''}
          </div>
          <div class="exam-options-card">
            <div class="exam-actions">
              <button class="btn btn--primary btn--lg" id="start-exam-btn">Start Exam <svg class="icon icon--sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
              ${progress ? `<button class="btn btn--ghost" id="retry-exam-btn"><svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Retry</button>` : ''}
            </div>
            <div class="exam-actions" style="margin-top:.5rem">
              <button class="btn btn--danger btn--sm" data-nav="scoped-review"
                data-params='${JSON.stringify({ moduleId: mod.id, examType, subject: subjectId, subSubject: subSubjectId, label: ss.label })}'>
                Incorrect (this topic)
              </button>
              <button class="btn btn--ghost btn--sm" data-nav="scoped-flagged"
                data-params='${JSON.stringify({ moduleId: mod.id, examType, subject: subjectId, subSubject: subSubjectId, label: ss.label })}'
                style="border-color:var(--success);color:var(--success)">
                Flagged (this topic)
              </button>
            </div>
          </div>`
      }
    </div>`;
  },

  // ─── NEW: Wide exam start page (subject-level or examtype-level) ──────────

  renderWideExamStart(mod, params, totalCount, config) {
    const et  = config.examTypes.find(e => e.id === params.examType);
    const isSubjectScope = params.scope === 'subject';
    const sub = isSubjectScope ? config.subjects.find(s => s.id === params.subject) : null;

    const icon     = isSubjectScope ? sub.icon : mod.icon; // kept as data identity
    const title    = isSubjectScope ? `${sub.label} — Full Exam` : `${et.label} — Full Exam`;
    const subtitle = isSubjectScope
      ? `${mod.title} · ${et.label} · All ${sub.label} Topics`
      : `${mod.title} · All Subjects`;
    const color    = isSubjectScope ? sub.color : mod.color;

    const backNav    = isSubjectScope ? 'subject' : 'module';
    const backParams = isSubjectScope
      ? { moduleId: mod.id, examType: params.examType, subject: params.subject }
      : { moduleId: mod.id };

    const noQ = totalCount === 0;

    // Build topic breakdown
    let breakdownHTML = '';
    if (isSubjectScope) {
      const ssList = (mod.subSubjects?.[params.examType]?.[params.subject]) || [];
      breakdownHTML = ssList.map(ss => `
        <div class="wide-breakdown-item">
          <span>${ss.icon} ${ss.label}</span>
        </div>`).join('');
    } else {
      breakdownHTML = config.subjects.map(sub => {
        const ssList = (mod.subSubjects?.[params.examType]?.[sub.id]) || [];
        if (ssList.length === 0) return '';
        return `<div class="wide-breakdown-item">
          <span style="color:${sub.color}">${sub.icon} ${sub.label}</span>
          <span class="wide-breakdown-count">${ssList.length} topics</span>
        </div>`;
      }).join('');
    }

    return `
    <div class="page wide-exam-start-page">
      ${this.backBtn(backNav, backParams)}
      ${this.breadcrumb([
        { label: 'Dashboard', nav: 'dashboard' },
        { label: mod.title, nav: 'module', params: { moduleId: mod.id } },
        ...(isSubjectScope ? [
          { label: et.label, nav: 'module', params: { moduleId: mod.id } },
          { label: sub.label, nav: 'subject', params: { moduleId: mod.id, examType: params.examType, subject: params.subject } },
        ] : [
          { label: et.label, nav: 'module', params: { moduleId: mod.id } },
        ]),
        { label: 'Full Exam' },
      ])}
      <header class="page__header" style="--mod-color:${color}">
        <span class="page__icon">${icon}</span>
        <div>
          <h1 class="page__title">${title}</h1>
          <p class="page__subtitle">${subtitle}</p>
        </div>
      </header>

      ${noQ
        ? this.emptyState('No Questions Available', 'No questions have been added to this section yet.', icon)
        : `<div class="subject-info-cards">
            <div class="info-card">
              <div class="info-card__label">Total Questions</div>
              <div class="info-card__value">${totalCount}</div>
            </div>
            <div class="info-card">
              <div class="info-card__label">Question Order</div>
              <div class="info-card__value info-card__value--sm">Randomized</div>
            </div>
            <div class="info-card">
              <div class="info-card__label">Feedback</div>
              <div class="info-card__value info-card__value--sm">Immediate</div>
            </div>
          </div>

          <div class="wide-exam-breakdown">
            <h3 class="wide-exam-breakdown__title">Covered Topics</h3>
            <div class="wide-breakdown-grid">${breakdownHTML}</div>
          </div>

          <div class="exam-options-card">
            <p class="wide-exam-note">Questions from all topics are shuffled together into one randomized exam.</p>
            <div class="exam-actions">
              <button class="btn btn--primary btn--lg" id="start-wide-exam-btn"><svg class="icon icon--sm" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> 
                Start Exam (${totalCount} Q) <svg class="icon icon--sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>`
      }
    </div>`;
  },

  // ─── Exam interface ───────────────────────────────────────────────────────

  renderExam(engine, config) {
    const q        = engine.getCurrent();
    const idx      = engine.state.currentIndex;
    const total    = engine.questions.length;
    const et       = config.examTypes.find(e => e.id === engine.config.examType);
    const answered  = engine.getCurrentAnswer();
    const isFlagged = engine.isFlagged(idx);
    const progress  = engine.getProgress();

    // Wide exam vs single sub-subject
    const isWide = !!engine.config.scope;
    let sidebarTitle, sidebarSub;

    if (isWide) {
      const modObj = config.modules.find(m => m.id === engine.config.module);
      if (engine.config.scope === 'subject') {
        const sub = config.subjects.find(s => s.id === engine.config.subject);
        sidebarTitle = `${sub?.icon} ${sub?.label}`;
        sidebarSub   = `${modObj?.shortTitle} · ${et?.label} · All Topics`;
      } else {
        sidebarTitle = `${modObj?.icon} ${modObj?.shortTitle}`;
        sidebarSub   = `${et?.label} · All Subjects`;
      }
    } else {
      const sub   = config.subjects.find(s => s.id === engine.config.subject);
      const subSubs = (config.modules.find(m => m.id === engine.config.module)?.subSubjects?.[engine.config.examType]?.[engine.config.subject]) || [];
      const ss    = subSubs.find(s => s.id === engine.config.subSubject) || { label: engine.config.subSubject, icon: '📄' };
      sidebarTitle = `${ss.icon} ${ss.label}`;
      sidebarSub   = `${sub?.icon} ${sub?.label} · ${et?.label}`;
    }

    // Show topic badge for wide exams
    const topicBadge = (isWide && q._subSubjectLabel)
      ? `<div class="exam-question-topic">${q._subSubjectLabel}</div>`
      : '';

    const paletteHTML = engine.questions.map((_, i) => {
      let cls = 'palette-btn';
      if (i === idx)                 cls += ' palette-btn--current';
      else if (engine.isAnswered(i)) cls += ' palette-btn--answered';
      if (engine.isFlagged(i))       cls += ' palette-btn--flagged';
      return `<button class="${cls}" data-goto="${i}" title="Question ${i + 1}">${i + 1}</button>`;
    }).join('');

    const optionsHTML = q.options.map((opt, i) => {
      let cls = 'option';
      if (answered !== undefined) {
        if (i === q.answer)      cls += ' option--correct';
        else if (i === answered) cls += ' option--wrong';
      }
      return `<button class="${cls}" data-option="${i}" ${answered !== undefined ? 'disabled' : ''}>
        <span class="option__letter">${['A','B','C','D','E','F','G','H'][i]}</span>
        <span class="option__text">${opt}</span>
      </button>`;
    }).join('');

    const explanationHTML = (answered !== undefined && engine.config.immediateFeedback)
      ? `<div class="explanation-box ${answered === q.answer ? 'explanation-box--correct' : 'explanation-box--wrong'}">
          <div class="explanation-box__header">
            ${answered === q.answer ? '✅ Correct!' : `❌ Incorrect — Correct answer: <strong>${['A','B','C','D','E','F','G','H'][q.answer]}</strong>`}
          </div>
          ${isWide && q._subSubjectLabel ? `<div class="explanation-box__topic">${q._subSubjectLabel}</div>` : ''}
          <p class="explanation-box__text">${q.explanation}</p>
        </div>` : '';

    // Back nav for wide exams goes to the right place
    const backParams = isWide
      ? (engine.config.scope === 'subject'
          ? { moduleId: engine.config.module, examType: engine.config.examType, subject: engine.config.subject }
          : { moduleId: engine.config.module })
      : { moduleId: engine.config.module, examType: engine.config.examType, subject: engine.config.subject };
    const backNav = isWide
      ? (engine.config.scope === 'subject' ? 'subject' : 'module')
      : 'subject';

    const progressPct = total ? Math.round((progress.answered / total) * 100) : 0;
    const isLastQuestion = idx === total - 1;

    return `
    <div class="exam-layout">
      <aside class="exam-sidebar">
        <div class="exam-sidebar__header">
          <div class="exam-sidebar__title">${sidebarTitle}</div>
          <div class="exam-sidebar__sub">${sidebarSub}</div>
        </div>
        <div class="exam-progress-info">
          <span>${progress.answered}/${total} answered</span>
          ${progress.flagged > 0 ? `<span>🚩 ${progress.flagged}</span>` : ''}
        </div>
        ${this.progressBar(progressPct)}
        <div class="palette">${paletteHTML}</div>
        <div class="palette-legend">
          <span class="legend-item legend-item--current">Current</span>
          <span class="legend-item legend-item--answered">Answered</span>
          <span class="legend-item legend-item--flagged">Flagged</span>
        </div>
        <button class="btn btn--ghost btn--sm submit-exam-trigger" id="submit-exam-btn">
          <svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Submit Exam
        </button>
      </aside>

      <main class="exam-main">
        <div class="exam-topbar">
          ${this.backBtn(backNav, backParams)}
          <div class="exam-counter">Question <strong>${idx + 1}</strong> of <strong>${total}</strong></div>
          <button class="flag-btn ${isFlagged ? 'flag-btn--active' : ''}" id="flag-btn" title="${isFlagged ? 'Unflag' : 'Flag'} question">
            <svg class="icon icon--sm" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            <span class="flag-btn__label">${isFlagged ? 'Flagged' : 'Flag'}</span>
          </button>
        </div>
        <div class="question-card">
          <div class="question-card__number">Q${idx + 1}</div>
          ${topicBadge}
          <p class="question-card__text">${q.question}</p>
        </div>
        <div class="options-list">${optionsHTML}</div>
        ${explanationHTML}
        <div class="exam-nav">
          <button class="btn btn--ghost" id="prev-btn" ${idx === 0 ? 'disabled' : ''}>← Previous</button>
          ${isLastQuestion
            ? `<button class="btn btn--primary submit-exam-trigger" id="finish-exam-btn">Finish Exam <svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>`
            : `<button class="btn btn--primary" id="next-btn">Next →</button>`}
        </div>
      </main>
    </div>`;
  },

  // ─── Results page ─────────────────────────────────────────────────────────

  renderResults(results, config) {
    const et    = config.examTypes.find(e => e.id === results.config.examType);
    const mod   = config.modules.find(m => m.id === results.config.module);
    const isWide = !!results.config.scope;

    let titleLabel, subtitleLabel, backNav, backParams, crumbs;
    if (isWide) {
      if (results.config.scope === 'subject') {
        const sub = config.subjects.find(s => s.id === results.config.subject);
        titleLabel    = `${sub?.label} — Full Exam`;
        subtitleLabel = `${mod?.title} · ${et?.label}`;
        backNav       = 'subject';
        backParams    = { moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject };
        crumbs        = [
          { label: 'Dashboard', nav: 'dashboard' },
          { label: mod?.title, nav: 'module', params: { moduleId: results.config.module } },
          { label: et?.label, nav: 'module', params: { moduleId: results.config.module } },
          { label: sub?.label, nav: 'subject', params: backParams },
          { label: 'Results' },
        ];
      } else {
        titleLabel    = `${et?.label} — Full Exam`;
        subtitleLabel = mod?.title;
        backNav       = 'module';
        backParams    = { moduleId: results.config.module };
        crumbs        = [
          { label: 'Dashboard', nav: 'dashboard' },
          { label: mod?.title, nav: 'module', params: { moduleId: results.config.module } },
          { label: et?.label, nav: 'module', params: { moduleId: results.config.module } },
          { label: 'Results' },
        ];
      }
    } else {
      const sub     = config.subjects.find(s => s.id === results.config.subject);
      const subSubs = (mod?.subSubjects?.[results.config.examType]?.[results.config.subject]) || [];
      const ss      = subSubs.find(s => s.id === results.config.subSubject) || { label: results.config.subSubject };
      titleLabel    = ss.label;
      subtitleLabel = `${sub?.label} · ${et?.label}`;
      backNav       = 'subsubject';
      backParams    = { moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject, subSubject: results.config.subSubject };
      crumbs        = [
        { label: 'Dashboard', nav: 'dashboard' },
        { label: results.config.module, nav: 'module', params: { moduleId: results.config.module } },
        { label: et?.label, nav: 'module', params: { moduleId: results.config.module } },
        { label: sub?.label, nav: 'subject', params: { moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject } },
        { label: ss.label, nav: 'subsubject', params: backParams },
        { label: 'Results' },
      ];
    }

    const reviewHTML = results.perQuestion.map((pq, i) => {
      const cls    = pq.correct ? 'result-item--correct' : pq.answered ? 'result-item--wrong' : 'result-item--skipped';
      const status = pq.correct ? '✅' : pq.answered ? '❌' : '—';
      // For wide exams show topic badge
      const topicTag = (isWide && pq._subSubjectLabel)
        ? `<span class="result-item__topic">${pq._subSubjectLabel}</span>` : '';
      return `<div class="result-item ${cls}">
        <div class="result-item__header">
          <span class="result-item__num">${status} Q${i + 1}</span>
          ${topicTag}
          ${pq.flagged ? '<span class="result-item__flag">🚩</span>' : ''}
        </div>
        <p class="result-item__question">${pq.question}</p>
        <div class="result-item__answers">
          ${pq.answered ? `<span class="result-item__user ${pq.correct ? 'result-item__user--correct' : 'result-item__user--wrong'}">Your answer: ${['A','B','C','D','E','F','G','H'][pq.userAnswer]}. ${pq.options[pq.userAnswer]}</span>` : '<span class="result-item__skipped">Not answered</span>'}
          ${!pq.correct ? `<span class="result-item__correct">Correct: ${['A','B','C','D','E','F','G','H'][pq.answer]}. ${pq.options[pq.answer]}</span>` : ''}
        </div>
        <div class="result-item__explanation">${pq.explanation}</div>
      </div>`;
    }).join('');

    return `
    <div class="page results-page">
      ${this.backBtn(backNav, backParams)}
      ${this.breadcrumb(crumbs)}
      <div class="results-summary">
        <div class="results-summary__ring">${this.scoreRing(results.score)}</div>
        <div class="results-summary__stats">
          <h2 class="results-summary__title">Exam Complete</h2>
          <p class="results-summary__subtitle">${titleLabel} · ${subtitleLabel}</p>
          <div class="results-summary__grid">
            ${this.statCard('Correct',   results.correct,    '✅', 'var(--success)')}
            ${this.statCard('Incorrect', results.incorrect,  '❌', 'var(--danger)')}
            ${this.statCard('Skipped',   results.unanswered, '—',  '#6b7280')}
            ${this.statCard('Time',      ExamEngine.formatTime(results.timeSec), '⏱', 'var(--info)')}
          </div>
        </div>
      </div>
      <div class="results-actions">
        <button class="btn btn--ghost" id="retry-all-btn"
          data-module="${results.config.module}"
          data-exam-type="${results.config.examType}"
          data-subject="${results.config.subject || ''}"
          data-sub-subject="${results.config.subSubject || ''}"
          data-scope="${results.config.scope || ''}"><svg class="icon icon--sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Retry Exam</button>
        <button class="btn btn--ghost" data-nav="dashboard"><svg class="icon icon--sm" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> Dashboard</button>
      </div>
      <section class="section">
        <h2 class="section__title">Question Review</h2>
        <div class="results-list">${reviewHTML}</div>
      </section>
    </div>`;
  },

  // ─── Review page ──────────────────────────────────────────────────────────

  renderReview(incorrectList, config, filter = null) {
    const backPage  = filter ? 'subsubject' : 'dashboard';
    const backParams = filter ? { moduleId: filter.moduleId, examType: filter.examType, subject: filter.subject, subSubject: filter.subSubject } : {};
    const title     = filter ? `Incorrect — ${filter.label}` : 'Review Incorrect Questions';
    const crumbs    = filter
      ? [{ label: 'Dashboard', nav: 'dashboard' }, { label: filter.label, nav: 'subsubject', params: backParams }, { label: 'Incorrect Questions' }]
      : [{ label: 'Dashboard', nav: 'dashboard' }, { label: 'Review' }];

    if (incorrectList.length === 0) {
      return `<div class="page">
        ${this.backBtn(backPage, backParams)}
        ${this.breadcrumb(crumbs)}
        ${this.emptyState('Nothing to Review', 'Complete some exams and incorrect answers will appear here.', '🎉')}
      </div>`;
    }

    const listHTML = incorrectList.map(q => {
      const sub = config.subjects.find(s => s.id === q.subject);
      const et  = config.examTypes.find(e => e.id === q.examType);
      return `<div class="review-item" data-uid="${q.uid}">
        <div class="review-item__meta">
          <span class="badge" style="background:${sub?.color}20;color:${sub?.color}">${sub?.icon} ${sub?.label}</span>
          <span class="badge badge--ghost">${q.module}</span>
          ${q.subSubjectLabel ? `<span class="badge badge--ghost">${q.subSubjectLabel}</span>` : ''}
          <span class="badge badge--ghost">${et?.label}</span>
        </div>
        <p class="review-item__question">${q.question}</p>
        <div class="review-item__options">
          ${q.options.map((opt, i) => `<span class="review-opt ${i === q.answer ? 'review-opt--correct' : i === q.userAnswer ? 'review-opt--wrong' : ''}">${['A','B','C','D','E','F','G','H'][i]}. ${opt}</span>`).join('')}
        </div>
        <div class="review-item__explanation">${q.explanation}</div>
        <button class="btn btn--ghost btn--sm review-item__remove" data-remove-uid="${q.uid}">Mark as Mastered</button>
      </div>`;
    }).join('');

    const filtersHTML = filter ? '' : `
      <div class="review-filters">
        <input type="text" id="review-search" class="input" placeholder="Search questions…">
        <select id="review-filter-module" class="select">
          <option value="">All Modules</option>
          ${config.modules.map(m => `<option value="${m.id}">${m.title}</option>`).join('')}
        </select>
        <select id="review-filter-subject" class="select">
          <option value="">All Subjects</option>
          ${config.subjects.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
        </select>
        <button class="btn btn--danger btn--sm" id="clear-all-review">Clear</button>
      </div>`;

    return `
    <div class="page review-page">
      ${this.backBtn(backPage, backParams)}
      ${this.breadcrumb(crumbs)}
      <header class="page__header" style="--mod-color:var(--danger)">
        <span class="page__icon"><svg class="icon icon--lg" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></span>
        <div>
          <h1 class="page__title">${title}</h1>
          <p class="page__subtitle">${incorrectList.length} questions pending review</p>
        </div>
      </header>
      ${filtersHTML}
      <div class="review-list" id="review-list">${listHTML}</div>
    </div>`;
  },

  // ─── Flagged review page ─────────────────────────────────────────────────

  renderFlagged(flaggedList, config, filter = null) {
    const backPage   = filter ? 'subsubject' : 'dashboard';
    const backParams = filter ? { moduleId: filter.moduleId, examType: filter.examType, subject: filter.subject, subSubject: filter.subSubject } : {};
    const title      = filter ? `Flagged — ${filter.label}` : 'Flagged Questions';
    const crumbs     = filter
      ? [{ label: 'Dashboard', nav: 'dashboard' }, { label: filter.label, nav: 'subsubject', params: backParams }, { label: 'Flagged Questions' }]
      : [{ label: 'Dashboard', nav: 'dashboard' }, { label: 'Flagged Questions' }];

    if (flaggedList.length === 0) {
      return `<div class="page">
        ${this.backBtn(backPage, backParams)}
        ${this.breadcrumb(crumbs)}
        ${this.emptyState('No Flagged Questions', 'Flag questions during an exam to review them later.', '🚩')}
      </div>`;
    }

    const listHTML = flaggedList.map(q => {
      const sub = config.subjects.find(s => s.id === q.subject);
      const et  = config.examTypes.find(e => e.id === q.examType);
      return `<div class="review-item" data-uid="${q.uid}">
        <div class="review-item__meta">
          <span class="badge" style="background:${sub?.color}20;color:${sub?.color}">${sub?.icon} ${sub?.label}</span>
          <span class="badge badge--ghost">${q.module}</span>
          ${q.subSubjectLabel ? `<span class="badge badge--ghost">${q.subSubjectLabel}</span>` : ''}
          <span class="badge badge--ghost">${et?.label}</span>
          <span class="badge" style="background:var(--success-bg);color:var(--success)">🚩 Flagged</span>
        </div>
        <p class="review-item__question">${q.question}</p>
        <div class="review-item__options">
          ${q.options.map((opt, i) => `<span class="review-opt ${i === q.answer ? 'review-opt--correct' : ''}">${['A','B','C','D','E','F','G','H'][i]}. ${opt}</span>`).join('')}
        </div>
        <div class="review-item__explanation">${q.explanation}</div>
        <button class="btn btn--ghost btn--sm review-item__remove" data-remove-uid="${q.uid}">Remove Flag</button>
      </div>`;
    }).join('');

    const flagFiltersHTML = filter ? '' : `
      <div class="review-filters">
        <input type="text" id="flagged-search" class="input" placeholder="Search questions…">
        <select id="flagged-filter-module" class="select">
          <option value="">All Modules</option>
          ${config.modules.map(m => `<option value="${m.id}">${m.title}</option>`).join('')}
        </select>
        <select id="flagged-filter-subject" class="select">
          <option value="">All Subjects</option>
          ${config.subjects.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
        </select>
        <button class="btn btn--danger btn--sm" id="clear-all-flagged">Clear All Flags</button>
      </div>`;

    return `
    <div class="page review-page">
      ${this.backBtn(backPage, backParams)}
      ${this.breadcrumb(crumbs)}
      <header class="page__header" style="--mod-color:var(--success)">
        <span class="page__icon"><svg class="icon icon--lg" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></span>
        <div>
          <h1 class="page__title">${title}</h1>
          <p class="page__subtitle">${flaggedList.length} flagged for review</p>
        </div>
      </header>
      ${flagFiltersHTML}
      <div class="review-list" id="flagged-list">${listHTML}</div>
    </div>`;
  },

  // ─── Search page ──────────────────────────────────────────────────────────

  renderSearch(config) {
    return `
    <div class="page search-page">
      ${this.backBtn('dashboard')}
      ${this.breadcrumb([{ label: 'Dashboard', nav: 'dashboard' }, { label: 'Search' }])}
      <header class="page__header" style="--mod-color:var(--info)">
        <span class="page__icon"><svg class="icon icon--lg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
        <div>
          <h1 class="page__title">Search</h1>
          <p class="page__subtitle">Search across all subjects and modules</p>
        </div>
      </header>
      <div class="search-bar-wrap">
        <input type="text" id="global-search" class="input input--lg" placeholder="Search questions, subjects, modules…" autofocus>
      </div>
      <div id="search-results" class="search-results">
        <p class="search-hint">Start typing to search across all available questions.</p>
      </div>
    </div>`;
  },

  // ─── Internal helpers ─────────────────────────────────────────────────────

  _calcModuleProgress(mod, config, progressMap) {
    const subSubjects = mod.subSubjects || {};
    let completed  = 0;
    let total      = 0;
    config.examTypes.forEach(et => {
      config.subjects.forEach(sub => {
        const list = (subSubjects[et.id] && subSubjects[et.id][sub.id]) || [];
        total += list.length;
        list.forEach(ss => {
          const key = `${mod.id}|${et.id}|${sub.id}|${ss.id}`;
          if (progressMap[key]?.completed) completed++;
        });
      });
    });
    return {
      setsCompleted: completed,
      totalSets:     total,
      percent:       total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },
};

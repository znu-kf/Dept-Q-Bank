/**
 * ============================================================
 * DEPT. Q. BANK — ui.js  (v2 — sub-subject support)
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

  confetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const COLORS = ['#1B3A6B','#4A9E8E','#c87f0a','#c0392b','#2563eb','#7c3aed'];
    const particles = Array.from({ length: 60 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height * 0.4,
      vx:   (Math.random() - 0.5) * 6,
      vy:   (Math.random() - 0.5) * 4 - 3,
      size: Math.random() * 8 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot:  Math.random() * 360,
      rv:   (Math.random() - 0.5) * 8,
      alpha: 1,
    }));
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.18;
        p.rot += p.rv;
        p.alpha -= 0.012;
        if (p.alpha <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      if (alive) frame = requestAnimationFrame(draw);
      else canvas.remove();
    };
    frame = requestAnimationFrame(draw);
    setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 3500);
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
      <span class="breadcrumb__home">🏠</span>
      ${items.join('<span class="breadcrumb__sep">›</span>')}
    </nav>`;
  },

  backBtn(nav, params = {}) {
    return `<button class="btn btn--ghost btn--sm back-btn" data-nav="${nav}" data-params='${JSON.stringify(params)}'>
      <span class="btn__icon">←</span> Back
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
    const color  = percent >= 70 ? '#4A9E8E' : percent >= 50 ? '#d97706' : '#dc2626';
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

  renderDashboard(config, progressMap, stats) {
    const accuracy  = stats.totalAttempted > 0
      ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;
    const incorrect = Storage.getIncorrect();
    const flagged   = Storage.getFlagged();
    
    const fmtTime = (sec) => {
      if (!sec || sec < 60) return `${sec || 0}s`;
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const statsHTML = [
      this.statCard('Questions Solved', stats.totalAttempted,  '📚', '#2563eb'),
      this.statCard('Accuracy',         `${accuracy}%`,        '🎯', '#4A9E8E'),
      this.statCard('Study Time',       fmtTime(stats.totalTimeSpentSec), '⏱️', '#1B3A6B'),
    ].join('');

    const modulesHTML = config.modules.map(mod => {
      const modProgress = this._calcModuleProgress(mod, config, progressMap);
      return `<div class="module-card" data-nav="module" data-params='${JSON.stringify({ moduleId: mod.id })}' style="--mod-color:${mod.color}" tabindex="0" role="button" aria-label="Open ${mod.title}">
        <div class="module-card__header">
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="module-card__icon">${mod.icon}</span>
            <div class="module-card__meta">
              <h3 class="module-card__title">${mod.title}</h3>
              <p class="module-card__subtitle">${mod.fullTitle}</p>
            </div>
          </div>
        </div>
        <div class="module-card__body" style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${this._moduleRing(modProgress.percent, mod.color)}
            <div style="display:flex; flex-direction:column; line-height:1.2;">
              <span style="font-size:0.85rem; font-weight:600; color:var(--text-2);">${modProgress.setsCompleted} / ${modProgress.totalSets} Sets</span>
              <span style="font-size:0.75rem; color:var(--text-3); font-weight:500;">${modProgress.percent}% Average</span>
            </div>
          </div>
          <span style="font-size:0.85rem; font-weight:700; color:var(--mod-color);">${modProgress.setsCompleted > 0 ? 'Continue' : 'Start'} →</span>
        </div>
      </div>`;
    }).join('');

    const reviewBtn = incorrect.length > 0
      ? `<button class="btn btn--danger review-btn" data-nav="review">
          <span>🔄</span> Review Incorrect Questions
          <span class="badge">${incorrect.length}</span>
        </button>` : '';

    const flaggedBtn = flagged.length > 0
      ? `<button class="btn btn--ghost review-btn" data-nav="flagged-review" style="border-color:#4A9E8E;color:#4A9E8E">
          <span>🚩</span> Review Flagged Questions
          <span class="badge" style="background:#4A9E8E">${flagged.length}</span>
        </button>` : '';

    const saved = Storage.loadCurrentExam();
    let resumeBanner = '';
    if (saved && saved.config && !saved.state?.submitted) {
      const answered = Object.keys(saved.state?.answers || {}).length;
      const total    = (saved.questions || []).length;
      const modObj   = config.modules.find(m => m.id === saved.config.module);
      const label    = saved.config.subSubjectLabel || saved.config.subSubject || saved.config.subject || 'Exam';
      
      resumeBanner = `
        <div class="resume-banner" data-nav="exam" data-params='{"resume":true}' tabindex="0" role="button">
          <div class="resume-banner__left">
            <div class="resume-banner__icon" style="color:${modObj?.color}">▶</div>
            <div>
              <div class="resume-banner__title">Continue Exam</div>
              <div class="resume-banner__sub">${modObj?.title} · ${label}</div>
            </div>
          </div>
          <div class="resume-banner__right">
            <span class="resume-banner__progress">Question ${answered + 1} / ${total}</span>
            <span class="resume-banner__cta" style="color:${modObj?.color}">Resume →</span>
          </div>
        </div>
      `;
    }

    return `
    <div class="dashboard">
      ${resumeBanner}
      <header class="dashboard__header">
        <div class="dashboard__title-wrap">
          <img src="assets/images/logo.svg" alt="${config.siteTitle}" class="dashboard__logo" />
        </div>
        <div class="dashboard__actions">
          ${reviewBtn}
          ${flaggedBtn}
          <button class="btn btn--ghost btn--sm" data-nav="search" title="Search questions">🔍 Search</button>
          <button class="dark-toggle" id="dark-toggle-btn" title="Toggle dark mode" aria-label="Toggle dark mode"></button>
        </div>
      </header>
      <section class="section">
        <h2 class="section__title">Overview</h2>
        <div class="stats-grid">${statsHTML}</div>
      </section>
      <section class="section">
        <h2 class="section__title">Modules</h2>
        <div class="modules-grid">${modulesHTML}</div>
      </section>
      <footer class="dashboard__footer">
        <p>Made by <strong>Kareem Farouk</strong> · Questions by Department Heads</p>
      </footer>
    </div>`;
  },

  // ─── Module page ──────────────────────────────────────────────────────────

  renderModule(mod, config, progressMap) {
    const examTypesHTML = config.examTypes.map(et => {
      const subjectsHTML = config.subjects.map(sub => {
        // Count total sub-subjects and completed ones for this combo
        const subSubs   = (mod.subSubjects && mod.subSubjects[et.id] && mod.subSubjects[et.id][sub.id]) || [];
        const completed = subSubs.filter(ss => {
          const key = `${mod.id}|${et.id}|${sub.id}|${ss.id}`;
          return progressMap[key]?.completed;
        }).length;
        const pct = subSubs.length > 0 ? Math.round((completed / subSubs.length) * 100) : 0;

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
            <span class="subject-card__arrow">›</span>
          </div>
        </div>`;
      }).join('');

      return `<div class="exam-type-section">
        <div class="exam-type-header" style="--et-color:${et.color}">
          <h3 class="exam-type-header__title">${et.label}</h3>
          <p class="exam-type-header__desc">${et.description}</p>
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

  // ─── Subject page — shows sub-subject cards ───────────────────────────────

  renderSubject(mod, examType, subjectId, subSubjects, progressMap, config) {
    const sub = config.subjects.find(s => s.id === subjectId);
    const et  = config.examTypes.find(e => e.id === examType);

    const content = subSubjects.length === 0
      ? this.emptyState('No Topics Yet', `No sub-subjects defined for ${sub.label} in ${mod.title}. Add them to modules.json.`, sub.icon)
      : `<div class="subsubjects-grid">
          ${subSubjects.map(ss => {
            const prog = progressMap[`${mod.id}|${examType}|${subjectId}|${ss.id}`] || {};
            const pct  = prog.total ? Math.round((prog.correct / prog.total) * 100) : 0;
            return `<div class="subsubject-card" data-nav="subsubject"
              data-params='${JSON.stringify({ moduleId: mod.id, examType, subject: subjectId, subSubject: ss.id })}'
              tabindex="0" role="button">
              <div class="subsubject-card__icon">${ss.icon}</div>
              <div class="subsubject-card__name">${ss.label}</div>
              ${prog.completed
                ? `<div class="subsubject-card__score" style="color:${pct >= 70 ? '#4A9E8E' : pct >= 50 ? '#d97706' : '#dc2626'}">${pct}%</div>
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
    <div class="page subject-page">
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
              <div class="info-card__value" style="color:${pct >= 70 ? '#4A9E8E' : pct >= 50 ? '#d97706' : '#dc2626'}">${pct}%</div>
            </div>
            <div class="info-card">
              <div class="info-card__label">Last Attempt</div>
              <div class="info-card__value info-card__value--sm">${new Date(progress.lastAttempt).toLocaleDateString()}</div>
            </div>` : ''}
          </div>
          <div class="exam-options-card">
            <div class="exam-actions">
              <button class="btn btn--primary btn--lg" id="start-exam-btn">Start Exam →</button>
              ${progress ? `<button class="btn btn--ghost" id="retry-exam-btn">Retry Exam</button>` : ''}
            </div>
            <div class="exam-actions" style="margin-top:.5rem">
              <button class="btn btn--danger btn--sm" data-nav="scoped-review"
                data-params='${JSON.stringify({ moduleId: mod.id, examType, subject: subjectId, subSubject: subSubjectId, label: ss.label })}'>
                🔄 Incorrect (this topic)
              </button>
              <button class="btn btn--ghost btn--sm" data-nav="scoped-flagged"
                data-params='${JSON.stringify({ moduleId: mod.id, examType, subject: subjectId, subSubject: subSubjectId, label: ss.label })}'
                style="border-color:#4A9E8E;color:#4A9E8E">
                🚩 Flagged (this topic)
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
    const sub      = config.subjects.find(s => s.id === engine.config.subject);
    const et       = config.examTypes.find(e => e.id === engine.config.examType);
    const answered  = engine.getCurrentAnswer();
    const isFlagged = engine.isFlagged(idx);
    const progress  = engine.getProgress();
    const subSubs   = (config.modules.find(m => m.id === engine.config.module)?.subSubjects?.[engine.config.examType]?.[engine.config.subject]) || [];
    const ss        = subSubs.find(s => s.id === engine.config.subSubject) || { label: engine.config.subSubject, icon: '📄' };

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
        <span class="option__letter">${['A','B','C','D'][i]}</span>
        <span class="option__text">${opt}</span>
      </button>`;
    }).join('');

    const explanationHTML = (answered !== undefined && engine.config.immediateFeedback)
      ? `<div class="explanation-box ${answered === q.answer ? 'explanation-box--correct' : 'explanation-box--wrong'}">
          <div class="explanation-box__header">
            ${answered === q.answer ? '✅ Correct!' : `❌ Incorrect — Correct answer: <strong>${['A','B','C','D'][q.answer]}</strong>`}
          </div>
          <p class="explanation-box__text">${q.explanation}</p>
        </div>` : '';

    return `
    <div class="exam-layout">
      <aside class="exam-sidebar">
        <div class="exam-sidebar__header">
          <div class="exam-sidebar__title">${ss.icon} ${ss.label}</div>
          <div class="exam-sidebar__sub">${sub.icon} ${sub.label} · ${et.label}</div>
        </div>
        <div class="exam-progress-info">
          <span>${progress.answered}/${total} answered</span>
          ${progress.flagged > 0 ? `<span>🚩 ${progress.flagged}</span>` : ''}
        </div>
        <div class="palette">${paletteHTML}</div>
        <div class="palette-legend">
          <span class="legend-item legend-item--current">Current</span>
          <span class="legend-item legend-item--answered">Answered</span>
          <span class="legend-item legend-item--flagged">Flagged</span>
        </div>
        <button class="btn btn--danger btn--sm submit-exam-btn" id="submit-exam-btn">Submit Exam</button>
      </aside>

      <main class="exam-main">
        <div class="exam-topbar">
          ${this.backBtn('subject', { moduleId: engine.config.module, examType: engine.config.examType, subject: engine.config.subject })}
          <div class="exam-counter">Question <strong>${idx + 1}</strong> of <strong>${total}</strong></div>
          <button class="flag-btn ${isFlagged ? 'flag-btn--active' : ''}" id="flag-btn" title="${isFlagged ? 'Unflag' : 'Flag'} question">
            🚩 ${isFlagged ? 'Flagged' : 'Flag'}
          </button>
        </div>
        <div class="question-card">
          <div class="question-card__number">Q${idx + 1}</div>
          <p class="question-card__text">${q.question}</p>
        </div>
        <div class="options-list">${optionsHTML}</div>
        ${explanationHTML}
        <div class="exam-nav">
          <button class="btn btn--ghost" id="prev-btn" ${idx === 0 ? 'disabled' : ''}>← Previous</button>
          <button class="btn btn--primary" id="next-btn" ${idx === total - 1 ? 'disabled' : ''}>Next →</button>
        </div>
      </main>
    </div>`;
  },

  // ─── Results page ─────────────────────────────────────────────────────────

  renderResults(results, config) {
    const sub   = config.subjects.find(s => s.id === results.config.subject);
    const et    = config.examTypes.find(e => e.id === results.config.examType);
    const mod   = config.modules.find(m => m.id === results.config.module);
    const subSubs = (mod?.subSubjects?.[results.config.examType]?.[results.config.subject]) || [];
    const ss    = subSubs.find(s => s.id === results.config.subSubject) || { label: results.config.subSubject };

    const reviewHTML = results.perQuestion.map((pq, i) => {
      const cls    = pq.correct ? 'result-item--correct' : pq.answered ? 'result-item--wrong' : 'result-item--skipped';
      const status = pq.correct ? '✅' : pq.answered ? '❌' : '—';
      return `<div class="result-item ${cls}">
        <div class="result-item__header">
          <span class="result-item__num">${status} Q${i + 1}</span>
          ${pq.flagged ? '<span class="result-item__flag">🚩</span>' : ''}
        </div>
        <p class="result-item__question">${pq.question}</p>
        <div class="result-item__answers">
          ${pq.answered ? `<span class="result-item__user ${pq.correct ? 'result-item__user--correct' : 'result-item__user--wrong'}">Your answer: ${['A','B','C','D'][pq.userAnswer]}. ${pq.options[pq.userAnswer]}</span>` : '<span class="result-item__skipped">Not answered</span>'}
          ${!pq.correct ? `<span class="result-item__correct">Correct: ${['A','B','C','D'][pq.answer]}. ${pq.options[pq.answer]}</span>` : ''}
        </div>
        <div class="result-item__explanation">${pq.explanation}</div>
      </div>`;
    }).join('');

    return `
    <div class="page results-page">
      ${this.backBtn('subsubject', { moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject, subSubject: results.config.subSubject })}
      ${this.breadcrumb([
        { label: 'Dashboard', nav: 'dashboard' },
        { label: results.config.module, nav: 'module', params: { moduleId: results.config.module } },
        { label: et.label, nav: 'module', params: { moduleId: results.config.module } },
        { label: sub.label, nav: 'subject', params: { moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject } },
        { label: ss.label, nav: 'subsubject', params: { moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject, subSubject: results.config.subSubject } },
        { label: 'Results' },
      ])}
      <div class="results-summary">
        <div class="results-summary__ring">${this.scoreRing(results.score)}</div>
        <div class="results-summary__stats">
          <h2 class="results-summary__title">Exam Complete</h2>
          <p class="results-summary__subtitle">${ss.label} · ${sub.label} · ${et.label}</p>
          <div class="results-summary__grid">
            ${this.statCard('Correct',   results.correct,    '✅', '#4A9E8E')}
            ${this.statCard('Incorrect', results.incorrect,  '❌', '#dc2626')}
            ${this.statCard('Skipped',   results.unanswered, '—',  '#6b7280')}
            ${this.statCard('Time',      ExamEngine.formatTime(results.timeSec), '⏱', '#2563eb')}
          </div>
        </div>
      </div>
      <div class="results-actions">
        ${results.incorrect > 0 ? `<button class="btn btn--danger" data-nav="scoped-review"
          data-params='${JSON.stringify({ moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject, subSubject: results.config.subSubject, label: ss.label })}'>
          🔄 Review Incorrect (this topic)</button>` : ''}
        ${Storage.getFlagged().some(f => f.module === results.config.module && f.examType === results.config.examType && f.subject === results.config.subject && f.subSubject === results.config.subSubject)
          ? `<button class="btn btn--ghost" data-nav="scoped-flagged"
              data-params='${JSON.stringify({ moduleId: results.config.module, examType: results.config.examType, subject: results.config.subject, subSubject: results.config.subSubject, label: ss.label })}'
              style="border-color:#4A9E8E;color:#4A9E8E">
              🚩 Review Flagged (this topic)</button>`
          : ''}
        <button class="btn btn--primary" id="retry-incorrect-btn"
          data-module="${results.config.module}"
          data-exam-type="${results.config.examType}"
          data-subject="${results.config.subject}"
          data-sub-subject="${results.config.subSubject}"
          ${results.incorrect === 0 ? 'disabled' : ''}>Retry Incorrect Only</button>
        <button class="btn btn--ghost" id="retry-all-btn"
          data-module="${results.config.module}"
          data-exam-type="${results.config.examType}"
          data-subject="${results.config.subject}"
          data-sub-subject="${results.config.subSubject}">Retry Full Exam</button>
        <button class="btn btn--ghost" data-nav="dashboard">Dashboard</button>
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
          ${q.options.map((opt, i) => `<span class="review-opt ${i === q.answer ? 'review-opt--correct' : i === q.userAnswer ? 'review-opt--wrong' : ''}">${['A','B','C','D'][i]}. ${opt}</span>`).join('')}
        </div>
        <div class="review-item__explanation">${q.explanation}</div>
        <button class="btn btn--ghost btn--sm review-item__remove" data-remove-uid="${q.uid}">✓ Mark as Mastered</button>
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
        <button class="btn btn--danger btn--sm" id="clear-all-review">Clear All</button>
      </div>`;

    return `
    <div class="page review-page">
      ${this.backBtn(backPage, backParams)}
      ${this.breadcrumb(crumbs)}
      <header class="page__header" style="--mod-color:#dc2626">
        <span class="page__icon">🔄</span>
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
        <button class="btn btn--danger btn--sm" id="clear-all-flagged">Remove All Flags</button>
      </div>`;

    return `
    <div class="page review-page">
      ${this.backBtn(backPage, backParams)}
      ${this.breadcrumb(crumbs)}
      <header class="page__header" style="--mod-color:#4A9E8E">
        <span class="page__icon">🚩</span>
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
      <header class="page__header" style="--mod-color:#2563eb">
        <span class="page__icon">🔍</span>
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

  _moduleRing(percent, color) {
    const r = 18, circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return `<svg viewBox="0 0 44 44" width="44" height="44" style="transform: rotate(-90deg); flex-shrink:0;">
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--border)" stroke-width="4"/>
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="4"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
        stroke-linecap="round" style="transition: stroke-dashoffset 1s ease-out;"/>
    </svg>`;
  },

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
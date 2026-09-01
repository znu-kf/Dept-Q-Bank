# Dept. Q. Bank

A professional, offline-first medical question bank for GitHub Pages.
Built with plain HTML, CSS, and JavaScript — no build step, no backend, no dependencies.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Live Demo](#live-demo)
- [Installation](#installation)
- [Deployment to GitHub Pages](#deployment-to-github-pages)
- [Repository Structure](#repository-structure)
- [Adding Questions](#adding-questions)
- [JSON Question Format](#json-question-format)
- [Adding a New Module](#adding-a-new-module)
- [Adding a New Subject](#adding-a-new-subject)
- [Customisation](#customisation)
- [LocalStorage Data](#localstorage-data)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Licence](#licence)

---

## Overview

Dept. Q. Bank is a self-hosted medical question bank platform for practising multiple-choice questions across five medical modules:

| Module | Full Title |
|--------|-----------|
| CPM | Cardio-Pulmonary Medicine |
| GIT | Gastrointestinal Tract |
| CNS | Central Nervous System |
| ENDO & REPRO | Endocrinology & Reproductive |
| Urinary | Urinary System |

Each module contains two exam types (End Module Exam and Final Exam), each with four subjects (Anatomy, Physiology, Biochemistry, Histology).

All question content lives in plain JSON files. Adding or updating questions requires only editing JSON files — no coding knowledge needed.

---

## Features

- Professional medical Q-bank interface, in the style of UWorld or AMBOSS
- Full exam engine with immediate feedback or end-of-exam review mode
- Question palette showing answered, unanswered, and flagged status
- Flag questions for later review
- Incorrect questions automatically saved to a review bank
- Dashboard analytics: questions solved, accuracy, and total study time
- Per-module progress rings with completion count and average score
- Resume banner for continuing an in-progress exam from the dashboard
- Results page with full question review and explanations
- Retry incorrect questions only
- Search functionality
- Light and dark themes
- Mobile-first responsive design
- Fully offline after first load, with no backend
- All progress saved in browser LocalStorage

---

## Live Demo

After deploying to GitHub Pages, your URL will be:

```
https://<your-username>.github.io/<repository-name>/
```

---

## Installation

### Option 1 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# 2. Serve locally (required — the file:// protocol blocks fetch() calls)
# Python 3:
python -m http.server 8000

# Node.js (npx):
npx serve .

# Then open: http://localhost:8000
```

Note: do not open `index.html` directly from the file system (`file://`). Browsers block `fetch()` on `file://` URLs. Always use a local server.

### Option 2 — Deploy to GitHub Pages (recommended)

See [Deployment to GitHub Pages](#deployment-to-github-pages).

---

## Deployment to GitHub Pages

1. Fork or push this repository to your GitHub account.

2. Go to your repository on GitHub, then Settings, then Pages.

3. Under Source, select Deploy from a branch.

4. Select the main branch and the / (root) folder, then click Save.

5. After a minute, your site will be live at:
   ```
   https://<your-username>.github.io/<repository-name>/
   ```

6. To update questions, edit the JSON files and push. GitHub Pages will deploy the changes automatically.

---

## Repository Structure

```
/
├── index.html              Single-page app entry point
├── README.md
│
├── assets/
│   ├── css/
│   │   └── styles.css      All styles (edit colours, fonts here)
│   └── js/
│       ├── app.js          Main application controller and navigation
│       ├── storage.js      LocalStorage persistence layer
│       ├── exam.js         Exam engine (loading, scoring, state)
│       └── ui.js           UI rendering functions
│
├── config/
│   └── modules.json        Site configuration, modules, subjects
│
└── data/
    ├── CPM/
    │   ├── end_module/
    │   │   ├── anatomy.json
    │   │   ├── physiology.json
    │   │   ├── biochemistry.json
    │   │   └── histology.json
    │   └── final_exam/
    │       └── (same four files)
    ├── GIT/            (same structure)
    ├── CNS/            (same structure)
    ├── ENDO_REPRO/     (same structure)
    └── URINARY/        (same structure)
```

---

## Adding Questions

### Step-by-step

1. Open the relevant JSON file. For example, to add CNS End Module Exam — Anatomy questions:
   ```
   data/CNS/end_module/anatomy.json
   ```

2. Find the `"questions"` array.

3. Copy the template below and paste it at the end of the array (before the closing `]`).

4. Fill in all fields.

5. Ensure the `"id"` is unique within the file (increment from the last question's id).

6. Save and push to GitHub.

### Single question template

```json
{
  "id": 4,
  "question": "Which structure forms the floor of the fourth ventricle?",
  "options": [
    "Cerebral aqueduct",
    "Rhomboid fossa",
    "Choroid plexus",
    "Tectum"
  ],
  "answer": 1,
  "explanation": "The rhomboid fossa is the diamond-shaped floor of the fourth ventricle, formed by the posterior surfaces of the pons and medulla oblongata. The choroid plexus forms part of the roof."
}
```

### Multiple questions at once

Simply add multiple objects to the array, separated by commas:

```json
{
  "questions": [
    {
      "id": 1,
      "question": "First question?",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Explanation for first question."
    },
    {
      "id": 2,
      "question": "Second question?",
      "options": ["A", "B", "C", "D"],
      "answer": 2,
      "explanation": "Explanation for second question."
    }
  ]
}
```

---

## JSON Question Format

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Unique identifier within this file |
| `question` | string | Yes | The question text |
| `options` | string[] | Yes | Exactly 4 answer options (A, B, C, D) |
| `answer` | integer | Yes | Index of the correct option: `0`=A, `1`=B, `2`=C, `3`=D |
| `explanation` | string | Yes | Detailed explanation shown after answering |

---

## Adding a New Module

1. Open `config/modules.json`.

2. Copy one of the existing module objects in the `"modules"` array and add it to the end.

3. Update `id`, `title`, `fullTitle`, `shortTitle`, `description`, `color`, `icon`, and `dataPath`.

4. Create the matching data folder structure:
   ```bash
   mkdir -p data/NEW_MODULE/end_module data/NEW_MODULE/final_exam
   ```

5. Create empty question files for each subject in each exam folder:
   ```json
   { "questions": [] }
   ```

6. Push to GitHub. The new module card will appear automatically on the dashboard.

**Example module object:**
```json
{
  "id": "MSK",
  "title": "MSK",
  "fullTitle": "Musculoskeletal System",
  "shortTitle": "MSK",
  "description": "Musculoskeletal anatomy and pathology questions",
  "color": "#7c3aed",
  "icon": "bone",
  "dataPath": "MSK"
}
```

Note: the `icon` field is rendered verbatim in the interface. The placeholder above is for readability in this document; substitute an actual glyph (for example an emoji character) to match the existing modules.

---

## Adding a New Subject

1. Open `config/modules.json`.

2. Add a new object to the `"subjects"` array:
   ```json
   { "id": "pathology", "label": "Pathology", "icon": "microscope", "color": "#be185d" }
   ```
   (as above, use an actual glyph for `icon` to match the existing subjects)

3. For every module and exam type, create the matching JSON file:
   ```
   data/CPM/end_module/pathology.json
   data/CPM/final_exam/pathology.json
   data/GIT/end_module/pathology.json
   ... (repeat for all modules)
   ```

---

## Customisation

### Change the site title

Edit `config/modules.json`:
```json
"siteTitle": "My Q. Bank",
"siteSubtitle": "My Custom Subtitle"
```

Also update `<title>` in `index.html`.

### Change colours

Edit the CSS variables at the top of `assets/css/styles.css`:
```css
:root {
  --primary:       #1d4ed8;  /* main brand colour */
  --success:       #059669;  /* correct answers */
  --danger:        #dc2626;  /* incorrect answers */
  /* ... */
}
```

### Change fonts

Replace the `@import` line at the top of `styles.css` and update the `--font-body` and `--font-mono` variables to your chosen font family names.

### Enable immediate feedback by default

In `config/modules.json`:
```json
"examSettings": {
  "defaultImmediateFeedback": true
}
```

### Enable question randomisation by default

```json
"examSettings": {
  "defaultRandomize": true
}
```

---

## LocalStorage Data

All user progress is stored in the browser's LocalStorage under these keys:

| Key | Contents |
|-----|----------|
| `dqb_stats` | Global statistics (attempted, correct, etc.) |
| `dqb_progress` | Per-subject completion records |
| `dqb_incorrect` | Incorrect questions review bank |
| `dqb_flagged` | Flagged questions |
| `dqb_exam_history` | Last 100 exam results |
| `dqb_current_exam` | In-progress exam state |
| `dqb_last_page` | Last visited page (for session restore) |
| `dqb_settings` | User preferences |

To **reset all data** (for development), open the browser console and run:
```javascript
Storage.resetAll(); location.reload();
```

---

## Troubleshooting

**Questions don't load / "No questions available"**
- Make sure the JSON file exists at the correct path.
- Check the JSON is valid (use [jsonlint.com](https://jsonlint.com)).
- Ensure you're running via a local server, not opening the file directly.

**Changes don't appear after pushing to GitHub Pages**
- GitHub Pages can take 1–2 minutes to rebuild. Hard-refresh the page (`Ctrl+Shift+R`).

**Progress was lost**
- Check that browser LocalStorage is enabled (not blocked by private mode or extensions).

---

## Roadmap

Recently added:

- Redesigned dashboard stats (questions solved, accuracy, study time)
- Per-module progress rings with average score
- Resume banner for continuing an in-progress exam
- Light and dark themes

Planned:

- [ ] Timed exam mode
- [ ] Question difficulty tags
- [ ] Notes on individual questions
- [ ] PDF export of results
- [ ] Offline PWA support
- [ ] Cloud sync (optional)

---

## Licence

MIT — free to use, modify, and distribute.

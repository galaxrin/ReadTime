# README and GitHub Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a polished Chinese README with real ReadTime screenshots and publish a clean project snapshot to `galaxrin/ReadTime`.

**Architecture:** Capture privacy-safe screenshots from the packaged ReadTime app, store them under `docs/images/`, and reference them from a concise README. Build the public snapshot in an isolated branch based on remote `main`, copy only approved project files, validate it, push it, and open a GitHub Pull Request.

**Tech Stack:** Electron, React 18, TypeScript, Jest, Markdown, GitHub CLI

## Global Constraints

- Use only actual ReadTime UI screenshots.
- Do not expose private filenames, notifications, paths, or desktop content.
- Keep remote `LICENSE`.
- Publish source, tests, assets, configuration, README, and showcase images.
- Exclude `node_modules/`, `dist/`, `release/`, `.superpowers/`, `.worktrees/`, and `docs/superpowers/`.
- Do not force-push or overwrite remote history.

---

### Task 1: Capture privacy-safe product images

**Files:**
- Create: `docs/images/readtime-hero.png`
- Create: `docs/images/theme-paper.png`
- Create: `docs/images/theme-night.png`
- Create: `docs/images/theme-glass.png`
- Create: `docs/images/theme-transparent.png`
- Create: `docs/images/settings.png`
- Create: `docs/images/bookshelf.png`

**Interfaces:**
- Consumes: `release/mac-arm64/ReadTime.app` and a synthetic public-domain demo text.
- Produces: PNG screenshots containing only ReadTime UI and generic demo content.

- [ ] **Step 1: Create a synthetic demo book outside the repository**

Create `/tmp/readtime-readme-demo.txt` with generic Chinese chapter content and no personal data.

- [ ] **Step 2: Launch the packaged app and import the demo book**

Use Computer Use against:

```text
/Users/babybus/Library/CloudStorage/OneDrive-个人/Res/project/ReadTime/release/mac-arm64/ReadTime.app
```

Import `/tmp/readtime-readme-demo.txt`, verify the visible title is generic, and close unrelated desktop windows before capture.

- [ ] **Step 3: Capture the main reading view and four themes**

Capture:

```text
docs/images/readtime-hero.png
docs/images/theme-paper.png
docs/images/theme-night.png
docs/images/theme-glass.png
docs/images/theme-transparent.png
```

Each image must show the same demo content and the selected theme without private desktop content.

- [ ] **Step 4: Capture settings and bookshelf**

Capture:

```text
docs/images/settings.png
docs/images/bookshelf.png
```

The settings image must include the theme selector and `ReadTime by 脏咖喱 · Galaxrin`. The bookshelf image must contain only the synthetic demo book.

- [ ] **Step 5: Inspect all screenshots**

Open each PNG and verify readable UI, consistent dimensions, and absence of personal data.

### Task 2: Write and validate README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: approved project behavior, package scripts, and `docs/images/*.png`.
- Produces: a GitHub-renderable Chinese project README.

- [ ] **Step 1: Write README**

Include these sections in order:

```text
Logo and title
One-line product description
Badges
Hero screenshot
Highlights
Theme gallery
Feature screenshots
Supported formats and system
Install and develop
Test and build
Keyboard shortcuts
Project structure
Privacy
Author
License
```

Document only commands present in `package.json`:

```bash
npm install
npm run electron:dev
npm test -- --runInBand
npm run build
npm run pack
```

- [ ] **Step 2: Verify README references**

Run:

```bash
rg -o 'docs/images/[^)< ]+' README.md
```

Confirm every referenced image exists and every feature claim is supported by source or tests.

- [ ] **Step 3: Run project checks**

Run:

```bash
npm test -- --runInBand
npm run build
```

Expected: all Jest suites pass and production build exits successfully.

### Task 3: Publish a clean GitHub snapshot

**Files:**
- Remote: `https://github.com/galaxrin/ReadTime.git`
- Branch: `agent/readme-showcase`

**Interfaces:**
- Consumes: current approved project files and remote `main`.
- Produces: a pushed branch and GitHub Pull Request targeting `main`.

- [ ] **Step 1: Add and fetch the remote**

Run:

```bash
git remote add origin https://github.com/galaxrin/ReadTime.git
git fetch origin main
```

If `origin` already exists, verify it equals the approved URL before fetching.

- [ ] **Step 2: Create an isolated publish worktree**

Create `/tmp/readtime-github-publish` from `origin/main` on branch `agent/readme-showcase`.

- [ ] **Step 3: Copy only approved files**

Copy the project snapshot while excluding:

```text
.git/
node_modules/
dist/
release/
.superpowers/
.worktrees/
docs/superpowers/
```

Preserve the remote worktree's existing `LICENSE`.

- [ ] **Step 4: Inspect and stage the exact public diff**

Run `git status --short` and confirm no excluded path appears. Stage the clean worktree only.

- [ ] **Step 5: Validate the public snapshot**

Install dependencies from `package-lock.json`, then run:

```bash
npm test -- --runInBand
npm run build
```

- [ ] **Step 6: Commit and push**

Commit:

```text
Publish ReadTime with README showcase
```

Push `agent/readme-showcase` with upstream tracking.

- [ ] **Step 7: Open a Pull Request**

Create a Pull Request targeting `main` describing the project snapshot, README, screenshots, tests, and build result. Return the branch, commit, PR URL, and validation summary.

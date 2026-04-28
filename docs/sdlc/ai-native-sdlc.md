# AI-Native SDLC v1.0

**Version**: 1.0
**Date**: 2026-04-04
**Status**: Draft — extracted from Hikaku Plan 1 execution
**Author**: Purujit Negi + Claude (AI pair)
**Origin**: Reverse-engineered from the first successful development cycle of Hikaku (比較)

> **Versioning Policy**: This document is immutable once published. Process changes result in a new version (v1.1, v2.0, etc.) with a changelog. Previous versions are preserved for tracking how the methodology evolved.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [The 8 Phases](#2-the-8-phases)
3. [Phase 0: Discovery](#phase-0-discovery)
4. [Phase 1: Brainstorming](#phase-1-brainstorming)
5. [Phase 2: Architecture Decisions](#phase-2-architecture-decisions)
6. [Phase 3: Specification](#phase-3-specification)
7. [Phase 4: Implementation Planning](#phase-4-implementation-planning)
8. [Phase 5: Execution](#phase-5-execution)
9. [Phase 6: Review + Ship](#phase-6-review--ship)
10. [Phase 7: Retrospective + Next Cycle](#phase-7-retrospective--next-cycle)
11. [Artifacts Produced](#artifacts-produced)
12. [Core Principles](#core-principles)
13. [Anti-Patterns](#anti-patterns)
14. [Roles](#roles)
15. [Tooling](#tooling)
16. [Appendix: Observed During Hikaku Plan 1](#appendix)

---

## 1. Philosophy

### AI-Native, Not AI-Assisted

This SDLC treats AI as a **first-class team member**, not a tool that helps occasionally. Every phase is designed so that:
- AI can resume work from any point with full context (via CLAUDE.md, ADRs, specs, plans)
- Decisions are documented with rationale so AI (and humans) understand *why*, not just *what*
- The codebase is self-describing — types, tests, and conventions make the system navigable without tribal knowledge
- Processes are repeatable by any AI agent or human developer following the documentation

### The Three Disciplines

Every feature, every PR, every phase follows three parallel disciplines:

```
TDD  — Test-Driven Development    — Proves the code works
ADD  — Analytics-Driven Development — Proves the feature is used
DOC  — Documentation-Driven Development — Proves the decision was reasoned
```

These are not optional. A feature is not done until it has tests (TDD), analytics events (ADD), and documented decisions (DOC).

---

## 2. The 8 Phases

```
Phase 0: Discovery
    ↓ "Is this worth building?"
Phase 1: Brainstorming
    ↓ "What exactly are we building?"
Phase 2: Architecture Decisions
    ↓ "How will we build it?"
Phase 3: Specification
    ↓ "What does done look like?"
Phase 4: Implementation Planning
    ↓ "What are the steps?"
Phase 5: Execution
    ↓ "Build it."
Phase 6: Review + Ship
    ↓ "Is it correct?"
Phase 7: Retrospective + Next Cycle
    ↓ "What did we learn?"
    → Back to Phase 1 for the next feature
```

### Phase Dependencies

```
Phase 0 → Phase 1: Discovery informs what to brainstorm
Phase 1 → Phase 2: Brainstorm decisions need architectural formalization
Phase 2 → Phase 3: Architecture decisions constrain the specification
Phase 3 → Phase 4: Specification defines what the plan must deliver
Phase 4 → Phase 5: Plan defines exactly what to build
Phase 5 → Phase 6: Built code needs review before shipping
Phase 6 → Phase 7: Shipped work needs retrospective before next cycle
Phase 7 → Phase 1: Learnings feed into the next brainstorm
```

**CRITICAL RULE: No phase can be skipped.** Even for "simple" features. The brainstorm can be 5 minutes, the spec can be 10 lines, the plan can be 3 tasks — but each phase must happen and produce its artifact.

---

## Phase 0: Discovery

### Purpose
Validate that the problem exists and is worth solving. This can be a prototype, a manual analysis, a user interview, or market research.

### Entry Criteria
- A problem statement or user need exists
- Someone (human or AI) can articulate what's broken or missing

### Activities
1. **Prototype or explore** — Build a throwaway script, run an analysis, test a hypothesis
2. **Validate the need** — Does the output solve a real problem? Would you use it yourself?
3. **Document findings** — Capture data, insights, and the "aha moment"

### Exit Criteria
- A documented problem + evidence that a solution is needed
- Decision to proceed to brainstorming (or kill the idea)

### Artifacts
- Discovery notes or analysis report
- Prototype scripts (if applicable — saved as reference material)

### Hikaku Example
We built YouTube comparison scripts, ran a real WW vs FRA analysis, generated a comprehensive report. The scripts proved the methodology. The report proved the value. The request "can we build a platform from this?" was the Phase 0 → Phase 1 transition.

---

## Phase 1: Brainstorming

### Purpose
Transform a validated problem into concrete product decisions through structured, interactive exploration. This is where vision becomes specification-ready.

### Entry Criteria
- Phase 0 complete (problem validated)
- Key stakeholder available for interactive decisions

### Activities
1. **Set up context** — Review discovery outputs, existing codebases, constraints
2. **Visual exploration** (when applicable) — Use browser mockups for design decisions
3. **One question at a time** — Never bundle decisions. Each gets its own exploration.
4. **Options + recommendation** — Always present 2-4 options with trade-offs and a recommended pick
5. **User decides** — AI recommends, human chooses. Document the choice AND the rejected alternatives.
6. **Challenge assumptions** — The user should push back. Better decisions come from friction.

### Decision Categories (typical)

| Category | Example Questions |
|----------|------------------|
| Identity | Name, brand, design philosophy |
| Design | Visual style, color palette, typography, responsive strategy |
| Tech Stack | Framework, hosting, database, state management |
| Data | Storage model, caching strategy, lifecycle |
| UX | Loading experience, error handling, mobile behavior |
| Growth | Analytics, sharing mechanics, viral loops |
| Process | Dev methodology (TDD, ADD), documentation approach |

### Rules
- **One decision per message** — Don't overwhelm with multiple choices
- **Visual for visual questions** — Use mockups for design; use text for architecture
- **Rejected alternatives documented** — Why we didn't choose the other options
- **No implementation** — Brainstorming produces decisions, not code

### Exit Criteria
- All major decisions documented
- No open questions that block specification
- User has approved each decision

### Artifacts
- Brainstorm session notes (`docs/brainstorm/`)
- Visual mockups (if design decisions were made)
- List of decisions ready for ADRs

### Hikaku Example
Interactive brainstorm produced: project name (Hikaku from 3 options), design system (Kintsugi dark + Washi Gold V2 light from 6+ iterations), typography (Zen Kaku Gothic + Crimson Pro from 4 pairings), tech stack (Next.js + Convex + Redis from multiple evaluations). Each decision had visual or text-based options with recommendations.

---

## Phase 2: Architecture Decisions

### Purpose
Formalize brainstorm decisions into Architecture Decision Records (ADRs) with full context, rationale, and consequences. This is the permanent record of *why* the system is built the way it is.

### Entry Criteria
- Phase 1 complete (decisions made)
- Decisions need to be captured before they're forgotten

### Activities
1. **Write ADRs** — One per major decision. Standard format: Context → Options → Decision → Rationale → Consequences
2. **Update Decision Log** — Quick-reference table linking all ADRs
3. **Update CLAUDE.md** — Ensure AI project instructions reflect all decisions
4. **Cross-reference check** — Do ADRs agree with each other? Any contradictions?

### ADR Format

```markdown
# ADR-NNN: [Decision Title]

**Status**: Accepted | Superseded | Deprecated
**Date**: YYYY-MM-DD
**Deciders**: [Who made this decision]

## Context
[What problem or question prompted this decision?]

## Options Considered
[2-4 options with pros/cons]

## Decision
[What was chosen]

## Rationale
[Why this option — the reasoning, not just the choice]

## Consequences
[What follows from this decision — good and bad]
```

### Rules
- **Every architectural decision gets an ADR** — tech stack, database, design system, component library, state management, analytics, etc.
- **Rejected alternatives documented** — Future you (or AI) needs to know what was considered
- **ADRs are immutable** — Don't edit. Supersede with a new ADR if the decision changes.
- **Decision log stays current** — Single table that links all ADRs

### Exit Criteria
- Every brainstorm decision has an ADR
- Decision log is complete
- CLAUDE.md reflects all decisions
- No contradictions between ADRs

### Artifacts
- ADRs (`docs/adrs/NNN-*.md`)
- Decision log (`docs/decisions/DECISION_LOG.md`)
- Updated CLAUDE.md

### Hikaku Example
13 ADRs covering: tech stack, database, design system, data architecture, API key strategy, sharing model, component library, loading UX, responsive strategy, image service, Convex backend, analytics, frontend state management. Decision log with 28 entries including rejected alternatives.

---

## Phase 3: Specification

### Purpose
Write the complete product specification — what "done" looks like. This is the contract between the brainstorm/architecture phase and the implementation phase.

### Entry Criteria
- Phase 2 complete (all ADRs written)
- No open architectural questions

### Activities
1. **Write the spec** — Pages, components, API routes, data types, error handling, responsive behavior, performance targets, security considerations
2. **Automated spec review** — Dispatch a review agent to check for completeness, consistency, ambiguity, contradictions, and implementability
3. **Fix all issues** — Address every review finding (CRITICAL, MEDIUM, LOW)
4. **User review** — Human reads the spec and challenges gaps
5. **Iterative fixes** — User feedback → update spec → re-review if needed

### Spec Sections (typical)

1. Product Overview (what, why, for whom)
2. Tech Stack (with ADR references)
3. Design System (tokens, typography, spacing, component overrides)
4. Pages & Routes (purpose, elements, behavior, responsive)
5. Report Sections / Features (detailed component specs)
6. API Routes (input, process, output, streaming)
7. Data Types (TypeScript interfaces)
8. Computation Logic (algorithms, formulas)
9. Loading & UX (phased reveal, progress states)
10. Sharing & Social (URLs, OG tags, PDF export)
11. Error Handling (every error → user experience)
12. Responsive Breakpoints (mobile, tablet, desktop)
13. Performance Targets (Lighthouse, LCP, CLS)
14. Security (API keys, rate limiting, XSS, input validation)
15. Future Considerations (explicitly out of scope)
16. Development Approach (TDD, ADD, git workflow)
17. Project Structure (file tree)
18. Analytics (events, funnels, dashboard metrics)

### Rules
- **Spec review is mandatory** — Automated review catches what humans miss
- **Every issue gets fixed** — Don't ship a spec with known contradictions
- **Spec matches ADRs** — If the spec disagrees with an ADR, one must be updated
- **No implementation details** — Spec says *what*, not *how* (that's the plan's job)

### Exit Criteria
- Automated review: APPROVED (no critical/medium issues)
- User review: approved
- Spec matches all ADRs
- A developer (human or AI) could implement from this spec without asking questions

### Artifacts
- Design specification (`docs/specs/YYYY-MM-DD-*.md`)
- Spec review results (captured in commit messages)

### Hikaku Example
18-section spec (~800 lines). First review found 15 issues (3 critical, 7 medium, 5 low). All fixed. User then caught 4 more gaps (state management, ADD, KISS/YAGNI, coding style). All addressed. Final spec was reviewed-clean.

---

## Phase 4: Implementation Planning

### Purpose
Break the specification into bite-sized, executable tasks with exact file paths, complete code, test-first steps, and commit messages. This is the bridge between "what to build" and "building it."

### Entry Criteria
- Phase 3 complete (spec reviewed and approved)
- All external decisions made (no open questions)

### Activities
1. **Scope decomposition** — If the spec covers multiple subsystems, split into separate plans
2. **File map** — List every file created/modified with its responsibility
3. **Task breakdown** — Each task: ~2-5 minutes, one action, TDD steps
4. **Dependency graph** — Which tasks depend on which, what can parallel
5. **Automated plan review** — Dispatch a reviewer to check: file paths correct, TDD compliant, commands runnable, spec alignment, task granularity
6. **Fix all issues** — Address review findings
7. **Review loop** — Run review N times until clean (user specifies N)

### Task Format

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Test: `exact/path/to/test.ts`

- [ ] **Step 1: Write the failing test**
[Complete test code]

- [ ] **Step 2: Run test → verify FAIL**
[Exact command + expected output]

- [ ] **Step 3: Implement**
[Complete implementation code]

- [ ] **Step 4: Run test → verify PASS**
[Exact command + expected output]

- [ ] **Step 5: Commit**
[Exact git command with message]
```

### Rules
- **Every task follows TDD** — test first, always
- **Core principles in preamble** — KISS, YAGNI, SOLID, DRY, TDD, ADD
- **Exact file paths** — No ambiguity about where code goes
- **Complete code in plan** — Not "add validation" but the actual validation code
- **Runnable commands** — Copy-paste into terminal and it works
- **Feature branch** — All work on a feature branch, not main/master

### Exit Criteria
- Automated review: APPROVED after N iterations
- Every task has TDD steps
- File paths match spec's project structure
- Commands are non-interactive (agentic-compatible)
- Core principles documented in plan preamble

### Artifacts
- Implementation plan (`docs/plans/YYYY-MM-DD-*.md`)
- Plan review results

### Hikaku Example
Plan 1: 17 tasks across 4 chunks. First review found 11 issues (3 critical: schema type mismatch, expiry logic bug, Tailwind v4/v3 collision; 5 important: test paths, missing tests, etc.). All fixed. User then caught: missing ADD compliance, missing KISS/YAGNI principles. Both added.

---

## Phase 5: Execution

### Purpose
Build exactly what the plan specifies. No more, no less.

### Entry Criteria
- Phase 4 complete (plan reviewed and approved)
- Feature branch created
- External services configured (if needed)

### Activities
1. **Create feature branch** — `feature/plan-N-name`
2. **Execute tasks sequentially** (or parallel where dependency graph allows)
3. **Follow TDD strictly** — Write test → RED → implement → GREEN → commit
4. **Track progress** — Mark tasks complete as they're done
5. **Handle blockers** — If a task can't be completed, document why and escalate
6. **Wire external services** — Configure API keys, databases, etc.
7. **Final verification** — All tests pass, build succeeds, dev server works

### TDD Cycle (per task)

```
1. Write failing test       → commit test
2. Run test → see RED       → screenshot/log the failure
3. Write minimum code       → make the test pass
4. Run test → see GREEN     → verify
5. Refactor if needed       → keep tests green
6. Commit                   → descriptive conventional commit message
```

### Rules
- **No code without a test first** (for logic/components; config/setup exempt)
- **No "while I'm here" changes** — stick to the plan (YAGNI)
- **Commit after every task** — small, meaningful, reversible commits
- **Run full test suite before pushing** — no broken builds on remote
- **External service setup is part of execution** — not a separate phase

### Exit Criteria
- All plan tasks completed
- All tests pass
- Build succeeds
- Dev server runs correctly
- External services verified
- Branch pushed

### Artifacts
- Working code on feature branch
- Test suite (all green)
- Conventional commit history

### Hikaku Example
Plan 1 execution: 17 commits, 19 tests passing, Convex deployed, Redis verified, PostHog configured. Build succeeds. PR opened.

---

## Phase 6: Review + Ship

### Purpose
Verify the implementation matches the spec, meets quality standards, and is ready to merge.

### Entry Criteria
- Phase 5 complete (all tasks done, tests pass)
- Branch pushed, PR opened

### Activities
1. **Spec compliance review** — Does the code match the specification?
2. **Code quality review** — Clean code, no anti-patterns, follows conventions
3. **Test coverage review** — Are the right things tested? Any gaps?
4. **Design system compliance** — Correct tokens, fonts, spacing (for UI work)
5. **ADD compliance** — Are analytics events instrumented?
6. **Fix issues** — Address review findings, re-review
7. **Merge** — Once all reviews pass

### Rules
- **Two-stage review** — Spec compliance first, then code quality (in that order)
- **Re-review after fixes** — Don't merge with unverified fixes
- **PR template used** — Standard template with testing evidence, impact radius, ADD compliance

### Exit Criteria
- Spec review: APPROVED
- Code quality review: APPROVED
- PR merged to main

### Artifacts
- Review results (in PR comments or commit messages)
- Merged code on main branch

---

## Phase 7: Retrospective + Next Cycle

### Purpose
Extract learnings and feed them into the next cycle.

### Entry Criteria
- Phase 6 complete (code shipped)

### Activities
1. **What went well?** — Process wins, decisions that paid off
2. **What went wrong?** — Gaps caught late, assumptions that broke
3. **What should change?** — Process improvements for next cycle
4. **Update SDLC** — If the process needs to change, create a new version of this document
5. **Update CLAUDE.md** — If new conventions or rules emerged
6. **Update memory** — Save project context for future sessions
7. **Plan next cycle** — Return to Phase 1 (brainstorm) for the next feature

### Rules
- **Retro is mandatory** — Even for solo projects. The AI partner counts as a team.
- **SDLC versions are immutable** — Don't edit this doc. Create v1.1 or v2.0.
- **Learnings become rules** — If a gap was caught, add a rule to prevent it next time

### Artifacts
- Retrospective notes (can be inline in brainstorm for next cycle)
- Updated SDLC version (if process changed)
- Updated CLAUDE.md (if new conventions)

### Hikaku Example
After Plan 1 execution, jumping straight to Plan 2 without brainstorming was caught. This led to: (1) documenting the SDLC itself, (2) recognizing that every plan cycle needs its own brainstorm, not just the first one.

---

## Artifacts Produced (Summary)

| Phase | Artifact | Location | Immutable? |
|-------|----------|----------|-----------|
| 0: Discovery | Analysis/prototype scripts | `docs/reference-scripts/` | Yes |
| 1: Brainstorm | Session notes + visual mockups | `docs/brainstorm/` | Yes |
| 2: Architecture | ADRs + Decision Log | `docs/adrs/`, `docs/decisions/` | ADRs: Yes. Log: Updated. |
| 3: Specification | Design spec | `docs/specs/` | Versioned (revisions noted in header) |
| 4: Planning | Implementation plan | `docs/plans/` | Yes per version |
| 5: Execution | Code + tests + commits | `src/`, feature branch | Mutable (active development) |
| 6: Review | Review results + merged PR | GitHub PR | Yes (PR is immutable after merge) |
| 7: Retro | Learnings + SDLC update | `docs/retros/`, `docs/sdlc/` | SDLC: Yes per version |
| Always | Project instructions | `.claude/CLAUDE.md` | Updated (living document) |

---

## Core Principles

These apply to every phase, every decision, every line of code.

| Principle | One-Line Rule |
|-----------|--------------|
| **KISS** | Simplest solution that works. No premature abstractions. |
| **YAGNI** | Build only what the current task requires. If the spec doesn't mention it, don't build it. |
| **SOLID** | One responsibility per file. Depend on abstractions, not implementations. |
| **DRY** | Don't extract until 3+ uses. Two similar blocks are fine. |
| **TDD** | Test first, always. RED → GREEN → REFACTOR. |
| **ADD** | Every page ships with analytics. If you can't measure it, you can't know if it works. |
| **DOC** | Every decision gets documented with rationale. Future you (or AI) needs to know *why*. |

---

## Anti-Patterns (Observed and Corrected)

| Anti-Pattern | When It Happened | How to Prevent |
|-------------|-----------------|----------------|
| Skipping brainstorm for "obvious" features | Plan 2 started without brainstorm | **Rule: Every plan cycle starts at Phase 1** |
| Missing ADRs for implicit decisions | Module split decided in plan, not documented | **Rule: If it's a choice between options, it needs an ADR** |
| Core principles not codified | KISS/YAGNI were assumed, not written | **Rule: Principles in CLAUDE.md with concrete examples** |
| ADD as afterthought | Landing page had no analytics initially | **Rule: Analytics events in the plan, not added later** |
| Spec contradicting ADRs | Redis TTL, storage location mismatches | **Rule: Automated spec review cross-references ADRs** |
| Plan not reviewed | Plan 2 written but not reviewed before execution | **Rule: N review iterations before execution (user-specified)** |
| External service setup skipped | Convex types missing broke the build | **Rule: External service wiring is part of execution, verified in checklist** |

---

## Roles

### In AI-Native Development

| Role | Responsibility | Who |
|------|---------------|-----|
| **Product Owner** | Vision, decisions, approval gates, challenges assumptions | Human |
| **AI Architect** | Options analysis, trade-offs, recommendations, spec writing | AI |
| **AI Implementer** | Code, tests, commits, following the plan exactly | AI (subagent or direct) |
| **AI Reviewer** | Spec review, code review, plan review | AI (separate agent for objectivity) |
| **Process Guardian** | Ensures SDLC is followed, catches skipped phases | Both (human catches what AI misses, AI catches what human misses) |

### The Critical Balance

- **AI recommends, human decides** — AI presents options with trade-offs. Human makes the call.
- **Human challenges, AI adapts** — Best decisions came from human pushback (Convex, shadcn, storage lifecycle, ADD).
- **AI documents, human validates** — AI writes ADRs/specs/plans. Human verifies they capture the actual intent.

---

## Tooling

### Required

| Tool | Purpose | Phase Used |
|------|---------|-----------|
| CLAUDE.md | AI project context (loaded every session) | All phases |
| ADRs | Decision documentation | Phase 2 |
| Design Spec | Product specification | Phase 3 |
| Implementation Plans | Execution blueprint | Phase 4 |
| Vitest | Test runner (TDD) | Phase 5 |
| PostHog | Analytics (ADD) | Phase 5+ |
| Git + GitHub | Version control, PRs, reviews | Phase 5-6 |
| Visual Companion | Browser mockups for design decisions | Phase 1 |

### Optional but Recommended

| Tool | Purpose |
|------|---------|
| Subagent dispatch | Parallel task execution |
| Automated review agents | Spec/plan/code review |
| Session context extractor | Preserve conversation state across sessions |

---

## Appendix: Observed During Hikaku Plan 1 {#appendix}

### Timeline

| Time | Phase | What Happened |
|------|-------|---------------|
| Session start | 0 | YouTube API scripts built, WW vs FRA analysis completed |
| Mid-session | 1 | Brainstorming: name, design, tech stack, fonts (visual companion) |
| Mid-session | 2 | 13 ADRs written, decision log with 28 entries |
| Mid-session | 3 | Spec written (18 sections), reviewed (15 issues fixed), user caught 4 more |
| Mid-session | 4 | Plan 1 written (17 tasks), reviewed (11 issues fixed), user caught 2 more |
| Late session | 5 | Plan 1 executed: 17 commits, 19 tests, all services wired |
| Late session | 6 | PR #1 opened, all checks pass |
| Next session | 7 | Caught Plan 2 skipping brainstorm → led to this SDLC document |

### Key Metrics

| Metric | Value |
|--------|-------|
| ADRs written | 13 |
| Decision log entries | 28 |
| Spec issues found by review | 15 (3C, 7M, 5L) |
| Plan issues found by review | 11 (3C, 5I, 3M) |
| Issues caught by user (post-review) | 6 |
| Tests in Plan 1 | 19 |
| Commits in Plan 1 | 17 |
| Total review iterations | 2 (spec) + 2 (plan) = 4 |

### What This SDLC Doesn't Cover Yet (for future versions)

- CI/CD pipeline integration
- Multi-developer parallel workflows
- Design review with non-technical stakeholders
- Production monitoring and incident response
- A/B testing and experimentation framework
- Security review checklist
- Performance benchmarking process
- Accessibility audit process

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-04-04 | Initial draft — extracted from Hikaku Plan 1 execution |

---

*This SDLC is a living methodology. It will evolve as we learn what works and what doesn't. Each version is immutable — create a new version to capture process changes.*

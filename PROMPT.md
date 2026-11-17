# Build "E School" — an interactive JS → TypeScript → React learning platform

You are building a production-quality learning website for **beginner developers on an internship** who already know a little JavaScript but struggle with it, and who need to get productive in **React and TypeScript fast**.

Every lesson teaches **one idea at a time**: a short explanation, then runnable code. One running example ties the whole school together: a **mini shopping cart** (items with `id`, `name`, `price`, `qty`; a list, a total, a badge). Students meet it in the JavaScript lessons, rebuild it in React, type it with TypeScript, test it the way real teams do, and finish by growing it into a complete, deployed multi-page website.

Work in **phases** (see the end of this file). **Stop after each phase**, summarize what you built, and wait for my review before you continue.

---

## 0. Ground rules (these override anything below that conflicts with them)

### 0.1 No limits: every number is a minimum
All counts in this spec (number of lessons, questions, steps, minutes per lesson, entries) are **minimums, not limits**. Create as many pages, lessons, sections, examples and questions as each topic needs. Bigger and more complete is better. The goal is that a student can learn **all** of JavaScript, TypeScript and React here without needing YouTube or another site. Never cut a topic short to save space; split it into more pages instead.

### 0.2 Explanations: short by default, deep on demand
Keep the "one short sentence, then code" style as the **first layer**. Then add depth below it:
- **"How it works"** sections and **"Go deeper"** expandable sections.
- **Diagrams and visualizers**, for example the event loop, the render cycle, how state updates and re-renders flow, and the `useEffect` timeline.

Beginners get the quick version; curious students can dig in.

### 0.3 Many question types, and invent your own
Each lesson must mix **at least 3 different question types**. Use all of these across the school, and invent new ones whenever a topic deserves it:
- Multiple choice (single and multi-select)
- Predict the output: read code and type what the console prints
- Fill in the blanks: inputs placed inside the code
- Order the lines: drag code lines into the correct order (Parsons problems)
- Match pairs: concept ↔ definition, hook ↔ use case, error ↔ fix
- Sort into buckets: e.g. "mutates the array" vs. "returns a new array"
- Spot the bug: click the line that's wrong
- Fix the bug: edit code until the tests pass
- Write code from scratch, checked by hidden tests
- Write the tests (`<TestExercise>`: "your tests caught 4 of 5 bugs")
- Trace the state: step through clicks and type the state after each one
- Code review: pick the best of 3 implementations and explain why
- Build the UI: write a component that matches a target preview, checked by tests
- True/false with an explanation
- A **review quiz at the end of each module (course)**, plus a bigger **"boss challenge" at the end of each track**

Every question gives **instant feedback with an explanation**, and wrong answers get a **helpful hint**, not just "wrong".

### 0.4 Full topic coverage (nothing skipped)
- **JavaScript:** everything in the curriculum below, plus scope and hoisting, `this`, classes and prototypes, the event loop (with a visualizer), `Map`/`Set`, iterators and generators, error handling, regex basics, dates, and modern syntax.
- **TypeScript:** everything below, plus tuples, enums, utility types (`Partial`, `Pick`, `Omit`, `Record`, `ReturnType`), `keyof`/`typeof`, type guards, generics in depth, `satisfies`, `tsconfig`, declaration files, and TS with React.
- **React (latest stable, React 19):** everything below, plus rendering and reconciliation, `memo`, Suspense and `lazy`, error boundaries, portals, `forwardRef`/refs, React Router, data fetching (TanStack Query), forms (React Hook Form + Zod), state management (Context vs. Zustand/Redux Toolkit), performance, accessibility, and the React 19 features (Actions, `use`, `useActionState`, `useOptimistic`, `useFormStatus`).
- **Hooks: all built-in hooks,** not "learn later": `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useRef`, `useContext`, `useMemo`, `useCallback`, `useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`, `useImperativeHandle`, `useDebugValue`, `use`, `useActionState`, `useOptimistic`, `useFormStatus`, plus custom hooks and the Rules of Hooks.
- **Testing:** everything in the Testing course below, plus coverage reports, testing custom hooks, accessibility testing (`jest-axe`), and what to test vs. what not to test.

### 0.5 Tracks
The school is organized into **tracks** (section 10): **JavaScript**, **TypeScript**, **React** (with Hooks and Testing inside it), and **"Build a real website with React"**. In that last track, MiniShop grows into a complete multi-page site: routing, product pages, cart, checkout with forms and validation, data fetching, state management, tests, and deployment to Vercel, step by step.

### 0.6 Freedom with libraries and design
Use any library, package or documentation that makes this the best possible experience: animations (e.g. Motion, formerly Framer Motion), drag-and-drop (e.g. dnd-kit), better code highlighting, diagrams, charts, icons, anything. Add them to `package.json` and install them. Keep the **dark-navy theme, colors and fonts** of the design system (section 2) as the base identity. Add tasteful **animations, transitions and micro-interactions**, and **gamification**: XP, streaks, badges and track certificates, to make learning fun. Keep the project structure clean and scalable.

---

## 1. Tech stack

- **Vite + React 19 + TypeScript** (strict mode), on current stable versions
- **Tailwind CSS v4** (`@tailwindcss/vite`) for styling
- **shadcn/ui** (Radix primitives + `class-variance-authority`, `lucide-react` icons) for UI components
- **Motion** (`motion`) for animations and micro-interactions; **dnd-kit** for drag-and-drop questions; **Sonner** for XP and badge toasts
- **React Router** for routing
- **MDX** (`@mdx-js/rollup`) for lesson content, with frontmatter (`remark-frontmatter` + `remark-mdx-frontmatter`)
- **Sandpack** (`@codesandbox/sandpack-react`) for live **React** previews, React exercises and the website track. Libraries taught in lessons (TanStack Query, React Hook Form, Zod, Zustand, Redux Toolkit, React Router, MSW, Testing Library, `jest-axe`) run inside Sandpack sandboxes as sandbox dependencies.
- **Monaco Editor** (`@monaco-editor/react`) for **TypeScript** lessons, so students see **real type errors** (red squiggles plus a problems list) using Monaco's built-in TypeScript diagnostics
- A **custom Web Worker runner** for plain JavaScript examples and exercises (spec in section 5), with a mini test API that mirrors Vitest (section 6)
- **MiniSearch** for full-text search across lessons and the reference
- **Vitest** + Testing Library for unit tests; **Playwright** for smoke tests
- ESLint + Prettier
- The design tokens in section 2 are CSS variables mapped into Tailwind's theme (`@theme`) and shadcn's semantic tokens (`background`, `foreground`, `card`, `border`, `ring`, …). A small amount of plain CSS is fine where Tailwind can't reach, such as the editor's aligned layers and third-party editors.
- Deployable to **Vercel or Netlify** as a static site (include the SPA rewrite config)

Lazy-load heavy parts per route: Sandpack, Monaco, visualizers and the search index only load on the pages that use them.

---

## 2. Design system (match my existing course materials exactly)

The school must look like my existing slide decks and JS reference: a dark-navy "code editor" aesthetic with one brand color per language.

**Fonts** (Google Fonts, self-hosting is fine): `Inter` for body text, `Space Grotesk` for headings, `JetBrains Mono` for code. Turn off font ligatures in code.

**Colors (dark theme, the default):**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#12152A` | page background |
| `--panel` | `#1C2140` | cards, editors |
| `--panel-2` | `#151933` | editor tab bar, sidebar |
| `--line` | `#2A3156` | borders |
| `--text` | `#F3F1EA` | main text |
| `--muted` | `#B9BED3` | secondary text |
| `--faint` | `#8A90A8` | labels, line numbers |
| `--js` | `#F0C43F` | JavaScript color (dark text on it) |
| `--react` | `#61DAFB` | React color (dark text on it) |
| `--ts` | `#3178C6` | TypeScript color (light text on it) |
| `--testing` | `#7BD88F` | Testing color (dark text on it) |
| `--danger` | `#FF8A80` | errors, "Watch out", the Common Mistakes course |
| `--success` | `#C3E88D` | passed tests, completed |

**Light theme** (toggle in the header; remember the choice in localStorage): `--bg #FFFFFF`, sidebar `#FAFAF7`, text `#171A2B`, muted `#555B72`, borders `#E7E5DE`, links `#2457D6`. **Code editors stay dark in both themes.**

**Syntax colors** (editor-style, used everywhere code appears):
keywords `#C792EA` · functions `#82AAFF` · properties `#89DDFF` · strings `#C3E88D` · numbers and parameters `#F78C6C` · JSX tags `#F07178` · TS types `#FFCB6B` · comments `#7F86A8`.

**Rules:**
- Professional documentation feel, in the style of MDN or the Stripe docs: generous whitespace, clear hierarchy, no clutter. Animations are tasteful and respect `prefers-reduced-motion`.
- Code blocks look like a real editor: a file tab with a small language badge, line numbers, Copy, Reset (shown only when edited), and ▶ Run.
- Badges: **"Used in React"** (cyan tint) on concepts React relies on, and **"Watch out"** (coral tint) on gotchas.
- **No default-styled HTML anywhere.** UI is built from shadcn/ui components in `src/components/ui`, themed with the tokens above. Tailwind's Preflight removes browser defaults, and every Markdown element in MDX (headings, `p`, `a`, lists, tables, `code`, `blockquote`, `hr`) maps to a styled component.
- Fully responsive. On mobile the sidebar becomes a drawer. Drag-and-drop questions also work with touch and keyboard.
- Accessible: keyboard navigation, visible focus rings, `aria` labels, 4.5:1 text contrast.

---

## 3. Site structure and pages

```
/                          Home: hero, track cards, course cards with progress, XP/streak, "Continue where you left off"
/tracks                    All tracks
/tracks/:track             Track overview: its courses in order, progress, boss challenge, certificate
/courses                   All courses
/courses/:course           Course overview: description, lesson list with ✓ status, progress bar
/courses/:course/:lesson   Lesson page
/project                   "Build a real website" track overview (MiniShop)
/project/:step             Project step page
/reference                 JS Quick Reference (searchable cheat sheet; see section 9)
/progress                  Your progress: XP, streak, badges, certificates, per-course bars, scores, reset
/certificates/:track       A printable track certificate
*                          404
```

**Global layout:**
- **Header:** logo + "E School", search box (opens a command palette with `/` or `Ctrl/Cmd + K`), XP and streak, theme toggle.
- **Left sidebar** (lesson and project pages): the course's lessons, each with a ✓ when completed. The active lesson is highlighted, and **the sidebar auto-scrolls so the active item is always in view.**
- **Right "On this page" TOC** on lesson pages, with scrollspy. It also auto-scrolls to keep the active heading in view. Hidden below 1180px.
- **Bottom of every lesson:** "Mark as complete", plus ← Previous / Next → links.
- Breadcrumbs: `Courses / JavaScript Basics / Arrays`.

---

## 4. Content model

Store content as files, never hard-coded in components:

```
src/content/
  tracks.ts                     // tracks: id, title, color, ordered course ids, boss challenge
  courses.ts                    // course manifest: id, title, color, description, ordered lesson ids
  courses/<course>/NN-*.mdx     // one file per lesson (a course's last lesson is its review)
  reference/js-reference.txt    // the JS Quick Reference
  project/NN-*.mdx              // the website track steps
```

**Lesson frontmatter:**
```yaml
---
id: arrays
title: Arrays
summary: Store lists and transform them with map, filter and reduce.
minutes: 12
tags: [arrays, map, filter, reduce]
---
```

**MDX components available inside lessons** (build them as reusable React components):

| Component | Purpose |
|---|---|
| `<Concept name="map()" react warn>` | A heading-level concept block: name, badges, anchor link |
| `<Playground lang="js" file="map.js" expected={...}>` | Runnable JS example (worker runner, section 5). Shows the expected output before the first run. |
| `<TSPlayground file="cart.ts">` | Monaco with live TypeScript diagnostics; Run transpiles and executes the code in the worker |
| `<ReactPlayground files={...}>` | Sandpack with an editor and live preview |
| `<Exercise>` | "Your turn": write or fix code; hidden tests check it (section 6) |
| `<TestExercise>` | The student **writes the tests**; they run against the correct implementation and against hidden buggy versions (section 6) |
| `<Quiz>` | Multiple-choice questions (single or multi-select) with explanations (section 7) |
| Question components | One per question type in 0.3: `<Predict>`, `<FillBlanks>`, `<OrderLines>`, `<MatchPairs>`, `<SortBuckets>`, `<SpotTheBug>`, `<TraceState>`, `<CodeReview>`, `<TrueFalse>`, `<BuildUI>`, … |
| `<GoDeeper title>` / `<HowItWorks>` | The deep layer: expandable and always-visible deep-dive sections |
| Visualizers | Interactive diagrams, e.g. `<EventLoop>`, `<RenderCycle>`, `<EffectTimeline>` |
| `<Callout type="tip/warn/react">` | Short highlighted note |
| `<Compare>` | Side-by-side "Wrong" vs. "Right" code, each with a one-line result caption |

**Writing rules for all content:**
- One concept per section. **One short sentence** explains it, then code. Depth goes below, in "How it works" and "Go deeper".
- Every concept has runnable code that prints with `console.log` (or a live preview for React).
- Use the shopping cart in examples whenever it fits.
- No walls of text in the first layer. A lesson takes at least 10–15 minutes; split big topics into more lessons.
- Mark React-relevant concepts with the `react` badge and gotchas with `warn`.
- Every lesson mixes at least 3 question types (0.3).

---

## 5. JavaScript runner (Web Worker sandbox): exact requirements

Build `src/runner/` as an isolated, fully tested module. **It must never freeze or crash the page.**

**How it runs:**
- Each run creates a new `Worker` from a Blob URL containing a prelude plus the user code wrapped in `(async () => { ... })()`, so top-level `await` works.
- **Prelude:**
  - `console.log/info/warn/error` that post formatted lines to the page.
  - A **simulated `fetch`** that returns mock JSON after about 250 ms (configurable per lesson).
  - An in-memory **`localStorage`** shim.
  - An `unhandledrejection` handler.

**Output formatting:** Node/devtools style.
- Arrays print as `[ 8, 6, 10 ]` and objects as `{ name: 'Coffee', qty: 2 }`.
- Nested strings are quoted; top-level strings print raw.
- Errors print as `Uncaught TypeError: …` in red.

**Safety limits** (one exported config object):
- `MAX_LINES = 200`: when exceeded, stop the worker and show **"Stopped after 200 lines of output. Is a loop running forever?"** The limit must also work when the user's logging loop is wrapped in `try/catch`.
- `MAX_MS = 4000`: a hard timeout that terminates the worker and shows **"Stopped: the code ran for more than 4 seconds. Is there an infinite loop?"**
- `AFTER_MS = 1500`: after the main code finishes, keep the worker alive this long so timers can print, then terminate it.
- `MAX_CHARS = 2000` per line, then append `… (N more characters)`.
- `MAX_ITEMS = 100` array items or object keys shown, then append `… N more items`.

**Page side:**
- Buffer incoming lines and render at most once per animation frame.
- Never render more than `MAX_LINES`.
- The console panel has a max height (about 320px) and auto-scrolls.
- A new Run cancels the previous run. Disable the Run button while running.
- `Ctrl/Cmd + Enter` runs the code.

**Editor behavior:**
- The visible highlighted layer and the typing layer must align **character for character**: same font, size, line-height and padding, with ligatures off.
- Auto-indent on Enter, with an extra indent after `{ ( [`.
- Auto-close brackets and quotes; typing a closing character that's already there steps over it.
- Backspace inside an empty pair deletes both characters.
- Tab and Shift+Tab indent and outdent by 2 spaces.
- Keep native undo working (insert text through `execCommand('insertText')` with a fallback).

**Tests (Vitest):**
- The formatter.
- Each limit: infinite logging loop, silent `while(true)`, a `setInterval` that's never cleared, a logging loop inside `try/catch`, a 100k-character string, a 5,000-item array.
- Async code and the simulated `fetch`.
- Syntax errors.

---

## 6. Exercises with automatic checking

An `<Exercise>` has: a title, a one-sentence task, starter code, **hidden tests**, progressive hints (revealed one at a time), and a solution (revealed behind a "Show solution" confirmation). "Fix the bug" exercises start from broken code; "write from scratch" exercises start almost empty.

- **JS exercises:** the student's code and the tests run together in the worker runner, using the built-in mini test API below. Show each test as ✓ or ✗ with the expected vs. received value.
- **TS exercises:** must have no type errors (from Monaco diagnostics) **and** pass the tests.
- **React exercises** and **Build the UI:** use Sandpack's test runner with React Testing Library.
- Passing an exercise marks it complete, awards XP and shows a small success state.
- Example: *"Write `getTotal(cart)` that returns the sum of `price * qty`"*, with tests for an empty cart, one item, several items and decimal prices.

### Running tests in the browser

- **Plain JS/TS tests:** the worker runner's mini test API mirrors Vitest's, so code students write here works unchanged in a real project:
  - `describe`, `test` / `it`, `expect` with `toBe`, `toEqual`, `toContain`, `toHaveLength`, `toThrow`, `toBeTruthy` (and `.not`)
  - `vi.fn()` with `toHaveBeenCalled` / `toHaveBeenCalledWith`
  - basic fake timers: `vi.useFakeTimers()`, `vi.advanceTimersByTime()`, `vi.useRealTimers()`
  - Results look like a test runner: ✓/✗ per test, grouped by `describe`, with test names, expected vs. received on failures, and a summary such as **"3 passed, 1 failed"**.
- **React tests:** Sandpack's test runner (`SandpackTests`) with React Testing Library and `@testing-library/jest-dom`. Hidden exercise tests simulate users with `fireEvent`: `@testing-library/user-event` v14 crashes Sandpack's runner ("The provided value is not of type 'Element'"), so the Testing course must either find a version that runs there or show `user-event` in read-only code with recorded output. Likely cause (found in Phase 6): the runner mixes realms, rendering into jsdom while exposing some browser globals. `FormData` was one (now shimmed by a hidden test prelude); try shimming `getComputedStyle` and friends the same way before giving up on user-event.
- The same safety limits apply to every test run (timeouts, output caps).

### `<TestExercise>`: the student writes the tests

The student is given a function or component and writes tests for it. The checker runs those tests:
1. against the **correct** implementation: all tests must pass;
2. against **at least 3 hidden buggy versions** (for example an off-by-one in the total, ignoring `qty`, or `remove` deleting the wrong item): each bug should make at least one test fail.

Show the result as **"Your tests caught 4 of 5 bugs"**, and reveal a hint for each bug they missed. It passes when the tests pass on the correct version and catch every bug. This teaches what a *good* test is, not just how to write one. JS/TS test exercises run in the worker; React ones run in Sandpack.

---

## 7. Quizzes and questions

- Every lesson has questions of **at least 3 types** (0.3), and every course ends with a **review quiz** that mixes types across the whole course. Every track ends with a **boss challenge**.
- At least 3 questions per lesson quiz; plausible wrong answers; multi-select where it fits.
- Every question gives instant feedback with an explanation, and a helpful hint on a wrong answer.
- Includes "What does this code print?" and "Which hook do I need here?" style questions.
- Scores and results are stored in progress and earn XP.

---

## 8. Progress and gamification

- A `ProgressStore` interface (`getLesson`, `markComplete`, `saveQuizScore`, `saveExerciseResult`, `saveQuestionResult`, `getCourseProgress`, `reset`, …) with a **localStorage implementation**. Design it so a Supabase implementation can replace it later without touching components.
- Wrap all storage in try/catch, and render normally if storage is unavailable.
- **Gamification:** XP for completed lessons, passed exercises, correct answers and boss challenges; a daily **streak**; **badges** for milestones; and a **certificate** per completed track. Store only the raw facts (what was completed and when) and derive XP, streaks and badges from them, so the rules can change without migrating data.
- Use progress on the home page ("Continue where you left off", XP, streak), on track and course cards (progress bars), in the sidebar (✓ marks) and on the `/progress` page. Every course is tracked.

---

## 9. Search and the JS Quick Reference

- **Command palette search:** results grouped by course (all courses), plus the reference, matching lesson titles, concept names, tags and code. Arrow keys plus Enter navigate, and it jumps to the exact concept anchor.
- **`/reference` page:** a one-page JavaScript cheat sheet with at least the 78 entries in 10 sections from my `js-reference.html` (Basics; Conditions & loops; Functions; Arrays; Objects; Strings; Async; DOM & events; Modules & extras; Gotchas), ported with its behavior. Add entries as the JavaScript track grows. DOM and `import`/`export` examples can't run in the worker, so they're marked "Runs in a browser page" and show the browser output instead of a Run button.

---

## 10. Curriculum, organized in tracks

Every lesson mixes at least 3 question types; every course ends with a review quiz and has exercises; every track ends with a boss challenge and a certificate. Use the shopping cart wherever it fits. The lists below are minimums (0.1).

### Track 1 — JavaScript (yellow)

**Course 1 — JavaScript Basics**
1. Variables & types: `let`/`const`, `typeof`, template literals
2. Operators & comparisons: math, `===` vs `==`, truthy/falsy
3. Conditions: `if`/`else`, ternary, `&&` and `||`, `switch`
4. Loops: `for`, `for...of`, `while`
5. Functions: declarations, arrow functions, default and rest parameters, early return
6. Callbacks & closures
7. Arrays I: `push`/`pop`, `forEach`, `map`, `filter`
8. Arrays II: `reduce`, `find`, `some`/`every`, `includes`, `slice`, `sort`, `join`
9. Objects: literals, shorthand, destructuring, spread, `Object.keys/values/entries`, computed keys, `?.`, `??`
10. Strings: `trim`, case, `includes`/`startsWith`, `split`, `replace`, `slice`, `toFixed`
11. Review quiz

**Course 2 — Modern JavaScript**
1. Spread, rest & destructuring in depth: why copying matters for React
2. Timers & promises: `setTimeout`, `setInterval`, `Promise`
3. `async`/`await`, `fetch`, `res.ok`, `try/catch`, `Promise.all`
4. Modules: `import`/`export`, default vs. named
5. The DOM & events: `querySelector`, `textContent`, `addEventListener`, `preventDefault`, `classList`, `createElement`
6. JSON & `localStorage`
7. JavaScript gotchas: `"5" + 1`, `0.1 + 0.2`, `typeof null`, references, `const` isn't frozen, missing `return` in `{ }`
8. Review quiz

**Course 3 — JavaScript in Depth**
Scope and hoisting (`var`/`let`/`const`, the temporal dead zone); `this` (`call`/`apply`/`bind`, arrow functions); classes and prototypes; the event loop with a visualizer (call stack, task queue, microtasks); `Map`/`Set` (and `WeakMap`); iterators and generators; error handling (error types, custom errors, `finally`, async errors); regex basics; dates and `Intl` formatting; modern syntax (logical assignment, `structuredClone`, `at()`, `toSorted()`/`with()`, `Object.groupBy`, …); review quiz.

**Boss challenge** + JavaScript certificate.

### Track 2 — TypeScript (blue)

**Course — TypeScript Basics:** why TypeScript (the `"5" + 1` bug React can't catch); basic types and inference; objects, `type` vs. `interface`, optional properties; union and literal types, narrowing; typing functions; arrays and tuples; enums (and union alternatives); review quiz.

**Course — TypeScript in Depth:** generics in depth (`Array<Item>`, `first<T>()`, constraints, defaults); `keyof`, `typeof` and indexed access; utility types (`Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `ReturnType`, `Parameters`, `NonNullable`, `Awaited`); type guards and assertion functions; discriminated unions and exhaustive checks; `satisfies`; `tsconfig`; declaration files and `@types`; review quiz.

**Course — TypeScript with React:** typing props and children, state (`useState<Item[]>`), events, refs, `useReducer` actions as a discriminated union, context, custom hooks, generic components; review quiz.

**Boss challenge** + TypeScript certificate.

### Track 3 — React (cyan), with Hooks and Testing

**Course — Why React?** (the bridge, based on my deck "From JS to React & TypeScript"): build the cart in vanilla JS; feel the pain (one click means three manual updates, and the list, total and badge get out of sync); see the same cart in React, where the UI is a function of state; before/after: four lines vs. one `setCart()`.

**Course — React Fundamentals:** components and JSX; props, typed props and children; state with `useState` (never mutate state); events; lists and keys; conditional rendering; forms and controlled inputs; lifting state up; composition; review quiz.

**Course — React Hooks** (based on my deck "React Hooks Explained"): why hooks exist (class components vs. functions); **every built-in hook (0.4)**, each with its own lesson or section, visual explanations (state update flow, the `useEffect` timeline) and exercises; custom hooks (build `useCart()`); the Rules of Hooks; review quiz.

**Course — How React Works:** rendering and reconciliation (render cycle visualizer); `memo`, `useMemo`, `useCallback` and performance; Suspense and `lazy`; error boundaries; portals; refs, `forwardRef` and ref as a prop in React 19; StrictMode; review quiz.

**Course — React 19:** Actions, `use`, `useActionState`, `useOptimistic`, `useFormStatus`, form actions, document metadata; review quiz.

**Course — The React Ecosystem:** React Router; data fetching with TanStack Query; forms with React Hook Form + Zod; state management (Context vs. Zustand vs. Redux Toolkit); accessibility; performance profiling; review quiz.

**Course — Common React Mistakes (coral)** (based on my deck "Common React Mistakes"): one section per mistake, each with a `<Compare>` (wrong vs. right) and a "Why": mutating state directly; a missing or index `key`; stale state (`setQty(qty + 1)` twice); a `useEffect` with no dependency array that loops forever; a missing dependency (`react-hooks/exhaustive-deps`); calling a function in `onClick`; reading state right after setting it; storing derived state. Ends with a "Before you push" checklist and a review quiz.

**Course — Testing (green):** interns learn to test plain functions and React components the way real teams do, using the cart. Use `<TestExercise>` wherever the student should write the tests.
1. **Why test?** Clicking around by hand vs. automated tests. The testing pyramid (unit, integration, end-to-end).
2. **Vitest basics:** `describe`, `test`/`it`, `expect`; `toBe` vs. `toEqual`, `toContain`, `toHaveLength`, `toThrow`. Test `getTotal(cart)` and `formatPrice()`.
3. **Edge cases & test-first:** empty cart, decimals, negative quantities. Write the test first, watch it fail, then make it pass.
4. **Testing reducers:** test `cartReducer` action by action.
5. **Async tests & mocking:** `async` tests, `vi.fn()`, mocking `fetch`, `vi.useFakeTimers()`.
6. **React Testing Library:** `render`, `screen`, query priority (`getByRole` first, `getByTestId` last). Test behavior, not implementation details.
7. **User interactions:** `@testing-library/user-event`; `findBy…` for async UI; jest-dom matchers like `toBeInTheDocument`.
8. **Testing hooks & context:** `renderHook` for `useCart()` and other custom hooks, and a `renderWithProviders()` helper that wraps components in `CartProvider`.
9. **Mocking APIs with MSW:** the loading, success and error states of the product list.
10. **Accessibility testing** with `jest-axe`.
11. **Coverage reports:** reading them, and why 100% isn't the goal.
12. **What to test and what not to test.**
13. **End-to-end with Playwright:** one test for the full checkout flow. Read-only (code plus recorded output), because Playwright can't run in the browser. Explain how to run it locally.
14. **Common testing mistakes:** testing implementation details, `getByTestId` everywhere, forgetting `await`, snapshot overuse, `act()` warnings, and tests that pass even when the code is broken.
15. Review quiz.

**Boss challenge** + React certificate.

### Track 4 — Build a real website with React

MiniShop grows from a vanilla-JS cart into a complete, deployed multi-page site (section 11).

---

## 11. Track 4 — "Build a real website with React" (MiniShop, step by step)

Each step page has:
- **Goal:** one sentence, plus a screenshot or mock of the expected result
- **What you'll practice:** links back to the relevant lessons
- **Starter code:** in Sandpack, with a live preview
- **Tasks:** a checklist the student ticks off
- **Hints:** revealed one at a time
- **Check:** automated tests where possible
- **Solution:** revealed behind a confirmation, with an explanation of the key lines
- **Test it** (from step 3 onward): a task to write tests for what was just built

The code from step N becomes the starter code of step N+1. At least these steps:
1. **Static cart in vanilla JS:** render a hard-coded cart with `map` and `join` into the DOM, with a total.
2. **Add-to-cart buttons in vanilla JS:** events and manual DOM updates. The student should *feel* the sync problem.
3. **Move to React:** a `ProductList` and a `Cart` component with props.
4. **State:** `useState` cart, add and remove items, quantity +/–, and a derived total (no total state).
5. **`useReducer`:** cart logic in `cartReducer` with actions `add`, `remove`, `setQty` and `clear`.
6. **`useEffect` + persistence:** save the cart to `localStorage` and load it on start.
7. **Fetching products:** loading and error states, then TanStack Query.
8. **Context or Zustand + custom hook:** a `useCart()` hook; the header badge reads the cart without prop drilling.
9. **TypeScript:** convert to `.tsx`; type `Product`, `CartItem`, the reducer actions and the props.
10. **Routing:** React Router with a home page, product list, product detail pages, cart page and 404.
11. **Checkout:** a multi-field form with React Hook Form + Zod validation, an empty state and an order summary.
12. **Polish:** loading skeletons, error boundaries, accessibility, animations.
13. **Test MiniShop:** unit tests for `cartReducer`, Testing Library tests for `Cart` and `ProductList`, MSW for product fetching, `jest-axe`, and one Playwright test for checkout.
14. **Deploy to Vercel:** build, environment, SPA rewrites, preview deployments.

It ends with a "What's next" page: a real backend, authentication and payments.

---

## 12. Quality bar

- TypeScript strict, with no `any` in app code.
- Components are small and reusable. Content lives in MDX and manifests, never hard-coded in components.
- Unit tests for the runner (including the mini test API), the exercise checker, the `<TestExercise>` checker, every question type's checking logic, the progress store and gamification rules, and search indexing. Every runnable example is run by a test and must print its expected output. Playwright smoke tests cover the main flows.
- Lighthouse: performance and accessibility at least 90 on the home and lesson pages.
- A `README.md` covering how to run the project, how to add a lesson (with a copyable MDX template), how to add each kind of question and exercise, and how to deploy.
- Clear commit history, one commit per meaningful step.

---

## 13. Phases — summarize each one, then go straight on to the next

**Phase 1 — Platform + JavaScript Basics** ✅
- Scaffold, design system, layout, routing, theme, worker runner, core lesson components, progress, search, Course 1.

**Phase 2 — Modern JS + the JS Quick Reference** ✅
- Course 2 and the `/reference` page.

**Phase 3 — The learning engine** ✅
- Tracks (`/tracks`, `/tracks/:track`) and the track manifest.
- Every question type that runs in the worker or the page (all of 0.3 except Build the UI and React test exercises, which need Sandpack), with instant feedback, hints and XP.
- The depth layer (`<HowItWorks>`, `<GoDeeper>`) and the visualizer foundation, with the first visualizers.
- Gamification: XP, streaks, badges, certificates; progress page and header updates.
- Courses 1 and 2 upgraded: at least 3 question types per lesson, "Go deeper" sections, and a review quiz per course.

**Phase 4 — The JavaScript track, complete** ✅
- Course 3 (JavaScript in Depth) with the event loop visualizer, new reference entries, the JS boss challenge and certificate.

**Phase 5 — React foundations** ✅
- `ReactPlayground` (Sandpack), React exercises with Sandpack tests, Build the UI questions, the render cycle visualizer.
- Why React?, React Fundamentals, How React Works.

**Phase 6 — Hooks and React 19** ✅
- The React Hooks course (every built-in hook) and the React 19 course, with the state update and `useEffect` timeline visualizers.

**Phase 7 — The React ecosystem + Common Mistakes** ✅
- The React Ecosystem course and Common React Mistakes.

**Phase 8 — The TypeScript track**
- `TSPlayground` (Monaco with live diagnostics) and TS exercises; the three TypeScript courses, boss challenge and certificate.

**Phase 9 — Testing**
- The full Vitest-style mini test API, `<TestExercise>` (worker and Sandpack), the Testing course, the React track boss challenge and certificate.

**Phase 10 — Build a real website with React**
- All MiniShop steps through deployment, with checks, "Test it" tasks and solutions.

**Phase 11 — Polish**
- Responsive pass, accessibility, Lighthouse, animations review, README and deploy configuration.

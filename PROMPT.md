# Build "E School" — an interactive JS → TypeScript → React learning platform

You are building a production-quality learning website for **beginner developers on an internship** who already know a little JavaScript but struggle with it, and who need to get productive in **React and TypeScript fast**.

Every lesson teaches **one idea**: a short explanation, then runnable code. One running example ties the whole school together: a **mini shopping cart** (items with `id`, `name`, `price`, `qty`; a list, a total, a badge). Students meet it in the JavaScript lessons, rebuild it in React, type it with TypeScript, test it the way real teams do, and finish by building (and testing) it as a full app in the final project.

Work in **phases** (see the end of this file). **Stop after each phase**, summarize what you built, and wait for my review before you continue.

---

## 1. Tech stack

- **Vite + React 19 + TypeScript** (strict mode), on current stable versions
- **Tailwind CSS v4** (`@tailwindcss/vite`) for all styling
- **shadcn/ui** (Radix primitives + `class-variance-authority`, `lucide-react` icons) for UI components
- **React Router** for routing
- **MDX** (`@mdx-js/rollup`) for lesson content, with frontmatter (`remark-frontmatter` + `remark-mdx-frontmatter`)
- **Sandpack** (`@codesandbox/sandpack-react`) for live **React** previews and project steps
- **Monaco Editor** (`@monaco-editor/react`) for **TypeScript** lessons, so students see **real type errors** (red squiggles plus a problems list) using Monaco's built-in TypeScript diagnostics
- A **custom Web Worker runner** for plain JavaScript examples and exercises (spec in section 5), with a mini test API that mirrors Vitest (section 6)
- **Testing course content:** React Testing Library, `@testing-library/user-event` and `@testing-library/jest-dom` inside Sandpack's test runner; **MSW** (`msw`) for API mocking in the Testing course and the final project
- **MiniSearch** (or Fuse.js) for full-text search across lessons
- **Vitest** + Testing Library for unit tests; **Playwright** for a small smoke test
- ESLint + Prettier
- The design tokens in section 2 are CSS variables mapped into Tailwind's theme (`@theme`) and shadcn's semantic tokens (`background`, `foreground`, `card`, `border`, `ring`, …). A small amount of plain CSS is fine where Tailwind can't reach, such as the editor's aligned layers and third-party editors.
- Deployable to **Vercel or Netlify** as a static site (include the SPA rewrite config)

Lazy-load heavy parts per route: Sandpack, Monaco and the search index should only load on the pages that use them.

---

## 2. Design system (match my existing course materials exactly)

The school must look like my existing slide decks and JS reference: a dark-navy "code editor" aesthetic with one brand color per language.

**Fonts** (Google Fonts): `Inter` for body text, `Space Grotesk` for headings, `JetBrains Mono` for code. Turn off font ligatures in editors.

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
| `--js` | `#F0C43F` | JavaScript course color (dark text on it) |
| `--react` | `#61DAFB` | React course color (dark text on it) |
| `--ts` | `#3178C6` | TypeScript course color (light text on it) |
| `--testing` | `#7BD88F` | Testing course color (dark text on it) |
| `--danger` | `#FF8A80` | errors, "Watch out", the Common Mistakes course |
| `--success` | `#C3E88D` | passed tests, completed |

**Light theme** (toggle in the header; remember the choice in localStorage): `--bg #FFFFFF`, sidebar `#FAFAF7`, text `#171A2B`, muted `#555B72`, borders `#E7E5DE`, links `#2457D6`. **Code editors stay dark in both themes.**

**Syntax colors** (editor-style, used everywhere code appears):
keywords `#C792EA` · functions `#82AAFF` · properties `#89DDFF` · strings `#C3E88D` · numbers and parameters `#F78C6C` · JSX tags `#F07178` · TS types `#FFCB6B` · comments `#7F86A8`.

**Rules:**
- Professional documentation feel, in the style of MDN or the Stripe docs: generous whitespace, clear hierarchy, no clutter.
- Code blocks look like a real editor: a file tab with a small language badge, line numbers, Copy, Reset (shown only when edited), and ▶ Run.
- Badges: **"Used in React"** (cyan tint) on concepts React relies on, and **"Watch out"** (coral tint) on gotchas.
- **No default-styled HTML anywhere.** UI is built from shadcn/ui components in `src/components/ui` (`Button`, `Input`, `Card`, `Badge`, `Progress`, `Dialog`, `Command`, `Sheet`, `Tooltip`, …), themed with the tokens above. The search palette uses shadcn's `Command` and the mobile sidebar uses `Sheet`. Tailwind's Preflight removes browser defaults, and every Markdown element in MDX (headings, `p`, `a`, lists, tables, `code`, `blockquote`, `hr`) maps to a styled component.
- Fully responsive. On mobile the sidebar becomes a drawer.
- Accessible: keyboard navigation, visible focus rings, `aria` labels, 4.5:1 text contrast.

---

## 3. Site structure and pages

```
/                       Home: hero, course cards with progress (one per course, including Testing), "Continue where you left off"
/courses                All courses
/courses/:course        Course overview: description, lesson list with ✓ status, progress bar
/courses/:course/:lesson   Lesson page
/project                Final project overview
/project/:step          Project step page
/reference              JS Quick Reference (searchable cheat sheet; see section 9)
/progress               Your progress: per-course bars, completed lessons, quiz scores, reset button
*                       404
```

**Global layout:**
- **Header:** logo + "E School", search box (opens a command palette with `/` or `Ctrl/Cmd + K`), theme toggle.
- **Left sidebar** (lesson and project pages): the course's lessons, each with a ✓ when completed. The active lesson is highlighted, and **the sidebar auto-scrolls so the active item is always in view.**
- **Right "On this page" TOC** on lesson pages, with scrollspy. It also auto-scrolls to keep the active heading in view. Hidden below 1180px.
- **Bottom of every lesson:** "Mark as complete", plus ← Previous / Next → links.
- Breadcrumbs: `Courses / JavaScript Basics / Arrays`.

---

## 4. Content model

Store content as files, never hard-coded in components:

```
src/content/
  courses.ts                    // course manifest: id, title, color, description, ordered lesson ids
  courses/
    js-basics/
      01-variables.mdx
      02-types.mdx
      ...
    modern-js/ ...
    typescript/ ...
    react/ ...
    hooks/ ...
    mistakes/ ...
    testing/ ...
  project/
    01-static-cart.mdx
    ...
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
| `<Exercise>` | "Your turn" task with starter code, hidden tests, hints and a solution (section 6) |
| `<TestExercise>` | The student **writes the tests**; they run against the correct implementation and against 3–5 hidden buggy versions (section 6) |
| `<Quiz>` | 3–5 multiple-choice questions with explanations (section 7) |
| `<Callout type="tip/warn/react">` | Short highlighted note |
| `<Compare>` | Side-by-side "Wrong" vs. "Right" code, each with a one-line result caption |

**Writing rules for all content:**
- One concept per section. **One short sentence** explains it, then code.
- Every concept has runnable code that prints with `console.log`.
- Use the shopping cart in examples whenever it fits.
- No walls of text. Lessons should take 10–15 minutes.
- Mark React-relevant concepts with the `react` badge and gotchas with `warn`.

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

An `<Exercise>` has: a title, a one-sentence task, starter code, **hidden tests**, up to 3 progressive hints (revealed one at a time), and a solution (revealed behind a "Show solution" confirmation).

- **JS exercises:** the student's code and the tests run together in the worker runner, using the built-in mini test API below. Show each test as ✓ or ✗ with the expected vs. received value.
- **TS exercises:** must have no type errors (from Monaco diagnostics) **and** pass the tests.
- **React exercises:** use Sandpack's test runner with React Testing Library.
- Passing an exercise marks it complete and shows a small success state. No confetti overload.
- Example: *"Write `getTotal(cart)` that returns the sum of `price * qty`"*, with tests for an empty cart, one item, several items and decimal prices.

### Running tests in the browser

- **Plain JS/TS tests:** the worker runner's mini test API mirrors Vitest's, so code students write here works unchanged in a real project:
  - `describe`, `test` / `it`, `expect` with `toBe`, `toEqual`, `toContain`, `toHaveLength`, `toThrow`, `toBeTruthy` (and `.not`)
  - `vi.fn()` with `toHaveBeenCalled` / `toHaveBeenCalledWith`
  - basic fake timers: `vi.useFakeTimers()`, `vi.advanceTimersByTime()`, `vi.useRealTimers()`
  - Results look like a test runner: ✓/✗ per test, grouped by `describe`, with test names, expected vs. received on failures, and a summary such as **"3 passed, 1 failed"**.
- **React tests:** Sandpack's test runner (`SandpackTests`) with React Testing Library, `@testing-library/user-event` and `@testing-library/jest-dom`.
- The same safety limits apply to every test run (timeouts, output caps).

### `<TestExercise>`: the student writes the tests

The student is given a function or component and writes tests for it. The checker runs those tests:
1. against the **correct** implementation: all tests must pass;
2. against **3–5 hidden buggy versions** (for example an off-by-one in the total, ignoring `qty`, or `remove` deleting the wrong item): each bug should make at least one test fail.

Show the result as **"Your tests caught 4 of 5 bugs"**, and reveal a hint for each bug they missed. It passes when the tests pass on the correct version and catch every bug. This teaches what a *good* test is, not just how to write one. JS/TS test exercises run in the worker; React ones run in Sandpack.

---

## 7. Quizzes

- 3–5 multiple-choice questions per lesson. Exactly one correct answer, with plausible wrong answers.
- Shows an explanation after each answer, and a score at the end with a "Retry" button.
- Includes "What does this code print?" and "Which hook do I need here?" style questions.
- The best score is stored in progress.

---

## 8. Progress

- Write a `ProgressStore` interface (`getLesson`, `markComplete`, `saveQuizScore`, `saveExerciseResult`, `getCourseProgress`, `reset`) with a **localStorage implementation** now. Design it so a Supabase implementation can replace it later without touching components.
- Wrap all storage in try/catch, and render normally if storage is unavailable.
- Use progress on the home page ("Continue where you left off"), on course cards (progress bars), in the sidebar (✓ marks) and on the `/progress` page. Every course is tracked, including Testing, and `<TestExercise>` results are saved like other exercises.

---

## 9. Search and the JS Quick Reference

- **Command palette search:** results grouped by course (all courses, including Testing), matching lesson titles, concept names, tags and code. Arrow keys plus Enter navigate, and it jumps to the exact concept anchor.
- **`/reference` page:** a one-page JavaScript cheat sheet with about 78 entries in 10 sections:
  - Basics
  - Conditions & loops
  - Functions
  - Arrays
  - Objects
  - Strings
  - Async
  - DOM & events
  - Modules & extras
  - Gotchas

  Each entry has a name, one sentence, a runnable example and its expected output. **I am attaching my existing reference page (`js-reference.html`). Port its content and behavior into this page and into the JS lessons.** DOM and `import`/`export` examples can't run in the worker, so mark them "Runs in a browser page" and show the browser output instead of a Run button.

---

## 10. Curriculum

Every course ends with a quiz and at least one exercise. Use the shopping cart wherever it fits.

### Course 1 — JavaScript Basics (yellow)
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

### Course 2 — Modern JavaScript (yellow)
1. Spread, rest & destructuring in depth: why copying matters for React
2. Timers & promises: `setTimeout`, `setInterval`, `Promise`
3. `async`/`await`, `fetch`, `res.ok`, `try/catch`, `Promise.all`
4. Modules: `import`/`export`, default vs. named
5. The DOM & events: `querySelector`, `textContent`, `addEventListener`, `preventDefault`, `classList`, `createElement`
6. JSON & `localStorage`
7. JavaScript gotchas: `"5" + 1`, `0.1 + 0.2`, `typeof null`, references, `const` isn't frozen, missing `return` in `{ }`

### Course 3 — Why React? (cyan) — the bridge lesson
This is based on my deck "From JS to React & TypeScript":
- Build the cart in vanilla JS.
- Feel the pain: one click means three manual updates, and the list, total and badge get out of sync.
- Then see the same cart in React, where the UI is a function of state.
- End with a before/after comparison: four lines vs. one `setCart()`.

### Course 4 — React (cyan)
1. Components & JSX
2. Props, typed props and children
3. State with `useState`; never mutate state
4. Events
5. Lists & keys
6. Conditional rendering
7. Forms & controlled inputs
8. Lifting state up

### Course 5 — React Hooks (cyan)
This is based on my deck "React Hooks Explained":
1. Why hooks exist: class components vs. functions
2. `useState` in depth: updater functions and stale state
3. `useReducer`: when `useState` gets messy, plus a cart reducer with `dispatch`
4. `useEffect`: syncing with the outside world, the dependency array (`[]`, `[cart]`, none) and cleanup
5. `useRef`: DOM access and values that don't re-render
6. `useContext`: prop drilling vs. a Provider
7. Custom hooks: build `useCart()`
8. Rules of Hooks, plus "learn later": `useMemo` and `useCallback`

### Course 6 — TypeScript (blue)
1. Why TypeScript: the `"5" + 1` bug that React can't catch
2. Basic types & inference
3. Objects, `type` vs. `interface`, optional properties
4. Union types, literal types & narrowing
5. Typing functions
6. Arrays & generics basics: `Array<Item>`, a generic `first<T>()`
7. TypeScript with React: typing props, `useState<Item[]>`, events, `useReducer` actions as a discriminated union

### Course 7 — Common React Mistakes (coral)
This is based on my deck "Common React Mistakes". One lesson-section per mistake, each with a `<Compare>` (wrong vs. right) and a "Why":
1. Mutating state directly
2. A missing or index `key`
3. Stale state: `setQty(qty + 1)` twice
4. A `useEffect` with no dependency array that loops forever
5. A missing dependency (mention `react-hooks/exhaustive-deps`)
6. Calling a function in `onClick`
7. Reading state right after setting it
8. Storing derived state

It ends with a "Before you push" checklist.

### Course 8 — Testing (green)
Goal: interns learn to test plain functions and React components the way real teams do, using the cart they already know. The same lesson rules apply: one concept per section, one short sentence, then runnable code (here the "output" is usually the test results), plus a quiz and at least one exercise per lesson. Use `<TestExercise>` wherever the student should write the tests.
1. **Why test?** Clicking around by hand vs. automated tests. The testing pyramid (unit, integration, end-to-end), kept short.
2. **Vitest basics:** `describe`, `test`/`it`, `expect`; `toBe` vs. `toEqual`, `toContain`, `toHaveLength`, `toThrow`. Test `getTotal(cart)` and `formatPrice()`.
3. **Edge cases & test-first:** empty cart, decimals, negative quantities. Write the test first, watch it fail, then make it pass.
4. **Testing reducers:** test `cartReducer` action by action. Pure functions are the easiest thing to test.
5. **Async tests & mocking:** `async` tests, `vi.fn()`, mocking `fetch`, `vi.useFakeTimers()`.
6. **React Testing Library:** `render`, `screen`, query priority (`getByRole` first, `getByTestId` last). Test behavior, not implementation details.
7. **User interactions:** `@testing-library/user-event` (click "Add to cart", type in an input); `findBy…` for async UI; jest-dom matchers like `toBeInTheDocument`.
8. **Testing hooks & context:** `renderHook` for `useCart()`, and a custom `renderWithProviders()` helper that wraps components in `CartProvider`.
9. **Mocking APIs with MSW:** test the loading, success and error states of the product list.
10. **End-to-end with Playwright:** one test for the full checkout flow. This lesson is read-only (code plus recorded output), because Playwright can't run in the browser. Explain how to run it locally.
11. **Common testing mistakes:** testing implementation details, `getByTestId` everywhere, forgetting `await`, snapshot overuse, `act()` warnings, and tests that pass even when the code is broken.

---

## 11. Final project — "Build MiniShop" (step by step)

A guided project in 11 steps. Each step page has:
- **Goal:** one sentence, plus a screenshot or mock of the expected result
- **What you'll practice:** links back to the relevant lessons
- **Starter code:** in Sandpack, with a live preview
- **Tasks:** a short checklist the student ticks off
- **Hints:** 2–3, revealed one at a time
- **Check:** automated tests where possible
- **Solution:** revealed behind a confirmation, with a short explanation of the key lines
- **Test it** (from step 3 onward): a short task to write 1–2 tests for what was just built

The code from step N becomes the starter code of step N+1.

**Steps:**
1. **Static cart in vanilla JS:** render a hard-coded cart with `map` and `join` into the DOM, with a total.
2. **Add-to-cart buttons in vanilla JS:** events and manual DOM updates. The student should *feel* the sync problem.
3. **Move to React:** a `ProductList` and a `Cart` component with props.
4. **State:** `useState` cart, add and remove items, quantity +/–, and a derived total (no total state).
5. **`useReducer`:** refactor cart logic into `cartReducer` with actions `add`, `remove`, `setQty` and `clear`.
6. **`useEffect` + persistence:** save the cart to `localStorage` and load it on start.
7. **Fetching products:** load products from a mock API with loading and error states (`async`/`await`, `try/catch`).
8. **`useContext` + custom hook:** a `CartProvider` and a `useCart()` hook; the header badge reads the cart without prop drilling.
9. **TypeScript:** convert to `.tsx`. Type `Product`, `CartItem`, the reducer actions (discriminated union) and the props, and fix the errors TS finds.
10. **Polish & checkout:** a checkout form with controlled inputs and validation, an empty state, and an order summary.
11. **Test MiniShop:** unit tests for `cartReducer`, Testing Library tests for `Cart` and `ProductList`, MSW for product fetching, and one Playwright test for checkout.

It ends with a "What's next" page after step 11: React Router, deeper testing, and connecting a real backend.

---

## 12. Quality bar

- TypeScript strict, with no `any` in app code.
- Components are small and reusable. Content lives in MDX and manifests, never hard-coded in components.
- Unit tests for the runner (including the mini test API), the exercise checker, the `<TestExercise>` checker, the progress store and search indexing. A Playwright smoke test opens a lesson, runs an example, passes an exercise and checks that the progress updates.
- Lighthouse: performance and accessibility at least 90 on the home and lesson pages.
- A `README.md` covering how to run the project, how to add a lesson (with a copyable MDX template), how to add an exercise with tests, and how to deploy.
- Clear commit history, one commit per meaningful step.

---

## 13. Phases — stop for my review after each one

**Phase 1 — Platform + JavaScript Basics**
- The scaffold, design system, layout (header, sidebars with auto-scroll, TOC, breadcrumbs), routing and theme toggle.
- The worker runner with all safety limits and its tests.
- The Playground, Concept, Callout, Compare, Quiz and Exercise components.
- The progress store, the home and course pages, and search.
- **Course 1 (JavaScript Basics), complete with quizzes and exercises.**
- *Done when:* I can run the app, complete a lesson, pass an exercise, see my progress on the home page, and search for "reduce".

**Phase 2 — Modern JS + the JS Quick Reference page**
- Course 2 and the `/reference` page, ported from my attached `js-reference.html`.

**Phase 3 — React, Hooks and Why React?**
- `ReactPlayground` (Sandpack) and React exercises with Sandpack tests.
- Courses 3, 4 and 5.

**Phase 4 — TypeScript + Common Mistakes**
- `TSPlayground` (Monaco with live diagnostics) and TS exercises.
- Course 6, plus Course 7 (Common Mistakes).

**Phase 5 — Testing**
- The full Vitest-style mini test API in the worker (`describe`, `vi.fn()`, fake timers, runner-style results and summary).
- `<TestExercise>` with buggy-version checking ("Your tests caught 4 of 5 bugs"), for JS/TS in the worker and React in Sandpack.
- Course 8 (Testing), with a quiz and at least one exercise per lesson. The Testing card on the home page, plus search and progress.

**Phase 6 — Final project**
- All 11 MiniShop steps, with starter code, checks and solutions, the "Test it" tasks from step 3 onward, step 11 "Test MiniShop", and the "What's next" page.

**Phase 7 — Polish**
- The progress page, a responsive pass, accessibility, Lighthouse, the README and deploy configuration.

Before writing code in Phase 1, show me:
1. the folder structure,
2. the list of dependencies with one line on why each is needed,
3. any decision where you'd deviate from this spec, and why.

Then start building.

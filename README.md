# E School

An interactive learning site that takes interns from JavaScript to React, TypeScript and testing, one idea at a time. Every concept has code students can edit and run in the browser, and every lesson ends with a quiz and an exercise checked by hidden tests.

The spec lives in [PROMPT.md](PROMPT.md).

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · shadcn/ui (Radix) · React Router · MDX · MiniSearch · Vitest · Playwright.

Plain JavaScript runs in a sandboxed Web Worker (`src/runner/`) with hard limits on output lines, run time and value size, so student code can never freeze the page. React code runs in [Sandpack](https://sandpack.codesandbox.io/) (CodeSandbox's in-browser bundler, loaded lazily on lessons that use it), so live React previews and React exercises need a network connection.

## Run it

Requires Node 22.22 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (runner, checker, progress, search, every lesson's examples, and every React exercise solution and playground) |
| `npm run test:e2e` | Playwright smoke tests against the production build (set `OFFLINE=1` to skip the Sandpack ones, which need the network) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

The first time you run the e2e tests, install the browser with `npx playwright install chromium`. To run them against a dev server that is already running (no build first), use `npx playwright test -c playwright.dev.config.ts`.

## Project layout

```
src/
  content/
    courses.ts                 course manifest: titles, colors, ordered lesson ids
    courses/<course>/NN-*.mdx  one file per lesson
  runner/                      the Web Worker sandbox, test API and exercise checker
  editor/                      code editor, console, run hook
  components/mdx/              components available inside lessons
  components/ui/               shadcn/ui components
  progress/                    ProgressStore interface + localStorage implementation
  search/                      build-time index extraction + MiniSearch
  pages/                       one file per route
plugins/                       Vite plugins: code-fence → <CodeBlock>, lesson metadata + search index
e2e/                           Playwright smoke tests
```

## Add a lesson

1. Create `src/content/courses/<course>/NN-<slug>.mdx` from the template below.
2. Add its `id` to that course's `lessons` array in `src/content/courses.ts`, in order.
3. Run `npm test`. The content test runs every example and checks that it prints exactly its `expected` output, that every exercise solution passes its tests and that every starter fails them.

```mdx
---
id: my-lesson
title: My lesson
summary: One sentence that says what the student will be able to do.
minutes: 12
tags: [keyword, another keyword]
---

One or two sentences of intro.

<Concept name="map()" react>

One short sentence that explains the concept.

<Playground file="map.js" expected={["[ 8, 6, 10 ]"]}>

```js
const prices = [4, 3, 5];
console.log(prices.map(p => p * 2));
```

</Playground>
</Concept>

<Quiz
  questions={[
    {
      q: "What does this print?",
      code: "console.log([1, 2].map(n => n * 10));",
      options: ["`[ 10, 20 ]`", "`30`", "`[ 1, 2 ]`"],
      answer: 0,
      explain: "`map` returns a new array with every item transformed.",
    },
  ]}
/>
```

### Lesson components

| Component | Use |
| --- | --- |
| `<Concept name id? react? warn?>` | One concept: heading with badges and an anchor. Set `id` when the name has no letters (e.g. `===`). |
| `<Playground file expected browserOnly? fetchMocks? fetchDelay?>` | Runnable example. The code is the fenced block inside it. `expected` is an array of lines; start a line with `Uncaught ` for an error, `~ ` for a muted note. `browserOnly` hides Run for DOM or `import` code. |
| `<Exercise id title hints?>` | "Your turn" (see below). |
| `<Quiz questions={[…]}>` | 3–5 questions: `q`, optional `code`, `options`, `answer` (index), `explain`. Backticks in text become inline code. |
| `<Callout type="tip" \| "warn" \| "react">` | A short highlighted note. |
| `<Compare wrong right wrongFile? rightFile?>` | Two fenced blocks inside: the wrong code first, then the right code. `wrong` and `right` are the one-line captions. |

Every Markdown element (headings, lists, tables, links, inline code…) is styled automatically.

MDX notes: `{` and `<` in normal text start JavaScript or JSX, so put code in backticks. Leave a blank line around fenced code inside components.

## Add an exercise with tests

Put three fenced blocks inside `<Exercise>`, marked `starter`, `tests` and `solution`:

```mdx
<Exercise id="get-total" title="The cart total" hints={["Use reduce.", "Start from 0."]}>

Write `getTotal(cart)` that returns the sum of `price * qty`.

```js starter
function getTotal(cart) {
  return 0;
}
```

```js tests
test("an empty cart totals 0", () => {
  expect(getTotal([])).toBe(0);
});

test("decimal prices", () => {
  expect(getTotal([{ price: 2.2, qty: 3 }])).toBeCloseTo(6.6);
});
```

```js solution
function getTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}
```

</Exercise>
```

- Tests run in the worker together with the student's code, using a Vitest-shaped API (`src/runner/testApi.ts`):
  - `describe` / `test` / `it` (with `.skip`, `.todo`), `beforeEach` / `afterEach` / `beforeAll` / `afterAll` scoped to their `describe`;
  - `expect(x)` with `.not`, `.resolves`, `.rejects` and `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toContain`, `toContainEqual`, `toMatch`, `toHaveLength`, `toHaveProperty`, `toBeInstanceOf`, `toThrow`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeNaN`, `toBeCloseTo`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, plus `expect.any`, `expect.anything`, `expect.objectContaining`, `expect.stringContaining`;
  - mocks: `vi.fn()` (with `mockReturnValue(Once)`, `mockResolvedValue(Once)`, `mockRejectedValue(Once)`, `mockImplementation(Once)`, `mockClear`, `mockReset`), `vi.spyOn`, `vi.stubGlobal`, and the matchers `toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toHaveReturnedWith`;
  - fake timers: `vi.useFakeTimers()`, `vi.advanceTimersByTime(ms)`, `vi.runAllTimers()`, `vi.runOnlyPendingTimers()`, `vi.getTimerCount()`, `vi.setSystemTime(t)` (fakes `Date.now`), `vi.useRealTimers()`.
  - Fake timers, global stubs and spies are restored automatically after every test. Tests can be `async`.
- Tests live in their own block, so helpers like `const cart = …` in the tests never clash with the student's code.
- `tests` and `solution` blocks are never added to the search index.
- Passing marks the exercise as completed in the student's progress.

## React lessons (Sandpack)

React code can't run in the worker, so React lessons use Sandpack components. Every fenced block inside them is a file; name it with `file=` (React files are `.js` with JSX inside, as in Sandpack's templates). A project with an `/App.tsx` runs in Sandpack's `react-ts` template instead, so TypeScript files (`.ts`, `.tsx`, and `.test.tsx` tests) work too, and files can live in folders (`file=/pages/ProductPage.tsx`).

| Component | Use |
| --- | --- |
| `<ReactPlayground height? console?>` | A live editor + preview. Blocks: ````jsx file=/App.js```` (default-export `App`), optional extra components and ````css file=/styles.css````. `console` adds the browser console. |
| `<ReactPlayground template="vanilla">` | Plain HTML + JS: `/index.js` (main, `import "./styles.css"` for styles), `/index.html` (body markup and `<script src="index.js">`), `/styles.css`. |
| `<ReactExercise id title hints? variant?>` | A React exercise. Blocks marked `starter`, `tests` and `solution`, each with `file=`. Hidden Testing Library tests run in Sandpack; passing saves progress. `variant="fix"` labels it "Fix the bug". |
| `<BuildUI id title hints?>` | "Build the UI": a ReactExercise that also shows the finished solution as a live target preview. |
| `<StateTimeline frames title? file?>` | "State is a snapshot": frames `{ render, snapshot: { name: value }, queue?: [{ update, result? }], screen?, line?, out?, note? }` show a render's fixed values, the update queue and the next render. |
| `<EffectTimeline frames title? file?>` | The `useEffect` timeline: frames `{ stage, log?, deps?: [{ name, prev?, next }], screen?, line?, out?, note? }`, with `stage` one of `render`, `commit`, `paint`, `cleanup`, `effect`, `unmount`; `log` lines build up a timeline and `deps` shows React's dependency check. |
| `<RenderCycle frames title? file?>` | Steps through trigger → render → commit over a component tree. Frames: `{ phase, tree: [{ name, depth, state?, status? }], screen?, line?, note? }`, with `status` one of `rendering`, `rendered`, `skipped`, `updated`. An optional fenced block shows the code, with `line` highlighted. |

**npm packages.** A sandbox gets React, React DOM and Testing Library, plus any package from `src/components/react/packages.json` that its files import (React Router, TanStack Query, React Hook Form, Zod, `@hookform/resolvers`, Zustand, Redux Toolkit, react-redux). Lessons never list dependencies. To allow another package, add it to `packages.json` (with a version) and install it as a dev dependency so `npm test` can run the lesson's code; the test generator rejects imports of anything not in that file.

Rules for React exercise tests:

- Import from `@testing-library/react` and `@testing-library/jest-dom`, use `test` and `expect` as globals, and simulate users with **`fireEvent`**. `@testing-library/user-event` v14 crashes Sandpack's test runner, so the generator rejects it.
- Hidden test files get a one-line prelude in Sandpack (`TEST_PRELUDE` in `src/components/react/sandboxFiles.ts`): Sandpack's runner renders into jsdom but exposes the browser's own `FormData`, which rejects jsdom forms and breaks React 19 form actions.
- For async code, wrap waits in `act`: `const wait = (ms) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });`. A component that suspends on first render must be rendered inside an async `act` (`await act(async () => { render(<App />); })`), or React 19 won't retry it when the promise resolves.
- To check solutions inside real Sandpack (its runner differs from Vitest), run `LESSONS=hooks/use-context,react/forms npx playwright test e2e/solutions.spec.ts`.
- Prefer queries by role, label and text (`getByRole`, `getByLabelText`); give elements an `aria-label` when the task needs a stable handle.
- `npm test` first runs `scripts/gen-react-tests.mjs`, which turns every React exercise (solution + tests) and every playground (a "renders without crashing" smoke test, or a "runs" test for vanilla ones) into Vitest + Testing Library tests under `test/react-exercises/` (git-ignored). So a solution that fails its own tests fails the build.
- Question components (`SpotTheBug`, `FillBlanks`, `Choice`, `TraceState`, `CodeReview`, `Compare`) show a ````jsx```` block as JSX. JSX blanks and `fixed` blocks aren't run in the worker; `Predict` must stay plain JavaScript, because its answer is checked by running it.

## TypeScript lessons (Monaco)

TypeScript lessons use [Monaco](https://microsoft.github.io/monaco-editor/), loaded lazily from jsDelivr (pinned in `src/ts/monaco.ts`), with its built-in TypeScript worker. Compiler settings live in `src/ts/options.ts` and are shared with the content tests, which type-check every lesson with the real TypeScript compiler (`test/tsChecker.ts`). Every file is its own module, so examples never clash. React's types load only for `.tsx` lessons.

| Component | Use |
| --- | --- |
| `<TSPlayground file errors? expected? checkOnly?>` | Monaco with live type errors and a Problems panel. Run compiles the code and runs it in the JS worker. `errors={[lines]}` lists the lines that are **meant** to have type errors (the test checks exactly those lines error). `checkOnly` hides Run (TSX, declarations). A `.tsx` file name type-checks with React's types. |
| `<TSExercise id title hints? variant?>` | Blocks: ````ts starter````, ````ts solution````, and at least one of ````ts types```` (hidden type checks appended to the student's code) and ````js tests```` (run on the compiled code). Passing = no type errors, every type check holds, every test passes. Use ````tsx```` blocks for React (type checks only). |

**Hidden type checks.** Code in the `types` block must compile, and a `// @ts-expect-error reason` line must really be an error: if the student's types are too loose (`any`), the directive is "unused", which fails the check and shows the reason. Exercises are scripts that share the checks' scope: declare things at the top level.

**TS questions.** `SpotTheBug`, `FillBlanks` and `Predict` accept ````ts````/````tsx```` blocks. A TS `SpotTheBug`'s `bug` lines must be exactly where the compiler reports errors (add `errorElsewhere` when the cause is on a different line than the error); filled-in TS blanks must type-check; Predict code is compiled before it runs.

## "Write the tests" exercises

The student writes the tests. They must pass on the correct code **and** fail on at least 3 hidden buggy versions; the result reads "Your tests caught 2 of 3 bugs", with each missed bug's hint.

| Component | Blocks |
| --- | --- |
| `<TestExercise id title hints?>` (worker) | ````js code file=cart.js```` (the correct code, shown), ````js starter```` (the tests to start from), 3+ ````js bug title="…" hint="…"```` (each a full buggy version), ````js solution```` (example tests that catch every bug) |
| `<ReactTestExercise id title hints?>` (Sandpack) | the same, with file names: ````jsx code file=/Cart.js````, ````jsx starter file=/Cart.test.js````, ````jsx bug file=/Cart.js title="…" hint="…"````, ````jsx solution file=/Cart.test.js```` |

- In fence metadata, use single quotes inside `title`/`hint` (escaped double quotes fail the content test).
- React test files import from `"vitest"` (`import { expect, test, vi } from "vitest"`). In Sandpack, a hidden local `vitest` package re-exports Jest's globals (`VITEST_SHIM` in `src/components/react/sandboxFiles.ts`); the generated tests use the real Vitest. Use `fireEvent`, not user-event, and avoid `vi` APIs Jest lacks (`vi.stubGlobal`).
- In Sandpack, hidden copies of the student's test file import each buggy version (`/check-N.test.js` → `/__bugs__/bug-N/…`; the copies keep the test file's extension, so `.test.tsx` works), and every suite is re-run after each change. Hidden copies are only rewritten when their code really changes: a run that starts while another is still reporting makes Sandpack's test panel crash. If it crashes anyway, `PanelBoundary` keeps the lesson page alive and the sandbox is rebuilt with the student's latest code.
- `npm test` checks every example: the content test runs worker exercises; `gen-react-tests` writes the React ones to `test/react-exercises` (example tests on the real component) and `test/react-bugs` (each buggy version, wrapped to pass only if a test fails).

## The MiniShop project (track 4)

The "Build a real website with React" track is one course, `minishop`, whose lessons are the project's steps (`src/content/courses/minishop/`). `/project` is its overview page.

| Component | Use |
| --- | --- |
| `<ProjectStep id title goal practice tasks hints? explain?>` | A whole step: the **goal** (one sentence, with a "Preview the finished result" button that runs the solution live), **what you'll practice** (`practice={[["Props", "/courses/react/props"], …]}`), a **task** checklist (ticks are remembered in this browser), then the starter code in Sandpack with hints, hidden tests and the solution. Blocks as in `<ReactExercise>`. `explain` lists notes on the solution's key lines (`<ReactExercise>` takes it too). |
| `<StepIntro goal practice tasks>` | The same top part, for steps whose code is checked another way (TypeScript, tests, deployment). |
| `<ReactPlayground final>` | A step's finished code when it isn't a `ProjectStep` (the TypeScript step). |

Rules the content test enforces:

- **Each step starts from the previous step's finished code.** Every starter file of step N+1 that also exists in step N's final code (its last `ProjectStep`/`ReactExercise` starter + solution, or a `ReactPlayground final`) must be identical. A file the step changes for the student on purpose is marked `starter updated`.
- From step 3 on, every step has a **Test it** task (`<ReactTestExercise>` or `<TestExercise>`).
- Every TypeScript project in a step (the finished code, and each Test it's code plus example tests) **compiles** with the real compiler (`typeCheckProject` in `test/tsChecker.ts`).

Copying a dozen unchanged files into the next step by hand is error-prone, so put a line `%%STARTER%%` where the starter blocks go and run `node scripts/minishop-starter.mjs <step.mdx> <previous-step.mdx>`. A Test it can list the step's own files with `%%CODE:/Cart.tsx,/cartUtils.ts%%` (run the script with the step's file twice).

To check steps in real Sandpack (with the dev server running: `-c playwright.dev.config.ts`), `e2e/solutions.spec.ts` takes `LESSONS=minishop/routing` (the first exercise's solution passes; `lesson@2` for the second), `TESTS=minishop/checkout` (the example tests catch every bug) and `PREVIEWS="minishop/typescript@1=Coffee beans"` (a preview shows that text).

## Questions, depth and visualizers

Every lesson mixes **at least 3 question types** (the content test enforces it). Strings in question props, hints and tasks may use `code`, ``code with a ` inside`` (double backticks, needed for template literals) and **bold**. Put questions anywhere, or group them in `<Practice title="…">`, which shows a "3 of 5 done" bar. Each question needs an `id` that is unique in the lesson; progress, XP and badges are keyed by it.

| Component | Key props | Code inside |
| --- | --- | --- |
| `<Choice>` | `q`, `options`, `answer` (index, or array for multi-select), `explain`, `hint` | optional fenced block shown under the question |
| `<Predict>` | `answer` (array of console lines), `explain`, `hint` | the code; the test checks `answer` is the real output |
| `<FillBlanks>` | `prompt`, `explain`, `caseSensitive` | code with blanks written `__[answer]__` or `__[answer\|alt]__`; filled-in code must run |
| `<OrderLines>` | `prompt`, `explain` | the lines in the **correct** order (shuffled for the student) |
| `<MatchPairs>` | `pairs={[["left", "right"], …]}`, `columns` | — |
| `<SortBuckets>` | `buckets`, `items={[["item", bucketIndex], …]}` | — |
| `<SpotTheBug>` | `bug` (1-based line, or array), `explain` | the buggy code, and optionally a ```` ```js fixed ```` block (must run cleanly) |
| `<TraceState>` | `track` ("the value of `qty`"), `steps={[{ action, answer }]}` | optional code |
| `<CodeReview>` | `answer`, `reasons` (one per option) | 2+ fenced blocks, one per implementation |
| `<TrueFalse>` | `statements={[{ text, answer, explain }]}` | — |
| `<Exercise variant="fix">` | as `<Exercise>`, labeled "Fix the bug" | starter / tests / solution |
| `<BuildUI>` | see React lessons | starter / tests / solution |

Depth: `<HowItWorks>` (always visible) and `<GoDeeper title="…">` (expandable). Visualizer: `<CodeTrace frames={[{ line, vars, heap, out, note }]}>` around a fenced block steps through the code; a variable value like `"#a"` points at a `heap` object, so shared references are visible.

`<EventLoop frames={[{ line, stack, apis, micro, tasks, out, note }]}>` around a fenced block animates the call stack, the browser's timers, the microtask and task queues and the console. A callback keeps its label as it moves between boxes, so it slides from one to the next.

**Lesson kinds.** Add `kind: review` or `kind: boss` to the frontmatter. A review is labeled on the course page. A boss lesson wraps its challenges in `<BossChallenge>`: it counts the exercises and questions inside it and completes the lesson by itself once every one is passed (boss lessons have no "Mark as complete" button). A track's certificate unlocks when every lesson in its courses, boss included, is complete; the boss is set in `src/content/tracks.ts`.

**YAML note:** a frontmatter value that contains `: ` (like a summary with a colon) must be in quotes.

**Quoting rule:** MDX string attributes (`explain="…"`) can't contain `\"`. When the text needs double quotes, use an expression: `explain={"say \"hi\""}`.

## Gamification

XP, levels, streaks, badges and track certificates are **derived** from the stored progress facts (`src/gamification/rules.ts`), never stored, so the rules can change without migrating data. Tracks and their boss challenges are listed in `src/content/tracks.ts`.

## Edit the JS Quick Reference

The `/reference` page is built from `src/content/reference/js-reference.txt`, in the same format as the original `js-reference.html` (the format is described at the top of the file):

```text
@@ entry-id :: section-id :: Name :: react warn
One sentence that explains it.
```js
console.log("code");
```
>> code
```

Flags: `react` (Used in React badge), `warn` (Watch out badge), `static` (needs a real page: no Run button), `varies` (random or date output). `!!` lines are expected errors and `~~` lines are muted notes. `npm test` runs every entry that isn't `static` and checks its output.

## Progress

Components only talk to the `ProgressStore` interface (`src/progress/ProgressStore.ts`). The app uses `LocalProgressStore` (localStorage, wrapped in try/catch so blocked storage never breaks the page). To move to a backend, write another class that implements the interface, load its snapshot, call the subscribers, and pass it to `<ProgressProvider>` in `src/main.tsx`.

## Deploy

It's a static site: `npm run build` writes `dist/`. Every route must serve `index.html`; the configs for that are already in the repo.

- **Vercel:** import the repository. `vercel.json` sets the build and the SPA rewrite.
- **Netlify:** import the repository. `netlify.toml` sets the build, Node 22 and the SPA redirect.

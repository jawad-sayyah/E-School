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

The first time you run the e2e tests, install the browser with `npx playwright install chromium`.

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

- Tests run in the worker together with the student's code, using a Vitest-shaped API: `describe`, `test`/`it`, `test.skip`, `expect(x)` with `.not`, `toBe`, `toEqual`, `toContain`, `toHaveLength`, `toThrow`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeCloseTo`, `toBeGreaterThan` and `toBeLessThan`. Tests can be `async`.
- Tests live in their own block, so helpers like `const cart = …` in the tests never clash with the student's code.
- `tests` and `solution` blocks are never added to the search index.
- Passing marks the exercise as completed in the student's progress.

## React lessons (Sandpack)

React code can't run in the worker, so React lessons use Sandpack components. Every fenced block inside them is a file; name it with `file=` (React files are `.js` with JSX inside, as in Sandpack's templates).

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
- Hidden test files get a one-line prelude in Sandpack (`TEST_PRELUDE` in `src/components/react/LiveSandpack.tsx`): Sandpack's runner renders into jsdom but exposes the browser's own `FormData`, which rejects jsdom forms and breaks React 19 form actions.
- For async code, wrap waits in `act`: `const wait = (ms) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });`. A component that suspends on first render must be rendered inside an async `act` (`await act(async () => { render(<App />); })`), or React 19 won't retry it when the promise resolves.
- To check solutions inside real Sandpack (its runner differs from Vitest), run `LESSONS=hooks/use-context,react/forms npx playwright test e2e/solutions.spec.ts`.
- Prefer queries by role, label and text (`getByRole`, `getByLabelText`); give elements an `aria-label` when the task needs a stable handle.
- `npm test` first runs `scripts/gen-react-tests.mjs`, which turns every React exercise (solution + tests) and every playground (a "renders without crashing" smoke test, or a "runs" test for vanilla ones) into Vitest + Testing Library tests under `test/react-exercises/` (git-ignored). So a solution that fails its own tests fails the build.
- Question components (`SpotTheBug`, `FillBlanks`, `Choice`, `TraceState`, `CodeReview`, `Compare`) show a ````jsx```` block as JSX. JSX blanks and `fixed` blocks aren't run in the worker; `Predict` must stay plain JavaScript, because its answer is checked by running it.

## Questions, depth and visualizers

Every lesson mixes **at least 3 question types** (the content test enforces it). Put questions anywhere, or group them in `<Practice title="…">`, which shows a "3 of 5 done" bar. Each question needs an `id` that is unique in the lesson; progress, XP and badges are keyed by it.

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

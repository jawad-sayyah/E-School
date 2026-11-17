# E School

An interactive learning site that takes interns from JavaScript to React, TypeScript and testing, one idea at a time. Every concept has code students can edit and run in the browser, and every lesson ends with a quiz and an exercise checked by hidden tests.

The spec lives in [PROMPT.md](PROMPT.md).

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · shadcn/ui (Radix) · React Router · MDX · MiniSearch · Vitest · Playwright.

Plain JavaScript runs in a sandboxed Web Worker (`src/runner/`) with hard limits on output lines, run time and value size, so student code can never freeze the page.

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
| `npm test` | Unit tests (runner, checker, progress, search, and every lesson's examples) |
| `npm run test:e2e` | Playwright smoke tests against the production build |
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

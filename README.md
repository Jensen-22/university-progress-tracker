# University Progress Tracker

A self-contained static web app to monitor your progress across university
modules. Track which weeks you are up to date on, which you still need to
catch up on, record exam dates, and see an at-a-glance list of upcoming exams.

No backend, no build step, and no external network or CDN dependencies. All
data lives in your browser's `localStorage`.

## Features

- **Modules** — add modules with a name and optional code, and remove them.
- **Weekly progress** — each module has a configurable number of weeks. Click a
  week to toggle it between **up to date** (green) and **to catch up** (red).
- **Progress summary** — each module shows `X of Y weeks up to date`, a percent,
  and a progress bar that updates as you toggle weeks.
- **Exam dates** — set or change an exam date per module.
- **Upcoming exams** — a panel at the top lists modules with an exam date today
  or in the future, sorted soonest-first, each with a `today` / `in N days`
  indicator.

## How to launch

This is a static app. Serve the project root with any static file server, then
open it in a browser:

```sh
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or, if you have Node available:

```sh
npx serve
```

> Opening `index.html` directly via `file://` may be blocked by the browser
> because it uses ES modules. Use a static server as shown above.

## Where data is stored

All state is saved in the browser's `localStorage` under the single key
`uni-progress-tracker:v1`. This means your data is:

- per-browser and per-device (not synced across browsers or machines),
- cleared if you clear site data for this origin.

## Project structure

```
index.html            app shell, loads the stylesheet and app.js
src/css/styles.css     styling
src/js/model.js        pure data model and logic (no DOM) - unit tested
src/js/store.js        localStorage load/save (guarded with try/catch)
src/js/app.js          DOM rendering and event wiring
test/model.test.js     node:test unit tests for the model
```

## Running the tests

The pure logic in `src/js/model.js` is covered by unit tests using Node's
built-in test runner (no dependencies to install):

```sh
node --test
```

You can also validate syntax of the scripts:

```sh
node --check src/js/model.js
node --check src/js/store.js
node --check src/js/app.js
```

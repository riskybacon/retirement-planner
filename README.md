# Retirement Planner

![Demo](docs/demo.gif)

A local, terminal-style web app for running historical retirement simulations with guardrail withdrawals and asset allocation inputs. The backend is FastAPI, the frontend is React + Recharts, and all data stays on your machine.

Do not use this app to plan your retirement. It probably generates incorrect results. This project exists because I:

1. enjoy using [FIRECalc](https://www.firecalc.com) and [cFIRESim](https://cfiresim.com)
2. think it would be interesting to have a terminal-like hacker sorta interface for a retirement planner
3. want play with [OpenAI](https://openai.com)'s [Codex](https://openai.com/codex/)
4. want to have interesting convos with my financial advisor and better understand investment concepts.

Rules: Codex writes all the code. I write no code by hand.

This doesn't mean I blindly accept all edits. I reviewed edits, asked codex to explain things I didn't understand, requested clarification, made suggestions if I wanted something different.

I instructed codex to commit changes when I thought appropriate, and to craft commit messages.

I'm pleased with the result. This is meant to be a proof-of-concept project, not a well-tested project that will reach maturity. The initial proof of concept with very few features took about 3 hours, and only took that long because I paused to get coffee, and look out the window at the amusing squirrels carrying off persimmons from my tree during Christmas. Tweaking the project and adding additional features took another 4 hours, and then adding in ruff, mypy, and unit tests took another 3.

This workflow was great until it wasn't. The big time savings wasn't on the backend, but on the frontend. While I reviewed backend code, I'm not much of a frontend developer, so I vibe-coded the frontend and the demo. Those things would have taken me much longer to handle and I probably would have gotten bored and abandoned the project if I wasn't using codex.

The workflow fell apart when:

1. codex started making large changes for small features. Specifically, it looks like data validation is spread across many layers, in both the frontend and backend, which is a junior level coding mistake. Fixing this is a refactor. 
  - This is has been my experience with cursor and other agents. Things go great for a while, but then I need to scrutinize the code and use my right-brain to get the gestalt and show AI how to clean up tech debt, which means that almost all of the time savings are lost.
  - But I probably can use codex to help get the gestalt and help word my plan succinctly.
2. codex somehow lost all read and write permissions mid-session and started asking me to cut-n-paste code in and would only give me diffs to apply manually. Which made the tool effectively ChatGPT. Restarting codex and losing the current context fixed the problem.

That's not to say that it isn't a good tool. I enjoyed using it, and I was glad that I didn't have to go and learn node.js and react via stackoverflow to get a decent proof of concept up and running.

## Project Layout
- `backend/`: FastAPI app, simulation engine, Shiller data fetch script.
- `backend/data/`: generated historical returns (`historical.csv`).
- `frontend/`: React UI with terminal-style prompt flow and charts.

## License
Apache-2.0

## Setup
1) Create and activate the environment (from `INSTALL.md`):
```text
mamba create -y -n retirement nodejs python
mamba activate retirement
npm install -g @openai/codex
```

2) Install backend dependencies and fetch data:
```text
pip install -r backend/requirements.txt
python backend/scripts/fetch_shiller.py
```
If the Yale site is unavailable, download `ie_data.xls` manually and place it at
`backend/data/ie_data.xls`, then re-run the script. You can also set
`SHILLER_XLS_PATH` to the file location.

3) Run the backend:
```text
uvicorn backend.app.main:app --reload
```

4) Run the frontend:
```text
cd frontend
npm install
npm run dev
```

## Linting and Type Checking (Backend)
```text
pip install -r backend/requirements-dev.txt
ruff format backend/app backend/scripts
ruff check backend/app backend/scripts
mypy backend/app backend/scripts
pytest backend/tests
```

## Data Assumptions
- Stocks use the Shiller dataset price series (price index; not total return).
- Bonds use the Shiller dataset long-rate series as a proxy return via annual average yield.
- Date range is the earliest overlapping year between the two series in the Shiller dataset.
- Data is downloaded from the public Shiller spreadsheet.

## Simulation Model
- Annual steps with portfolio rebalanced to the user’s stock/bond allocation.
- Guardrails: withdrawal rate is clamped between min and max.
- Optional smoothing: separate up/down rates let withdrawals ease toward guardrails.
- Management fee: annual percentage applied after returns.
- Inflation: fixed rate applied to withdrawals.
- Social Security: annual cashflow added when each recipient reaches their start year.

## API
- `GET /api/v1/series/metadata`: historical series bounds.
- `POST /api/v1/simulate`: run rolling historical simulations for every start year.

## UI
- Terminal-style prompt flow collects inputs step-by-step.
- Charts display portfolio balances (with a zero reference line) and spending per year.
- Summary shows total runs, successes, failures, and success rate.

## Troubleshooting
- `Missing historical data`: run `python backend/scripts/fetch_shiller.py` to generate `backend/data/historical.csv`.
- `Simulation failed` in the UI: check backend logs and confirm `uvicorn` is running on port 8000.
- Vite cannot reach the API: ensure the backend is on `http://localhost:8000` or update the proxy in `frontend/vite.config.js`.

## Demo Capture
```text
cd frontend
npm install -D playwright
npx playwright install chromium
npm run demo:gif
```

This will save a new `demo.gif` into the `docs` directory.

# Repository Guidelines

## Project Structure & Module Organization
- Repository root currently contains `INSTALL.md` (environment setup) and this guide.
- Source code, tests, and assets are not yet present. When added, keep code in a clearly named top-level directory (for example `src/`), tests alongside the code or in `tests/`, and static assets in a dedicated folder (for example `assets/`).
- If you introduce new top-level folders, add a short note here describing their purpose.

## Build, Test, and Development Commands
- `mamba create -y -n retirement nodejs`: creates the Conda/Mamba environment for the project.
- `mamba activate retirement`: activates the environment for local development.
- `npm install -g @openai/codex`: installs the Codex CLI globally.
- No build or test commands are defined yet. If you add them, document the exact commands and expected outputs here.

## Coding Style & Naming Conventions
- Backend formatting and linting: use `ruff format backend/app backend/scripts` and `ruff check backend/app backend/scripts`.
- Type checking: run `mypy backend/app backend/scripts`.
- For any backend changes, ensure these checks pass or note why they were not run.
- Use clear, descriptive names for files and directories (for example `src/retirement_planner.js`).
- Prefer small, focused modules and avoid mixing unrelated responsibilities in one file.

## Testing Guidelines
- No testing framework is configured yet.
- When tests are introduced, document the framework, naming conventions, and how to run the test suite.

## Commit & Pull Request Guidelines
- There is no commit history yet to infer conventions.
- Use short, imperative commit subjects (for example `Add environment setup notes`).
- For pull requests, include a concise description, testing notes (or “not run”), and any required screenshots or logs.

## Security & Configuration Tips
- Keep secrets out of the repository. If configuration is needed, prefer a local-only file like `.env` and document required keys here.

# Contributing

## Setup

```bash
git clone https://github.com/cristof-r/obsidian-notifier.git
cd obsidian-notifier
pnpm install
pnpm dev
```

## Development

- `pnpm dev` — watch mode with hot rebuild
- `pnpm build` — production build
- `pnpm lint` — lint check
- `pnpm test` — run tests

## Deploy to your vault

Copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/obsidian-notifier/` folder, then reload Obsidian.

## Pull Requests

1. Fork and create a feature branch from `main`
2. Keep changes focused — one feature or fix per PR
3. Run `pnpm lint`, `pnpm build`, and `pnpm test` before submitting
4. Describe what changed and why in the PR description

## Code Style

- TypeScript strict mode
- ESLint enforced on commit via Husky
- No `any` types (warned by linter)

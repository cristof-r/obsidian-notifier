# Notifier — Obsidian Plugin

TypeScript Obsidian plugin. Schedules OS-level system notifications from Obsidian. Node 18+.

## Commands

- `npm run dev` — watch build (development)
- `npm run build` — production build

After build, copy `main.js`, `manifest.json`, `styles.css` into `.obsidian/plugins/notifier/` in the vault.

## Structure

```
src/    # TypeScript source
main.js # Compiled output (committed)
styles.css
manifest.json
```

## Key Features

- Schedule types: once, daily, weekly, monthly, custom interval
- Optional start/end date bounds on recurring schedules
- Notification duration: auto, persistent, or fixed seconds
- Missed-notification recovery on startup (10-minute window)
- Falls back to Obsidian Notice if system permissions denied

## Key Constraints

- Desktop only — uses Electron's system notification API
- Not supported on mobile
- Notification data persisted in plugin data (not vault notes)

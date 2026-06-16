# Notifier — Obsidian Plugin

Schedule system (OS-level) notifications directly from [Obsidian](https://obsidian.md). Set reminders that fire even when Obsidian is minimized, with flexible recurrence, sound control, and persistent-until-dismissed options.

> **Desktop only.** Requires Obsidian's desktop app (Electron). Not supported on mobile.

---

## Why Notifier?

Most Obsidian reminder plugins embed reminders inside note text and only notify while Obsidian is open. Notifier is different:

| Feature | Notifier | obsidian-reminder |
|---|---|---|
| Fires when Obsidian is minimized | ✅ | ❌ |
| Schedule-first (not tied to any note) | ✅ | ❌ |
| Click notification to open a note | ✅ | ✅ |
| Recurring schedules (daily/weekly/etc.) | ✅ | ✅ |

**Best use case:** Standing habits and reminders that aren't attached to any specific task — daily check-ins, weekly reviews, timed breaks.

---

## Features

- **Multiple schedule types** — once, daily, weekly (pick days), monthly (pick day of month), or a custom N-day interval
- **Optional date bounds** — set a start and/or end date for any recurring schedule
- **Notification duration** — auto (OS default), persistent (stays until dismissed), or a fixed number of seconds
- **Sound toggle** — enable or disable the notification sound per reminder
- **Link to note** — optionally link a notification to a vault file; clicking the notification opens that file
- **Snooze** — snooze from the command palette: 15 min, 1 hour, 3 hours, or tomorrow 9am
- **Missed-notification recovery** — fires on next startup if Obsidian was closed (same-day window for one-time reminders, 10-minute window for recurring)
- **Click-to-focus** — clicking a notification brings Obsidian to the front
- **Status bar** — shows active notification count at a glance
- **Import/Export** — share or back up notifications as JSON via clipboard
- **Fallback** — if system notification permission is denied, falls back to an in-app Obsidian Notice

---

## Installation

### BRAT (recommended for early access)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat).
2. Open BRAT settings → **Add Beta Plugin**.
3. Enter: `https://github.com/cristof-r/obsidian-notifier`

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. Copy them into your vault at `.obsidian/plugins/notifier/`.
3. Enable **Notifier** in **Settings → Community plugins**.

### From source

```bash
git clone https://github.com/cristof-r/obsidian-notifier.git
cd obsidian-notifier
pnpm install
pnpm build
```

Then copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/notifier/` in your vault.

---

## Usage

### Adding a notification

- Click the **bell icon** in the ribbon, or
- Run **"Add notification"** from the Command Palette (`Ctrl/Cmd+P`), or
- Go to **Settings → Notifier** and click **+ Add**.

### Configuring a notification

| Field | Description |
|---|---|
| **Title** | Notification headline |
| **Body** | Optional body text |
| **Link to note** | Optional vault file to open when the notification is clicked |
| **Schedule** | Once / Daily / Weekly / Monthly / Custom interval |
| **Time** | Time of day (native OS time picker) |
| **Days of week** | (Weekly only) toggle individual days |
| **Date** | (Once only) calendar date |
| **Day of month** | (Monthly only) 1–31 |
| **Interval** | (Custom only) repeat every N days |
| **Start / End date** | Optional bounds for recurring schedules |
| **Duration** | Auto, Persistent, or 5 / 10 / 15 / 30 / 60 seconds |
| **Sound** | Enable or disable the notification sound |
| **Enabled** | Quickly toggle a notification on/off without deleting it |

Use the **Test** button in the modal to preview the notification before saving.

### Commands

| Command | Description |
|---|---|
| Add notification | Create a new notification |
| Fire notification now | Immediately fire an active notification (for testing) |
| Snooze notification | Snooze: 15 min / 1 hr / 3 hr / tomorrow 9am |
| Skip next occurrence | Skip the next scheduled occurrence of a recurring notification |

---

## Development

```bash
pnpm install
pnpm dev      # watch mode
pnpm build    # production build
pnpm test     # run scheduler tests
```

Requires Node.js ≥ 18 and TypeScript.

---

## License

[MIT](LICENSE) © Cristof Rojas

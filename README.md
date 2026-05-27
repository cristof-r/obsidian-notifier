# Notifier — Obsidian Plugin

Schedule system (OS-level) notifications directly from [Obsidian](https://obsidian.md). Set reminders that fire even when Obsidian is minimized, with flexible recurrence, sound control, and persistent-until-dismissed options.

> **Desktop only.** Requires Obsidian's desktop app (Electron). Not supported on mobile.

---

## Features

- **Multiple schedule types** — once, daily, weekly (pick days), monthly (pick day of month), or a custom N-day interval
- **Optional date bounds** — set a start and/or end date for any recurring schedule
- **Notification duration** — auto (OS default), persistent (stays until dismissed), or a fixed number of seconds
- **Sound toggle** — enable or disable the notification sound per reminder
- **Snooze support** — snooze a notification from the notification itself
- **Missed-notification recovery** — if Obsidian was closed when a notification was due, it fires on the next startup (within a 10-minute window)
- **Click-to-focus** — clicking a notification brings Obsidian to the front
- **Status bar** — shows active notification count at a glance
- **Fallback** — if system notification permission is denied, falls back to an in-app Obsidian Notice

---

## Installation

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. Copy them into your vault at `.obsidian/plugins/notifier/`.
3. Enable **Notifier** in **Settings → Community plugins**.

### From source

```bash
git clone https://github.com/cristof-r/obsidian-notifier.git
cd obsidian-notifier
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/notifier/` in your vault.

---

## Usage

### Adding a notification

- Click the **bell icon** in the ribbon, or
- Run the command **"Add notification"** from the Command Palette (`Ctrl/Cmd+P`), or
- Go to **Settings → Notifier** and click **+ Add**.

### Configuring a notification

| Field | Description |
|---|---|
| **Title** | Notification headline |
| **Body** | Optional body text |
| **Schedule** | Once / Daily / Weekly / Monthly / Custom interval |
| **Time** | 24-hour `HH:mm` format |
| **Days of week** | (Weekly only) toggle individual days |
| **Date** | (Once only) `YYYY-MM-DD` |
| **Day of month** | (Monthly only) 1–31 |
| **Interval** | (Custom only) repeat every N days |
| **Start / End date** | Optional bounds for recurring schedules |
| **Duration** | Auto, Persistent, or 5 / 10 / 15 / 30 / 60 seconds |
| **Sound** | Enable or disable the notification sound |
| **Enabled** | Quickly toggle a notification on/off without deleting it |

Use the **Test** button in the modal to preview the notification before saving.

---

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
```

Requires Node.js ≥ 18 and TypeScript.

---

## License

[MIT](LICENSE) © Cristof Rojas
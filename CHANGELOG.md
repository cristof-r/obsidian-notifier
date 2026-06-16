# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0] - 2026-06-16

### Added
- Multiple schedule types: once, daily, weekly (pick days), monthly (pick day of month), custom N-day interval
- Optional start/end date bounds for any recurring schedule
- Notification duration control: auto (OS default), persistent (stays until dismissed), or fixed seconds (5/10/15/30/60)
- Sound toggle per notification
- Status bar item showing active notification count and next fire time
- Missed-notification recovery on startup: same-day window for one-time reminders, 10-minute window for recurring
- Click-to-focus: clicking a notification brings Obsidian to the front
- Import/Export notifications as JSON via clipboard
- Link to vault note: click notification to open linked file
- Snooze from command palette: 15 min / 1 hr / 3 hr / tomorrow 9am
- "Fire notification now" command for quick testing without opening settings
- "Skip next occurrence" command for recurring notifications
- Native OS time/date pickers in the notification editor
- Fallback to in-app Obsidian Notice if system notification permission is denied

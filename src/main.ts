import { Notice, Plugin } from 'obsidian';
import { NotifierSettings, DEFAULT_SETTINGS, NotificationEntry } from './types';
import { shouldFire, getNextOccurrence } from './scheduler';
import { NotifierSettingTab } from './settings';
import { NotificationModal } from './notification-modal';

const SCHEDULER_INTERVAL_MS = 30_000;
const MISSED_WINDOW_MS = 10 * 60_000; // fire "missed" notifications up to 10 min late

export default class NotifierPlugin extends Plugin {
	settings: NotifierSettings = DEFAULT_SETTINGS;
	private statusBarEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Request notification permission
		if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
			Notification.requestPermission();
		}

		// Settings tab
		this.addSettingTab(new NotifierSettingTab(this.app, this));

		// Command: add notification
		this.addCommand({
			id: 'add-notification',
			name: 'Add notification',
			callback: () => {
				new NotificationModal(this.app, null, async (entry) => {
					this.settings.notifications.push(entry);
					await this.saveSettings();
				}).open();
			},
		});

		// Ribbon icon
		this.addRibbonIcon('bell', 'Add notification', () => {
			new NotificationModal(this.app, null, async (entry) => {
				this.settings.notifications.push(entry);
				await this.saveSettings();
			}).open();
		});

		// Status bar
		this.statusBarEl = this.addStatusBarItem();
		this.updateStatusBar();

		// Start scheduler
		this.registerInterval(
			window.setInterval(() => this.tick(), SCHEDULER_INTERVAL_MS)
		);

		// Fire missed notifications on startup (if Obsidian was closed)
		this.fireMissed();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Ensure notifications array exists
		if (!Array.isArray(this.settings.notifications)) {
			this.settings.notifications = [];
		}
		if (!this.settings.lastFired) {
			this.settings.lastFired = {};
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.updateStatusBar();
	}

	private tick(): void {
		const now = new Date();

		for (const entry of this.settings.notifications) {
			const lastFired = this.settings.lastFired[entry.id];

			if (shouldFire(entry, now, lastFired)) {
				this.fireNotification(entry);
				this.settings.lastFired[entry.id] = now.toISOString();
				this.saveSettings();
			}
		}
	}

	/**
	 * On startup, check if any notifications were missed while Obsidian was closed.
	 * Only fires if the missed time was within MISSED_WINDOW_MS.
	 */
	private fireMissed(): void {
		const now = new Date();

		for (const entry of this.settings.notifications) {
			if (!entry.enabled) continue;

			const lastFired = this.settings.lastFired[entry.id];
			if (!lastFired) continue;

			const lastDate = new Date(lastFired);
			const nextOcc = getNextOccurrence(entry);

			// If next occurrence is in the past (we missed it) and within window
			if (nextOcc && nextOcc < now) {
				const missedMs = now.getTime() - nextOcc.getTime();
				if (missedMs <= MISSED_WINDOW_MS) {
					this.fireNotification(entry);
					this.settings.lastFired[entry.id] = now.toISOString();
				}
			}
		}

		this.saveSettings();
	}

	private fireNotification(entry: NotificationEntry): void {
		// System notification (Electron / Web API)
		if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
			const opts: NotificationOptions = {
				body: entry.body || undefined,
				silent: !entry.sound,
				requireInteraction: entry.duration === 'persistent',
			};

			const n = new Notification(entry.title, opts);

			// Auto-close after duration
			if (typeof entry.duration === 'number' && entry.duration > 0) {
				setTimeout(() => n.close(), entry.duration * 1000);
			}

			// Click handler — bring Obsidian to front
			n.onclick = () => {
				this.focusObsidian();
				n.close();
			};
		} else {
			// Fallback: Obsidian Notice
			const duration = typeof entry.duration === 'number' ? entry.duration * 1000 : 0;
			new Notice(`🔔 ${entry.title}${entry.body ? '\n' + entry.body : ''}`, duration || 10_000);
		}
	}

	/** Bring Obsidian window to front using Electron APIs */
	private focusObsidian(): void {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const electron = require('electron');
			const win = electron.remote.getCurrentWindow();
			if (win.isMinimized()) win.restore();
			win.show();
			win.focus();
		} catch {
			window.focus();
		}
	}

	private updateStatusBar(): void {
		if (!this.statusBarEl) return;

		const active = this.settings.notifications.filter(e => e.enabled).length;
		if (active === 0) {
			this.statusBarEl.setText('🔕 No notifications');
			return;
		}

		// Find soonest next occurrence
		let soonest: Date | null = null;
		for (const entry of this.settings.notifications) {
			if (!entry.enabled) continue;
			const next = getNextOccurrence(entry);
			if (next && (!soonest || next < soonest)) {
				soonest = next;
			}
		}

		const nextStr = soonest
			? soonest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			: '—';

		this.statusBarEl.setText(`🔔 ${active} · Next: ${nextStr}`);
	}
}

import { App, Modal, Notice, Plugin, Setting } from "obsidian";
import { focusObsidian } from "./electron-utils";
import { NotificationModal } from "./notification-modal";
import { formatDate, getNextOccurrence, shouldFire } from "./scheduler";
import { NotifierSettingTab } from "./settings";
import { SnoozeModal } from "./snooze-modal";
import { DEFAULT_SETTINGS, NotificationEntry, NotifierSettings } from "./types";

const SCHEDULER_INTERVAL_MS = 30_000;
const MISSED_WINDOW_MS = 10 * 60_000;

class NotificationPickerModal extends Modal {
	private heading: string;
	private entries: NotificationEntry[];
	private onSelect: (entry: NotificationEntry) => void;

	constructor(app: App, heading: string, entries: NotificationEntry[], onSelect: (entry: NotificationEntry) => void) {
		super(app);
		this.heading = heading;
		this.entries = entries;
		this.onSelect = onSelect;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: this.heading });

		for (const entry of this.entries) {
			new Setting(contentEl).setName(entry.title).addButton((btn) =>
				btn.setButtonText("Select").onClick(() => {
					this.onSelect(entry);
					this.close();
				}),
			);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export default class NotifierPlugin extends Plugin {
	settings: NotifierSettings = DEFAULT_SETTINGS;
	private statusBarEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		if (typeof Notification !== "undefined" && Notification.permission === "default") {
			Notification.requestPermission();
		}

		this.addSettingTab(new NotifierSettingTab(this.app, this));

		this.addCommand({
			id: "add-notification",
			name: "Add notification",
			callback: () => {
				new NotificationModal(this.app, null, async (entry) => {
					this.settings.notifications.push(entry);
					await this.saveSettings();
				}).open();
			},
		});

		this.addCommand({
			id: "fire-notification-now",
			name: "Fire notification now",
			callback: () =>
				this.openNotificationPicker("Fire notification", (entry) => {
					this.fireNotification(entry);
				}),
		});

		this.addCommand({
			id: "skip-next-occurrence",
			name: "Skip next notification occurrence",
			callback: () =>
				this.openNotificationPicker("Skip next occurrence", async (entry) => {
					const next = getNextOccurrence(entry);
					if (next) {
						this.settings.lastFired[entry.id] = next.toISOString();
						await this.saveSettings();
						new Notice(`Skipped: ${entry.title}`);
					} else {
						new Notice(`No upcoming occurrence for: ${entry.title}`);
					}
				}),
		});

		this.addCommand({
			id: "snooze-notification",
			name: "Snooze notification",
			callback: () =>
				this.openNotificationPicker("Snooze notification", (entry) => {
					new SnoozeModal(this.app, entry, async (e, until) => {
						e.snoozedUntil = until.toISOString();
						const idx = this.settings.notifications.findIndex((n) => n.id === e.id);
						if (idx >= 0) this.settings.notifications[idx] = e;
						await this.saveSettings();
						new Notice(
							`Snoozed "${e.title}" until ${until.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
						);
					}).open();
				}),
		});

		this.addRibbonIcon("bell", "Add notification", () => {
			new NotificationModal(this.app, null, async (entry) => {
				this.settings.notifications.push(entry);
				await this.saveSettings();
			}).open();
		});

		this.statusBarEl = this.addStatusBarItem();
		this.updateStatusBar();

		this.registerInterval(window.setInterval(() => this.tick(), SCHEDULER_INTERVAL_MS));

		this.fireMissed();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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

	private fireMissed(): void {
		const now = new Date();
		const todayStr = formatDate(now);

		for (const entry of this.settings.notifications) {
			if (!entry.enabled) continue;

			const lastFired = this.settings.lastFired[entry.id];

			if (entry.scheduleType === "once") {
				if (entry.date !== todayStr) continue;
				const [h = 0, m = 0] = entry.time.split(":").map(Number);
				const dueTime = new Date(now);
				dueTime.setHours(h, m, 0, 0);
				if (dueTime > now) continue;
				if (lastFired && new Date(lastFired) >= dueTime) continue;
				this.fireNotification(entry);
				this.settings.lastFired[entry.id] = now.toISOString();
			} else {
				const nextOcc = getNextOccurrence(entry);
				if (nextOcc && nextOcc < now) {
					const missedMs = now.getTime() - nextOcc.getTime();
					if (missedMs <= MISSED_WINDOW_MS) {
						this.fireNotification(entry);
						this.settings.lastFired[entry.id] = now.toISOString();
					}
				}
			}
		}

		this.saveSettings();
	}

	private fireNotification(entry: NotificationEntry): void {
		if (typeof Notification !== "undefined" && Notification.permission === "granted") {
			const opts: NotificationOptions = {
				body: entry.body || undefined,
				silent: !entry.sound,
				requireInteraction: entry.duration === "persistent",
			};

			const n = new Notification(entry.title, opts);

			if (typeof entry.duration === "number" && entry.duration > 0) {
				setTimeout(() => n.close(), entry.duration * 1000);
			}

			n.onclick = () => {
				focusObsidian();
				if (entry.linkedNote) {
					this.app.workspace.openLinkText(entry.linkedNote, "");
				}
				n.close();
			};
		} else {
			const duration = typeof entry.duration === "number" ? entry.duration * 1000 : 0;
			new Notice(`🔔 ${entry.title}${entry.body ? "\n" + entry.body : ""}`, duration || 10_000);
		}
	}

	private openNotificationPicker(heading: string, callback: (entry: NotificationEntry) => void): void {
		const entries = this.settings.notifications.filter((e) => e.enabled);
		if (entries.length === 0) {
			new Notice("No active notifications configured.");
			return;
		}
		new NotificationPickerModal(this.app, heading, entries, callback).open();
	}

	private updateStatusBar(): void {
		if (!this.statusBarEl) return;

		const active = this.settings.notifications.filter((e) => e.enabled).length;
		if (active === 0) {
			this.statusBarEl.setText("🔕 No notifications");
			return;
		}

		let soonest: Date | null = null;
		for (const entry of this.settings.notifications) {
			if (!entry.enabled) continue;
			const next = getNextOccurrence(entry);
			if (next && (!soonest || next < soonest)) {
				soonest = next;
			}
		}

		const nextStr = soonest ? soonest.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

		this.statusBarEl.setText(`🔔 ${active} · Next: ${nextStr}`);
	}
}

import { App, Modal, Setting } from "obsidian";
import { NotificationEntry } from "./types";

const SNOOZE_OPTIONS: Array<{ label: string; minutes: number }> = [
	{ label: "15 minutes", minutes: 15 },
	{ label: "1 hour", minutes: 60 },
	{ label: "3 hours", minutes: 180 },
	{ label: "Tomorrow 9am", minutes: -1 },
];

export class SnoozeModal extends Modal {
	private entry: NotificationEntry;
	private onSnooze: (entry: NotificationEntry, until: Date) => void;

	constructor(app: App, entry: NotificationEntry, onSnooze: (entry: NotificationEntry, until: Date) => void) {
		super(app);
		this.entry = entry;
		this.onSnooze = onSnooze;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("notifier-snooze-modal");

		contentEl.createEl("h3", { text: `Snooze: ${this.entry.title}` });
		contentEl.createEl("p", { text: "How long to snooze?" });

		for (const opt of SNOOZE_OPTIONS) {
			new Setting(contentEl).addButton((btn) =>
				btn.setButtonText(opt.label).onClick(() => {
					this.onSnooze(this.entry, computeSnoozeUntil(opt.minutes));
					this.close();
				}),
			);
		}

		new Setting(contentEl).addButton((btn) => btn.setButtonText("Dismiss").onClick(() => this.close()));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function computeSnoozeUntil(minutes: number): Date {
	const now = new Date();
	if (minutes === -1) {
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(9, 0, 0, 0);
		return tomorrow;
	}
	return new Date(now.getTime() + minutes * 60_000);
}

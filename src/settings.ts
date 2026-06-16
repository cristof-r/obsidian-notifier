import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type NotifierPlugin from "./main";
import { NotificationModal } from "./notification-modal";
import { getNextOccurrence, scheduleSummary } from "./scheduler";
import { NotificationEntry } from "./types";

export class NotifierSettingTab extends PluginSettingTab {
	plugin: NotifierPlugin;

	constructor(app: App, plugin: NotifierPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("notifier-settings");

		// Header + add button
		new Setting(containerEl)
			.setName("Notifications")
			.setHeading()
			.addButton((btn) =>
				btn
					.setButtonText("+ Add")
					.setCta()
					.onClick(() => {
						new NotificationModal(this.app, null, async (entry) => {
							this.plugin.settings.notifications.push(entry);
							await this.plugin.saveSettings();
							this.display();
						}).open();
					}),
			);

		// Notification permission status
		if (typeof Notification !== "undefined") {
			if (Notification.permission === "default") {
				new Setting(containerEl)
					.setName("Notification permission")
					.setDesc("System notifications need your permission to work.")
					.addButton((btn) =>
						btn.setButtonText("Grant permission").onClick(() => {
							Notification.requestPermission().then((p) => {
								new Notice(`Permission: ${p}`);
								this.display();
							});
						}),
					);
			} else if (Notification.permission === "denied") {
				new Setting(containerEl).setDesc(
					"⚠ Notification permission denied. Notifications will only appear as in-app notices.",
				);
			}
		}

		// List entries
		const entries = this.plugin.settings.notifications;

		if (entries.length === 0) {
			containerEl.createEl("p", {
				text: 'No notifications configured. Click "+ Add" to create one.',
				cls: "notifier-empty",
			});
			return;
		}

		const sorted = [...entries].sort((a, b) => {
			const nextA = getNextOccurrence(a);
			const nextB = getNextOccurrence(b);
			if (!nextA && !nextB) return 0;
			if (!nextA) return 1;
			if (!nextB) return -1;
			return nextA.getTime() - nextB.getTime();
		});

		for (const entry of sorted) {
			const summary = scheduleSummary(entry);
			const next = getNextOccurrence(entry);
			const nextStr = next
				? `Next: ${next.toLocaleDateString()} ${next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
				: "No upcoming";

			const s = new Setting(containerEl)
				.setName(entry.title || "(untitled)")
				.setDesc(
					`${summary} · ${nextStr}${entry.enabled ? "" : " · DISABLED"}${entry.linkedNote ? ` · 📎 ${entry.linkedNote}` : ""}`,
				);

			// Enable toggle
			s.addToggle((toggle) =>
				toggle.setValue(entry.enabled).onChange(async (v) => {
					entry.enabled = v;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

			// Edit
			s.addExtraButton((btn) =>
				btn
					.setIcon("pencil")
					.setTooltip("Edit")
					.onClick(() => {
						new NotificationModal(this.app, entry, async (updated) => {
							const idx = entries.findIndex((e) => e.id === entry.id);
							if (idx >= 0) entries[idx] = updated;
							await this.plugin.saveSettings();
							this.display();
						}).open();
					}),
			);

			// Duplicate
			s.addExtraButton((btn) =>
				btn
					.setIcon("copy")
					.setTooltip("Duplicate")
					.onClick(async () => {
						const dup: NotificationEntry = {
							...entry,
							id: crypto.randomUUID(),
							title: entry.title + " (copy)",
							daysOfWeek: entry.daysOfWeek ? [...entry.daysOfWeek] : undefined,
						};
						entries.push(dup);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

			// Delete
			s.addExtraButton((btn) =>
				btn
					.setIcon("trash")
					.setTooltip("Delete")
					.onClick(async () => {
						const idx = entries.findIndex((e) => e.id === entry.id);
						if (idx >= 0) {
							entries.splice(idx, 1);
							delete this.plugin.settings.lastFired[entry.id];
							await this.plugin.saveSettings();
							this.display();
						}
					}),
			);
		}

		// Import/Export section
		new Setting(containerEl).setName("Import / Export").setHeading();

		new Setting(containerEl)
			.setDesc("Export all notifications as JSON or import from clipboard.")
			.addButton((btn) =>
				btn.setButtonText("Export").onClick(() => {
					const json = JSON.stringify(this.plugin.settings.notifications, null, 2);
					navigator.clipboard.writeText(json).then(() => {
						new Notice("Notifications copied to clipboard.");
					});
				}),
			)
			.addButton((btn) =>
				btn.setButtonText("Import").onClick(async () => {
					try {
						const text = await navigator.clipboard.readText();
						const imported = JSON.parse(text) as NotificationEntry[];
						if (!Array.isArray(imported)) throw new Error("Expected array");
						// Assign new IDs to avoid collisions
						for (const e of imported) {
							e.id = crypto.randomUUID();
						}
						this.plugin.settings.notifications.push(...imported);
						await this.plugin.saveSettings();
						new Notice(`Imported ${imported.length} notification(s).`);
						this.display();
					} catch {
						new Notice("Import failed. Ensure valid JSON array is in clipboard.");
					}
				}),
			);
	}
}

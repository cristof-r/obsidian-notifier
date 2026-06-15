import { App, Modal, Setting, Notice } from 'obsidian';
import { NotificationEntry, createDefaultEntry } from './types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DURATION_OPTIONS: Record<string, string> = {
	'auto': 'Auto (OS default)',
	'persistent': 'Persistent (until dismissed)',
	'5': '5 seconds',
	'10': '10 seconds',
	'15': '15 seconds',
	'30': '30 seconds',
	'60': '1 minute',
};

export class NotificationModal extends Modal {
	private entry: NotificationEntry;
	private onSave: (entry: NotificationEntry) => void;
	private isEdit: boolean;

	constructor(
		app: App,
		entry: NotificationEntry | null,
		onSave: (entry: NotificationEntry) => void
	) {
		super(app);
		this.isEdit = entry !== null;
		this.entry = entry ? { ...entry } : createDefaultEntry();
		// Deep-copy arrays
		if (this.entry.daysOfWeek) {
			this.entry.daysOfWeek = [...this.entry.daysOfWeek];
		}
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('notifier-modal');

		contentEl.createEl('h2', { text: this.isEdit ? 'Edit Notification' : 'New Notification' });

		// Title
		new Setting(contentEl)
			.setName('Title')
			.setDesc('Notification headline')
			.addText(text => text
				.setPlaceholder('Reminder')
				.setValue(this.entry.title)
				.onChange(v => { this.entry.title = v; })
			);

		// Body
		new Setting(contentEl)
			.setName('Body')
			.setDesc('Notification body text (optional)')
			.addTextArea(text => text
				.setPlaceholder('Time to check your notes...')
				.setValue(this.entry.body)
				.onChange(v => { this.entry.body = v; })
			);

		// Schedule type
		new Setting(contentEl)
			.setName('Schedule')
			.addDropdown(dd => dd
				.addOption('once', 'Once')
				.addOption('daily', 'Daily')
				.addOption('weekly', 'Weekly')
				.addOption('monthly', 'Monthly')
				.addOption('custom', 'Custom interval')
				.setValue(this.entry.scheduleType)
				.onChange(v => {
					this.entry.scheduleType = v as NotificationEntry['scheduleType'];
					this.refresh();
				})
			);

		// Time
		new Setting(contentEl)
			.setName('Time')
			.setDesc('HH:mm (24-hour)')
			.addText(text => text
				.setPlaceholder('09:00')
				.setValue(this.entry.time)
				.onChange(v => { this.entry.time = v; })
			);

		// Conditional schedule fields
		const scheduleContainer = contentEl.createDiv('notifier-schedule-fields');
		this.renderScheduleFields(scheduleContainer);

		// Start/end date bounds (for recurring)
		if (this.entry.scheduleType !== 'once') {
			new Setting(contentEl)
				.setName('Start date')
				.setDesc('Optional. YYYY-MM-DD')
				.addText(text => text
					.setPlaceholder('2026-01-01')
					.setValue(this.entry.startDate ?? '')
					.onChange(v => { this.entry.startDate = v || undefined; })
				);

			new Setting(contentEl)
				.setName('End date')
				.setDesc('Optional. YYYY-MM-DD')
				.addText(text => text
					.setPlaceholder('2027-12-31')
					.setValue(this.entry.endDate ?? '')
					.onChange(v => { this.entry.endDate = v || undefined; })
				);
		}

		// Duration
		new Setting(contentEl)
			.setName('Duration')
			.setDesc('How long notification stays on screen')
			.addDropdown(dd => {
				for (const [key, label] of Object.entries(DURATION_OPTIONS)) {
					dd.addOption(key, label);
				}
				const currentVal = typeof this.entry.duration === 'number'
					? String(this.entry.duration)
					: this.entry.duration;
				dd.setValue(currentVal);
				dd.onChange(v => {
					if (v === 'auto' || v === 'persistent') {
						this.entry.duration = v;
					} else {
						this.entry.duration = parseInt(v, 10);
					}
				});
			});

		// Sound
		new Setting(contentEl)
			.setName('Sound')
			.setDesc('Play notification sound')
			.addToggle(toggle => toggle
				.setValue(this.entry.sound)
				.onChange(v => { this.entry.sound = v; })
			);

		// Enabled toggle
		new Setting(contentEl)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(this.entry.enabled)
				.onChange(v => { this.entry.enabled = v; })
			);

		// Buttons row
		const buttonRow = new Setting(contentEl);

		// Test notification
		buttonRow.addButton(btn => btn
			.setButtonText('Test')
			.onClick(() => this.testNotification())
		);

		// Cancel
		buttonRow.addButton(btn => btn
			.setButtonText('Cancel')
			.onClick(() => this.close())
		);

		// Save
		buttonRow.addButton(btn => btn
			.setButtonText('Save')
			.setCta()
			.onClick(() => {
				if (!this.validate()) return;
				this.onSave(this.entry);
				this.close();
			})
		);
	}

	private renderScheduleFields(container: HTMLElement): void {
		container.empty();

		switch (this.entry.scheduleType) {
			case 'once':
				new Setting(container)
					.setName('Date')
					.setDesc('YYYY-MM-DD')
					.addText(text => text
						.setPlaceholder('2026-04-20')
						.setValue(this.entry.date ?? '')
						.onChange(v => { this.entry.date = v || undefined; })
					);
				break;

			case 'weekly': {
				const setting = new Setting(container)
					.setName('Days of week');

				const daysContainer = setting.controlEl.createDiv('notifier-days');
				const selected = new Set(this.entry.daysOfWeek ?? []);

				for (let i = 0; i < 7; i++) {
					const btn = daysContainer.createEl('button', {
						text: DAY_NAMES[i],
						cls: selected.has(i) ? 'notifier-day-btn active' : 'notifier-day-btn',
					});
					btn.addEventListener('click', (e) => {
						e.preventDefault();
						if (selected.has(i)) {
							selected.delete(i);
							btn.removeClass('active');
						} else {
							selected.add(i);
							btn.addClass('active');
						}
						this.entry.daysOfWeek = Array.from(selected).sort();
					});
				}
				break;
			}

			case 'monthly':
				new Setting(container)
					.setName('Day of month')
					.addDropdown(dd => {
						for (let i = 1; i <= 31; i++) {
							dd.addOption(String(i), String(i));
						}
						dd.setValue(String(this.entry.dayOfMonth ?? 1));
						dd.onChange(v => { this.entry.dayOfMonth = parseInt(v, 10); });
					});
				break;

			case 'custom':
				new Setting(container)
					.setName('Interval (days)')
					.addText(text => text
						.setPlaceholder('7')
						.setValue(String(this.entry.customIntervalDays ?? ''))
						.onChange(v => {
							const n = parseInt(v, 10);
							this.entry.customIntervalDays = isNaN(n) ? undefined : n;
						})
					);

				new Setting(container)
					.setName('Start from')
					.setDesc('Anchor date for interval. YYYY-MM-DD')
					.addText(text => text
						.setPlaceholder('2026-04-19')
						.setValue(this.entry.customIntervalStartDate ?? '')
						.onChange(v => { this.entry.customIntervalStartDate = v || undefined; })
					);
				break;
		}
	}

	private refresh(): void {
		this.onOpen();
	}

	private validate(): boolean {
		if (!this.entry.title.trim()) {
			new Notice('Title is required.');
			return false;
		}
		if (!/^\d{2}:\d{2}$/.test(this.entry.time)) {
			new Notice('Time must be in HH:mm format.');
			return false;
		}
		if (this.entry.scheduleType === 'once' && !this.entry.date) {
			new Notice('Date is required for one-time notifications.');
			return false;
		}
		if (this.entry.scheduleType === 'weekly' && (!this.entry.daysOfWeek || this.entry.daysOfWeek.length === 0)) {
			new Notice('Select at least one day of the week.');
			return false;
		}
		if (this.entry.scheduleType === 'custom') {
			if (!this.entry.customIntervalDays || this.entry.customIntervalDays < 1) {
				new Notice('Custom interval must be at least 1 day.');
				return false;
			}
			if (!this.entry.customIntervalStartDate) {
				new Notice('Start date is required for custom intervals.');
				return false;
			}
		}
		return true;
	}

	private testNotification(): void {
		if (typeof Notification === 'undefined') {
			new Notice('System notifications not available.');
			return;
		}
		if (Notification.permission !== 'granted') {
			Notification.requestPermission();
			new Notice('Requesting notification permission...');
			return;
		}

		const opts: NotificationOptions = {
			body: this.entry.body || undefined,
			silent: !this.entry.sound,
			requireInteraction: this.entry.duration === 'persistent',
		};

		const n = new Notification(this.entry.title || 'Test', opts);

		n.onclick = () => {
			try {
				const electron = require('electron');
				const win = electron.remote.getCurrentWindow();
				if (win.isMinimized()) win.restore();
				win.show();
				win.focus();
			} catch {
				window.focus();
			}
			n.close();
		};

		if (typeof this.entry.duration === 'number') {
			setTimeout(() => n.close(), this.entry.duration * 1000);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

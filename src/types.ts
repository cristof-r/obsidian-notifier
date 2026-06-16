export type ScheduleType = "once" | "daily" | "weekly" | "monthly" | "custom";
export type DurationType = "auto" | "persistent" | number;

export interface NotificationEntry {
	id: string;
	enabled: boolean;
	title: string;
	body: string;
	linkedNote?: string; // vault path — opened when notification is clicked

	// Schedule
	scheduleType: ScheduleType;
	time: string; // HH:mm
	date?: string; // YYYY-MM-DD — for 'once'
	startDate?: string; // YYYY-MM-DD — optional start bound for recurring
	endDate?: string; // YYYY-MM-DD — optional end bound for recurring
	daysOfWeek?: number[]; // 0=Sun..6=Sat — for 'weekly'
	dayOfMonth?: number; // 1-31 — for 'monthly'
	customIntervalDays?: number; // for 'custom' recurrence
	customIntervalStartDate?: string; // anchor date for custom interval

	// Behavior
	duration: DurationType; // 'auto' = OS default, 'persistent' = until dismissed, number = seconds
	sound: boolean;

	// Snooze
	snoozedUntil?: string; // ISO timestamp if currently snoozed
}

export interface NotifierSettings {
	notifications: NotificationEntry[];
	lastFired: Record<string, string>; // entry.id → ISO timestamp of last fire
}

export const DEFAULT_SETTINGS: NotifierSettings = {
	notifications: [],
	lastFired: {},
};

export function createDefaultEntry(): NotificationEntry {
	return {
		id: crypto.randomUUID(),
		enabled: true,
		title: "Reminder",
		body: "",
		scheduleType: "daily",
		time: "09:00",
		duration: "persistent",
		sound: true,
	};
}

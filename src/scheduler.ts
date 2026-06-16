import { NotificationEntry } from "./types";

/**
 * Check if a notification should fire right now.
 * Uses a 60-second window to avoid missing due to timing jitter.
 */
export function shouldFire(entry: NotificationEntry, now: Date, lastFired: string | undefined): boolean {
	if (!entry.enabled) return false;

	// Snoozed?
	if (entry.snoozedUntil) {
		const snoozeEnd = new Date(entry.snoozedUntil);
		if (now < snoozeEnd) return false;
	}

	// Check time match (within 60s window)
	const [targetH = 0, targetM = 0] = entry.time.split(":").map(Number);
	const nowH = now.getHours();
	const nowM = now.getMinutes();
	const nowTotalMin = nowH * 60 + nowM;
	const targetTotalMin = targetH * 60 + targetM;

	// Must be within the same minute
	if (nowTotalMin !== targetTotalMin) return false;

	// Already fired this minute?
	if (lastFired) {
		const lastDate = new Date(lastFired);
		const diffMs = now.getTime() - lastDate.getTime();
		if (diffMs < 60_000) return false;
	}

	// Date bounds
	const todayStr = formatDate(now);

	if (entry.startDate && todayStr < entry.startDate) return false;
	if (entry.endDate && todayStr > entry.endDate) return false;

	switch (entry.scheduleType) {
		case "once":
			return entry.date === todayStr;

		case "daily":
			return true;

		case "weekly":
			return (entry.daysOfWeek ?? []).includes(now.getDay());

		case "monthly":
			return now.getDate() === (entry.dayOfMonth ?? 1);

		case "custom": {
			if (!entry.customIntervalDays || !entry.customIntervalStartDate) return false;
			const anchor = new Date(entry.customIntervalStartDate + "T00:00:00");
			const diffDays = Math.floor((now.getTime() - anchor.getTime()) / 86_400_000);
			return diffDays >= 0 && diffDays % entry.customIntervalDays === 0;
		}

		default:
			return false;
	}
}

/**
 * Compute the next fire time for display in settings.
 * Returns null if no future occurrence can be determined.
 */
export function getNextOccurrence(entry: NotificationEntry): Date | null {
	if (!entry.enabled) return null;

	const now = new Date();
	const [targetH = 0, targetM = 0] = entry.time.split(":").map(Number);

	// Start from today at target time
	const candidate = new Date(now);
	candidate.setHours(targetH, targetM, 0, 0);

	// If today's target time already passed, start from tomorrow
	if (candidate <= now) {
		candidate.setDate(candidate.getDate() + 1);
	}

	// Search up to 366 days ahead
	for (let i = 0; i < 366; i++) {
		const dateStr = formatDate(candidate);

		if (entry.endDate && dateStr > entry.endDate) return null;
		if (entry.startDate && dateStr < entry.startDate) {
			candidate.setDate(candidate.getDate() + 1);
			continue;
		}

		let match = false;
		switch (entry.scheduleType) {
			case "once":
				if (entry.date === dateStr) match = true;
				else if (entry.date && dateStr > entry.date) return null;
				break;
			case "daily":
				match = true;
				break;
			case "weekly":
				match = (entry.daysOfWeek ?? []).includes(candidate.getDay());
				break;
			case "monthly":
				match = candidate.getDate() === (entry.dayOfMonth ?? 1);
				break;
			case "custom": {
				if (entry.customIntervalDays && entry.customIntervalStartDate) {
					const anchor = new Date(entry.customIntervalStartDate + "T00:00:00");
					const diffDays = Math.floor((candidate.getTime() - anchor.getTime()) / 86_400_000);
					match = diffDays >= 0 && diffDays % entry.customIntervalDays === 0;
				}
				break;
			}
		}

		if (match) return new Date(candidate);
		candidate.setDate(candidate.getDate() + 1);
	}

	return null;
}

/**
 * Build a human-readable schedule summary.
 */
export function scheduleSummary(entry: NotificationEntry): string {
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	switch (entry.scheduleType) {
		case "once":
			return `Once on ${entry.date ?? "?"} at ${entry.time}`;
		case "daily":
			return `Daily at ${entry.time}`;
		case "weekly": {
			const days = (entry.daysOfWeek ?? []).map((d) => dayNames[d]).join(", ");
			return `Weekly (${days || "none"}) at ${entry.time}`;
		}
		case "monthly":
			return `Monthly on day ${entry.dayOfMonth ?? 1} at ${entry.time}`;
		case "custom":
			return `Every ${entry.customIntervalDays ?? "?"} days at ${entry.time}`;
		default:
			return entry.time;
	}
}

export function formatDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

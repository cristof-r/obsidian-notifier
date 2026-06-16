import { describe, expect, it } from "vitest";
import { getNextOccurrence, scheduleSummary, shouldFire } from "../src/scheduler";
import type { NotificationEntry } from "../src/types";

function makeEntry(overrides: Partial<NotificationEntry>): NotificationEntry {
	return {
		id: "test",
		enabled: true,
		title: "Test",
		body: "",
		scheduleType: "daily",
		time: "09:00",
		duration: "auto",
		sound: false,
		...overrides,
	};
}

function dateAt(dateStr: string, timeStr: string): Date {
	return new Date(`${dateStr}T${timeStr}:00`);
}

describe("shouldFire", () => {
	describe("daily", () => {
		it("fires at target time", () => {
			const entry = makeEntry({ scheduleType: "daily", time: "09:00" });
			expect(shouldFire(entry, dateAt("2026-01-15", "09:00"), undefined)).toBe(true);
		});

		it("does not fire at wrong time", () => {
			const entry = makeEntry({ scheduleType: "daily", time: "09:00" });
			expect(shouldFire(entry, dateAt("2026-01-15", "08:59"), undefined)).toBe(false);
			expect(shouldFire(entry, dateAt("2026-01-15", "09:01"), undefined)).toBe(false);
		});

		it("does not fire twice in same minute", () => {
			const entry = makeEntry({ scheduleType: "daily", time: "09:00" });
			const now = dateAt("2026-01-15", "09:00");
			const lastFired = new Date(now.getTime() - 10_000).toISOString();
			expect(shouldFire(entry, now, lastFired)).toBe(false);
		});

		it("fires again after 60+ seconds", () => {
			const entry = makeEntry({ scheduleType: "daily", time: "09:00" });
			const now = dateAt("2026-01-15", "09:00");
			const lastFired = new Date(now.getTime() - 90_000).toISOString();
			expect(shouldFire(entry, now, lastFired)).toBe(true);
		});

		it("respects startDate", () => {
			const entry = makeEntry({ scheduleType: "daily", time: "09:00", startDate: "2026-02-01" });
			expect(shouldFire(entry, dateAt("2026-01-15", "09:00"), undefined)).toBe(false);
			expect(shouldFire(entry, dateAt("2026-02-01", "09:00"), undefined)).toBe(true);
		});

		it("respects endDate", () => {
			const entry = makeEntry({ scheduleType: "daily", time: "09:00", endDate: "2026-01-14" });
			expect(shouldFire(entry, dateAt("2026-01-15", "09:00"), undefined)).toBe(false);
			expect(shouldFire(entry, dateAt("2026-01-14", "09:00"), undefined)).toBe(true);
		});
	});

	describe("once", () => {
		it("fires on exact date and time", () => {
			const entry = makeEntry({ scheduleType: "once", time: "10:00", date: "2026-03-15" });
			expect(shouldFire(entry, dateAt("2026-03-15", "10:00"), undefined)).toBe(true);
		});

		it("does not fire on wrong date", () => {
			const entry = makeEntry({ scheduleType: "once", time: "10:00", date: "2026-03-15" });
			expect(shouldFire(entry, dateAt("2026-03-16", "10:00"), undefined)).toBe(false);
			expect(shouldFire(entry, dateAt("2026-03-14", "10:00"), undefined)).toBe(false);
		});

		it("does not fire at wrong time on correct date", () => {
			const entry = makeEntry({ scheduleType: "once", time: "10:00", date: "2026-03-15" });
			expect(shouldFire(entry, dateAt("2026-03-15", "09:59"), undefined)).toBe(false);
		});
	});

	describe("weekly", () => {
		it("fires on selected days", () => {
			// 2026-01-05 = Monday (1), 2026-01-07 = Wednesday (3)
			const entry = makeEntry({ scheduleType: "weekly", time: "09:00", daysOfWeek: [1, 3] });
			expect(shouldFire(entry, dateAt("2026-01-05", "09:00"), undefined)).toBe(true);
			expect(shouldFire(entry, dateAt("2026-01-07", "09:00"), undefined)).toBe(true);
		});

		it("does not fire on unselected days", () => {
			// 2026-01-06 = Tuesday (2)
			const entry = makeEntry({ scheduleType: "weekly", time: "09:00", daysOfWeek: [1, 3] });
			expect(shouldFire(entry, dateAt("2026-01-06", "09:00"), undefined)).toBe(false);
		});
	});

	describe("monthly", () => {
		it("fires on correct day of month", () => {
			const entry = makeEntry({ scheduleType: "monthly", time: "09:00", dayOfMonth: 15 });
			expect(shouldFire(entry, dateAt("2026-01-15", "09:00"), undefined)).toBe(true);
			expect(shouldFire(entry, dateAt("2026-02-15", "09:00"), undefined)).toBe(true);
		});

		it("does not fire on wrong day", () => {
			const entry = makeEntry({ scheduleType: "monthly", time: "09:00", dayOfMonth: 15 });
			expect(shouldFire(entry, dateAt("2026-01-14", "09:00"), undefined)).toBe(false);
			expect(shouldFire(entry, dateAt("2026-01-16", "09:00"), undefined)).toBe(false);
		});

		it("silently skips months shorter than dayOfMonth", () => {
			// Feb has no day 31 — fires on Jan 31 but not Feb 28
			const entry = makeEntry({ scheduleType: "monthly", time: "09:00", dayOfMonth: 31 });
			expect(shouldFire(entry, dateAt("2026-01-31", "09:00"), undefined)).toBe(true);
			expect(shouldFire(entry, dateAt("2026-02-28", "09:00"), undefined)).toBe(false);
		});
	});

	describe("custom", () => {
		it("fires every N days from anchor", () => {
			const entry = makeEntry({
				scheduleType: "custom",
				time: "09:00",
				customIntervalDays: 7,
				customIntervalStartDate: "2026-01-01",
			});
			expect(shouldFire(entry, dateAt("2026-01-01", "09:00"), undefined)).toBe(true); // day 0
			expect(shouldFire(entry, dateAt("2026-01-08", "09:00"), undefined)).toBe(true); // day 7
			expect(shouldFire(entry, dateAt("2026-01-15", "09:00"), undefined)).toBe(true); // day 14
		});

		it("does not fire on off days", () => {
			const entry = makeEntry({
				scheduleType: "custom",
				time: "09:00",
				customIntervalDays: 7,
				customIntervalStartDate: "2026-01-01",
			});
			expect(shouldFire(entry, dateAt("2026-01-02", "09:00"), undefined)).toBe(false); // day 1
			expect(shouldFire(entry, dateAt("2026-01-07", "09:00"), undefined)).toBe(false); // day 6
		});
	});

	describe("snoozedUntil", () => {
		it("suppresses fire while snoozed", () => {
			const now = dateAt("2026-01-15", "09:00");
			const entry = makeEntry({
				scheduleType: "daily",
				time: "09:00",
				snoozedUntil: new Date(now.getTime() + 60_000).toISOString(),
			});
			expect(shouldFire(entry, now, undefined)).toBe(false);
		});

		it("fires after snooze expires", () => {
			const now = dateAt("2026-01-15", "09:00");
			const entry = makeEntry({
				scheduleType: "daily",
				time: "09:00",
				snoozedUntil: new Date(now.getTime() - 60_000).toISOString(),
			});
			expect(shouldFire(entry, now, undefined)).toBe(true);
		});
	});

	describe("disabled", () => {
		it("does not fire when disabled", () => {
			const entry = makeEntry({ scheduleType: "daily", time: "09:00", enabled: false });
			expect(shouldFire(entry, dateAt("2026-01-15", "09:00"), undefined)).toBe(false);
		});
	});
});

describe("getNextOccurrence", () => {
	it("returns a future date for daily schedule", () => {
		const entry = makeEntry({ scheduleType: "daily", time: "09:00" });
		const result = getNextOccurrence(entry);
		expect(result).not.toBeNull();
		expect(result!.getTime()).toBeGreaterThan(Date.now());
	});

	it("returns null for a past once schedule", () => {
		const entry = makeEntry({ scheduleType: "once", time: "09:00", date: "2020-01-01" });
		expect(getNextOccurrence(entry)).toBeNull();
	});

	it("returns null for a disabled entry", () => {
		const entry = makeEntry({ scheduleType: "daily", time: "09:00", enabled: false });
		expect(getNextOccurrence(entry)).toBeNull();
	});

	it("returns null after endDate for daily schedule", () => {
		const entry = makeEntry({ scheduleType: "daily", time: "09:00", endDate: "2020-01-01" });
		expect(getNextOccurrence(entry)).toBeNull();
	});
});

describe("scheduleSummary", () => {
	it("formats once correctly", () => {
		const entry = makeEntry({ scheduleType: "once", time: "09:00", date: "2026-03-15" });
		expect(scheduleSummary(entry)).toBe("Once on 2026-03-15 at 09:00");
	});

	it("formats daily correctly", () => {
		const entry = makeEntry({ scheduleType: "daily", time: "09:00" });
		expect(scheduleSummary(entry)).toBe("Daily at 09:00");
	});

	it("formats weekly correctly", () => {
		const entry = makeEntry({ scheduleType: "weekly", time: "09:00", daysOfWeek: [1, 3] });
		expect(scheduleSummary(entry)).toBe("Weekly (Mon, Wed) at 09:00");
	});

	it("formats monthly correctly", () => {
		const entry = makeEntry({ scheduleType: "monthly", time: "09:00", dayOfMonth: 15 });
		expect(scheduleSummary(entry)).toBe("Monthly on day 15 at 09:00");
	});

	it("formats custom correctly", () => {
		const entry = makeEntry({ scheduleType: "custom", time: "09:00", customIntervalDays: 7 });
		expect(scheduleSummary(entry)).toBe("Every 7 days at 09:00");
	});
});

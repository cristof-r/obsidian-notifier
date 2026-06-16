export function focusObsidian(): void {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const remote = require("@electron/remote");
		const win = remote.getCurrentWindow();
		if (win.isMinimized()) win.restore();
		win.show();
		win.focus();
	} catch {
		window.focus();
	}
}

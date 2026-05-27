import { AbstractInputSuggest, App, TFile } from 'obsidian';

export class FileSuggest extends AbstractInputSuggest<TFile> {
	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	getSuggestions(query: string): TFile[] {
		const lowerQuery = query.toLowerCase();
		return this.app.vault.getFiles()
			.filter(f => f.path.toLowerCase().includes(lowerQuery))
			.slice(0, 50);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		const inputEl = this.inputEl as HTMLInputElement;
		inputEl.value = file.path;
		inputEl.trigger('input');
		this.close();
	}
}

import {
	App,
	MarkdownRenderChild,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	normalizePath,
} from "obsidian";

// ─────────────────────────────────────────────
// SVG icons
// ─────────────────────────────────────────────

const SVG_HTML     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13l-2 2 2 2"/><path d="M16 13l2 2-2 2"/><path d="M10 18l4-6"/></svg>`;
const SVG_EXPAND   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>`;
const SVG_COLLAPSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M9 3H3v6"/><path d="M15 21h6v-6"/><path d="M3 3l7 7"/><path d="M21 21l-7-7"/></svg>`;
const SVG_OPEN     = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>`;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isHtmlPath(value: string): boolean {
	return /\.html?$/i.test(value || "");
}

function cleanLinkpath(value: string | null | undefined): string {
	if (!value) return "";
	return decodeURIComponent(String(value).split("|")[0].split("#")[0].trim());
}

function extractHtmlLinkFromEmbed(embedEl: Element): string {
	const directCandidates: (string | null)[] = [
		embedEl.getAttribute("src"),
		embedEl.getAttribute("data-path"),
		embedEl.getAttribute("href"),
		embedEl.getAttribute("alt"),
	];
	for (const candidate of directCandidates) {
		const cleaned = cleanLinkpath(candidate);
		if (isHtmlPath(cleaned)) return cleaned;
	}
	const descendants = Array.from(embedEl.querySelectorAll("a, span, div"));
	for (const node of descendants) {
		const el = node as Element;
		const values: (string | null)[] = [
			el.getAttribute("href"),
			el.getAttribute("data-href"),
			el.getAttribute("src"),
			el.textContent,
		];
		for (const value of values) {
			const cleaned = cleanLinkpath(value);
			if (isHtmlPath(cleaned)) return cleaned;
		}
	}
	return "";
}

// ─────────────────────────────────────────────
// Render child
// ─────────────────────────────────────────────

class HtmlPreviewRenderChild extends MarkdownRenderChild {
	private readonly vaultApp: App;
	private readonly file: TFile;
	private readonly plugin: HtmlPreviewPlugin;
	private expanded = false;
	private resizeInterval: number | null = null;

	constructor(app: App, containerEl: HTMLElement, file: TFile, plugin: HtmlPreviewPlugin) {
		super(containerEl);
		this.vaultApp = app;
		this.file     = file;
		this.plugin   = plugin;
	}

	onload(): void {
		this.render();
	}

	onunload(): void {
		this.stopResize();
	}

	// ── Resize ────────────────────────────────

	private stopResize(): void {
		if (this.resizeInterval !== null) {
			window.clearInterval(this.resizeInterval);
			this.resizeInterval = null;
		}
	}

	private measureHeight(iframe: HTMLIFrameElement): number {
		try {
			const doc = iframe.contentDocument;
			if (!doc || !doc.body || !doc.documentElement) return 0;
			iframe.style.height = "1px";
			const h = Math.max(
				doc.body.scrollHeight,
				doc.body.offsetHeight,
				doc.documentElement.scrollHeight,
				doc.documentElement.offsetHeight,
				320,
			);
			return h;
		} catch {
			return 0;
		}
	}

	private applyHeight(iframe: HTMLIFrameElement, wrap: HTMLElement, h: number): void {
		iframe.style.height = `${h}px`;
		wrap.style.height   = `${h}px`;
	}

	private startResize(iframe: HTMLIFrameElement, wrap: HTMLElement): void {
		this.stopResize();

		wrap.style.height    = "320px";
		wrap.style.minHeight = "320px";
		wrap.style.overflow  = "visible";
		iframe.style.width   = "100%";
		iframe.style.height  = "320px";
		iframe.style.display = "block";

		iframe.addEventListener("load", () => {
			this.stopResize();

			const h0 = this.measureHeight(iframe);
			if (h0 > 0) this.applyHeight(iframe, wrap, h0);

			let lastH = h0;
			let stable = 0;

			this.resizeInterval = window.setInterval(() => {
				const h = this.measureHeight(iframe);
				if (h > 0 && h !== lastH) {
					this.applyHeight(iframe, wrap, h);
					lastH   = h;
					stable  = 0;
				} else {
					stable++;
				}
				if (stable >= 12) this.stopResize();
			}, 500);
		});
	}

	// ── Actions ───────────────────────────────

	private openFile(): void {
		this.vaultApp.workspace.getLeaf(true).openFile(this.file);
	}

	private togglePreview(): void {
		this.expanded = !this.expanded;
		this.render();
	}

	// ── Render ────────────────────────────────

	private render(): void {
		this.stopResize();
		this.containerEl.empty();

		const root    = this.containerEl.createDiv({ cls: "hpv-embed" });
		const toolbar = root.createDiv({ cls: "hpv-toolbar" });

		const left = toolbar.createDiv({ cls: "hpv-toolbar-left" });
		const icon = left.createDiv({ cls: "hpv-inline-icon" });
		icon.innerHTML = SVG_HTML;
		const meta = left.createDiv({ cls: "hpv-meta" });
		meta.createDiv({ cls: "hpv-file-name", text: this.file.name });
		meta.createDiv({ cls: "hpv-file-path", text: this.file.path });

		const right = toolbar.createDiv({ cls: "hpv-toolbar-right" });

		const toggleBtn = right.createEl("button", { cls: "hpv-btn mod-cta" });
		toggleBtn.innerHTML = this.expanded
			? `${SVG_COLLAPSE}<span>Collapse preview</span>`
			: `${SVG_EXPAND}<span>Expand preview</span>`;
		toggleBtn.addEventListener("click", () => this.togglePreview());

		const openBtn = right.createEl("button", { cls: "hpv-btn" });
		openBtn.innerHTML = `${SVG_OPEN}<span>Open file</span>`;
		openBtn.addEventListener("click", () => this.openFile());

		if (this.expanded) {
			const wrap = root.createDiv({ cls: "hpv-frame-wrap" });
			const iframe = wrap.createEl("iframe", { cls: "hpv-frame" });
			iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads");
			iframe.setAttribute("referrerpolicy", "no-referrer");

			// Attach resize listener BEFORE src so load event is never missed
			this.startResize(iframe, wrap);
			iframe.src = (this.vaultApp.vault.adapter as any).getResourcePath(
				normalizePath(this.file.path),
			);
		} else {
			const el = root.createDiv({ cls: "hpv-collapsed" });
			el.setText("Preview is collapsed. Click Expand preview to render the HTML file inline.");
		}
	}
}

// ─────────────────────────────────────────────
// Main Plugin
// ─────────────────────────────────────────────

export default class HtmlPreviewPlugin extends Plugin {
	private statusBarEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("hpv-statusbar");
		this.statusBarEl.innerHTML = `${SVG_HTML}<span>HTML Preview</span>`;
		this.statusBarEl.setAttribute("title", "HTML Preview — inline HTML rendering");

		this.addSettingTab(new HtmlPreviewSettingTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			const embeds = Array.from(
				element.querySelectorAll(".internal-embed, .file-embed"),
			);
			for (const embedEl of embeds) {
				const linkpath = extractHtmlLinkFromEmbed(embedEl);
				if (!linkpath) continue;

				const file = this.app.metadataCache.getFirstLinkpathDest(
					linkpath,
					context.sourcePath,
				);
				if (!(file instanceof TFile)) continue;
				if (!isHtmlPath(file.path)) continue;

				const host = document.createElement("div");
				embedEl.replaceWith(host);
				context.addChild(
					new HtmlPreviewRenderChild(this.app, host, file, this),
				);
			}
		}, 1000);
	}
}

// ─────────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────────

class HtmlPreviewSettingTab extends PluginSettingTab {
	constructor(app: App, plugin: HtmlPreviewPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "HTML Preview" });

		containerEl.createEl("h3", { text: "Usage", cls: "hpv-section-heading" });

		const usage = containerEl.createDiv({ cls: "hpv-status-block" });
		usage.createEl("p", { text: "Embed an HTML file with ![[page.html]] in a note." });
		usage.createEl("p", { text: "Switch to Reading view and click Expand preview." });
		usage.createEl("p", { text: "The iframe grows to the full height of the HTML page." });
		usage.createEl("p", { text: "Click Collapse preview to hide the inline page." });
		usage.createEl("p", { text: "Click Open file to open the HTML in its own tab." });
	}
}

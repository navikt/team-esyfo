import { nextTick, onBeforeUnmount, onMounted } from "vue";

const MERMAID_SVG_SELECTOR = ".mermaid svg";
const OVERLAY_ID = "mermaid-overlay";

let isOverlayOpen = false;

const isSvgVisible = (svgElement: SVGSVGElement) => {
	const { width, height } = svgElement.getBoundingClientRect();
	return width > 0 && height > 0;
};

const createCloseButton = () => {
	const btn = document.createElement("button");
	btn.className = "mermaid-overlay-close";
	btn.setAttribute("aria-label", "Lukk");
	btn.textContent = "✕";
	return btn;
};

const cloneSvgForOverlay = (svgElement: SVGSVGElement) => {
	const clone = svgElement.cloneNode(true) as SVGSVGElement;
	clone.removeAttribute("style");
	clone.classList.add("mermaid-overlay-svg");
	return clone;
};

const createOverlayElement = (svgElement: SVGSVGElement) => {
	const overlay = document.createElement("div");
	overlay.id = OVERLAY_ID;
	overlay.setAttribute("role", "dialog");
	overlay.setAttribute("aria-modal", "true");
	overlay.setAttribute("aria-label", "Mermaid-diagram i fullskjerm");

	overlay.appendChild(createCloseButton());
	overlay.appendChild(cloneSvgForOverlay(svgElement));

	return overlay;
};

const bindOverlayEvents = (overlay: HTMLElement, closeBtn: HTMLElement) => {
	const previouslyFocused = document.activeElement as HTMLElement | null;

	const close = () => {
		isOverlayOpen = false;
		overlay.classList.remove("mermaid-overlay-visible");
		overlay.addEventListener("transitionend", () => overlay.remove(), {
			once: true,
		});
		document.removeEventListener("keydown", onKey);
		previouslyFocused?.focus();
	};

	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") close();
		if (e.key === "Tab") {
			e.preventDefault();
			closeBtn.focus();
		}
	};

	closeBtn.addEventListener("click", close);
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) close();
	});
	document.addEventListener("keydown", onKey);
};

const openOverlay = (svgElement: SVGSVGElement) => {
	if (isOverlayOpen || !isSvgVisible(svgElement)) return;

	isOverlayOpen = true;

	const overlay = createOverlayElement(svgElement);
	document.body.appendChild(overlay);

	const closeBtn = overlay.querySelector<HTMLElement>(".mermaid-overlay-close")!;
	closeBtn.focus();

	bindOverlayEvents(overlay, closeBtn);
	requestAnimationFrame(() => overlay.classList.add("mermaid-overlay-visible"));
};

const attachClickHandlers = () => {
	for (const svg of document.querySelectorAll<SVGSVGElement>(
		MERMAID_SVG_SELECTOR,
	)) {
		if (svg.dataset.overlayAttached) continue;
		svg.dataset.overlayAttached = "true";
		svg.addEventListener("click", () => openOverlay(svg));
	}
};

export const useMermaidOverlay = () => {
	let observer: MutationObserver | undefined;

	onMounted(() => {
		nextTick(() => attachClickHandlers());

		observer = new MutationObserver(() => attachClickHandlers());
		observer.observe(document.body, { childList: true, subtree: true });
	});

	onBeforeUnmount(() => {
		observer?.disconnect();
		const existing = document.getElementById(OVERLAY_ID);
		if (existing) {
			isOverlayOpen = false;
			existing.remove();
		}
	});
};

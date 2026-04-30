import { nextTick, onBeforeUnmount, onMounted } from "vue";

const MERMAID_SVG_SELECTOR = ".mermaid svg";
const OVERLAY_ID = "mermaid-overlay";

let isOverlayOpen = false;

const createOverlay = (svgElement: SVGSVGElement) => {
	if (isOverlayOpen) return;

	const { width, height } = svgElement.getBoundingClientRect();
	if (width === 0 || height === 0) return;

	isOverlayOpen = true;

	const overlay = document.createElement("div");
	overlay.id = OVERLAY_ID;
	overlay.setAttribute("role", "dialog");
	overlay.setAttribute("aria-modal", "true");
	overlay.setAttribute("aria-label", "Mermaid-diagram i fullskjerm");

	const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
	clonedSvg.removeAttribute("style");
	clonedSvg.classList.add("mermaid-overlay-svg");

	const closeBtn = document.createElement("button");
	closeBtn.className = "mermaid-overlay-close";
	closeBtn.setAttribute("aria-label", "Lukk");
	closeBtn.textContent = "✕";

	overlay.appendChild(closeBtn);
	overlay.appendChild(clonedSvg);
	document.body.appendChild(overlay);

	const previouslyFocused = document.activeElement as HTMLElement | null;
	closeBtn.focus();

	requestAnimationFrame(() => overlay.classList.add("mermaid-overlay-visible"));

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

const attachClickHandlers = () => {
	for (const svg of document.querySelectorAll<SVGSVGElement>(
		MERMAID_SVG_SELECTOR,
	)) {
		if (svg.dataset.overlayAttached) continue;
		svg.dataset.overlayAttached = "true";
		svg.addEventListener("click", () => createOverlay(svg));
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

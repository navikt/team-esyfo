import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted } from "vue";
import "./custom.css";

const MERMAID_SVG_SELECTOR = ".mermaid svg";
const OVERLAY_ID = "mermaid-overlay";

function createOverlay(svgElement: SVGSVGElement) {
	const existing = document.getElementById(OVERLAY_ID);
	if (existing) existing.remove();

	const overlay = document.createElement("div");
	overlay.id = OVERLAY_ID;

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

	requestAnimationFrame(() => overlay.classList.add("mermaid-overlay-visible"));

	const close = () => {
		overlay.classList.remove("mermaid-overlay-visible");
		overlay.addEventListener("transitionend", () => overlay.remove(), {
			once: true,
		});
		document.removeEventListener("keydown", onKey);
	};

	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") close();
	};

	closeBtn.addEventListener("click", close);
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) close();
	});
	document.addEventListener("keydown", onKey);
}

function attachClickHandlers() {
	for (const svg of document.querySelectorAll<SVGSVGElement>(
		MERMAID_SVG_SELECTOR,
	)) {
		if (svg.dataset.overlayAttached) continue;
		svg.dataset.overlayAttached = "true";
		svg.addEventListener("click", () => createOverlay(svg));
	}
}

function useMermaidOverlay() {
	let observer: MutationObserver | undefined;

	onMounted(() => {
		nextTick(() => attachClickHandlers());

		observer = new MutationObserver(() => attachClickHandlers());
		observer.observe(document.body, { childList: true, subtree: true });
	});

	onBeforeUnmount(() => {
		observer?.disconnect();
		document.getElementById(OVERLAY_ID)?.remove();
	});
}

const MermaidOverlayLayout = defineComponent({
	name: "MermaidOverlayLayout",
	setup() {
		useMermaidOverlay();
		return () => h(DefaultTheme.Layout);
	},
});

export default {
	extends: DefaultTheme,
	Layout: MermaidOverlayLayout,
} satisfies Theme;

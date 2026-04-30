import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h, nextTick, onBeforeUnmount, onMounted } from "vue";
import "./custom.css";

type SvgPanZoomModule = typeof import("svg-pan-zoom");
type SvgPanZoomInstance = ReturnType<SvgPanZoomModule["default"]>;

const MERMAID_SVG_SELECTOR = ".mermaid svg";
const panZoomInstances = new Map<SVGSVGElement, SvgPanZoomInstance>();

function ensureSvgDimensions(svgElement: SVGSVGElement) {
	if (!svgElement.getAttribute("viewBox")) {
		const width = Number.parseFloat(svgElement.getAttribute("width") ?? "");
		const height = Number.parseFloat(svgElement.getAttribute("height") ?? "");

		if (width > 0 && height > 0) {
			svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
		}
	}

	svgElement.style.width = "100%";
	svgElement.style.maxWidth = "100%";
	svgElement.style.display = "block";

	const container = svgElement.closest<HTMLElement>(".mermaid");
	if (container) {
		container.style.width = "100%";
		container.style.overflow = "hidden";
	}
}

function destroyDetachedInstances() {
	for (const [svgElement, instance] of panZoomInstances.entries()) {
		if (document.contains(svgElement)) {
			continue;
		}

		instance.destroy();
		panZoomInstances.delete(svgElement);
	}
}

function useMermaidPanZoom() {
	let observer: MutationObserver | undefined;
	let initializeTimer: number | undefined;
	let svgPanZoom: SvgPanZoomModule["default"] | undefined;

	const initializeMermaidDiagrams = async () => {
		if (typeof window === "undefined") {
			return;
		}

		svgPanZoom ??= (await import("svg-pan-zoom")).default;

		for (const svgElement of document.querySelectorAll<SVGSVGElement>(
			MERMAID_SVG_SELECTOR,
		)) {
			if (panZoomInstances.has(svgElement)) {
				continue;
			}

			ensureSvgDimensions(svgElement);

			const panZoomInstance = svgPanZoom(svgElement, {
				zoomEnabled: true,
				mouseWheelZoomEnabled: true,
				panEnabled: true,
				controlIconsEnabled: true,
				fit: true,
				center: true,
				minZoom: 0.5,
				maxZoom: 10,
			});

			panZoomInstance.resize();
			panZoomInstance.fit();
			panZoomInstance.center();
			panZoomInstances.set(svgElement, panZoomInstance);
		}

		destroyDetachedInstances();
	};

	const scheduleInitialization = () => {
		if (typeof window === "undefined") {
			return;
		}

		if (initializeTimer) {
			window.clearTimeout(initializeTimer);
		}

		initializeTimer = window.setTimeout(() => {
			void initializeMermaidDiagrams();
		}, 50);
	};

	onMounted(() => {
		nextTick(() => {
			scheduleInitialization();
		});

		observer = new MutationObserver(() => {
			scheduleInitialization();
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});

	onBeforeUnmount(() => {
		observer?.disconnect();

		if (initializeTimer) {
			window.clearTimeout(initializeTimer);
		}

		for (const instance of panZoomInstances.values()) {
			instance.destroy();
		}

		panZoomInstances.clear();
	});
}

export default {
	extends: DefaultTheme,
	Layout: () => {
		useMermaidPanZoom();

		return h(DefaultTheme.Layout);
	},
} satisfies Theme;

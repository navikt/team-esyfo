import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted } from "vue";
import "./custom.css";

type SvgPanZoomModule = typeof import("svg-pan-zoom");
type SvgPanZoomInstance = ReturnType<SvgPanZoomModule["default"]>;

const MERMAID_CONTAINER_SELECTOR = ".mermaid";
const MERMAID_SVG_SELECTOR = ".mermaid svg";
const INITIALIZE_DELAY_MS = 300;
const RETRY_DELAY_MS = 200;
const panZoomInstances = new Map<SVGSVGElement, SvgPanZoomInstance>();

function getSvgDimensions(svgElement: SVGSVGElement) {
	const width = Number.parseFloat(svgElement.getAttribute("width") ?? "");
	const height = Number.parseFloat(svgElement.getAttribute("height") ?? "");

	if (width > 0 && height > 0) {
		return { width, height };
	}

	try {
		const boundingBox = svgElement.getBBox();

		if (boundingBox.width > 0 && boundingBox.height > 0) {
			return { width: boundingBox.width, height: boundingBox.height };
		}
	} catch {
		// SVG-en er ikke klar for måling ennå.
	}

	return undefined;
}

function ensureSvgDimensions(svgElement: SVGSVGElement) {
	if (!svgElement.getAttribute("viewBox")) {
		const dimensions = getSvgDimensions(svgElement);

		if (dimensions) {
			svgElement.setAttribute(
				"viewBox",
				`0 0 ${dimensions.width} ${dimensions.height}`,
			);
		}
	}

	svgElement.style.width = "100%";
	svgElement.style.height = "auto";
	svgElement.style.maxWidth = "100%";
	svgElement.style.display = "block";

	const container = svgElement.closest<HTMLElement>(MERMAID_CONTAINER_SELECTOR);
	if (container) {
		container.style.width = "100%";
		container.style.overflow = "hidden";
	}
}

function isSvgReady(svgElement: SVGSVGElement) {
	if (!svgElement.isConnected) {
		return false;
	}

	if (
		!svgElement.querySelector(
			"g, path, rect, circle, ellipse, polygon, polyline, line, text, foreignObject",
		)
	) {
		return false;
	}

	const { width, height } = svgElement.getBoundingClientRect();
	return width > 0 && height > 0;
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
	let animationFrameId: number | undefined;
	let svgPanZoom: SvgPanZoomModule["default"] | undefined;

	const resizeInstances = () => {
		for (const instance of panZoomInstances.values()) {
			instance.resize();
		}
	};

	const initializeMermaidDiagrams = async () => {
		if (typeof window === "undefined") {
			return;
		}

		svgPanZoom ??= (await import("svg-pan-zoom")).default;
		let hasPendingSvg = false;

		for (const svgElement of document.querySelectorAll<SVGSVGElement>(
			MERMAID_SVG_SELECTOR,
		)) {
			if (panZoomInstances.has(svgElement)) {
				continue;
			}

			if (!isSvgReady(svgElement)) {
				hasPendingSvg = true;
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

		if (hasPendingSvg) {
			scheduleInitialization(RETRY_DELAY_MS);
		}
	};

	const scheduleInitialization = (delay = INITIALIZE_DELAY_MS) => {
		if (typeof window === "undefined") {
			return;
		}

		if (initializeTimer) {
			window.clearTimeout(initializeTimer);
		}

		if (animationFrameId) {
			window.cancelAnimationFrame(animationFrameId);
		}

		initializeTimer = window.setTimeout(() => {
			animationFrameId = window.requestAnimationFrame(() => {
				void initializeMermaidDiagrams();
			});
		}, delay);
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

		window.addEventListener("resize", resizeInstances);
	});

	onBeforeUnmount(() => {
		observer?.disconnect();

		if (initializeTimer) {
			window.clearTimeout(initializeTimer);
		}

		if (animationFrameId) {
			window.cancelAnimationFrame(animationFrameId);
		}

		window.removeEventListener("resize", resizeInstances);

		for (const instance of panZoomInstances.values()) {
			instance.destroy();
		}

		panZoomInstances.clear();
	});
}

const MermaidPanZoomLayout = defineComponent({
	name: "MermaidPanZoomLayout",
	setup() {
		useMermaidPanZoom();

		return () => h(DefaultTheme.Layout);
	},
});

export default {
	extends: DefaultTheme,
	Layout: MermaidPanZoomLayout,
} satisfies Theme;

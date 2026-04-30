<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const MERMAID_SVG_SELECTOR = ".mermaid svg";

const isOpen = ref(false);
const svgContent = ref("");

let observer: MutationObserver | undefined;

const open = (svgElement: SVGSVGElement) => {
	const { width, height } = svgElement.getBoundingClientRect();
	if (width === 0 || height === 0) return;

	const clone = svgElement.cloneNode(true) as SVGSVGElement;
	clone.removeAttribute("style");
	svgContent.value = clone.outerHTML;
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
	svgContent.value = "";
};

const onBackdropClick = (e: MouseEvent) => {
	if ((e.target as HTMLElement).classList.contains("mermaid-overlay")) {
		close();
	}
};

const onKeydown = (e: KeyboardEvent) => {
	if (e.key === "Escape") close();
};

const attachClickHandlers = () => {
	for (const svg of document.querySelectorAll<SVGSVGElement>(
		MERMAID_SVG_SELECTOR,
	)) {
		if (svg.dataset.overlayAttached) continue;
		svg.dataset.overlayAttached = "true";
		svg.style.cursor = "zoom-in";
		svg.addEventListener("click", () => open(svg));
	}
};

onMounted(() => {
	nextTick(() => attachClickHandlers());

	observer = new MutationObserver(() => attachClickHandlers());
	observer.observe(document.body, { childList: true, subtree: true });

	document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
	observer?.disconnect();
	document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
	<Teleport to="body">
		<Transition name="overlay-fade">
			<div
				v-if="isOpen"
				class="mermaid-overlay"
				role="dialog"
				aria-modal="true"
				aria-label="Mermaid-diagram i fullskjerm"
				@click="onBackdropClick"
			>
				<button
					class="mermaid-overlay__close"
					aria-label="Lukk"
					@click="close"
				>
					✕
				</button>
				<div class="mermaid-overlay__content" v-html="svgContent" />
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.mermaid-overlay {
	position: fixed;
	inset: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.8);
	padding: 2rem;
}

.mermaid-overlay__content {
	width: 95vw;
	height: 90vh;
	background: var(--vp-c-bg);
	border-radius: 8px;
	padding: 1.5rem;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	overflow: auto;
	display: flex;
	align-items: center;
	justify-content: center;
}

.mermaid-overlay__content :deep(svg) {
	display: block;
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
}

.mermaid-overlay__close {
	position: fixed;
	top: 1rem;
	right: 1.5rem;
	z-index: 10000;
	background: none;
	border: none;
	color: white;
	font-size: 1.5rem;
	cursor: pointer;
	padding: 0.5rem;
	line-height: 1;
	opacity: 0.7;
	transition: opacity 0.15s;
}

.mermaid-overlay__close:hover {
	opacity: 1;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
	transition: opacity 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
	opacity: 0;
}
</style>

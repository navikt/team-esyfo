<script setup lang="ts">
import { withBase } from "vitepress";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { glossary } from "./glossary-data";

const props = defineProps<{ id: string }>();

const tooltipId = computed(() => `term-tooltip-${props.id}`);
const description = computed(() => glossary[props.id] ?? "");
const href = computed(() => withBase(`/ordbok#${props.id}`));

const showTooltip = ref(false);
const triggerRef = ref<HTMLAnchorElement | null>(null);

function show() {
	showTooltip.value = true;
}

function hide() {
	showTooltip.value = false;
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === "Escape" && showTooltip.value) {
		hide();
	}
}

onMounted(() => {
	document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
	document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <a
    ref="triggerRef"
    :href="href"
    class="term-link"
    :aria-describedby="description ? tooltipId : undefined"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
  >
    <slot />
    <span
      v-if="description"
      :id="tooltipId"
      role="tooltip"
      class="term-tooltip"
      :class="{ 'term-tooltip--visible': showTooltip }"
    >
      {{ description }}
    </span>
  </a>
</template>

<style scoped>
.term-link {
  position: relative;
  text-decoration: none;
  color: var(--vp-c-brand-1);
  border-bottom: 1px dashed var(--vp-c-brand-1);
  cursor: pointer;
}

.term-link:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
  border-radius: 2px;
}

.term-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.375rem 0.625rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 0.8125rem;
  line-height: 1.4;
  white-space: nowrap;
  max-width: 280px;
  white-space: normal;
  color: var(--vp-c-text-1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  z-index: 100;
}

.term-tooltip--visible {
  opacity: 1;
  visibility: visible;
}
</style>

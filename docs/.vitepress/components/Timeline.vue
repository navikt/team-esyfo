<script setup lang="ts">
import { withBase } from "vitepress";
import { computed } from "vue";
import {
	areas,
	type Phase,
	phaseColors,
	phaseDescriptions,
	phaseLabels,
	phaseWeeks,
} from "../areas";

const allPhases: Phase[] = ["early", "mid", "late", "continuous"];

interface TimelineItem {
	id: string;
	name: string;
	emoji: string;
	path: string;
	badge?: string;
}

// Dialogmøte-items definert lokalt — lenker alle til samme side
const dialogmoteItems: Record<Phase, TimelineItem[]> = {
	early: [
		{
			id: "dm1",
			name: "Dialogmøte 1",
			emoji: "📅",
			path: "/omrader/motebehov/",
			badge: "frivillig",
		},
	],
	mid: [
		{
			id: "dm2",
			name: "Dialogmøte 2",
			emoji: "📅",
			path: "/omrader/motebehov/",
			badge: "obligatorisk",
		},
	],
	late: [
		{
			id: "dm3",
			name: "Dialogmøte 3",
			emoji: "📅",
			path: "/omrader/motebehov/",
			badge: "frivillig",
		},
	],
	continuous: [],
};

const itemsByPhase = computed(() => {
	const grouped: Record<Phase, TimelineItem[]> = {
		early: [],
		mid: [],
		late: [],
		continuous: [],
	};
	for (const area of areas) {
		// Filtrer bort motebehov — erstattes av DM-items
		if (area.id === "motebehov") continue;
		grouped[area.phase].push({
			id: area.id,
			name: area.name,
			emoji: area.emoji,
			path: area.path,
		});
	}
	// Injiser dialogmøte-items i riktig fase
	for (const phase of allPhases) {
		grouped[phase].push(...dialogmoteItems[phase]);
	}
	return grouped;
});

function phaseDescription(phase: Phase): string {
	const weeks = phaseWeeks[phase];
	return phase === "continuous"
		? "Hele forløpet"
		: `${weeks.start}–${weeks.end} uker`;
}
</script>

<template>
  <div class="timeline-vertical" role="region" aria-label="Tidslinje for sykefraværsforløpet">
    <div
      v-for="(phase, index) in allPhases"
      :key="phase"
      class="timeline-step"
      :data-phase="phase"
      :class="{ 'timeline-step--last': index === allPhases.length - 1 }"
    >
      <!-- Animated track with gradient line -->
      <div class="timeline-track">
        <span
          class="timeline-dot"
          :class="`timeline-dot--${phaseColors[phase]}`"
          aria-hidden="true"
        />
        <span
          v-if="index < allPhases.length - 1"
          class="timeline-line"
          :class="`timeline-line--${phaseColors[phase]}`"
          aria-hidden="true"
        />
      </div>

      <!-- Phase content card -->
      <div class="timeline-content">
        <div class="phase-card" :class="`phase-card--${phaseColors[phase]}`">
          <div class="phase-header">
            <span class="phase-label">{{ phaseLabels[phase] }}</span>
            <span class="phase-weeks">{{ phaseDescription(phase) }}</span>
          </div>
          <p class="phase-desc">{{ phaseDescriptions[phase] }}</p>
          <div class="phase-areas">
            <a
              v-for="item in itemsByPhase[phase]"
              :key="item.id"
              :href="withBase(item.path)"
              class="area-tag"
              :class="`area-tag--${phaseColors[phase]}`"
            >
              <span class="area-emoji" aria-hidden="true">{{ item.emoji }}</span>
              <span class="area-name">{{ item.name }}</span>
              <span v-if="item.badge" class="area-badge" :class="`area-badge--${item.badge}`">
                {{ item.badge }}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-vertical {
  display: flex;
  flex-direction: column;
  margin: 2rem 0;
  padding-left: 0.25rem;
}

.timeline-step {
  display: flex;
  gap: 1.25rem;
  position: relative;
}

/* ─── Track ─── */
.timeline-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 1.5rem;
}

.timeline-dot {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 1.125rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.timeline-dot--green {
  background: var(--tl-green-border);
  box-shadow: 0 0 0 4px var(--tl-green-bg), 0 0 12px var(--tl-green-border);
}
.timeline-dot--yellow {
  background: var(--tl-yellow-border);
  box-shadow: 0 0 0 4px var(--tl-yellow-bg), 0 0 12px var(--tl-yellow-border);
}
.timeline-dot--orange {
  background: var(--tl-orange-border);
  box-shadow: 0 0 0 4px var(--tl-orange-bg), 0 0 12px var(--tl-orange-border);
}
.timeline-dot--blue {
  background: var(--tl-blue-border);
  box-shadow: 0 0 0 4px var(--tl-blue-bg), 0 0 12px var(--tl-blue-border);
}

.timeline-step:hover .timeline-dot {
  transform: scale(1.25);
}

.timeline-line {
  width: 3px;
  flex: 1;
  margin: 0.375rem 0;
  min-height: 1.5rem;
  border-radius: 2px;
  background-size: 100% 200%;
  animation: line-shimmer 3s ease-in-out infinite;
}

.timeline-line--green {
  background: linear-gradient(180deg, var(--tl-green-border), var(--tl-yellow-border));
}
.timeline-line--yellow {
  background: linear-gradient(180deg, var(--tl-yellow-border), var(--tl-orange-border));
}
.timeline-line--orange {
  background: linear-gradient(180deg, var(--tl-orange-border), var(--tl-blue-border));
}

@keyframes line-shimmer {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ─── Content card ─── */
.timeline-content {
  padding-bottom: 1.25rem;
  flex: 1;
  min-width: 0;
}

.timeline-step--last .timeline-content {
  padding-bottom: 0;
}

.phase-card {
  border-radius: 12px;
  padding: 1rem 1.25rem;
  border: 1px solid var(--tl-card-border);
  box-shadow: var(--tl-card-shadow);
  transition: box-shadow 0.2s ease;
}

.phase-card--green {
  background: linear-gradient(135deg, var(--tl-green-bg), transparent 60%);
  border-color: color-mix(in srgb, var(--tl-green-border) 30%, transparent);
}
.phase-card--yellow {
  background: linear-gradient(135deg, var(--tl-yellow-bg), transparent 60%);
  border-color: color-mix(in srgb, var(--tl-yellow-border) 30%, transparent);
}
.phase-card--orange {
  background: linear-gradient(135deg, var(--tl-orange-bg), transparent 60%);
  border-color: color-mix(in srgb, var(--tl-orange-border) 30%, transparent);
}
.phase-card--blue {
  background: linear-gradient(135deg, var(--tl-blue-bg), transparent 60%);
  border-color: color-mix(in srgb, var(--tl-blue-border) 30%, transparent);
}

.phase-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.phase-label {
  font-weight: 700;
  font-size: 1rem;
  color: var(--tl-header-text);
}

.phase-weeks {
  font-size: 0.8125rem;
  opacity: 0.65;
  color: var(--tl-header-text);
}

.phase-desc {
  font-size: 0.9375rem;
  color: var(--tl-header-text);
  opacity: 0.75;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

/* ─── Area tags ─── */
.phase-areas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.area-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  background: var(--tl-tag-bg);
  color: var(--tl-tag-text);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid var(--tl-tag-border);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.area-tag:hover {
  transform: translateY(-2px);
  text-decoration: none;
}

.area-tag--green:hover {
  border-color: var(--tl-green-border);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tl-green-border) 25%, transparent);
}
.area-tag--yellow:hover {
  border-color: var(--tl-yellow-border);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tl-yellow-border) 25%, transparent);
}
.area-tag--orange:hover {
  border-color: var(--tl-orange-border);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tl-orange-border) 25%, transparent);
}
.area-tag--blue:hover {
  border-color: var(--tl-blue-border);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tl-blue-border) 25%, transparent);
}

.area-tag:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, #3451b2);
  outline-offset: 2px;
  transform: translateY(-2px);
}

.area-emoji {
  font-size: 1.0625rem;
  line-height: 1;
}

.area-name {
  white-space: nowrap;
}

/* ─── Badge ─── */
.area-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  line-height: 1.2;
}

.area-badge--frivillig {
  background: var(--tl-badge-frivillig-bg);
  color: var(--tl-badge-frivillig-text);
}

.area-badge--obligatorisk {
  background: var(--tl-badge-oblig-bg);
  color: var(--tl-badge-oblig-text);
}
</style>

<!-- Non-scoped block for dark mode CSS custom properties (must target :root) -->
<style>
:root {
  --tl-green-bg: #e6f4ea;
  --tl-green-border: #34a853;
  --tl-yellow-bg: #fef9e7;
  --tl-yellow-border: #f9ab00;
  --tl-orange-bg: #fef0e6;
  --tl-orange-border: #e8710a;
  --tl-blue-bg: #e8f0fe;
  --tl-blue-border: #1a73e8;
  --tl-tag-bg: rgba(255, 255, 255, 0.85);
  --tl-tag-text: #1a1a1a;
  --tl-tag-border: rgba(128, 128, 128, 0.2);
  --tl-header-text: #1a1a1a;
  --tl-card-border: rgba(128, 128, 128, 0.15);
  --tl-card-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  --tl-badge-frivillig-bg: #e8f5e9;
  --tl-badge-frivillig-text: #2e7d32;
  --tl-badge-oblig-bg: #fff3e0;
  --tl-badge-oblig-text: #e65100;
}

.dark {
  --tl-green-bg: rgba(52, 168, 83, 0.12);
  --tl-green-border: #66bb6a;
  --tl-yellow-bg: rgba(249, 171, 0, 0.12);
  --tl-yellow-border: #fdd835;
  --tl-orange-bg: rgba(232, 113, 10, 0.12);
  --tl-orange-border: #ffa726;
  --tl-blue-bg: rgba(26, 115, 232, 0.12);
  --tl-blue-border: #64b5f6;
  --tl-tag-bg: rgba(255, 255, 255, 0.06);
  --tl-tag-text: #e0e0e0;
  --tl-tag-border: rgba(255, 255, 255, 0.1);
  --tl-header-text: #f0f0f0;
  --tl-card-border: rgba(255, 255, 255, 0.08);
  --tl-card-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  --tl-badge-frivillig-bg: rgba(76, 175, 80, 0.2);
  --tl-badge-frivillig-text: #a5d6a7;
  --tl-badge-oblig-bg: rgba(255, 152, 0, 0.2);
  --tl-badge-oblig-text: #ffcc80;
}
</style>

import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h } from "vue";
import "./custom.css";
import { useMermaidOverlay } from "./mermaid-overlay";

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

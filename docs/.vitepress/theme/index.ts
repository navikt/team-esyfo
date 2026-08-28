import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h } from "vue";
import AlertRegistry from "../components/AlertRegistry.vue";
import RuntimeInventory from "../components/RuntimeInventory.vue";
import Timeline from "../components/Timeline.vue";
import MermaidOverlay from "./MermaidOverlay.vue";
import "./custom.css";

const MermaidOverlayLayout = defineComponent({
	name: "MermaidOverlayLayout",
	setup() {
		return () =>
			h(DefaultTheme.Layout, null, {
				"layout-bottom": () => h(MermaidOverlay),
			});
	},
});

export default {
	extends: DefaultTheme,
	Layout: MermaidOverlayLayout,
	enhanceApp({ app }) {
		app.component("Timeline", Timeline);
		app.component("RuntimeInventory", RuntimeInventory);
		app.component("AlertRegistry", AlertRegistry);
	},
} satisfies Theme;

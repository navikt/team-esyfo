import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h } from "vue";
import Term from "../components/Term.vue";
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
		app.component("Term", Term);
	},
} satisfies Theme;

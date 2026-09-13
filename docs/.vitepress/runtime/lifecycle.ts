import type { IsoDate, Lifecycle } from "./model.ts";

export const isCurrentLifecycle = (lifecycle: Lifecycle) =>
	lifecycle.state === "active" ||
	lifecycle.state === "migrating" ||
	lifecycle.state === "retiring";

export const isExpectedLifecycleAt = (lifecycle: Lifecycle, asOf: IsoDate) =>
	isCurrentLifecycle(lifecycle) ||
	(lifecycle.state === "sunset" && lifecycle.sunsetOn >= asOf) ||
	(lifecycle.state === "retired" && lifecycle.retiredOn > asOf);

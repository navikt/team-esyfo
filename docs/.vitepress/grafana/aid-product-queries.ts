import {
	aidPlanEvaluationEventPipeline,
	aidPlanEventPipeline,
} from "./aid-plan-queries.ts";
import { aidServerPlanEventPipeline } from "./aid-server-plan-queries.ts";

// Keep the pilot boundary even when the local group selector means both groups.
// Assignment is independent of which form was delivered to the user.
const selectedPlanGroups = `| gruppe=~"tiltak|kontroll"
| gruppe=~"\${plan_group:raw}"`;

const serverPlanCount = (range: string) =>
	`sum by (gruppe) (count_over_time(${aidServerPlanEventPipeline}
${selectedPlanGroups}
| keep gruppe
[${range}]))`;

export const aidProductPlanCreationsQuery = serverPlanCount("$__auto");
export const aidProductPlanTrendQuery = serverPlanCount("1d");

// This describes the submitted value only where the form offers the choice.
// It deliberately does not inherit the plan row's group selector.
export const aidProductEvaluationQuery = `sum by (evaluering_paaminnelse) (count_over_time(${aidServerPlanEventPipeline}
| gruppe="tiltak"
| skjemavariant="tiltak"
| keep evaluering_paaminnelse
[$__auto]))`;

// Diagnostic details retain missing/invalid values for the offered form.
// A standard form never presents its stored value as a reminder preference.
export const aidPlanEvaluationDetailsQuery = `sum by (gruppe, skjemavariant, evaluering_paaminnelse, utfall) (count_over_time(${aidPlanEvaluationEventPipeline}
| label_format evaluering_paaminnelse=\`{{ if eq .skjemavariant "standard" }}ikke_tilbudt{{ else }}{{ .evaluering_paaminnelse }}{{ end }}\`
[$__auto]))`;

export const aidProductPlanViewsQuery = `sum by (gruppe, skjemavariant) (count_over_time(${aidPlanEventPipeline}
${selectedPlanGroups}
| hendelse="vist" | utfall="tilgjengelig"
| keep gruppe, skjemavariant
[$__auto]))`;

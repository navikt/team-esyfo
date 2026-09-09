import {
	aidPlanEvaluationEventPipeline,
	aidPlanEventPipeline,
} from "./aid-plan-queries.ts";
import { aidServerPlanEventPipeline } from "./aid-server-plan-queries.ts";

// Always compare both pilot groups; activity outside the pilot stays in diagnostics.
// Assignment is independent of which form was delivered to the user.
const pilotGroups = '| gruppe=~"tiltak|kontroll"';

const serverPlanCount = (range: string) =>
	`sum by (gruppe) (count_over_time(${aidServerPlanEventPipeline}
${pilotGroups}
| keep gruppe
[${range}]))`;

export const aidProductPlanCreationsQuery = serverPlanCount("$__auto");
export const aidProductPlanTrendQuery = serverPlanCount("1d");

// This describes the submitted value only where the form offers the choice.
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
${pilotGroups}
| hendelse="vist" | utfall="tilgjengelig"
| keep gruppe, skjemavariant
[$__auto]))`;

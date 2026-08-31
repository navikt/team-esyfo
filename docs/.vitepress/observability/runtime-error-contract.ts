export const runtimeEventTypePattern = "^[a-z][a-z0-9_.-]{0,79}$";
export const runtimeErrorCodePattern = "^[A-Z][A-Z0-9_]{1,79}$";
export const runtimeOperationPattern = runtimeEventTypePattern;
export const runtimeExceptionTypePattern =
	"^([A-Za-z][A-Za-z0-9_.:$]{0,143})?(Error|Exception)$";
export const runtimeTraceIdPattern = "^[0-9a-f]{32}$";
export const runtimeDashboardTraceIdPattern = "^[A-Fa-f0-9]{32}$";

// Loki stringifies extracted JSON scalars. The JSON Schema below is the
// authority for the producer-side number type and integer range.
export const runtimeUpstreamStatusStringPattern = "^[1-5][0-9]{2}$";

export const runtimeErrorContractVersion = "1.0.0";
export const runtimeErrorContractPublicPath = `contracts/runtime-error/v${runtimeErrorContractVersion}/schema.json`;
export const runtimeErrorContractUrl = `https://navikt.github.io/team-esyfo/${runtimeErrorContractPublicPath}`;

export const runtimeErrorContractV1Schema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	$id: runtimeErrorContractUrl,
	title: `Team eSyfo runtime error contract v${runtimeErrorContractVersion}`,
	description:
		"Minimum metadata contract for a terminal runtime error log. Application-specific and framework fields are allowed, but remain subject to local privacy and cardinality tests.",
	type: "object",
	required: ["event_type"],
	properties: {
		event_type: {
			type: "string",
			pattern: runtimeEventTypePattern,
			description:
				"Code-owned stable event identity from the application's closed catalogue.",
		},
		error_code: {
			type: "string",
			pattern: runtimeErrorCodePattern,
			description: "Stable code-owned enum or protocol code.",
		},
		operation: {
			type: "string",
			pattern: runtimeOperationPattern,
			description: "Stable logical operation from a closed set.",
		},
		upstream_status: {
			type: "integer",
			minimum: 100,
			maximum: 599,
			description:
				"HTTP response status from an upstream service. Omitted when no response was received.",
		},
		exception_type: {
			type: "string",
			pattern: runtimeExceptionTypePattern,
			description:
				"Normalised code-owned exception category from a closed set.",
		},
		logger_name: {
			type: "string",
			minLength: 1,
			maxLength: 160,
			description: "Stable logger name supplied by the logging framework.",
		},
		trace_id: {
			type: "string",
			pattern: runtimeTraceIdPattern,
			not: { const: "00000000000000000000000000000000" },
			description:
				"Non-zero W3C trace identifier from the active span. Required locally when tracing exists.",
		},
	},
	additionalProperties: true,
	$comment:
		"This schema proves shape only. Producer-near tests must also prove a closed event catalogue, bounded cardinality, active-span trace propagation, one terminal error log, and that privacy canaries are absent from the entire serialized JSON log.",
} as const;

export const serializeRuntimeErrorContractV1 = () =>
	`${JSON.stringify(runtimeErrorContractV1Schema, null, 2)}\n`;

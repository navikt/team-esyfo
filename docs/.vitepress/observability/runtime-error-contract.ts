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

export const runtimeErrorContractV1Version = "1.0.0";
export const runtimeErrorContractV1PublicPath = `contracts/runtime-error/v${runtimeErrorContractV1Version}/schema.json`;
export const runtimeErrorContractV1Url = `https://navikt.github.io/team-esyfo/${runtimeErrorContractV1PublicPath}`;

export const combineRuntimePatterns = (patterns: readonly string[]) => {
	if (patterns.length === 0) {
		throw new Error("Minst ett runtime-feilmønster må være støttet");
	}
	return patterns.length === 1 ? patterns[0] : `(${patterns.join("|")})`;
};

// Dashboard ingestion is deliberately versioned and append-only. A future
// contract version is added here without removing patterns for producers that
// are still pinned to an older published schema.
export const runtimeErrorIngestionPatterns = {
	[runtimeErrorContractV1Version]: {
		eventType: runtimeEventTypePattern,
		errorCode: runtimeErrorCodePattern,
		operation: runtimeOperationPattern,
		exceptionType: runtimeExceptionTypePattern,
		traceId: runtimeDashboardTraceIdPattern,
		upstreamStatus: runtimeUpstreamStatusStringPattern,
	},
} as const;

export const runtimeErrorIngestionEventTypePattern = combineRuntimePatterns(
	Object.values(runtimeErrorIngestionPatterns).map(
		({ eventType }) => eventType,
	),
);
export const runtimeErrorIngestionExceptionTypePattern = combineRuntimePatterns(
	Object.values(runtimeErrorIngestionPatterns).map(
		({ exceptionType }) => exceptionType,
	),
);
export const runtimeErrorIngestionErrorCodePattern = combineRuntimePatterns(
	Object.values(runtimeErrorIngestionPatterns).map(
		({ errorCode }) => errorCode,
	),
);
export const runtimeErrorIngestionOperationPattern = combineRuntimePatterns(
	Object.values(runtimeErrorIngestionPatterns).map(
		({ operation }) => operation,
	),
);
export const runtimeErrorIngestionTraceIdPattern = combineRuntimePatterns(
	Object.values(runtimeErrorIngestionPatterns).map(({ traceId }) => traceId),
);
export const runtimeErrorIngestionUpstreamStatusPattern =
	combineRuntimePatterns(
		Object.values(runtimeErrorIngestionPatterns).map(
			({ upstreamStatus }) => upstreamStatus,
		),
	);

export const runtimeErrorContractV1Schema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	$id: runtimeErrorContractV1Url,
	title: `Team eSyfo runtime error contract v${runtimeErrorContractV1Version}`,
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
		"This schema proves shape only. Root-level application fields are an open extension space, so promoting or constraining a previously unknown root field requires a new major version. Producer-near tests must also prove a closed event catalogue, bounded cardinality, active-span trace propagation, one terminal error log, and that privacy canaries are absent from the entire serialized JSON log.",
} as const;

export const serializeRuntimeErrorContractV1 = () =>
	`${JSON.stringify(runtimeErrorContractV1Schema, null, 2)}\n`;

export const assertPublishedRuntimeErrorContractsAreImmutable = (
	publishedAtBase: Readonly<Record<string, string>>,
	currentPublished: Readonly<Record<string, string>>,
) => {
	for (const [path, baseContent] of Object.entries(publishedAtBase)) {
		if (currentPublished[path] !== baseContent) {
			throw new Error(
				`Publisert runtime-feilkontrakt er immutable: ${path}. Gjenopprett filen byte-identisk og opprett en ny kontraktversjon i stedet.`,
			);
		}
	}
};

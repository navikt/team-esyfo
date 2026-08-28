const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

export const normalizeAlertExpression = (expression: string) =>
	expression.replace(/\s+/g, " ").trim();

export const alertExpressionFingerprint = (expression: string) => {
	let hash = FNV_OFFSET_BASIS;
	for (const character of normalizeAlertExpression(expression)) {
		hash ^= BigInt(character.codePointAt(0) ?? 0);
		hash = (hash * FNV_PRIME) & UINT64_MASK;
	}
	return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
};

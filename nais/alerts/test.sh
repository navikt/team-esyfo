#!/usr/bin/env bash
# Kjører promtool-enhetstester for PrometheusRule-filene i denne mappen.
# Krever yq (mikefarah v4). Bruker PROMTOOL hvis satt, ellers prom/prometheus i Docker.
set -euo pipefail

cd "$(dirname "$0")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for rule in *.yaml; do
	case "$rule" in *.test.yaml) continue ;; esac
	yq '.spec' "$rule" >"$work/${rule%.yaml}.rules.yaml"
done
cp ./*.test.yaml "$work/"
chmod -R a+rX "$work"

tests=()
for test in "$work"/*.test.yaml; do tests+=("$(basename "$test")"); done

if [[ -n "${PROMTOOL:-}" ]]; then
	(cd "$work" && "$PROMTOOL" check rules ./*.rules.yaml && "$PROMTOOL" test rules "${tests[@]}")
else
	docker run --rm -v "$work:/rules:ro" -w /rules --entrypoint /bin/sh \
		prom/prometheus:v3.13.1@sha256:3c42b892cf723fa54d2f262c37a0e1f80aa8c8ddb1da7b9b0df9455a35a7f893 -c 'promtool check rules ./*.rules.yaml && promtool test rules "$@"' -- "${tests[@]}"
fi

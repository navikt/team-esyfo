---
description: "Repository workflow contracts and permissions for team-esyfo"
applyTo: ".github/workflows/**"
---

# Workflow contract for team-esyfo

`.github/workflows/ci.yaml` is the existing verification entry point.
`ci.yaml` combines documentation and notebook builds; `deploy-docs.yaml` owns publication. Keep pull-request/merge-queue checks separate from deployment.

- Keep third-party actions pinned to full commit SHAs, with version comments;
  follow the established explicit policy for internal `nais/*` actions.
- Set minimal job permissions, bounded timeouts and the appropriate existing
  concurrency group. Never use `permissions: write-all` or log secrets.
- Do not check out an untrusted PR head in a privileged `pull_request_target`
  workflow. Keep validation on `pull_request` and `merge_group` where required.
- Check protected status names before renaming or deleting jobs. Branch rules
  are separate administration and are not changed by editing workflow YAML.
- New secrets, reusable workflow contracts or deployment ordering require a
  resolved decision within the task.

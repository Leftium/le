# Leftium spec review

**Date:** 2026-09-08
**Status:** Review findings and proposals; R1-R4, R7, and R9 design decisions resolved. R5 is narrowed to a first SvelteKit slice; its workflow contract remains open. R6 is an accepted experiment with the representation still unselected. R8 and optional structural changes remain proposals.
**Baseline:** `3cb036e`.
**Scope:** All documents under `10-leftium/` and the Pages migration plan/template. `90-sources/` is excluded and unchanged.

The product direction is coherent: create an ordinary project through its upstream owner, then reuse add-ons for later setup. Keep that direction and the single-package starting point. The review identified overbroad planning and replay guarantees; the accepted contracts below now bound them. Remaining uncertainty belongs primarily to provider integration and Pages delivery.

The accepted next engineering step is a small creation integration spike after `license`, before freezing the add-on API. A separate delivery-plan file remains optional organization work. Straightforward corrections and the accepted decisions identified below are applied; other recommendations remain proposals for discussion.

## Accepted resolution: content-specific behavior and Git review

The follow-up discussion selected the simplest useful behavior for each content type. Shared file utilities compute Leftium-owned text edits; add-ons reconcile structured configuration, regenerate declared output, or delegate to upstream tools as appropriate. Version-control diff and selective recovery are the recommended DX when available. A clean tree is not mandatory for Leftium-owned operations, and Leftium must leave the index and unrelated edits alone.

Generated blocks and assets can be replaced without detecting manual edits inside their documented boundaries. Customization belongs in source configuration or designated overrides. Existing unmarked content still requires careful adoption. Universal fingerprints, historical output snapshots, automatic rollback, and three-way merging are not initial requirements. Full upstream previews are not promised.

The active [core policy](10-leftium/10-core-model.md#content-ownership-and-reconciliation) and [architecture](10-leftium/20-architecture.md#shared-editing-and-reporting) now specify this resolution. R1/R2 below reflect the revised recommendation rather than the earlier blanket edit-detection proposal.

## Priority findings

| Status / priority | Finding | Consequence | Decision or next step |
| --- | --- | --- | --- |
| Resolved | R1: Execution guarantees | Complete upstream previews would overcomplicate orchestration | Report known edits and upstream operations; use Git for ordinary review |
| Resolved | R2: Content ownership | Shared source and generated output need different treatment | Use targeted edits for shared configuration and regeneration for declared output |
| Resolved | R3: Operation roots and workspace scope | Git is optional; package, workspace, and repository roots may differ | Support one selected package in a recognized workspace; keep operation scopes explicit |
| Resolved | R4: Initial-creation replay contract | The recipe records starting choices, not subsequent project evolution | Use a structured request and versioned command; settle grammar and verify serialization during implementation |
| High | R5: Pages delivery contract | First scope is prerendered SvelteKit; workflow distribution remains a gate | Define and release the narrow reusable workflow before consumer adoption |
| Experiment | R6: `nodiff` representation | Native attributes may remove local driver setup | Compare native `-diff` and a custom driver in a disposable fixture before selecting |
| Resolved | R7: Installation and execution results | Partial work and skipped checks must remain visible | Coordinate installation, support no-install, inspect provider results, and stop on failure |
| Medium | R8: Future lifecycle selection cannot always be inferred | `update` may claim ownership of manually configured tools | Distinguish observed state, managed intent, and provenance |
| Resolved | R9: Engineering sequence | Creation integration needs early evidence | Spike creation after license; preserve v0 release scope and defer optional file reorganization |

## R1. Make execution guarantees explicit

Affected: [architecture](10-leftium/20-architecture.md#add-on-boundary), [CLI delegation](10-leftium/30-cli.md#sv-delegation), [creation](10-leftium/35-create.md#execution-contract).

The original lifecycle implied a complete plan without defining one. The resolution keeps lightweight preparation and reporting: `run` can use shared mutation utilities or call an upstream tool whose prompts and writes remain upstream-owned. Public APIs improve coordination but do not automatically expose a read-only plan.

The upstream direction is feasible: `sv` documents public creation and add-on APIs. Its add-on execution API also permits subprocess execution, so importing an add-on is not equivalent to evaluating a pure transform. [Svelte API documentation](https://svelte.dev/docs/cli/sv).

Use one orchestrator with two execution forms:

```text
resolved request
  -> inspect target and resolve known inputs
  -> exact file/package edits OR declared upstream execution
  -> apply in dependency order
  -> inspect result, install when needed, verify, report
```

Shared text-edit utilities can hold before/after content in memory and skip identical output. An upstream step reports its provider, arguments, working directory, and known limitations. A persisted plan, complete virtual filesystem, and replayable transaction are not required. Git provides the ordinary detailed diff after application.

Prefer a two-stage creation plan: resolve intent before scaffolding, then inspect the real generated project before dependent transforms. If additional required choices only become knowable after generation, report that limitation instead of promising universal preflight.

A future dry run can render exact edits and describe unexecuted upstream steps. Do not simulate opaque tools by running them in the user's project. Staging in a temporary directory is an alternative for creators that tolerate it, but adds path-dependent output and cleanup complexity; it should not be the default architectural requirement.

## R2. Define what happens to user edits inside managed output

Affected: [existing configuration](10-leftium/10-core-model.md#existing-configuration), [Git attributes ownership](10-leftium/40-addons/20-gitattributes.md#file-ownership), [recipe insertion](10-leftium/35-create.md#recipe-contract).

Use an explicit content policy rather than inferring that all generated files must preserve manual edits:

| Observed state | Accepted behavior |
| --- | --- |
| No target | Create |
| Equivalent existing content | No-op, without silently claiming ownership |
| Shared user configuration | Update relevant fields or syntax; preserve unrelated content |
| Declared generated output, including manual edits inside it | Regenerate from input; document the customization location |
| Unmarked pre-existing content at a generated path | Preserve or obtain an explicit replacement choice |
| Malformed or duplicate ownership markers | Stop; do not guess boundaries |

A fingerprint or previous output is unnecessary when the contract explicitly makes a block replaceable. Structured configuration and workflow callers retain domain-specific preservation rules. Version control supports user review and selective undo; it does not justify broad overwrites or cover every install, local-setting, or remote side effect.

Git attribute ordering also needs a selected policy. A generated block before user rules and one after them can produce different effective values. Overrides appended inside the block need not win over user rules outside it. Preserve the original user-rule order and report effective precedence; do not treat every overlapping rule as an error merely because multiple rules match.

## R3. Define operation roots before implementing detection

Affected: [CLI detection](10-leftium/30-cli.md#project-detection), root license/attributes, repository workflows, package installation.

Accepted, refined by follow-up review: plain directories support generic add-ons. The target directory is always present; package and Git roots are optional capabilities. Package operations require a manifest. Support one selected package in a recognized workspace; keep package, workspace-install, and optional Git roots separate. App-specific operations must not choose an arbitrary workspace child. Repository-wide operations need a detected or explicit target. Whole-monorepo creation, bulk changes, and restructuring shared configuration remain deferred.

The [CLI targeting contract](10-leftium/30-cli.md#project-detection) and [architecture fixtures](10-leftium/20-architecture.md#target-context) define the implementation boundary. Git initialization remains creator-owned; Leftium does not independently initialize or commit. Version-control review is recommended when available, without a replacement rollback system.

## R4. Make the creation request serializable before polishing prompts

Affected: [creation inputs and recipe](10-leftium/35-create.md#inputs-and-interaction), [CLI](10-leftium/30-cli.md#creation-command-next-milestone).

Accepted: derive the executable creation record from a structured internal request shared with prompts and parsing. Replay reproduces supported initial choices in a fresh destination, not later project evolution or byte-identical output. Subsequent add-ons reconcile current files; the original recipe remains historical. Persisted operation history and template merging are deferred.

The design decision is resolved in the [creation contract](10-leftium/35-create.md#recipe-contract). Option grammar, serialization, and supported shells remain implementation gates, following `sv` where practical. Cover these cases together:

- Add-on-specific options, including the same option name used by two add-ons.
- Explicit false, empty string, ordered repeated presets, and shell-sensitive values.
- Stable provider identity for official add-ons wrapped or shadowed by Leftium.
- Destination path versus project/package name. `create .` must not record a replay command that derives a different identity when copied elsewhere.
- Creation from a local override or custom preset whose content is not captured by a pinned package release.
- Requested versus resolved versions, and mutable generated dependency ranges.
- Missing required input and partial execution, following the accepted R7 result contract. An incomplete run reports its progress without emitting a successful-creation recipe.

Choose the initial supported shell/OS set explicitly. A POSIX shell command is not automatically a PowerShell command. Keep argument arrays internally; the renderer owns quoting. Prefer ordinary scoped options over an embedded mini-language, but decide syntax from representative examples rather than committing to a schema in this review.

Define replay as reproducing supported creation choices, not necessarily byte-identical output. Compare meaningful generated configuration in replay fixtures; package-lock resolution and machine-specific metadata require a separate reproducibility claim. The existing requirement to pin Leftium is useful but insufficient if its own dependency resolution or a template input remains mutable.

## R5. Break Pages into assessable contracts

Affected: [Pages add-on](10-leftium/40-addons/30-pages.md), [migration plan](20-github-pages-migration/10-plan.md), [workflow template](20-github-pages-migration/20-workflow-template.yml).

The reviewed wording incorrectly required a CNAME artifact for custom Actions deployments and omitted root user/organization sites from base-path selection. Both are corrected. GitHub says custom Actions publishing ignores CNAME files. [GitHub domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

The first scope is now fully prerendered SvelteKit, with explicit default-adapter replacement and caller-owned branch triggers. Non-Kit support, SPA fallbacks, and arbitrary migrations are deferred. The remaining delivery gates and rationale are:

1. Accepted rendering mode: fully prerendered output without a fallback. A later fallback mode needs host-specific deep-link and HTTP-status behavior documented. Server code that only runs while prerendering is valid; static compatibility cannot be proven from filename detection alone. [SvelteKit static adapter](https://svelte.dev/docs/kit/adapter-static).
2. Accepted migration boundary: offer explicit replacement of a recognized default adapter while preserving unrelated configuration. Verify the recognized adapter shapes against the pinned provider; arbitrary custom migrations remain unsupported.
3. Specify the reusable workflow's actual `workflow_call` inputs, permissions, secrets, environment, working directory, output, and version reference. The checked-in standalone migration workflow is not that interface. Caller permissions cannot be elevated by a reusable callee. [GitHub reusable workflow constraints](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations).
4. Accepted ownership: the caller owns its `on` trigger. Define the remaining callable inputs in the reusable-workflow contract.
5. Accepted reporting boundary: distinguish successful local setup from a verified static build and a verified remote deployment. A routine setup command need not run every expensive project check, but skipped verification must be visible.
6. Publish an immutable usable workflow revision before generating callers that depend on it. Decide how workflow releases relate to the npm release; this is a distribution prerequisite even without remote mines.

The existing template's action refs resolve upstream, including `pnpm/setup@v2` and its `runtime`, `cache`, and `install` inputs. Do not downgrade them based on older documentation examples. The template grants deployment permissions to the build job as well; reduce that scope when defining the final workflow. Pages deployment requires write/OIDC permissions and an environment on the deploy job. [Pages workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## R6. Reconsider the custom `nodiff` driver

Affected: [Git attributes](10-leftium/40-addons/20-gitattributes.md#git-configuration).

The desired behavior may be expressible as ordinary attributes:

```gitattributes
package-lock.json text eol=lf -diff
```

Git separates text normalization from diff presentation. Unsetting `diff` suppresses normal textual hunks and reports a binary difference; it does not hide the file from status or guarantee silence in every diff tool. This avoids a local driver setup dependency. [Git attributes documentation](https://git-scm.com/docs/gitattributes).

Recommend this simpler representation if that presentation meets the user's intent. Retain `diff=nodiff` only if a concrete requirement calls for custom presentation, such as suppressing even the summary. Then specify which Git commands/tools honor it, how collaborators configure it after cloning, and what creation does before Git initialization. The active spec now requires the disposable-fixture comparison before choosing a representation; no experiment has been run yet.

## R7. Define package operations and execution results

Affected: [architecture](10-leftium/20-architecture.md), [package-manager selection](10-leftium/30-cli.md#project-detection), [creation acceptance](10-leftium/35-create.md#acceptance).

Accepted: one orchestrator coordinates a final install where upstream supports deferral. Leftium-owned operations support `--no-install`; unsupported combinations fail before avoidable writes. Applied/no-op, unsupported/conflict, and canceled/failed results are distinct, with verification tracked separately. Stop dependent work on failure and leave partial output inspectable. Transparent delegation retains native upstream behavior.

The [architecture contract](10-leftium/20-architecture.md#installation-and-execution-results) and [CLI completion rules](10-leftium/30-cli.md#installation-and-completion) specify these decisions. Supported environments and exact result/exit-code representation remain implementation gates. The inspected `sv` engine returns per-add-on status, so promise resolution alone is insufficient. [Upstream engine](https://github.com/sveltejs/cli/blob/main/packages/sv/src/core/engine.ts).

Use `sv` behavior as the default where it fits Leftium's scope, as stated in the [overview](10-leftium/00-spec.md#design). Explicit product contracts and verified integration limits take precedence.

## R8. Preserve the lifecycle idea without pretending native files express intent

Affected: [scopes and state](10-leftium/10-core-model.md), [roadmap](10-leftium/60-roadmap.md), [mines](10-leftium/50-resolution-and-mines.md).

A native Prettier configuration can reveal effective formatting, but not whether the user wants it to follow a moving preset. A generated file cannot always identify which catalog supplied it. Keep three records conceptually separate: actual native configuration, original creation choices, and explicitly managed policy. Record only irreducible policy/provenance when a maintenance workflow needs it.

Future `list` and `check` should distinguish detected integrations from deliberately managed ones. Adding a mine should still change only availability. Third-party execution also already exists through `sv` passthrough; its upstream download prompts and execution semantics must remain visible even before a Leftium mine trust model exists. [Svelte community add-ons](https://svelte.dev/docs/cli/sv-add#community-add-ons).

Do not add automatic template updating, a registry service, a universal plugin SDK, or a generic rollback engine to solve these distinctions. Explicit opt-in ownership and a small source identity are a better starting point.

## R9. Improve the implementation order

Accepted: the [overview implementation order](10-leftium/00-spec.md#implementation-order) now brings creation immediately after `license`, while retaining the existing v0 release scope. The sequence below explains the decision; the overview is authoritative for implementation.

Recommended engineering sequence:

| Step | Deliverable | Uncertainty resolved |
| --- | --- | --- |
| 1 | CLI shell, target context, `license`, preservation fixtures | Basic targeting, reporting, and file ownership |
| 2 | Small `sv:minimal` creation spike with `license` and official Prettier; explicit choices and recipe replay | Public API fit, provider boundaries, install coordination, serialization |
| 3 | `gitattributes` with selected `nodiff` behavior and managed-content policy | Composition, precedence, regeneration |
| 4 | Harden standalone `sv` delegation and the shared execution/result model | Passthrough arguments, cancellation, partial results, non-Kit projects |
| 5 | Static Pages setup, reusable workflow contract/release, then one real consumer adoption | Framework migration, distribution, deployment behavior |
| 6 | Stabilize creation UX, documentation, and supported environment matrix | Releasable product behavior |

The creation work in step 2 is an internal spike. v0 still ships the three add-ons and delegation; supported creation follows. Recipe flags emerge from three executable round-trip cases rather than further paper syntax design.

Before the first release, choose runtime/OS/package-manager support, directory behavior, built-in defaults, conflict handling, and verification policy. Those are delivery gates, not future roadmap ideas. Mines, desired-state commands, fleet scanning, and extra creators can remain deferred.

## Structure and naming

The current split is mostly useful. The problem is responsibility and status, not the number of files. Keep one active spec tree; another v3 directory would create unnecessary parallel authority.

A modest reorganization would be:

```text
specs/
  10-leftium/
    00-overview.md             # product, scope, reading guide, milestone summary
    10-model.md                # vocabulary and cross-cutting invariants
    20-architecture.md         # execution, ownership, provider boundaries
    30-cli.md                  # command grammar, targeting, output, exit behavior
    35-create.md               # creation and replay contract
    40-addons/                 # focused add-on behavior; keep current names
    50-mines.md                # explicitly deferred extension model
    60-delivery-plan.md        # implementation sequence, gates, completion
    70-roadmap.md              # future capabilities and open research
    90-influences.md           # rationale and provenance
  20-github-pages-migration/   # operational rollout, separate from product contract
  30-spec-review.md            # this review; proposals, not requirements
  90-sources/                 # unchanged read-only evidence
```

The highest-value change is extracting a delivery plan and making the roadmap purely future-facing. Renaming `00-spec` to `00-overview`, `10-core-model` to `10-model`, and `50-resolution-and-mines` to `50-mines` is optional navigation cleanup. If applied, update active links while leaving immutable source evidence alone. Treat the numbers as reading order, not release order. `35-create` is perfectly adequate; renumbering everything for equal spacing would add churn without meaning.

Within files:

- Keep milestone requirements in the delivery plan, with short summaries linked from the overview. Avoid maintaining two implementation sequences.
- Keep the concept definition in the model, concrete flags in CLI, execution guarantees in architecture, and observable behavior in the operation sub-spec. Link rather than restate.
- Group lifecycle command semantics together; the current roadmap separates command summaries from their later detailed policies.
- Keep the integration disposition table as provenance at the back. It should not be required reading for implementation.
- Give each focused spec a consistent status: required for a named milestone, deferred design, or reference material. A deferred logo file in `40-addons/` is fine when its status is explicit.
- Separate dated migration observations from remaining rollout tasks. Do not rewrite deployment status without inspecting the actual target.

Recommended vocabulary:

| Term | Recommendation |
| --- | --- |
| Leftium | Product name; `leftium` package/long command, `le` alias |
| Creator | Keep as a user-facing mechanism; call its internal module a creator adapter |
| Template | Keep for coherent starting structure |
| Add-on | Keep; use `addon` in identifiers and `addons` in paths |
| Preset | Use primarily for one add-on's reusable configuration |
| Creation defaults | Prefer this phrase for future reusable creation choices; a named creation preset can remain a convenience alias |
| Recipe | Qualify as creation recipe when ambiguity is possible; it records one resolved creation |
| Plan | Proposed operations before execution; not synonymous with recipe |
| Project context | Detected roots/capabilities for one operation; not persisted desired state |
| Mine | Keep as the established name, but introduce it as an extension repository and keep the metaphor out of ordinary errors |
| `pages` | Keep the command for now; spell out GitHub Pages in documentation. Revisit provider qualification only when another Pages service is supported |

Do not rename concepts solely for novelty. The real ambiguity is using preset, recipe, and desired state interchangeably; the v2 separation is worth keeping.

## Missing features versus missing contracts

Prioritize these before expanding the feature catalog:

- A clear target-directory/workspace policy and supported environment matrix.
- Useful preview/reporting of Leftium-owned edits; full upstream dry-run support can wait.
- Explicit no-install and verification-skipped behavior.
- Recipe replay and provider-result handling.
- Adoption/conflict rules and an intelligible recovery path for partial work.
- A published reusable workflow contract before Pages callers are generated.

Do not prioritize a second creator until `sv` exposes an actual abstraction limit. Keep flexible template sources, project-as-template authoring, fleet auditing, logo integration, and lifecycle maintenance as worthwhile next candidates. Reassess them against real user workflows rather than adding more speculative verbs.

## Corrections applied and verification

Applied during this review:

- Corrected Pages static-compatibility language, root-site base paths, and CNAME behavior, with primary references.
- Corrected the migration plan's contradictory initial-scan statement, dated its recorded observations, aligned its setup guidance with the actual pnpm action, and generalized output completion criteria.
- Removed the claim that idempotency follows automatically from defining `add` by its result.
- Clarified that v0 defaults and the internal interface must be resolved during v0 implementation.
- Linked the confirmed public `sv` API and made the active model authoritative over source drafts.

Reviewed all active product documents and both migration artifacts. Checked relevant upstream API/source behavior and the template action refs. Local Markdown links/anchors and whitespace checks are the appropriate repository validation for these edits. No project was created, dependency installed, build run, or remote deployment changed. Upstream checks establish feasibility, not a tested supported version matrix. Content ownership, optional-Git review, one-package workspace targeting, and initial-creation replay scope are applied. Installation/result behavior and the `sv` decision default are also applied. Generic directory targeting, early creation validation, narrowed Pages scope, and an experimental nodiff decision are also applied. Serialization, supported environments, and Pages distribution remain implementation gates; optional file reorganization remains a proposal.

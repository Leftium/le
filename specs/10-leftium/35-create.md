# Project creation

**Status:** Draft; a narrow Svelte implementation is published experimentally and serves as the creation architecture spike. Broader supported creation UX and environment coverage remain the next milestone.

`le create` uses an upstream creator to establish a project, runs the existing add-on pipeline, and records enough resolved input to recreate that starting point. The first backend is `sv`; additional backends wait until this integration demonstrates the boundary.

## Execution contract

```text
resolve destination, creator/template, options and versions
  -> resolve add-ons, presets, inputs and dependencies
  -> report intended operations and known choices
  -> scaffold base project
  -> inspect actual capabilities and reconcile add-ons
  -> install dependencies
  -> verify and record recipe
```

Resolve practical choices and known conflicts before significant mutation; a complete pre-mutation file diff is not required. Inspect the generated project before dependent transforms. Creation-time capability predictions are provisional until that inspection; upstream operations retain their own supported checks and reporting. Apply the same preservation, conflict, dependency-ordering, and idempotency rules as `le add`; do not build a second transform system.

Follow the shared [installation and execution result contract](20-architecture.md#installation-and-execution-results): coordinate one final install where supported, honor `--no-install`, preserve workspace lockfile ownership, and report upstream exceptions and skipped checks.

Use a missing or empty destination. Refuse a nonempty destination, including `.`, before scaffolding; `add` is the supported path for existing projects. Do not overwrite unrelated files or promise atomic rollback across external tools. On failure, stop dependent work, report completed steps and remaining files, and provide recovery instructions. Never recursively delete a destination as implicit cleanup. A failed run must not emit a successful-creation claim.

Git is optional. Leave Git initialization to the selected creator and report its behavior; Leftium does not independently initialize a repository or make an automatic commit. Version control supports review and recovery when a baseline exists, but newly generated files may not be recoverable through Git. Report partial output and effects outside tracked files using the shared review policy.

## Inputs and interaction

Interactive selection and command-line arguments resolve into one structured internal creation request. Keep argument arrays internally; a shell-specific renderer owns command quoting. The request feeds execution and recipe serialization. The prompt sequence follows creator, template, creator-specific options, add-ons and their required choices, then installation choices. Explicit inputs avoid prompts; missing inputs in non-interactive mode fail with instructions.

Working command shape:

```sh
le create my-app --template sv:minimal --add license --add gitattributes
```

This illustrates composition, not a complete replay command. Before shipping, settle how the command represents language, installation policy, per-add-on options and presets, and creator/template versions. The grammar must be deterministic, shell-friendly, readable, and able to represent every supported prompt answer. Avoid a miniature command language embedded in `--add`.

User defaults and named creation presets are later conveniences. When introduced, they follow normal scope precedence and expand into explicit recipe inputs. They do not require a desired-state file.

## Recipe contract

The outermost creation orchestrator owns the canonical recreation recipe. When the user invokes `sv create` directly, `sv` owns that recipe. When the user invokes `le create`, Leftium must leave one canonical Leftium recreation recipe representing the complete supported creation request, even when an upstream creator normally emits its own recreation command. Do not retain a competing upstream recipe that describes only part of the Leftium creation.

The primary human-readable recipe is an executable, non-interactive `leftium create` command. Pin the actual Leftium release in the invocation and record:

- Creator/template identity and resolved version or revision information where the creator supports it.
- Creator choices and all selected add-ons, including their required options, presets, and dependency-relevant choices.
- Package manager and installation policy, with version information when needed for repeatability.
- Resolved values previously supplied by prompts, defaults, or named presets, including values such as license author/year that would otherwise be inferred again.

Upstream identity, such as creator `sv`, template `minimal`, and supported version or revision information, remains provenance within the Leftium recipe. It does not require a second user-facing `sv create` command. The Leftium command records the full supported orchestration, including official upstream add-ons, Leftium add-ons and presets, and installation choices.

The serializer must quote arguments safely and round-trip supported values. Do not record only a mutable shorthand such as `--preset leftium-kit`. Do not embed authentication credentials in a README; if an input requires private access, document the prerequisite separately.

The preferred location is a clearly identified section in the generated README, preserving upstream instructions and unrelated content. Mark the recipe section as generated; replacement, when explicitly requested by a recipe-writing operation, is limited to that section. Preserve an unmarked existing section or report a collision rather than adopting it silently. Keep the recipe as original-creation history when later `add` operations run.

Prefer an upstream public programmatic creation API that does not emit creator-specific recreation instructions. The preferred Svelte path uses the public `sv` create API, applies official `sv` and Leftium add-ons, coordinates installation and verification, then writes one Leftium recipe. If a supported integration requires CLI delegation or otherwise cannot suppress an upstream recipe, Leftium may replace only that tool's clearly identified generated recipe section after successful orchestration. Preserve unrelated README content. A mention of `sv create` alone does not identify a generated section; preserve an unmarked or ambiguous section or report a collision rather than replacing it silently.

Replay targets a fresh destination and reproduces supported initial creation choices. It does not reconstruct subsequent edits or describe the current project after later setup. Existing-project add-ons inspect current files and apply their documented reconciliation rules independently of the original recipe. Do not track every subsequent operation or merge updated templates as part of this contract.

A recipe is not a lockfile, backup, or promise of byte-identical files or dependencies. Identify mutable or unpinnable upstream inputs and state the resulting reproducibility limit. Capture actual resolved inputs rather than inventing version guarantees. A separate machine-readable recipe is deferred until a consumer needs it.

For a preset whose content is not fixed by the pinned Leftium release, record immutable source identity or expand the effective values into the recipe. A local filename or mutable preset name alone is insufficient. If an upstream add-on cannot expose enough input for replay, identify that limitation rather than claim complete reproduction. The initial creation milestone may reject such inputs before scaffolding instead of adding remote-source machinery.

## Implementation gates and sequence

1. Inspect the selected `sv` release for public creation/add APIs, template choices, install control, and version resolution. Establish a compatible dependency and a minimal creation fixture before designing a generic creator interface.
2. Let three executable round-trip cases determine option scoping and serialization: a minimal project, official Prettier plus Leftium license, and a configured add-on with non-default values. Do not extend the paper grammar before this spike. Validate the structured request, shell renderer, and versioned replay command before calling a recipe complete.
3. Implement preflight resolution, destination checks, shared add-on execution, and coordinated installation. Report any upstream limitation that prevents a single install or full preflight.
4. Establish README section identification and implement the recipe ownership contract in the early Svelte creation spike. Prefer the public API path without an upstream recipe; cover replacement only when a supported integration actually emits one. Preserve unrelated upstream content.
5. Verify recreation in a fresh destination and failure behavior before adding other creators.

After the `license` language-boundary experiment, use this early spike to evaluate a richer ReScript creation request/recipe model. Commander arguments and Clack prompt answers must converge into the same structured request; ReScript may own its normalized representation and deterministic calculations where ergonomic. TypeScript continues to own `sv` create/add calls, filesystem changes, installation, README mutation, and process execution. Recipe command rendering may stay in TypeScript when quoting or platform concerns make that the natural boundary. A ReScript domain model does not require every recipe-related concern to move with it. Evaluate the split using the [architecture criteria](20-architecture.md#typescript-shell-and-rescript-core), while preserving the executable round-trip gate above.

API signatures, exact flags, and README markers are implementation decisions at these gates. A public third-party creator SDK is not required.

## Spike checkpoint: 2026-09-09

The first Svelte creation implementation is intentionally narrow. It is evidence for the next design decisions, not the final creator interface.

- `sv@0.17.0` is pinned as a runtime dependency. Its public `create({ cwd, name, template, types })` API is synchronous and does not install dependencies. Its public `add({ addons, cwd, options, packageManager })` API applies official add-ons without installing. The supported template identifiers include `minimal`, and `officialAddons.prettier` has no configured options in this release.
- `le create <directory>` currently supports `sv:minimal`, `typescript`, `checkjs`, and `none`; `--add prettier`; `--add license`; `--install npm|pnpm`; and `--no-install`. It rejects a nonempty or symbolic-link destination before scaffolding and resolves fresh-license author/year inputs before writes.
- Creation uses `sv`'s public APIs, applies the existing Leftium license operation, then performs one final install. For pnpm's `ERR_PNPM_IGNORED_BUILDS`, creation succeeds with an explicit `pnpm approve-builds` recovery warning, matching `sv`'s user-facing treatment. Other installation failures remain failures with partial output reported.
- The generated README's identified `sv` setup section is replaced with one marked Leftium recreation section. The recipe records the resolved template, language, add-ons, license values, and explicit install policy. Its package version is derived from package metadata; argv construction and shell rendering are separate so configured values are quoted correctly. It does not retain the competing `sv create` command.
- Fixtures cover minimal creation, destination rejection, official Prettier plus Leftium license composition, no-install behavior, portable recipe rendering with quoted configured values, and replay through a packed local CLI into a fresh destination.

TypeScript remains the implementation language for the creation request, `sv` calls, installation, README edits, and recipe rendering. This spike did not identify a deterministic creation calculation with enough variant or type-model value to justify a new ReScript boundary. Revisit that decision after the configured add-on case and `gitattributes`; do not generalize the current creation code into a creator or add-on framework yet.

The packed-local replay fixture verifies the supported recipe contract without publishing a new npm version.

## Acceptance

- Interactive and explicit equivalent inputs yield equivalent resolved plans.
- A Svelte project can be created with official Svelte and Leftium add-ons through the shared pipeline.
- Add-ons remain usable on existing projects; repeat application makes no unnecessary changes.
- Unknown inputs and nonempty destinations fail before avoidable mutation; later failures identify partial work accurately.
- Installation happens once when every selected operation supports deferral; exceptions are visible.
- The generated recipe runs without prompts in a fresh destination and reproduces the supported creation choices independently of changed user defaults.
- README content survives recipe insertion, and argument quoting preserves supported values. Later add-on operations leave the original recipe unchanged.
- The Svelte creation spike verifies that `le create` using the `sv` backend leaves one canonical Leftium recreation recipe in the final README, with no stale competing generated `sv` recipe and with unrelated upstream content preserved. Test generated-section replacement only for supported integration paths that emit an upstream recipe; those tests must also verify preservation or a reported collision for unmarked or ambiguous sections.
- Replay fixtures compare supported choices and meaningful generated configuration, without requiring identical dependency resolution or machine-specific output.
- Verification distinguishes successful generation from checks skipped because dependencies were not installed.

## Later creators and templates

Aggregate upstream catalogs for discovery without mirroring their templates. Preserve creator-owned channels, template pins, and richer application patterns. Electrobun/Hutch and Vite are candidates, not committed support promises.

Separate acquisition of local directories, repository snapshots, refs/subdirectories, or archives from rendering and project transforms. Mine templates follow the [mine resolution model](50-resolution-and-mines.md). Converting an ordinary project into a reusable template, parameterized replay, and template-to-project updates are research directions; creation provenance leaves room for them but does not specify a merge engine.

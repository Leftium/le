# Roadmap

This file collects intended directions that are not required for v0. The immediate next milestone is [Svelte creation](35-create.md). Other items become implementation requirements only when explicitly assigned a milestone; deferred sub-specs preserve direction without changing that scope.

## Desired-state workflow

Leftium may grow from one-shot `add` commands into a project manager:

```text
desired add-ons and presets
  -> resolve sources and dependencies
  -> compare with the project
  -> plan changes
  -> apply and verify
```

A future file under `.leftium/` may record desired policy. It should not duplicate state detectable from native files. TypeScript, YAML, and JSON remain candidates; choose only when a concrete workflow requires it.

Deferring the file avoids committing to a schema before `add` exposes information that native project files cannot represent. If detected state is sufficient, another metadata copy would create synchronization problems rather than solve them.

Creation presets, if needed, are convenience macros expanded into [recipes](35-create.md), not a separate canonical project schema. Composite add-on presets remain supported. Grouping add-ons for existing projects is still a possible convenience, with no new command or schema selected.

When desired-state configuration is introduced, decide whether successful `add` persists selection/options, how transient overrides work, and what failures do to the declaration. Native detectable state and original creation recipes must not be rewritten merely to track an installation.

## Commands

- `le apply` reconciles the project with desired configuration.
- `le check` reports missing, conflicting, or unhealthy add-ons.
- `le outdated` reports newer inputs or upstream versions.
- `le update` changes pinned inputs and reapplies affected add-ons.
- `le doctor` diagnoses the installation and project integration.
- `le why` explains effective configuration and provenance.

Their aggregation, version, exit-code, and interactive behavior remains unresolved.

`check`, `outdated`, and `update` answer different questions:

- `check`: Is the project healthy and correctly configured?
- `outdated`: Are managed presets, integrations, or conventions behind?
- `update`: Bring Leftium-managed configuration and migrations forward without blindly updating every package dependency.

`doctor` checks the Leftium environment, such as Git, Node, package-manager, and optional tool availability. It is distinct from `check`, which inspects the project.

## Mines and locking

[Resolution and mines](50-resolution-and-mines.md) describes the extension model. Mine commands, manifests, qualification, dependency resolution, remote fetching, and lockfiles should be designed together. Reproducibility is required before remote inputs can support automated updates.

Git repositories are sufficient for the first mine implementation. A hosted registry, generalized transport layer, and lockfile should wait until real remote inputs establish what must be discovered and pinned.

## Candidate add-ons

### `logo`

The [deferred logo spec](40-addons/40-logo.md) covers local native-config rendering, persisted custom visuals, separate favicon variants, asset installation, and preservation of application identity.

### `prettier`

Prefer the upstream installer and native configuration model. Leftium may select personal presets and reconcile existing configuration, but should not fork Prettier's schema. Separate framework setup from formatting policy (semicolons, indentation, quotes, trailing commas, width). No complete preferred value set is supplied. Preserve custom ignores and unrelated options; test generic/Svelte setup, explicit preference changes, and repeat runs. Decide whether a no-opinion preset adds value beyond `sv:` passthrough.

### `knip`

Prefer the upstream initializer, then add only project-specific defaults or reconciliation. Inspect existing configuration and scripts. Keep setup success separate from diagnostic findings; an initial analysis run is optional pending a decision on cost, defaults, and exit reporting. Reuse upstream analysis and later integrate with `check`.

### `robots`

Use the target framework's native representation. Preserve canonical base rules, optional native fragments, and project overrides. Merge according to robots semantics rather than blind concatenation. Inspect actual consumers before replacing copied updater scripts or fixing paths and preset names; preserve customized exceptions.

### `vscode`

The archived `vscode-preset` may become an add-on for shared editor and debugging configuration. Preserve project-specific settings and avoid assuming every user wants Leftium's defaults. Inspect predecessor debugging files and `.gitignore` changes before choosing migration behavior.

### `gg` and `nimble`

These add-ons would install and configure the independent `@leftium/gg` and `nimble.css` packages. Their library code remains in their own repositories. Historical setup leads are Vite plugin configuration and an optional Svelte console component for `gg`, and a stylesheet import for `nimble`. Recheck current package APIs; preserve unrelated setup and avoid duplicate imports. `nimble` remains lower priority because manual setup is small.

## Standalone libraries

Deterministic functionality should be extractable when it has consumers outside Leftium. Prefer a library or local CLI to a hosted dependency. Do not create packages speculatively; extract them when a second real consumer appears.

## Dry-run and agent support

The initial review workflow uses concise change reports and version-control diffs when available. A later automation milestone may expose buffered Leftium edits as dry runs or diffs and add machine-readable reports; these are not required for the initial Svelte creation milestone. Likely flags include `--dry-run`, `--json`, `--yes`, and `--diff`.

Agents should be able to determine known file changes, intended commands, and supplied values without reverse-engineering terminal prose. Opaque upstream steps may be reported as unexecuted operations whose exact file effects are unavailable. A dry run must not write files, install packages, invoke mutating commands, or change remote configuration.

## Open decisions

- `.leftium/` file names and project configuration format.
- Internal add-on API and module boundaries.
- Built-in default preset contents.
- Mine manifests, qualification, and locking.
- `check`, `outdated`, and `update` behavior.
- Prettier preset representation.
- Whether the logo renderer exposes a library API, CLI, or both.

Resolve the internal add-on boundary and built-in defaults during their v0 implementations. The remaining decisions belong to their deferred features and must not delay v0.

## Project health and lifecycle design

The proposed `check` policy prefers an existing project `check` script, considers a Svelte diagnostic fallback when absent, and includes configured lint, formatting, and Knip checks when applicable. Do not assume one command runs all diagnostics. Tests are not selected by default solely because they exist: they may be costly or require external services. Before implementation, settle deduplication, opt-in selection, unavailable tools versus findings versus execution failures, and aggregate status without hiding native results.

Define freshness per integration: a Pages workflow reference, a package version, an integration migration, and unversioned convention drift are different evidence. Keep `outdated` read-only; do not invent numeric versions for unversioned rules. `update` may migrate caller/configuration contracts independently of upgrading packages. Range-respecting updates, a latest-version override, and per-add-on selection remain proposals.

A lock records a resolved input; an optional hold would express a decision to stay on it while still showing available updates. Hold commands, persistence, and override rules are unselected.

## Cross-repository inspection

Preserve the initiating Pages use case: identify which repositories use a convention, their detected versions, and which need attention. A future read-only report derives evidence from native files, especially Pages caller references. Distinguish missing, outdated, detected, and uninspectable states. A dashboard, wiki, or GitHub Project is a view, not an authoritative installation registry. Discovery scope, authentication, and command names require a focused design.

Pages updates must inspect customization and migration notes before changing references or caller inputs. Preserve supported branch, build, output, and package-manager choices, and keep caller-owned permissions visible.

## Discovery and optional extensions

Retain the questions behind proposed `search`, `info`, and `list`: what is available, what does one integration do, and what is enabled here? Show applicability, source, meaningful version information, and composition through shared provenance. Do not confuse catalog availability with project selection.

Multiple add-ons in `create` are part of its milestone. A mixed multi-add-on `le add` request is still optional; settle option scoping, provider order, deduplication, stop-on-failure behavior, and partial reporting before adding it. It does not imply atomic rollback.

Later creation UX may include named defaults, remembered choices, hierarchical catalogs, offline acquisition, install/Git controls, and starter-versus-example labels. Add each for a concrete backend or user need. Ordinary-project template authoring and Copier-like template updates need separate source/merge semantics; they are not promised by recipes or `update`.

## Deferred license review

A separate dependency-license review operation was explicitly deferred in the original conversation. Keep `add license` a deterministic file-setup task. Future review may delegate inventory to an existing scanner, preserve declared expressions and unresolved cases, apply an explicitly chosen policy, and record reasoned project exceptions with provenance. Reassess tools and policy when this is designed; no legal compatibility policy or sample allow/deny table is adopted. Optional `check` integration follows that design.

## Research-only candidates

Shared agent configuration is an assistant-proposed candidate, not an adopted add-on or directory standard. Determine shared versus project-specific content and merge ownership first.

Other retained brainstorming: removal with protection of user code, an install alias, explicit migration commands, named profiles/generations, richer dependency/conflict metadata, preview conveniences, and rollback. None changes the implementation milestones. Version control is the recommended recovery mechanism when available; universal ownership tracking, output fingerprints, and three-way template merging are deferred until a concrete workflow requires them.

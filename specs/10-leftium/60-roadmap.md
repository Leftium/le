# Roadmap

This file collects intended directions that are not required for v0. Items become requirements only when promoted into the main spec or a focused sub-spec.

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

A project preset composes several configured add-ons, like the earlier `starterkit-preset`. It may be implemented as an add-on whose dependencies are the selected add-ons if that keeps the model simple. The preferred user-facing form is `le add <project-preset>` rather than a separate preset command.

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

Generate deterministic assets from native `LogoConfig` input. Prefer a reusable local renderer and CLI; Leftium should not depend on `logo.leftium.com` when local generation is practical. The website and Leftium should share the renderer.

Generated assets must be reproducible, identify their source configuration, and remain separate from package metadata unless framework integration requires coordination.

The normal path may use a reusable default visual preset until a project supplies custom `LogoConfig`. An application or download name used only for filenames or packaging is not part of the visual configuration.

### `prettier`

Prefer the upstream installer and native configuration model. Leftium may select personal presets and reconcile existing configuration, but should not fork Prettier's schema.

### `knip`

Prefer the upstream initializer, then add only project-specific defaults or reconciliation.

### `robots`

Use the target framework's native representation. Migration behavior needs real project examples before specification.

### `vscode`

The archived `vscode-preset` may become an add-on for shared editor and debugging configuration. Preserve project-specific settings and avoid assuming every user wants Leftium's defaults.

### `gg` and `nimble`

These add-ons would install and configure the independent `@leftium/gg` and `nimble.css` packages. Their library code remains in their own repositories.

## Standalone libraries

Deterministic functionality should be extractable when it has consumers outside Leftium. Prefer a library or local CLI to a hosted dependency. Do not create packages speculatively; extract them when a second real consumer appears.

## Dry-run and agent support

Post-v0 commands should support dry runs and machine-readable plans. Likely flags include `--dry-run`, `--json`, `--yes`, and `--diff`.

Agents should be able to determine which files and commands are involved, what supplied each value, and what would change without reverse-engineering terminal prose. A dry run must not write files, install packages, invoke mutating commands, or change remote configuration.

## Open decisions

- `.leftium/` file names and project configuration format.
- Internal add-on API and module boundaries.
- Built-in default preset contents.
- Mine manifests, qualification, and locking.
- `check`, `outdated`, and `update` behavior.
- Prettier preset representation.
- Whether the logo renderer exposes a library API, CLI, or both.

These decisions require implementation evidence and must not delay v0.

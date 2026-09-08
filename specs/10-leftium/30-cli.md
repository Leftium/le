# CLI

The npm package is `leftium`. It exposes `leftium` as the canonical command and `le` as a short alias. The long name is canonical because `npx leftium` is self-explanatory; the natural `le` abbreviation keeps frequent interactive use short. Both commands invoke the same program so their behavior cannot diverge.

## v0 command

```text
le add <addon> [options]
```

`add` detects the project, resolves the add-on, inspects existing state, plans the change, then applies and verifies it.

## Creation command (next milestone)

```text
le create [directory] --template <creator>:<template> [--add <addon>]...
```

The shape is provisional until the [creation option and recipe contract](35-create.md) is finalized. Interactive prompts and explicit arguments must resolve to the same plan. Support `.` only under the same empty-destination checks as any other target. Ask only questions relevant to the selected creator and add-ons.

Use qualified template identifiers to resolve collisions. A short name is valid only when unambiguous or resolved by an explicitly configured default creator; never choose based on catalog order. `<creator>:<template>` is the working syntax, with final grammar settled before shipping creation. Creator-specific channels and versions retain their upstream meanings.

## Project detection

A directory is a valid target for generic add-ons such as `license` and `gitattributes`; neither Git nor `package.json` is a universal prerequisite. Package and framework operations declare their own manifest, dependency, and configuration requirements. Explicit CLI input wins over inference. Ambiguous or unsupported targets fail before mutation with an actionable explanation.

Use the current directory or an explicit `-C, --cwd` target. For package operations, resolve the nearest enclosing `package.json` from that directory; generic operations do not change targets merely because an ancestor has a manifest. The flag follows the upstream [sv targeting interface](https://svelte.dev/docs/cli/sv-add); provider calls receive the resolved package root.

Keep an internal project context with the selected target directory, optional package root, containing package-manager workspace root when present, optional Git worktree root, and detection evidence. Detect workspace membership from package-manager configuration, not merely an ancestor lockfile or Git directory. Do not assume `.git` is a directory.

Support one package inside a recognized workspace. App-specific operations at a workspace root require an explicit app selection unless the root itself is the intended compatible app; never pick an arbitrary child. Dependency edits belong to the selected package, while installation respects the workspace and its shared lockfile. Conflicting lockfiles or unsupported workspace layouts require resolution before package mutation; unrelated package-manager ambiguity need not block generic file operations.

Each add-on defines its file scope. Package configuration stays in the resolved package; repository-wide operations use a detected or explicitly supplied repository root. Without Git, a generic repository-file operation can use the explicitly selected target directory as its root. Do not silently infer a repository root from a workspace root. Report affected roots before applying edits across scopes. Whole-monorepo creation, bulk package operations, and restructuring shared configuration are deferred.

Detection should expose capabilities instead of assigning one rigid project type:

```ts
{
  git: true,
  node: true,
  packageManager: 'pnpm',
  vite: true,
  svelte: true,
  kit: true
}
```

Each add-on declares the capabilities it needs.

Select the package manager from an explicit option, the applicable `packageManager` field (including the containing workspace), or a recognized lockfile, in that order. Validate that selection against the workspace before installation; do not create a competing package lockfile. Use its native install command and preserve its lockfile.

## Add-on resolution

v0 resolves names in this order:

1. A built-in Leftium add-on.
2. `sv add <name>` when the project is compatible with `sv`.
3. An unknown-add-on error.

A name reserved by a built-in always resolves to the built-in. Future mine qualification must provide an explicit way to select a non-core add-on without changing this rule.

An `sv:` qualifier bypasses a Leftium wrapper and selects the upstream Svelte add-on directly:

```sh
le add sv:prettier
# exactly the upstream sv add prettier behavior
```

Leftium wins ordinary name collisions because its wrapper may intentionally combine upstream setup with Leftium presets. The qualifier preserves access to untouched upstream behavior.

## `sv` delegation

Leftium should delegate rather than reproduce `sv` add-ons:

```sh
le add tailwindcss
# delegates to the equivalent sv add command
```

Arguments that Leftium does not interpret should be forwarded unchanged. Leftium must preserve the upstream exit status and make it clear that `sv` handled the request. Any option translation must be explicit and tested.

Passthrough and composition are separate paths:

```text
passthrough  -> spawn the real sv CLI
composition  -> import public sv APIs or sv-utils when useful
```

Passthrough gives `sv` ownership of package resolution, prompts, and community add-on behavior. A Leftium-owned add-on may instead compose with public `sv` functionality when it needs structured planning or additional transforms. Both paths use the known-compatible `sv` dependency described in the architecture. Creation prefers public APIs for orchestration; transparent passthrough still uses the CLI.

See [Implementation architecture](20-architecture.md) for the internal boundary.

## Automation

All supported operations should have a non-interactive path. Missing choices may prompt in a terminal, but automation must be able to provide them as flags or configuration.

Commands must report changed and newly created files, package operations, delegated commands, local Git-setting changes, and manual follow-up. A concise result summary, supplemented by a version-control diff when available, is the default review experience; displaying a complete diff or asking for approval before every routine edit is not required. Dry-run and structured agent output are [post-v0 work](60-roadmap.md#dry-run-and-agent-support).

Expected errors explain what was attempted, why it failed, and what to do next. Keep normal output concise; reserve stack traces for an explicit diagnostic mode whose flag is still to be chosen. Missing non-interactive inputs fail before mutation when knowable. Preserve upstream failure details and exit status on transparent delegation.

For Git projects, users review tracked changes with `git diff` and `git diff --staged`, and use `git status` to find new files. These may include pre-existing work; do not label the entire repository diff as Leftium's changes. Report the paths affected by the operation rather than adding a change-isolation subsystem. Follow the [review and recovery policy](10-core-model.md#review-and-recovery); do not require a clean tree solely for Leftium-owned edits.

## Installation and completion

Leftium-owned `add` and `create` accept `--no-install`; see the [installation and result contract](20-architecture.md#installation-and-execution-results). Transparent delegation preserves upstream flags and exit behavior.

For Leftium-owned orchestration, exit zero for completed applied/no-op work, including an explicitly requested no-install run whose skipped checks are reported. Unsupported targets, conflicts, cancellation, installation failures, and failed required verification exit nonzero. Exact nonzero codes are an implementation decision; automation must not mistake cancellation or partial completion for success. A skipped check is distinct from a failed check.

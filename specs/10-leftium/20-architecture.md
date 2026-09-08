# Implementation architecture

Leftium should use a small, `sv`-like add-on architecture without copying `sv` or creating a second Svelte ecosystem.

## Shape

Keep v0 in one package and repository:

```text
le/
  src/
    cli/
    creators/       # added for the Svelte creation milestone
    addons/
      license/
      gitattributes/
      pages/
    project/
  presets/
    license/
    gitattributes/
  fixtures/
```

Do not split the CLI, core, add-ons, or presets into separate packages before concrete consumers require those boundaries.

The first implementations need room to reveal the correct module boundaries. Splitting them earlier would turn provisional interfaces into package contracts without evidence that the separation is useful.

## Add-on boundary

Like `sv`, the CLI should treat add-ons as small modules behind a common lifecycle:

```text
resolve options and dependencies
  -> inspect project compatibility and current state
  -> prepare scoped edits or describe an upstream operation
  -> apply through shared project/file utilities
  -> verify and report next steps
```

The interface should support `dependsOn`-style dependencies, non-interactive options, and shared mutation utilities. The exact TypeScript API is provisional and should be extracted from the first three implementations rather than designed in isolation.

The intended shape is close to `sv`, generalized around detected project capabilities:

```ts
defineAddon({
  id: 'pages',
  setup({ project, unsupported, dependsOn }) {
    // Check capabilities, declare dependencies, and resolve options.
  },
  run({ files, packages }) {
    // Reconcile the relevant content or invoke the selected upstream operation.
  },
  nextSteps() {}
});
```

For example, an add-on can require `project.git` or `project.kit` without making the whole add-on system Svelte-specific.

Use realistic fixtures for Node, Vite, Svelte, and SvelteKit projects, with and without Git. Include an empty destination for creation and reject existing-project operations without a package manifest. Shared tests should cover fresh, partial, customized, conflicting, already-current, and repeated application states.

Built-in add-ons should use the same eventual shape expected of external mine add-ons where that costs little. v0 does not need dynamic loading, manifests, or a public add-on SDK.

## Target context

Use the [CLI project context](30-cli.md#project-detection) for every operation. Keep package edits, workspace installation, and repository-wide files scoped to their respective roots. Validate one-package workspace support with fixtures for a standalone package without Git, a workspace member with a shared lockfile, and an ambiguous root invocation rejected before writes. Upstream workspace support must be verified for the selected provider version; do not infer it from Leftium detection alone.

## Shared editing and reporting

Use small shared file utilities and content-specific transforms. For Leftium-owned text edits, compute the proposed content before writing and skip identical results. Keeping before/after content in memory is enough to support focused reporting and a later diff view; it does not require a persistent plan format or a virtual filesystem for the entire project.

A plan describes intended operations and known changes. It need not contain an exact diff for upstream APIs, subprocesses, package installations, or remote effects. Use an upstream preview when supported; otherwise describe the operation and inspect its result. Do not execute a mutating operation merely to obtain a preview.

Apply the [content ownership policy](10-core-model.md#content-ownership-and-reconciliation) at each affected file. Do not build universal edit detection, historical snapshots, or three-way merging. Add those only if a concrete future update workflow needs them. Version control provides review and selective recovery when available; Git is not a prerequisite.

## Relationship with `sv`

Use the narrowest integration that preserves upstream ownership:

| Operation | Integration |
| --- | --- |
| Svelte creation | Prefer public `sv` creation API. |
| Official Svelte add-ons during creation or intentional composition | Prefer public `sv` add API and shared utilities where practical. |
| Transparent unknown/community add-on passthrough | Spawn the real `sv` CLI and retain its resolver, prompts, and exit status. |

Use one known-compatible `sv` dependency for imports and CLI passthrough. Resolve its executable explicitly rather than relying on a global installation or downloading an arbitrary latest version. Upgrading that dependency requires integration fixtures. The [public `sv` API](https://svelte.dev/docs/cli/sv) documents `create`, `add`, and add-on authoring. Verify the selected release's option shapes, execution behavior, and install control before implementing creation; current documentation is not a substitute for a pinned compatibility fixture.

Creation coordinates the resolved inputs, operation sequence, report, and recipe, while retaining upstream prompts or limitations where delegation requires them. Reuse the add-on lifecycle after scaffolding, and defer package installation until all supported transforms finish. When an upstream operation requires earlier installation, expose that in the plan rather than replacing its internals. See [Creation](35-create.md) for failure boundaries.

Leftium add-ons do not need to be usable through `sv`. Compatibility flows from `sv` into `le`; the reverse is optional.

## Installation and execution results

One orchestrator owns installation for Leftium-composed operations. Collect package edits and run one final native install when all selected steps support deferral, using the package/workspace context. Do not compose by spawning several `le add` commands that each install. Report unavoidable earlier upstream installs. Transparent `sv` delegation retains its native installation and result behavior.

Support `--no-install` for Leftium-owned add and create operations. It skips dependency installation, records checks that could not run, and reports the command and directory needed to finish. If a selected upstream step cannot honor it, reject that combination before avoidable mutation rather than silently installing.

Keep a small internal result model: applied or no-op, unsupported or conflict, canceled or failed. Track verification separately as passed, failed, or skipped, so an applied change with skipped checks is not described as fully verified. Inspect upstream per-add-on results; a resolved API promise alone does not establish success.

On failure or cancellation, stop dependent steps and do not start further mutation by default. Report completed work, affected paths, skipped steps, and practical next steps. Leave partial output inspectable under the shared recovery policy. Do not claim successful creation or emit a success recipe for an incomplete run.

Validate Leftium-owned dependency requirements, ordering, and incompatible requests before mutation when knowable. Do not silently resolve contradictory package requirements by last-write-wins or claim a general dependency solver. Provider compatibility and supported runtime/package-manager versions remain implementation gates.

Fixtures must cover a deferred single install, no-install with skipped checks, an upstream partial failure, cancellation, and workspace lockfile targeting. Use provider fixtures to establish behavior rather than reproducing upstream tests.

## Implementation styles

The shared lifecycle must allow several implementations:

- Direct transform, such as `license` or `gitattributes`.
- Upstream setup followed by Leftium presets or overrides, such as a future `prettier` add-on.
- Upstream CLI delegation, such as pure `sv` passthrough.
- Generator-backed output, such as the future `logo` add-on.
- Shared or remote infrastructure, when local deterministic setup is not sufficient.

These are implementation choices inside one add-on model, not separate kinds of user-facing command.

## Transform and orchestration boundaries

Keep deterministic content transforms independently callable where practical. Filesystem access, prompts, package operations, and subprocesses belong to orchestration. This does not require another package, a frozen compatibility layer, or a public SDK.

Shared fixtures should cover regeneration of edited generated output, preservation of custom input outside that boundary, ambiguous adoption, and operation with staged and unstaged user changes. Verify that Leftium-owned operations leave the index untouched.

Test Leftium transforms directly and verify the resulting projects for upstream integrations instead of duplicating upstream unit tests. Delegation fixtures should include official, scoped community, local `file:` and explicit `sv:` requests, plus Svelte projects without Kit, using syntax supported by the pinned runtime.

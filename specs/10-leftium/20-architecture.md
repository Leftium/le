# Implementation architecture

Leftium should use a small, `sv`-like add-on architecture without copying `sv` or creating a second Svelte ecosystem.

## Implementation stack

Use a TypeScript imperative shell around a ReScript functional core, running on Node.js with ESM. This is the preferred implementation direction; the `license` experiment and early creation spike must establish where the modeling benefits justify the interop and tooling cost.

| Concern | Initial direction |
| --- | --- |
| Commands, arguments, options, and help | Commander |
| Interactive prompts and terminal UX | `@clack/prompts` |
| Svelte provider integration | `sv`, with public `@sveltejs/sv-utils` utilities where useful |
| Deterministic domain calculations | ReScript |
| Runtime validation | Valibot when concrete external inputs require validation |
| Build | A small TypeScript/ESM setup coordinated with ReScript compilation; tsdown is a candidate, not an architectural commitment |

Add each dependency only when implementation first requires it. The [sv package](https://github.com/sveltejs/cli/blob/main/packages/sv/package.json) uses Commander and Clack, and its [repository build](https://github.com/sveltejs/cli/blob/main/package.json) uses tsdown. Follow upstream choices when they fit, while checking compatibility against the selected release. Commander supplies a lightweight command hierarchy without imposing another plugin architecture alongside Leftium's future add-ons, creators, and mines. Do not introduce a heavyweight CLI/plugin framework such as oclif initially. Use `sv` as reference behavior and an upstream provider; do not fork it to inherit its CLI or rewrite it in ReScript.

## Shape

Keep v0 in one package and repository. A possible shape as implementation grows is:

```text
le/
  src/
    cli/
    orchestration/
    creators/       # introduced by the early Svelte creation spike
      sv.ts
    addons/
      license/
        index.ts    # effectful adapter
        License.res # pure calculations
      gitattributes/
      pages/
    project/
    core/           # shared domain modules only when needed
  presets/
    license/
    gitattributes/
  fixtures/
```

Do not split the CLI, core, add-ons, or presets into separate packages before concrete consumers require those boundaries.

The first implementations need room to reveal the correct module boundaries. Start smaller than this illustration and extract modules only when a real boundary appears; do not create empty directories or speculative `Result.res` and `Recipe.res` modules. Splitting packages earlier would turn provisional interfaces into contracts without evidence that the separation is useful.

## Thin CLI

Commander handlers translate user input into ordinary internal requests and delegate to orchestration such as `runAdd` and `runCreate`. Those functions must not depend on Commander. Interactive prompts, explicit CLI arguments, tests, and future agent/API callers use the same orchestration path. Keep business logic outside `.action()` callbacks and avoid elaborate wrapper layers solely to enforce the separation.

## Add-on boundary

Like `sv`, the CLI should treat add-ons as small modules behind a common lifecycle:

```text
resolve options and dependencies
  -> inspect project compatibility and current state
  -> prepare scoped edits or describe an upstream operation
  -> apply through shared project/file utilities
  -> verify and report next steps
```

The interface should support `dependsOn`-style dependencies, non-interactive options, and shared mutation utilities. The exact internal API and its placement in TypeScript, ReScript, or both remain provisional. Let `license`, the early creation/composition spike, `gitattributes`, and `sv` composition establish the boundary. An add-on may begin as a TypeScript orchestration adapter calling ReScript calculations where useful; neither ReScript declarations nor a ReScript-specific interface are required.

This illustrative TypeScript shape is close to `sv`, generalized around detected project capabilities; it does not freeze the implementation language or API:

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

Use realistic fixtures for plain directories, Git repositories, Node, Vite, Svelte, and SvelteKit projects. Generic add-ons must work without a manifest; package-dependent operations must explain a missing manifest. Include an empty destination for creation. Shared tests should cover fresh, partial, customized, conflicting, already-current, and repeated application states.

Fixture tests must verify that the presence or absence of a Leftium creation recipe does not affect add-on compatibility or reconciliation. At minimum, pair a target created through `le create` with an externally created target having equivalent native state, and apply the same resolved `le add license` and `le add gitattributes` requests. Both targets must receive the same compatibility decisions and resulting managed configuration, including on repeated application. Compare the add-on-managed output, allowing historical recipe content to differ. The external fixtures must work without a Leftium README recipe or `.leftium` metadata; include plain-directory cases without Git or `package.json`.

Built-in add-ons should use the same eventual shape expected of external mine add-ons where that costs little. v0 does not need dynamic loading, manifests, or a public add-on SDK.

## Target context

Use the [CLI project context](30-cli.md#project-detection) for every operation. Keep the target directory distinct from optional package, workspace, and Git roots. Scope edits accordingly and require each capability only for operations that need it. Validate one-package workspace support with fixtures for a standalone package without Git, a workspace member with a shared lockfile, and an ambiguous root invocation rejected before writes. Upstream workspace support must be verified for the selected provider version; do not infer it from Leftium detection alone.

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

## TypeScript shell and ReScript core

Use TypeScript for ecosystem-facing, effectful orchestration and ReScript for deterministic domain calculations:

```text
TypeScript: parse/prompt, discover, read
  -> gathered domain data
ReScript: classify, reconcile, decide
  -> decisions and resolved data
TypeScript: write, install, execute, report
```

TypeScript initially owns CLI parsing, prompts, filesystem/process/environment access, project and workspace discovery I/O, package-manager and subprocess execution, creator adapters, public `sv` calls and CLI delegation, applying mutations, and terminal reporting. ReScript receives the relevant observations as data rather than performing discovery itself.

Strong core candidates include add-on state and conflict classification, reconciliation decisions, capability checks, preset composition, dependency ordering and cycle detection, result transitions, verification status, and request/recipe normalization. Use variants and exhaustive handling for mutually exclusive states. For example, current state might distinguish absent, correct, incomplete, conflict, and unsupported; execution and verification remain separate as specified above. These are modeling examples, not frozen type names or a new result contract. Keep pure calculations directly callable without filesystem or process setup.

Keep interop coarse-grained: pass domain data to a calculation and return a decision or resolved data. Use ordinary ReScript-generated JavaScript imports and small explicit adapters. Preserve useful TypeScript type information at the boundary; ReScript's built-in [genType integration](https://rescript-lang.org/docs/manual/typescript-integration/) is an option to evaluate. Prefer one authoritative domain representation over independently maintained TS and ReScript models. Validate untrusted external inputs where needed before treating them as domain data; compile-time types do not perform runtime validation.

Do not build extensive ReScript bindings for Commander, Clack, Node filesystem APIs, `sv`, or package managers merely for language purity. Mog is not an initial dependency; actual interop friction may inform it later. This split requires neither another package nor a public add-on SDK, and maximizing ReScript usage is not a goal.

Use `license` as the first experiment: TypeScript resolves the target and reads license files; ReScript classifies state and determines the desired action; TypeScript writes, prompts when necessary, and reports. Results might express create, keep, replacement choice required, or conflict, with their exact representation settled by implementation. Supply inferred author/year and other environment-derived values as inputs so calculations stay deterministic.

Before generalizing, evaluate glue volume, state-model clarity, testing, typed generated-JS imports, build/watch behavior, and debugging ergonomics. Keep more logic in TypeScript where the split proves cumbersome. The early [creation spike](35-create.md#implementation-gates-and-sequence) is the second experiment for a richer normalized request/recipe model; use both experiments to refine the boundary before the remaining add-ons harden it.

## Boundary verification

Test implemented pure ReScript calculations directly for classification, reconciliation, dependency graphs, preset composition, recipe normalization, and result transitions as those concerns appear. Include a small typed TS-to-ReScript call in the first experiment to establish that generated imports preserve the intended contract. Integration tests exercise the TypeScript shell: Commander input translation, filesystem effects, the `sv` provider, installation, README recipe ownership, and workspace targeting. Exercise orchestration without constructing Commander commands as well.

Shared fixtures should cover regeneration of edited generated output, preservation of custom input outside that boundary, ambiguous adoption, and operation with staged and unstaged user changes. Verify that Leftium-owned operations leave the index untouched.

Test Leftium transforms directly and verify the resulting projects for upstream integrations instead of duplicating upstream unit tests. Delegation fixtures should include official, scoped community, local `file:` and explicit `sv:` requests, plus Svelte projects without Kit, using syntax supported by the pinned runtime.

# Implementation architecture

Leftium should use a small, `sv`-like add-on architecture without copying `sv` or creating a second Svelte ecosystem.

## Shape

Keep v0 in one package and repository:

```text
le/
  src/
    cli/
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
  -> create a change plan
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
    // Apply the planned file and package changes.
  },
  nextSteps() {}
});
```

For example, an add-on can require `project.git` or `project.kit` without making the whole add-on system Svelte-specific.

Use realistic fixtures for `empty-git`, Node, Vite, Svelte, and SvelteKit projects. Shared tests should cover fresh, partial, customized, conflicting, already-current, and repeated application states.

Built-in add-ons should use the same eventual shape expected of external mine add-ons where that costs little. v0 does not need dynamic loading, manifests, or a public add-on SDK.

## Relationship with `sv`

Use the narrowest integration that preserves upstream ownership:

```text
unknown compatible Svelte add-on
  -> spawn sv add

Leftium add-on needing sv functionality
  -> import public sv APIs or sv-utils
  -> apply Leftium-specific planning or transforms
```

Spawning is the default for transparent passthrough because `sv` should own its resolution, prompts, and experimental behavior. Importing is appropriate only for intentional composition. Imported functionality must use a known compatible `sv` version.

Leftium add-ons do not need to be usable through `sv`. Compatibility flows from `sv` into `le`; the reverse is optional.

## Implementation styles

The shared lifecycle must allow several implementations:

- Direct transform, such as `license` or `gitattributes`.
- Upstream setup followed by Leftium presets or overrides, such as a future `prettier` add-on.
- Upstream CLI delegation, such as pure `sv` passthrough.
- Generator-backed output, such as the future `logo` add-on.
- Shared or remote infrastructure, when local deterministic setup is not sufficient.

These are implementation choices inside one add-on model, not separate kinds of user-facing command.

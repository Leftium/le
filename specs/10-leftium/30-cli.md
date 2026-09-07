# CLI

The npm package is `leftium`. It exposes `leftium` as the canonical command and `le` as a short alias. The long name is canonical because the unscoped npm package is available and `npx leftium` is self-explanatory; the natural `le` abbreviation keeps frequent interactive use short. Both commands invoke the same program so their behavior cannot diverge.

## v0 command

```text
le add <addon> [options]
```

`add` detects the project, resolves the add-on, inspects existing state, plans the change, then applies and verifies it.

## Project detection

Detection should use repository evidence such as `package.json`, lockfiles, framework configuration, and existing target files. Explicit CLI input wins over inference. Ambiguous or unsupported projects fail before mutation with an explanation of the missing evidence.

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

Select the package manager from an explicit option, the `packageManager` field, or a recognized lockfile, in that order. Use its native install command and preserve its lockfile.

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

Passthrough gives `sv` ownership of package resolution, prompts, and community add-on behavior. A Leftium-owned add-on may instead compose with public `sv` functionality when it needs structured planning or additional transforms. In that case, Leftium should depend on a known compatible `sv` version rather than invoke an arbitrary remote version.

See [Implementation architecture](20-architecture.md) for the internal boundary.

## Automation

All supported operations should have a non-interactive path. Missing choices may prompt in a terminal, but automation must be able to provide them as flags or configuration.

Commands must report affected files, package operations, delegated commands, and manual follow-up. Dry-run and structured agent output are [post-v0 work](60-roadmap.md#dry-run-and-agent-support).

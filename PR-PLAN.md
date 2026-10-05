# PR Plan

Issue: #7

## Goal

Complete v0 add-on resolution by delegating compatible unknown Svelte add-ons to the real `sv add` command while preserving Leftium built-in precedence and an explicit `sv:` escape hatch.

## Scope

- preserve resolution order: Leftium built-in -> compatible `sv add <name>` -> unknown-add-on error
- support `sv:<name>` to bypass Leftium wrappers and select upstream behavior directly
- forward uninterpreted passthrough arguments unchanged
- preserve upstream prompts, package resolution, exit status, and failure details
- reject unsupported/non-Svelte targets before delegation
- keep transparent delegation separate from Leftium-owned composition/orchestration
- do not reproduce upstream `sv` add-ons inside Leftium

## Implementation approach

- inspect the existing add-on resolver, project capability detection, and subprocess/provider boundary before changing behavior
- extend resolution with an explicit upstream-qualified request and compatible unknown-add-on fallback
- delegate through the real `sv` CLI so interactive behavior and process status remain upstream-owned
- keep Leftium output sufficient to identify when `sv` handled the request

## Boundary decisions

- Built-ins retain strict Commander parsing. Delegated requests use a separate parser so upstream flags, values, inline options, separators, and additional add-ons survive unchanged. Put the selected add-on before upstream options.
- Resolve the installed `sv` package's declared executable and spawn it with the current Node executable and inherited stdio. Do not download another CLI or use a global `sv`.
- Require a Svelte dependency in the nearest package's dependencies/devDependencies, pass that package root through upstream `--cwd`, and leave upstream add-on-specific compatibility checks to `sv`. Workspace roots never select arbitrary children.
- The Leftium `--non-interactive` flag is rejected for passthrough because it cannot promise to suppress upstream prompts. Automation supplies upstream flags and explicit add-on options instead.
- Report upstream status separately from Leftium verification; propagate numeric exit codes and signal termination.
- Fixtures run official Prettier in SvelteKit and Svelte without Kit, a local community add-on with inline options, and a packed-layout stub for scoped/versioned names, flag collisions, input, exit codes, signals, and targeting. Registry package resolution stays upstream-owned; deterministic tests do not download third-party community packages.

## Verify

- built-in collisions still resolve to Leftium
- ordinary compatible unknown add-ons delegate to `sv add`
- `sv:<name>` bypasses a Leftium wrapper
- passthrough arguments reach `sv` unchanged
- upstream nonzero exits remain nonzero with useful failure details
- unsupported/non-Svelte targets fail before delegation
- representative official/community delegation cases pass
- existing tests, type checks, lint/build checks remain green

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

## Verify

- built-in collisions still resolve to Leftium
- ordinary compatible unknown add-ons delegate to `sv add`
- `sv:<name>` bypasses a Leftium wrapper
- passthrough arguments reach `sv` unchanged
- upstream nonzero exits remain nonzero with useful failure details
- unsupported/non-Svelte targets fail before delegation
- representative official/community delegation cases pass
- existing tests, type checks, lint/build checks remain green

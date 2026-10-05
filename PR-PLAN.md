# PR Plan

Issue: #6

## Goal

Implement the remaining v0 built-in `pages` add-on for fully prerendered SvelteKit projects targeting GitHub Pages, following the active Pages/CLI/product specs without broadening into generic deployment or framework migration.

## Scope

- recognize compatible SvelteKit packages and reject request-time server requirements before avoidable mutation
- install/configure `@sveltejs/adapter-static` for supported/default-adapter cases while preserving unrelated Svelte/Vite configuration
- configure prerendering, trailing-slash, and base-path behavior for static output with no SPA fallback
- distinguish project sites, user/organization root sites, and custom-domain deployments
- detect the publish directory when unambiguous and stop for unsupported/ambiguous output configuration
- generate a thin repository-root caller workflow that retains branch triggers locally and calls a versioned reusable Leftium workflow
- report remote Pages settings, DNS/custom-domain work, URL references, and old-host cleanup as explicit follow-up
- preserve supported existing caller customization and stop on unsupported adapter/base/workflow/domain conflicts
- keep local configuration, static-build verification, and remote-deployment verification as separate outcomes
- remain idempotent on a second run

Explicitly out of scope: SPA fallbacks, arbitrary adapter migrations, non-SvelteKit frameworks, automatic Pages/DNS configuration, generic deployment abstractions, and guessed workspace deployment contracts.

## Implementation approach

1. Inspect the existing add-on orchestration/project-context/install boundaries and the Pages migration reference material before extending them.
2. Define the reusable workflow contract first: inputs, permissions, app working directory, package-manager/install/build/check behavior, artifact path, and versioned caller reference. Keep project-specific branch triggers in callers.
3. Add Pages compatibility/planning logic that classifies supported static SvelteKit state and conflicts before mutation where knowable.
4. Apply targeted SvelteKit/package edits and deterministic caller-workflow reconciliation while preserving unrelated/custom content.
5. Verify static output and route/assets when installation/build execution is enabled; represent skipped verification distinctly when requested or unavailable.
6. Add focused unit/fixture coverage and update durable README/spec-facing usage documentation where implementation details need recording.

If a truly published immutable reusable-workflow release or external GitHub Pages configuration is required to complete verification, treat that as an external/release boundary rather than silently performing it. Record the exact remaining verification step for the user.

## Checkpoints

### 1. Provider and compatibility boundary

- reusable workflow contract represented in-repo
- supported SvelteKit/default-adapter detection and unsupported-server/custom-adapter rejection
- project/root/custom-domain base-path decisions covered by focused tests

### 2. Local Pages reconciliation

- package/SvelteKit configuration edits
- deterministic thin caller workflow
- preservation/conflict behavior for existing configuration and caller customization
- install/no-install and output-directory handling

### 3. Verification and completion

- successful static build plus route/asset checks for representative supported fixtures
- workspace behavior only where the spec's app-directory/shared-install contract is actually verified
- idempotent second run
- documentation and result reporting distinguish local applied / build verified / remote deployment verified
- full project tests, typecheck, formatting, build, and repository checks pass

## Verify

Cover the Pages spec matrix, including:

- new and existing supported SvelteKit configuration
- recognized default-adapter replacement and unsupported custom adapter conflicts
- request-time server/runtime incompatibility
- ambiguous/unknown output directory
- project-site, user/organization-site, and custom-domain base paths
- routes and assets in built static output
- deterministic valid caller workflow YAML
- reusable-workflow version changes and caller conflicts
- branch triggers remaining caller-owned
- supported workspace targeting, or an explicit unsupported result when its workflow contract cannot be established safely
- custom-domain/CNAME preservation and remote follow-up reporting
- idempotent second run
- existing tests and CI remain green

## Implementation decisions

- Contract v1 uses an immutable Git commit SHA published on the implementation branch before caller generation. It does not create a release/tag or enable remote Pages settings.
- Configure current SvelteKit Vite plugin options in place, including the JavaScript-compatible vite.config.ts emitted by the pinned sv provider. Also support legacy svelte.config.js. Stop on conflicting simultaneous sources or TypeScript-only syntax rather than guessing.
- Acorn syntax spans preserve unrelated Svelte/Vite settings; YAML document edits preserve supported caller comments, triggers, script choices, and additional jobs. Unknown customization stops before mutation.
- Only standalone apps at the repository root are generated. Workspace/app-directory/shared-install deployment requires a separate verified consumer contract.
- Native package installation and metadata-selected scripts feed strict adapter-static builds. Output verification checks literal routes and HTML asset references; dynamic route entries remain governed by strict SvelteKit prerendering.
- Network fixture verification is opt-in with LE_PAGES_BUILD_TEST=1; normal project tests remain offline. Fixtures cover npm project/root/custom-domain sites and a pnpm consumer.
- Remote deployment remains explicitly unverified until a consumer workflow runs against configured GitHub Pages settings. No deployment, DNS change, tag/release, or merge is performed in this implementation run.
